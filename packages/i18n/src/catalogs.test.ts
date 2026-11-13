import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  catalogs,
  interpolate,
  locales,
  translate,
  type Locale,
  type MessageKey,
  type MessageParams,
} from "./translate.ts";

const placeholders = (message: string) =>
  [...message.matchAll(/\{(\w+)\}/g)].map(([, name]) => name).sort();

const readCatalogText = (locale: Locale) =>
  readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8");

const readCatalog = (locale: Locale): Record<string, unknown> =>
  JSON.parse(readCatalogText(locale));

const duplicateKeys = (text: string) => {
  const keys = [...text.matchAll(/^\s*"((?:[^"\\]|\\.)*)"\s*:/gm)].map(([, key]) => key);
  return keys.filter((key, index) => keys.indexOf(key) !== index);
};

describe("catalogs", () => {
  const english = readCatalog("en");
  const englishKeys = Object.keys(english);

  for (const locale of locales.filter((locale) => locale !== "en")) {
    const catalog = readCatalog(locale);

    test(`${locale} has every English key`, () => {
      expect(englishKeys.filter((key) => !(key in catalog))).toEqual([]);
    });

    test(`${locale} has no key that English lacks`, () => {
      expect(Object.keys(catalog).filter((key) => !(key in english))).toEqual([]);
    });

    test(`${locale} uses the same {placeholders} as English`, () => {
      const mismatched = englishKeys.filter(
        (key) =>
          typeof catalog[key] === "string" &&
          placeholders(catalog[key]).join() !== placeholders(String(english[key])).join(),
      );
      expect(mismatched).toEqual([]);
    });
  }

  for (const locale of locales) {
    test(`${locale} has no duplicate keys`, () => {
      expect(duplicateKeys(readCatalogText(locale))).toEqual([]);
    });

    test(`${locale} values are non-empty strings`, () => {
      const invalid = Object.entries(readCatalog(locale))
        .filter(([, value]) => typeof value !== "string" || value.trim() === "")
        .map(([key]) => key);
      expect(invalid).toEqual([]);
    });
  }
});

describe("translate", () => {
  test("returns the text for the locale", () => {
    expect(translate("en", "search")).toBe(catalogs.en.search);
    expect(translate("tet", "search")).toBe(catalogs.tet.search);
  });

  test("fills every placeholder of every key in every locale", () => {
    const keys = Object.keys(catalogs.en) as MessageKey[];
    const unfilled = locales.flatMap((locale) =>
      keys
        .filter((key) => {
          const names = placeholders(catalogs.en[key]);
          const params = Object.fromEntries(names.map((name) => [name, `<${name}>`]));
          return /\{\w+\}/.test(translate(locale, key, params));
        })
        .map((key) => `${locale}.${key}`),
    );
    expect(unfilled).toEqual([]);
  });
});

describe("interpolate", () => {
  test("replaces placeholders with params", () => {
    expect(interpolate("{count} records in {place}", { count: 12, place: "Dili" })).toBe(
      "12 records in Dili",
    );
  });

  test("keeps a placeholder that has no param", () => {
    expect(interpolate("{count} records", {})).toBe("{count} records");
  });

  test("returns the message unchanged without params", () => {
    expect(interpolate("{count} records")).toBe("{count} records");
  });

  test("ignores inherited properties", () => {
    expect(interpolate("{toString}", {})).toBe("{toString}");
  });

  test("reads a params object with no prototype", () => {
    const params: MessageParams = Object.assign(Object.create(null), { count: 3 });
    expect(interpolate("{count} records", params)).toBe("3 records");
  });

  test("renders a zero value", () => {
    expect(interpolate("{count} records", { count: 0 })).toBe("0 records");
  });

  test("keeps a placeholder whose param is undefined or null", () => {
    const params = { count: undefined, place: null } as unknown as MessageParams;
    expect(interpolate("{count} records in {place}", params)).toBe("{count} records in {place}");
  });
});
