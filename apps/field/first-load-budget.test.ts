import { describe, expect, it } from "vitest";
import type { Rolldown } from "vite";
import { firstLoadBudget, firstLoadFiles } from "./first-load-budget.ts";

const chunk = (
  fileName: string,
  options: { isEntry?: boolean; imports?: string[]; css?: string[]; assets?: string[] } = {},
) => ({
  type: "chunk",
  fileName,
  code: "",
  isEntry: options.isEntry ?? false,
  imports: options.imports ?? [],
  viteMetadata: {
    importedCss: new Set(options.css ?? []),
    importedAssets: new Set(options.assets ?? []),
  },
});

const asset = (fileName: string) => ({ type: "asset", fileName, source: "" });

const outputBundle = (outputs: { fileName: string }[]) =>
  Object.fromEntries(outputs.map((output) => [output.fileName, output])) as Rolldown.OutputBundle;

describe("firstLoadFiles", () => {
  it("follows static imports from the entry and collects their CSS and assets", () => {
    const bundle = outputBundle([
      asset("index.html"),
      chunk("index.js", { isEntry: true, imports: ["shared.js"], css: ["index.css"] }),
      chunk("shared.js", { imports: ["vendor.js"], css: ["shared.css"], assets: ["font.woff2"] }),
      chunk("vendor.js"),
      asset("index.css"),
      asset("shared.css"),
      asset("font.woff2"),
    ]);
    expect(firstLoadFiles(bundle)).toEqual([
      "font.woff2",
      "index.css",
      "index.html",
      "index.js",
      "shared.css",
      "shared.js",
      "vendor.js",
    ]);
  });

  it("leaves out chunks, CSS and assets that only a dynamic import reaches", () => {
    const bundle = outputBundle([
      asset("index.html"),
      chunk("index.js", { isEntry: true }),
      chunk("species-detail.js", { css: ["species-detail.css"], assets: ["photo.webp"] }),
      asset("species-detail.css"),
      asset("photo.webp"),
    ]);
    expect(firstLoadFiles(bundle)).toEqual(["index.html", "index.js"]);
  });

  it("visits a chunk once when imports form a cycle", () => {
    const bundle = outputBundle([
      chunk("a.js", { isEntry: true, imports: ["b.js"] }),
      chunk("b.js", { imports: ["a.js"] }),
    ]);
    expect(firstLoadFiles(bundle)).toEqual(["a.js", "b.js"]);
  });
});

describe("firstLoadBudget", () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects a budget of %s KiB",
    (maxGzipKiB) => {
      expect(() => firstLoadBudget({ maxGzipKiB })).toThrow("maxGzipKiB must be a positive number");
    },
  );

  it("accepts a positive finite budget", () => {
    expect(firstLoadBudget({ maxGzipKiB: 50 }).name).toBe("first-load-budget");
  });
});
