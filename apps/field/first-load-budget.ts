import { brotliCompressSync } from "node:zlib";
import type { Plugin, Rolldown } from "vite";

type OutputBundle = Rolldown.OutputBundle;

/**
 * Files the browser fetches before the app can run: `index.html`, every entry chunk, the chunks
 * they import statically (transitively) and the CSS those chunks import. Dynamic imports are
 * excluded. Returns bundle file names, sorted.
 */
export function firstLoadFiles(bundle: OutputBundle): string[] {
  const files = new Set<string>(["index.html"].filter((name) => name in bundle));
  const visit = (name: string) => {
    const chunk = bundle[name];
    if (chunk?.type !== "chunk" || files.has(name)) return;
    files.add(name);
    chunk.viteMetadata?.importedCss.forEach((css) => files.add(css));
    chunk.imports.forEach(visit);
  };
  Object.values(bundle)
    .filter((output) => output.type === "chunk" && output.isEntry)
    .forEach((entry) => visit(entry.fileName));
  return [...files].sort();
}

const brotliSize = (output: OutputBundle[string]) =>
  brotliCompressSync(output.type === "chunk" ? output.code : output.source).length;

const kib = (bytes: number) => `${(bytes / 1024).toFixed(1)} KiB`;

/**
 * Build-only plugin. After the bundle is written, sums the brotli size of `firstLoadFiles` and
 * fails the build when the sum exceeds `limitBytes`.
 */
export function firstLoadBudget(limitBytes: number): Plugin {
  return {
    name: "first-load-budget",
    apply: "build",
    writeBundle(_options, bundle) {
      const files = firstLoadFiles(bundle);
      const total = files.reduce((sum, name) => sum + brotliSize(bundle[name]), 0);
      const summary = `First load is ${kib(total)} brotli (budget ${kib(limitBytes)}): ${files.join(", ")}`;
      if (total > limitBytes) this.error(summary);
      this.info(summary);
    },
  };
}
