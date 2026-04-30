/**
 * 无头校验 dist/manifest.json（OpenSpec：chrome-music-extension / CI 场景）。
 *
 * @author dmusic-test
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(__dirname, "..", "dist", "manifest.json");

function fail(msg) {
  console.error("verify-manifest:", msg);
  process.exit(1);
}

if (!fs.existsSync(manifestPath)) {
  fail(`缺少 ${manifestPath}，请先 npm run build`);
}

const raw = fs.readFileSync(manifestPath, "utf8");
let m;
try {
  m = JSON.parse(raw);
} catch (e) {
  fail(`manifest.json 非合法 JSON: ${e.message}`);
}

if (m.manifest_version !== 3) {
  fail(`manifest_version 应为 3，实际为 ${m.manifest_version}`);
}

const bg = m.background;
if (!bg || typeof bg.service_worker !== "string" || !bg.service_worker.length) {
  fail("缺少 background.service_worker（MV3）");
}

console.log("verify-manifest: OK", {
  manifest_version: m.manifest_version,
  service_worker: bg.service_worker,
});
