/**
 * 解析 Music_Free myPlugins.json，输出目录快照条目（不含写入文件）。
 *
 * @author dmusic-test
 */

const { deriveStableIdFromPluginUrl } = require("./derive-stable-id.cjs");

/**
 * @typedef {{ stableId: string, name: string, version: string, sourceUrl: string, adapterId: string, adapterStatus: 'pending'|'ready', enabled: boolean }} PluginCatalogEntry
 */

/**
 * @param {unknown} parsed
 * @returns {{ catalogVersion: number, entries: PluginCatalogEntry[] }}
 */
function buildSnapshotFromParsedMyPlugins(parsed, catalogVersion = 1) {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("根对象无效");
  }
  const plugins = /** @type {{ plugins?: unknown }} */ (parsed).plugins;
  if (!Array.isArray(plugins)) {
    throw new Error("缺少 plugins 数组");
  }
  const entries = [];
  for (let i = 0; i < plugins.length; i++) {
    const p = plugins[i];
    if (!p || typeof p !== "object") {
      throw new Error(`plugins[${i}] 无效`);
    }
    const name = /** @type {{ name?: unknown }} */ (p).name;
    const url = /** @type {{ url?: unknown }} */ (p).url;
    const version = /** @type {{ version?: unknown }} */ (p).version;
    if (typeof name !== "string" || !name.trim()) {
      throw new Error(`plugins[${i}].name 必填`);
    }
    if (typeof url !== "string" || !url.trim()) {
      throw new Error(`plugins[${i}].url 必填`);
    }
    if (typeof version !== "string" || !version.trim()) {
      throw new Error(`plugins[${i}].version 必填`);
    }
    const stableId = deriveStableIdFromPluginUrl(url);
    entries.push({
      stableId,
      name: name.trim(),
      version: version.trim(),
      sourceUrl: url.trim(),
      adapterId: stableId,
      adapterStatus: "pending",
      enabled: true,
    });
  }
  return { catalogVersion, entries };
}

/**
 * @param {string} jsonText
 */
function parseMyPluginsJsonString(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(`JSON 解析失败: ${/** @type {Error} */ (e).message}`);
  }
  return buildSnapshotFromParsedMyPlugins(parsed);
}

module.exports = { buildSnapshotFromParsedMyPlugins, parseMyPluginsJsonString };
