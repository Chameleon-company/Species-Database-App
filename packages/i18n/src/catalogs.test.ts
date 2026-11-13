import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { catalogs, locales, translate, type Locale } from "./translate.ts";

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
      assert.deepEqual(
        englishKeys.filter((key) => !(key in catalog)),
        [],
      );
    });

    test(`${locale} has no key that English lacks`, () => {
      assert.deepEqual(
        Object.keys(catalog).filter((key) => !(key in english)),
        [],
      );
    });

    test(`${locale} uses the same {placeholders} as English`, () => {
      const mismatched = englishKeys.filter(
        (key) =>
          typeof catalog[key] === "string" &&
          placeholders(catalog[key]).join() !== placeholders(String(english[key])).join(),
      );
      assert.deepEqual(mismatched, []);
    });
  }

  for (const locale of locales) {
    test(`${locale} has no duplicate keys`, () => {
      assert.deepEqual(duplicateKeys(readCatalogText(locale)), []);
    });

    test(`${locale} values are non-empty strings`, () => {
      const invalid = Object.entries(readCatalog(locale))
        .filter(([, value]) => typeof value !== "string" || value.trim() === "")
        .map(([key]) => key);
      assert.deepEqual(invalid, []);
    });
  }
});

describe("translate", () => {
  test("returns the text for the locale", () => {
    assert.equal(translate("en", "search"), catalogs.en.search);
    assert.equal(translate("tet", "search"), catalogs.tet.search);
  });

  test("replaces placeholders with params", () => {
    assert.equal(
      translate("en", "speciesRecordCount", { count: 12 }),
      "12 species records in the English Database",
    );
  });

  test("keeps a placeholder that has no param", () => {
    assert.equal(translate("en", "speciesRecordCount", {}), catalogs.en.speciesRecordCount);
  });
});
