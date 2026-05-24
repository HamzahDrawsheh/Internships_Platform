import type { SupabaseClient, User } from "@supabase/supabase-js";

import {
  DEFAULT_NOTIFICATION_SETTINGS,
  PROFILE_NOTIFICATION_SELECT,
  type ProfileNotificationRow,
  type ProfileNotificationSettings,
  normalizeNotificationSettings,
} from "@/lib/notification-preferences";
import {
  formatPostgrestError,
  isMissingNotificationSettingsColumns,
  isRlsDeniedError,
  logPostgrestError,
} from "@/lib/postgrest-error";
import type { ProfileRole } from "@/lib/types";

export type { ProfileNotificationSettings, ProfileNotificationRow };

export type LoadNotificationSettingsResult =
  | { ok: true; settings: ProfileNotificationSettings; created: boolean }
  | { ok: false; error: string; retryable: boolean };

export type SaveNotificationSettingsResult =
  | { ok: true; settings: ProfileNotificationSettings }
  | { ok: false; error: string; retryable: boolean };

export function getSupabaseEnvDiagnostics(): {
  urlSet: boolean;
  anonKeySet: boolean;
  urlHost: string | null;
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  let urlHost: string | null = null;
  try {
    urlHost = url ? new URL(url).host : null;
  } catch {
    urlHost = null;
  }
  return {
    urlSet: Boolean(url),
    anonKeySet: Boolean(anonKey),
    urlHost,
  };
}

function logNotificationSettingsDebug(
  step: string,
  payload: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === "production") return;
  console.info(`[notification-settings] ${step}`, payload);
}

function migrationRequiredMessage(): string {
  return (
    "Notification settings columns are missing on profiles. " +
    "Run `npm run supabase:push` in the frontend folder, then reload this page."
  );
}

/**
 * Loads notification boolean columns from the user's profile row.
 */
export async function loadNotificationSettings(
  supabase: SupabaseClient,
  options?: { signal?: AbortSignal }
): Promise<LoadNotificationSettingsResult> {
  const env = getSupabaseEnvDiagnostics();
  logNotificationSettingsDebug("env", env);

  if (!env.urlSet || !env.anonKeySet) {
    return {
      ok: false,
      retryable: false,
      error:
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server.",
    };
  }

  if (options?.signal?.aborted) {
    return { ok: false, retryable: false, error: "Request cancelled." };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  logNotificationSettingsDebug("session", {
    hasSession: Boolean(sessionData.session),
    sessionError: sessionError ? formatPostgrestError(sessionError) : null,
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  logNotificationSettingsDebug("user", {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    userError: userError ? formatPostgrestError(userError) : null,
  });

  if (userError || !user) {
    return {
      ok: false,
      retryable: true,
      error: userError
        ? `Authentication error: ${formatPostgrestError(userError)}`
        : "You must be signed in to manage notification preferences.",
    };
  }

  if (options?.signal?.aborted) {
    return { ok: false, retryable: false, error: "Request cancelled." };
  }

  const queryResult = await supabase
    .from("profiles")
    .select(PROFILE_NOTIFICATION_SELECT)
    .eq("id", user.id)
    .maybeSingle();

  logNotificationSettingsDebug("profile query", {
    status: queryResult.status,
    count: queryResult.count,
    hasData: Boolean(queryResult.data),
    error: queryResult.error ? formatPostgrestError(queryResult.error) : null,
    errorCode: queryResult.error?.code ?? null,
  });

  if (queryResult.error) {
    logPostgrestError("[notification-settings] profile select error", queryResult.error);

    if (isMissingNotificationSettingsColumns(queryResult.error)) {
      return { ok: false, retryable: false, error: migrationRequiredMessage() };
    }

    if (isRlsDeniedError(queryResult.error)) {
      return {
        ok: false,
        retryable: true,
        error:
          "Permission denied reading your profile (RLS). Ensure you are logged in as the correct user.",
      };
    }

    return {
      ok: false,
      retryable: true,
      error: `Could not load preferences: ${formatPostgrestError(queryResult.error)}`,
    };
  }

  if (!queryResult.data) {
    logNotificationSettingsDebug("profile missing", { userId: user.id });
    const ensured = await ensureProfileNotificationSettings(supabase, user);
    if (!ensured.ok) {
      return ensured;
    }
    return { ok: true, settings: ensured.settings, created: true };
  }

  const row = queryResult.data as ProfileNotificationRow;
  const settings = normalizeNotificationSettings(row);

  const needsPersist =
    row.email_notifications === null ||
    row.push_notifications === null ||
    row.marketing_notifications === null;

  if (needsPersist) {
    const persisted = await persistNotificationSettings(supabase, user.id, settings);
    if (!persisted.ok) {
      return persisted;
    }
    return { ok: true, settings, created: true };
  }

  return { ok: true, settings, created: false };
}

export async function saveNotificationSettings(
  supabase: SupabaseClient,
  settings: ProfileNotificationSettings
): Promise<SaveNotificationSettingsResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      retryable: true,
      error: "You must be signed in to save preferences.",
    };
  }

  const persisted = await persistNotificationSettings(supabase, user.id, settings);
  if (!persisted.ok) {
    return persisted;
  }

  return { ok: true, settings: persisted.settings };
}

