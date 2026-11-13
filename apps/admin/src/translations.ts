import { catalogs, type MessageKey } from "@sda/i18n/translate";

/**
 * `{ key: { en, tet } }` view of the `@sda/i18n` catalogs for pages that index it directly.
 * Prefer `t` from `useLanguage()`.
 */
export const translations = Object.fromEntries(
  Object.keys(catalogs.en).map((key) => [
    key,
    { en: catalogs.en[key as MessageKey], tet: catalogs.tet[key as MessageKey] },
  ]),
) as Record<MessageKey, { en: string; tet: string }>;
