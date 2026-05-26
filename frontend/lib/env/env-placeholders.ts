const PLACEHOLDER_VALUES = new Set(
  [
    "your-gmail-address@gmail.com",
    "your-gmail-app-password-here",
    "your-email@gmail.com",
    "changeme",
    "replace-me",
    "your-anon-key",
    "your-service-role-key",
    "your-openai-key",
  ].map((v) => v.toLowerCase())
);

export function isEnvPlaceholderValue(value: string): boolean {
  if (!value.trim()) return true;
  const normalized = value.trim().toLowerCase();
  if (PLACEHOLDER_VALUES.has(normalized)) return true;
  if (normalized.startsWith("your-") && normalized.includes("gmail")) return true;
  if (normalized.includes("app-password-here")) return true;
  return false;
}
