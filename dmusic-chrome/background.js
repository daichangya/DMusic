/**
 * MV3 service worker：目录 overlay（storage）+ 合并快照；消息供播放器页拉取。
 *
 * @author dmusic-test
 */

importScripts("js/plugin-catalog/merge-runtime.js");

const STORAGE_OVERLAY_KEY = "dmusic.catalog.overlay";

chrome.runtime.onInstalled.addListener(() => {
  // 预留：安装引导
});

chrome.action.onClicked.addListener(() => {
  const url = chrome.runtime.getURL("player.html");
  chrome.tabs.create({ url });
});

async function loadBaseSnapshot() {
  const url = chrome.runtime.getURL("assets/plugin-catalog.snapshot.json");
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`snapshot HTTP ${res.status}`);
  }
  return res.json();
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "GET_MERGED_CATALOG") {
    (async () => {
      try {
        const base = await loadBaseSnapshot();
        const raw = await chrome.storage.local.get(STORAGE_OVERLAY_KEY);
        const overlay = raw[STORAGE_OVERLAY_KEY] || { byStableId: {} };
        const merged = self.dmusicMergeSnapshotWithOverlay(base, overlay);
        sendResponse({ ok: true, catalog: merged });
      } catch (e) {
        sendResponse({ ok: false, error: String(/** @type {Error} */ (e).message || e) });
      }
    })();
    return true;
  }

  if (msg?.type === "SET_ENTRY_ENABLED") {
    const { stableId, enabled } = msg;
    if (typeof stableId !== "string" || typeof enabled !== "boolean") {
      sendResponse({ ok: false, error: "需要 stableId(string) 与 enabled(boolean)" });
      return false;
    }
    (async () => {
      try {
        const raw = await chrome.storage.local.get(STORAGE_OVERLAY_KEY);
        const cur = raw[STORAGE_OVERLAY_KEY] || { byStableId: {} };
        const byStableId = { ...(cur.byStableId || {}) };
        byStableId[stableId] = { ...(byStableId[stableId] || {}), enabled };
        await chrome.storage.local.set({ [STORAGE_OVERLAY_KEY]: { byStableId } });
        const base = await loadBaseSnapshot();
        const merged = self.dmusicMergeSnapshotWithOverlay(base, { byStableId });
        sendResponse({ ok: true, catalog: merged });
      } catch (e) {
        sendResponse({ ok: false, error: String(/** @type {Error} */ (e).message || e) });
      }
    })();
    return true;
  }

  return undefined;
});
