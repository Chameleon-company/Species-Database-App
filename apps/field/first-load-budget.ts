import { gzipSync } from "node:zlib";
import type { Plugin, Rolldown } from "vite";

type OutputBundle = Rolldown.OutputBundle;

/**
 * Files the browser fetches before the app can run: `index.html`, every entry chunk, the chunks
 * they import statically (transitively), and the CSS and assets those chunks import. Dynamic
 * imports are excluded. Files copied from `public/` are not part of the bundle and are not
 * counted. Returns bundle file names, sorted.
 */
export function firstLoadFiles(bundle: OutputBundle): string[] {
  const files = new Set<string>(["index.html"].filter((name) => name in bundle));
  const visit = (name: string) => {
    const chunk = bundle[name];
    if (chunk?.type !== "chunk" || files.has(name)) return;
    files.add(name);
    chunk.viteMetadata?.importedCss.forEach((css) => files.add(css));
    chunk.viteMetadata?.importedAssets.forEach((asset) => files.add(asset));
    chunk.imports.forEach(visit);
  };
  Object.values(bundle)
    .filter((output) => output.type === "chunk" && output.isEntry)
    .forEach((entry) => visit(entry.fileName));
  return [...files].sort();
}

const gzipSize = (output: OutputBundle[string]) =>
  gzipSync(output.type === "chunk" ? output.code : output.source).length;

const kib = (bytes: number) => `${(bytes / 1024).toFixed(1)} KiB`;

/**
 * Build-only plugin. After the bundle is written, sums the gzip size (zlib default level, as in
 * Vite's own size report) of `firstLoadFiles` and fails the build when the sum exceeds
 * `maxGzipKiB` KiB.
 */
export function firstLoadBudget({ maxGzipKiB }: { maxGzipKiB: number }): Plugin {
  const limitBytes = maxGzipKiB * 1024;
  return {
    name: "first-load-budget",
    apply: "build",
    writeBundle(_options, bundle) {
      const files = firstLoadFiles(bundle);
      const total = files.reduce((sum, name) => sum + gzipSize(bundle[name]), 0);
      const summary = `First load is ${kib(total)} gzip (budget ${kib(limitBytes)}): ${files.join(", ")}`;
      if (total > limitBytes) this.error(summary);
      this.info(summary);
    },
  };
}
