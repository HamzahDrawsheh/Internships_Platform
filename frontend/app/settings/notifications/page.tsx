"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTIFICATION_SETTING_FIELDS,
  type ProfileNotificationSettings,
} from "@/lib/notification-preferences";
import { useI18n } from "@/lib/i18n/context";
import {
  loadNotificationSettings,
  saveNotificationSettings,
} from "@/lib/notification-settings";

export default function NotificationSettingsPage() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<ProfileNotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const loadGenerationRef = useRef(0);

  const runLoad = useCallback(async (signal?: AbortSignal) => {
    const generation = ++loadGenerationRef.current;
    setLoading(true);
    setError(null);
    setRetryable(false);
    setSaved(false);

    try {
      const supabase = createClient();
      const result = await loadNotificationSettings(supabase, { signal });

      if (generation !== loadGenerationRef.current) {
        return;
      }

      if (!result.ok) {
        setError(result.error);
        setRetryable(result.retryable);
        return;
      }

      setSettings(result.settings);
      if (result.created) {
        console.info("[notification-settings] Initialized default preferences for user");
      }
    } catch (err) {
      if (signal?.aborted) return;
      const message = err instanceof Error ? err.message : String(err);
      console.error("[notification-settings] unexpected load error:", message, err);
      setError(
        message.includes("fetch")
          ? "Network error while loading preferences. Check your connection and try again."
          : `Unexpected error: ${message}`
      );
      setRetryable(true);
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    void runLoad(abort.signal);
    return () => {
      abort.abort();
    };
  }, [runLoad]);

  const toggleSetting = (key: keyof ProfileNotificationSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    setRetryable(false);

    try {
      const supabase = createClient();
      const result = await saveNotificationSettings(supabase, settings);

      if (!result.ok) {
        setError(result.error);
        setRetryable(result.retryable);
        return;
      }

      setSettings(result.settings);
      setSaved(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[notification-settings] unexpected save error:", message, err);
      setError(`Unexpected error while saving: ${message}`);
      setRetryable(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0">
      <Container>
        <PageHeader
          title={t("settings.notifications.title")}
          description={t("settings.notifications.description")}
        />

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            <p>{error}</p>
            {retryable && (
              <Button
                type="button"
                variant="secondary"
                className="mt-3"
                disabled={loading}
                onClick={() => void runLoad()}
              >
                {loading ? t("settings.notifications.retrying") : t("settings.notifications.tryAgain")}
              </Button>
            )}
          </div>
        )}

        {saved && !error && (
          <div
            className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
            role="status"
          >
            {t("settings.notifications.saved")}
          </div>
        )}

        <Card className="p-6">
          {loading ? (
            <p className="text-sm text-gray-600 dark:text-slate-400" role="status">
              {t("settings.notifications.loading")}
            </p>
          ) : (
            <fieldset className="space-y-3" disabled={saving || Boolean(error)}>
              <legend className="sr-only">{t("settings.notifications.channelsLegend")}</legend>
              {NOTIFICATION_SETTING_FIELDS.map((field) => (
                <label
                  key={field.key}
                  className="flex cursor-pointer items-start gap-4 rounded-xl border-2 border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                >
                  <input
                    type="checkbox"
                    name={field.key}
                    checked={settings[field.key]}
                    onChange={() => toggleSetting(field.key)}
                    className="mt-1 h-4 w-4 shrink-0 rounded accent-purple-600"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                      {t(field.labelKey)}
                    </span>
                    <span className="mt-1 block text-sm text-gray-600 dark:text-slate-400">
                      {t(field.descriptionKey)}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-200 pt-6 dark:border-slate-800">
            <Button
              variant="primary"
              onClick={() => void handleSave()}
              disabled={loading || saving || Boolean(error)}
            >
              {saving ? t("settings.notifications.saving") : t("settings.notifications.save")}
            </Button>
          </div>
        </Card>
      </Container>
    </div>
  );
}
