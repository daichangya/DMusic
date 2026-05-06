/**
 * 将 dmusic-core 静态资源与扩展壳文件写入 dist/。
 *
 * @author dmusic-test
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const chromeRoot = path.join(__dirname, "..");
const coreRoot = path.join(chromeRoot, "..", "dmusic-core");
const distDir = path.join(chromeRoot, "dist");

function rmrf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(srcDir, destDir, { skip } = { skip: new Set() }) {
  if (!fs.existsSync(srcDir)) {
    throw new Error(`源目录不存在: ${srcDir}`);
  }
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (skip.has(name.name)) continue;
    const s = path.join(srcDir, name.name);
    const d = path.join(destDir, name.name);
    if (name.isDirectory()) {
      copyDir(s, d, { skip });
    } else {
      copyFile(s, d);
    }
  }
}

rmrf(distDir);
fs.mkdirSync(distDir, { recursive: true });

const genSnap = spawnSync(process.execPath, [path.join(coreRoot, "scripts", "generate-catalog-snapshot.cjs")], {
  stdio: "inherit",
  cwd: coreRoot,
  env: process.env,
});
if (genSnap.status !== 0) {
  throw new Error("generate-catalog-snapshot 失败");
}

copyFile(path.join(chromeRoot, "manifest.json"), path.join(distDir, "manifest.json"));
copyFile(path.join(chromeRoot, "background.js"), path.join(distDir, "background.js"));

const coreSkip = new Set(["package.json", "node_modules", "scripts", "test"]);
copyDir(coreRoot, distDir, { skip: coreSkip });

// 供 service worker importScripts：与 scripts/merge-catalog.cjs 逻辑同源（toString 注入）
const { mergeSnapshotWithOverlay } = require(path.join(coreRoot, "scripts", "merge-catalog.cjs"));
const mergeRuntimePath = path.join(distDir, "js", "plugin-catalog", "merge-runtime.js");
fs.mkdirSync(path.dirname(mergeRuntimePath), { recursive: true });
const mergeRuntimeBody = `(function(){self.dmusicMergeSnapshotWithOverlay=${mergeSnapshotWithOverlay.toString()};})();`;
fs.writeFileSync(mergeRuntimePath, mergeRuntimeBody, "utf8");

console.log("build.cjs: 已生成", distDir);
