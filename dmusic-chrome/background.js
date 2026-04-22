/**
 * dmusic-chrome 扩展后台：点击工具栏图标打开播放器页面。
 * @author listen1, dmusic-chrome
 */
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('player.html') });
});
