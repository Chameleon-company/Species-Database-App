// Runs the Gradle wrapper in apps/android/android on Windows, macOS and Linux, passing the
// arguments through, e.g. `node scripts/gradle.mjs bundleRelease -PversionCode=2`.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const androidDir = join(dirname(fileURLToPath(import.meta.url)), "..", "android");
const windows = process.platform === "win32";
const result = spawnSync(windows ? ".\\gradlew.bat" : "./gradlew", process.argv.slice(2), {
  cwd: androidDir,
  stdio: "inherit",
  shell: windows,
});
if (result.error) console.error(result.error);
process.exit(result.status ?? 1);
