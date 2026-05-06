/**
 * 从 Music_Free 插件脚本 URL 派生稳定目录主键 stableId（及默认 adapterId）。
 *
 * @author dmusic-test
 */

/**
 * @param {string} pluginUrl
 * @returns {string} 形如 musicfree:xiaoqiu
 */
function deriveStableIdFromPluginUrl(pluginUrl) {
  if (typeof pluginUrl !== "string" || !pluginUrl.trim()) {
    throw new Error("pluginUrl 必须为非空字符串");
  }
  let pathname;
  try {
    pathname = new URL(pluginUrl).pathname;
  } catch {
    throw new Error(`非法 URL: ${pluginUrl}`);
  }
  const base = pathname.split("/").filter(Boolean).pop();
  if (!base) {
    throw new Error(`无法从 URL 解析文件名: ${pluginUrl}`);
  }
  const slug = base.endsWith(".js") ? base.slice(0, -3) : base.replace(/\.[^/.]+$/, "");
  if (!slug) {
    throw new Error(`脚本名称为空: ${pluginUrl}`);
  }
  return `musicfree:${slug}`;
}

module.exports = { deriveStableIdFromPluginUrl };
