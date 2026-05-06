/**
 * 从内置 myPlugins.json 生成 assets/plugin-catalog.snapshot.json。
 * 可通过环境变量 DMUSIC_MY_PLUGINS_JSON 覆盖源文件路径（便于 monorepo 根调试）。
 *
 * @author dmusic-test
 */

const fs = require("fs");
const path = require("path");
const { parseMyPluginsJsonString } = require("./parse-my-plugins.cjs");

const coreRoot = path.join(__dirname, "..");
const defaultSource = path.join(coreRoot, "assets", "sources", "myPlugins.json");
const sourcePath = process.env.DMUSIC_MY_PLUGINS_JSON || defaultSource;
const outPath = path.join(coreRoot, "assets", "plugin-catalog.snapshot.json");

const raw = fs.readFileSync(sourcePath, "utf8");
const { catalogVersion, entries } = parseMyPluginsJsonString(raw);

const snapshot = {
  catalogVersion,
  generatedAt: new Date().toISOString(),
  source: path.basename(sourcePath),
  entries,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log("generate-catalog-snapshot:", outPath, `(${entries.length} entries)`);
