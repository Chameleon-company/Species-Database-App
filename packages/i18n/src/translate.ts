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
 * Replaces each `{name}` in `message` with the own property `params[name]`.
 * A placeholder without a matching own property stays as written.
 * Uses no API newer than Chrome 71.
 */
export const interpolate = (message: string, params?: MessageParams): string => {
  if (!params) return message;
  return message.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : placeholder,
  );
};

export const translate = (locale: Locale, key: MessageKey, params?: MessageParams): string =>
  interpolate(catalogs[locale][key], params);
