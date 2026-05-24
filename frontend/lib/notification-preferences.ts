/**
 * Notification settings stored on public.profiles (boolean columns).
 */

export type ProfileNotificationSettings = {
  email_notifications: boolean;
  push_notifications: boolean;
  marketing_notifications: boolean;
};

/** Explicit PostgREST select list — never use "*" for notification settings. */
export const PROFILE_NOTIFICATION_SELECT =
  "id, email_notifications, push_notifications, marketing_notifications" as const;

export type ProfileNotificationRow = {
  id: string;
  email_notifications: boolean | null;
  push_notifications: boolean | null;
  marketing_notifications: boolean | null;
};

export const DEFAULT_NOTIFICATION_SETTINGS: ProfileNotificationSettings = {
  email_notifications: true,
  push_notifications: true,
  marketing_notifications: false,
};

export const NOTIFICATION_SETTING_FIELDS: {
  key: keyof ProfileNotificationSettings;
  label: string;
  description: string;
}[] = [
  {
    key: "push_notifications",
    label: "Website notifications",
    description: "Show alerts in the app (bell icon and notifications page).",
  },
  {
    key: "email_notifications",
    label: "Email notifications",
    description: "Receive platform updates by email when supported.",
  },
  {
    key: "marketing_notifications",
    label: "Marketing emails",
    description: "News, tips, and promotional messages (optional).",
  },
];

export function normalizeNotificationSettings(
  row: Partial<ProfileNotificationRow> | null | undefined
): ProfileNotificationSettings {
  return {
    email_notifications:
      row?.email_notifications ?? DEFAULT_NOTIFICATION_SETTINGS.email_notifications,
    push_notifications:
      row?.push_notifications ?? DEFAULT_NOTIFICATION_SETTINGS.push_notifications,
    marketing_notifications:
      row?.marketing_notifications ?? DEFAULT_NOTIFICATION_SETTINGS.marketing_notifications,
  };
}

export function wantsWebsiteNotifications(settings: ProfileNotificationSettings): boolean {
  return settings.push_notifications;
}

export function wantsEmailNotifications(settings: ProfileNotificationSettings): boolean {
  return settings.email_notifications;
}

export function wantsMarketingNotifications(settings: ProfileNotificationSettings): boolean {
  return settings.marketing_notifications;
}
