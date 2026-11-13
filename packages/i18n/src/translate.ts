import en from "../messages/en.json" with { type: "json" };
import tet from "../messages/tet.json" with { type: "json" };

export type MessageKey = keyof typeof en;
export type Locale = "en" | "tet";
export type Catalog = Record<MessageKey, string>;
export type MessageParams = Record<string, string | number>;

export const locales: readonly Locale[] = ["en", "tet"];
export const defaultLocale: Locale = "en";
export const catalogs: Record<Locale, Catalog> = { en, tet };

export const isLocale = (value: unknown): value is Locale => locales.includes(value as Locale);

/**
 * Returns the `locale` text for `key`, with each `{name}` placeholder
 * replaced by `params[name]`. Placeholders without a matching param stay as written.
 */
export const translate = (locale: Locale, key: MessageKey, params?: MessageParams): string => {
  const message = catalogs[locale][key];
  if (!params) return message;
  return message.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  );
};
