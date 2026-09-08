/**
 * Creates NativeWind's CSS cache file before Metro starts, if it is missing.
 *
 * `expo export --platform web` runs two bundling passes concurrently (the
 * client bundle and the static-render pass). Both resolve
 * `react-native-css-interop/.cache/web.css`, but on a cold cache that file does
 * not exist yet — it is written by the NativeWind transformer during the run.
 * Whichever pass resolves it first can therefore hit a file that is not on disk
 * yet and the whole export dies with:
 *
 *   Error: Failed to get the SHA-1 for: .../react-native-css-interop/.cache/web.css
 *
 * A warm cache hides this, so it reproduces on CI and on Vercel — which
 * installs from scratch and therefore builds cold on every single deploy —
 * while passing locally on any machine that has built before.
 *
 * Creating the file up front gives Metro something to hash; the transformer
 * then writes the real stylesheet into it during the build, so the generated
 * Tailwind utilities are unaffected. Opened in append mode so an existing,
 * already-populated cache is never truncated.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let cacheDir;
try {
  const pkg = require.resolve("react-native-css-interop/package.json");
  cacheDir = path.join(path.dirname(pkg), ".cache");
} catch {
  // NativeWind isn't installed (or was removed) — nothing to warm.
  process.exit(0);
}

fs.mkdirSync(cacheDir, { recursive: true });

const cacheFile = path.join(cacheDir, "web.css");
if (fs.existsSync(cacheFile)) {
  console.log(`[nativewind-cache] already present: ${cacheFile}`);
} else {
  fs.closeSync(fs.openSync(cacheFile, "a"));
  console.log(`[nativewind-cache] created placeholder: ${cacheFile}`);
}
