// Copies apps/field-legacy into apps/android/www (the Capacitor webDir), leaving out files the
// app never loads, so they are not shipped in the APK/AAB. The public website still serves
// apps/field-legacy as it is. Run through `pnpm --filter android sync`.
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "..", "..", "field-legacy");
const target = join(here, "..", "www");

// Paths relative to apps/field-legacy. No page links to or loads any of these.
const EXCLUDED = new Set([
  "data/images.json", // read only by scripts/preloadImages.js
  "scripts/preloadImages.js",
  "scripts/bundleSync.js",
  "scripts/nativeMediaPrefetch.js",
  "login-admin.html",
  "plantcamidentifier.html",
  "imagepreview.html",
  "tutorial.html",
]);

// Species photos now come from the API; ship a file under Assets/Images/ only when a shipped
// html/js/css/json file names its path (exact case, as Android asset paths are case-sensitive).
const IMAGES_DIR = "Assets/Images/";
const TEXT_FILE = /\.(html|js|css|json)$/;

function listFiles(dir, prefix = "") {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const rel = prefix + entry.name;
    if (entry.isDirectory()) files.push(...listFiles(join(dir, entry.name), rel + "/"));
    else if (entry.isFile()) files.push(rel);
  }
  return files;
}

const all = listFiles(source);
const candidates = all.filter((rel) => !EXCLUDED.has(rel) && !rel.endsWith(".md"));
const shippedText = candidates
  .filter((rel) => TEXT_FILE.test(rel) && !rel.startsWith(IMAGES_DIR))
  .map((rel) => readFileSync(join(source, rel), "utf8"))
  .join("\n");
const shipped = candidates.filter(
  (rel) => !rel.startsWith(IMAGES_DIR) || shippedText.includes(rel),
);

rmSync(target, { recursive: true, force: true });
let bytes = 0;
for (const rel of shipped) {
  const to = join(target, rel);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(join(source, rel), to);
  bytes += statSync(to).size;
}

const skipped = all.filter((rel) => !shipped.includes(rel));
console.log(
  `prepare-web: copied ${shipped.length} files (${(bytes / 1024 / 1024).toFixed(2)} MB) to www, ` +
    `left out ${skipped.length}: ${skipped.join(", ")}`,
);
