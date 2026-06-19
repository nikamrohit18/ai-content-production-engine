export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    if (!(key in vars)) {
      console.warn(`[renderTemplate] no value provided for placeholder {{${key}}}`);
      return match;
    }
    return vars[key];
  });
}
