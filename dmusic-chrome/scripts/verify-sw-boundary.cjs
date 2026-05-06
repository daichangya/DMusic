/**
 * 断言 service worker 源码不直连音乐 API（OpenSpec：Background 不直连音乐 API）。
 * 仅扫描 dmusic-chrome/background.js，不含 importScripts 拉取的运行时文件。
 *
 * @author dmusic-test
 */

const fs = require("fs");
const path = require("path");

const bgPath = path.join(__dirname, "..", "background.js");
const src = fs.readFileSync(bgPath, "utf8");

/** 若出现在 background.js 中，表示搜/播逻辑可能泄漏进 SW */
const FORBIDDEN = [
  "y.qq.com",
  "qq.com/cgi-bin/musicu",
  "lxmusicapi",
  "musicu.fcg",
  "gtimg.cn",
  "c.y.qq.com",
  "i.y.qq.com",
];

for (const frag of FORBIDDEN) {
  if (src.includes(frag)) {
    console.error("verify-sw-boundary: 禁止在 background.js 中出现片段:", frag);
    process.exit(1);
  }
}

console.log("verify-sw-boundary: OK（background.js 未发现音乐 API 直连片段）");
