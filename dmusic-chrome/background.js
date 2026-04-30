/**
 * MV3 service worker：打开播放器页（由 dmusic-core 同步到 dist）。
 *
 * @author dmusic-test
 */

chrome.runtime.onInstalled.addListener(() => {
  // 预留：安装后引导、目录快照注入等
});

chrome.action.onClicked.addListener(() => {
  const url = chrome.runtime.getURL("player.html");
  chrome.tabs.create({ url });
});