async function persistNotificationSettings(
  supabase: SupabaseClient,
  userId: string,
  settings: ProfileNotificationSettings
): Promise<
  | { ok: true; settings: ProfileNotificationSettings }
  | { ok: false; error: string; retryable: boolean }
> {
  const payload = {
    email_notifications: settings.email_notifications,
    push_notifications: settings.push_notifications,
    marketing_notifications: settings.marketing_notifications,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select(PROFILE_NOTIFICATION_SELECT)
    .maybeSingle();

  logNotificationSettingsDebug("persist", {
    userId,
    settings,
    error: error ? formatPostgrestError(error) : null,
    hasData: Boolean(data),
  });

  if (error) {
    logPostgrestError("[notification-settings] profile update error", error);

    if (isMissingNotificationSettingsColumns(error)) {
      return { ok: false, retryable: false, error: migrationRequiredMessage() };
    }

    if (isRlsDeniedError(error)) {
      return {
        ok: false,
        retryable: true,
        error: "Permission denied updating your profile. Check Row Level Security policies.",
      };
    }

    return {
      ok: false,
      retryable: true,
      error: `Could not save preferences: ${formatPostgrestError(error)}`,
    };
  }

  if (!data) {
    return {
      ok: false,
      retryable: true,
      error: "Profile row not found. Try signing out and back in.",
    };
  }

  return { ok: true, settings: normalizeNotificationSettings(data as ProfileNotificationRow) };
}

async function ensureProfileNotificationSettings(
  supabase: SupabaseClient,
  user: User,
  settings: ProfileNotificationSettings = DEFAULT_NOTIFICATION_SETTINGS
): Promise<
  | { ok: true; settings: ProfileNotificationSettings }
  | { ok: false; error: string; retryable: boolean }
> {
  const email = user.email ?? null;
  const full_name =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;
  const role = (typeof user.user_metadata?.role === "string"
    ? user.user_metadata.role
    : "student") as ProfileRole;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.id) {
    const result = await persistNotificationSettings(supabase, user.id, settings);
    if (!result.ok) {
      return result;
    }
    return { ok: true, settings: result.settings };
  }

  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    email,
    full_name,
    role,
    email_notifications: settings.email_notifications,
    push_notifications: settings.push_notifications,
    marketing_notifications: settings.marketing_notifications,
    updated_at: new Date().toISOString(),
  });

  if (insertError) {
    logPostgrestError("[notification-settings] ensure insert error", insertError);

    if (insertError.code === "23505") {
      const retry = await persistNotificationSettings(supabase, user.id, settings);
      if (retry.ok) {
        return { ok: true, settings: retry.settings };
      }
    }

    if (isMissingNotificationSettingsColumns(insertError)) {
      return { ok: false, retryable: false, error: migrationRequiredMessage() };
    }

    return {
      ok: false,
      retryable: true,
      error: `Could not create profile: ${formatPostgrestError(insertError)}`,
    };
  }

  logNotificationSettingsDebug("profile created", { userId: user.id, settings });
  return { ok: true, settings };
}
