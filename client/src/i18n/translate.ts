type MessageTree = { [key: string]: string | MessageTree };

export type TranslateParams = Record<string, string | number>;

export function translate(
  messages: MessageTree,
  key: string,
  params?: TranslateParams
): string {
  const parts = key.split('.');
  let current: string | MessageTree | undefined = messages;
  for (const part of parts) {
    if (!current || typeof current === 'string') return key;
    current = current[part];
  }
  if (typeof current !== 'string') return key;
  if (!params) return current;
  return current.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    params[name] != null ? String(params[name]) : ''
  );
}
