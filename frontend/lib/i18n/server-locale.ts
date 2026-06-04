import { getMessage, LOCALE_STORAGE_KEY, type Locale } from "@/lib/i18n/messages";

export function parseLocaleFromRequest(request: Request): Locale {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${LOCALE_STORAGE_KEY}=([^;]+)`));
  const fromCookie = match?.[1]?.trim();
  if (fromCookie === "ar" || fromCookie === "en") return fromCookie;

  const accept = request.headers.get("accept-language") ?? "";
  if (/\bar\b/i.test(accept)) return "ar";
  return "en";
}

export function createServerTranslator(locale: Locale): (key: string) => string {
  return (key: string) => getMessage(locale, key);
}
