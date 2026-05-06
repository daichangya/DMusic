/**
 * @author dmusic-test
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { deriveStableIdFromPluginUrl } = require("../scripts/derive-stable-id.cjs");
const { parseMyPluginsJsonString, buildSnapshotFromParsedMyPlugins } = require("../scripts/parse-my-plugins.cjs");

test("deriveStableIdFromPluginUrl: xiaoqiu.js", () => {
  assert.equal(
    deriveStableIdFromPluginUrl("https://fastly.jsdelivr.net/gh/Huibq/keep-alive/Music_Free/xiaoqiu.js"),
    "musicfree:xiaoqiu",
  );
});

test("parseMyPluginsJsonString: 合法清单", () => {
  const snap = parseMyPluginsJsonString(
    JSON.stringify({
      plugins: [{ name: "A", url: "https://x/y/foo.js", version: "1.0.0" }],
    }),
  );
  assert.equal(snap.entries.length, 1);
  assert.equal(snap.entries[0].stableId, "musicfree:foo");
  assert.equal(snap.entries[0].adapterStatus, "pending");
});

test("parseMyPluginsJsonString: 非法 JSON", () => {
  assert.throws(() => parseMyPluginsJsonString("{"), /JSON 解析失败/);
});

test("buildSnapshotFromParsedMyPlugins: 缺少 plugins", () => {
  assert.throws(() => buildSnapshotFromParsedMyPlugins({}), /缺少 plugins 数组/);
});
