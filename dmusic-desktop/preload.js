/**
 * dmusic-desktop — Preload：向页面注入最小 `chrome` 兼容层
 *
 * - `chrome.runtime.getURL`：解析为同级 `dmusic-core/` 下文件的 `file:` URL，供动态 `import()`。
 * - `chrome.cookies.get` / `set`：经 IPC 由主进程 `session.defaultSession.cookies` 执行（preload 无 `session`）。
 *
 * @author dmusic-desktop
 */
const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const dmusicRoot = path.resolve(__dirname, '..', 'dmusic-core');

/** @type {{ message: string } | undefined} */
let runtimeLastError;

/**
 * @param {string} relativePath
 */
function getURL(relativePath) {
  const rel = String(relativePath || '').replace(/^[/\\]+/, '');
  const abs = path.join(dmusicRoot, rel);
  return pathToFileURL(abs).href;
}

const chromeShim = {
  runtime: {
    get lastError() {
      return runtimeLastError;
    },
    getURL,
  },
  cookies: {
    /**
     * @param {{ url?: string; name?: string }} details
     * @param {(cookie: Electron.Cookie | null) => void} callback
     */
    get(details, callback) {
      if (typeof callback !== 'function') return;
      const url = details && details.url != null ? String(details.url) : '';
      const name = details && details.name != null ? String(details.name) : '';
      ipcRenderer
        .invoke('dmusic-cookies-get', { url, name })
        .then((cookie) => {
          runtimeLastError = undefined;
          callback(cookie || null);
          queueMicrotask(() => {
            runtimeLastError = undefined;
          });
        })
        .catch((err) => {
          runtimeLastError = { message: String(err && err.message ? err.message : err) };
          callback(null);
          queueMicrotask(() => {
            runtimeLastError = undefined;
          });
        });
    },
    /**
     * @param {Record<string, unknown>} details
     * @param {() => void} callback
     */
    set(details, callback) {
      if (typeof callback !== 'function') return;
      ipcRenderer
        .invoke('dmusic-cookies-set', details)
        .then(() => {
          runtimeLastError = undefined;
          callback();
          queueMicrotask(() => {
            runtimeLastError = undefined;
          });
        })
        .catch((err) => {
          runtimeLastError = { message: String(err && err.message ? err.message : err) };
          callback();
          queueMicrotask(() => {
            runtimeLastError = undefined;
          });
        });
    },
  },
};

/**
 * 仅暴露 `__DMUSIC_CHROME_SHIM__`，避免与 Chromium 预置的只读 `window.chrome` 冲突；
 * 页面侧由 `electron-chrome-bridge.js` 在可行时将 shim 赋给 `window.chrome`。
 */
contextBridge.exposeInMainWorld('__DMUSIC_CHROME_SHIM__', chromeShim);
