import { describe, expect, it } from "vitest";
import type { Rolldown } from "vite";
import { firstLoadFiles } from "./first-load-budget.ts";

const chunk = (
  fileName: string,
  options: { isEntry?: boolean; imports?: string[]; css?: string[] } = {},
) => ({
  type: "chunk",
  fileName,
  code: "",
  isEntry: options.isEntry ?? false,
  imports: options.imports ?? [],
  viteMetadata: { importedCss: new Set(options.css ?? []), importedAssets: new Set<string>() },
});

const asset = (fileName: string) => ({ type: "asset", fileName, source: "" });

const outputBundle = (outputs: { fileName: string }[]) =>
  Object.fromEntries(outputs.map((output) => [output.fileName, output])) as Rolldown.OutputBundle;

describe("firstLoadFiles", () => {
  it("follows static imports from the entry and collects their CSS", () => {
    const bundle = outputBundle([
      asset("index.html"),
      chunk("index.js", { isEntry: true, imports: ["shared.js"], css: ["index.css"] }),
      chunk("shared.js", { imports: ["vendor.js"], css: ["shared.css"] }),
      chunk("vendor.js"),
      asset("index.css"),
      asset("shared.css"),
    ]);
    expect(firstLoadFiles(bundle)).toEqual([
      "index.css",
      "index.html",
      "index.js",
      "shared.css",
      "shared.js",
      "vendor.js",
    ]);
  });

  it("leaves out chunks and CSS that only a dynamic import reaches", () => {
    const bundle = outputBundle([
      asset("index.html"),
      chunk("index.js", { isEntry: true }),
      chunk("species-detail.js", { css: ["species-detail.css"] }),
      asset("species-detail.css"),
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
