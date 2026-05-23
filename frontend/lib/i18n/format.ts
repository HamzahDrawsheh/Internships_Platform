/** Replace `{{key}}` placeholders in a translation template. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value)),
    template,
  );
}
