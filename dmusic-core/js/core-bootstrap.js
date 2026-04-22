/**
 * dmusic-core 宿主引导：在加载业务脚本前统一处理「纯网页 / Electron / Chrome 扩展」环境。
 * - 纯网页：注入最小 `__DMUSIC_CHROME_SHIM__`（`runtime.getURL` + `cookies: null`）。
 * - Electron：preload 已注入带 `getURL` 的 `__DMUSIC_CHROME_SHIM__` 时不再覆盖；并尝试将 shim 赋给 `window.chrome`。
 * - Chrome 扩展：已有 `chrome.runtime.getURL` 时短路。
 *
 * 合并原 `site-shim.js` 与 `electron-chrome-bridge.js` 行为。
 *
 * @author dmusic-core
 */
(function coreBootstrap() {
  var pre = globalThis.__DMUSIC_CHROME_SHIM__;
  if (
    pre &&
    pre.runtime &&
    typeof pre.runtime.getURL === 'function'
  ) {
    installElectronChromeBridge();
    return;
  }
  if (
    typeof chrome !== 'undefined' &&
    chrome.runtime &&
    typeof chrome.runtime.getURL === 'function'
  ) {
    return;
  }

  /** @type {{ message: string } | undefined} */
  var runtimeLastError;

  /**
   * @param {string} relativePath
   * @returns {string}
   */
  function getURL(relativePath) {
    var rel = String(relativePath || '').replace(/^[/\\]+/, '');
    return new URL(rel, window.location.href).href;
  }

  var shim = {
    runtime: {
      get lastError() {
        return runtimeLastError;
      },
      getURL: getURL,
    },
    cookies: null,
  };

  if (shim.cookies == null) {
    // eslint-disable-next-line no-console
    console.info(
      '[dmusic-core] chrome.cookies 不可用；依赖 Cookie 的数据源请在 Chrome 扩展（dmusic-chrome）或 dmusic-desktop 中使用。'
    );
  }

  globalThis.__DMUSIC_CHROME_SHIM__ = shim;
  installElectronChromeBridge();
})();

/**
 * Electron：将 preload 注入的 shim 挂到 `window.chrome`（若 Chromium 未提供可用的 getURL）。
 */
function installElectronChromeBridge() {
  var shim = globalThis.__DMUSIC_CHROME_SHIM__;
  if (!shim || typeof shim !== 'object') {
    return;
  }
  var hasGetURL =
    shim.runtime && typeof shim.runtime.getURL === 'function';
  if (!hasGetURL) {
    return;
  }
  var needReplace =
    typeof chrome === 'undefined' ||
    !chrome.runtime ||
    typeof chrome.runtime.getURL !== 'function';
  if (!needReplace) {
    return;
  }
  try {
    globalThis.chrome = shim;
  } catch (_e) {
    /* 若 chrome 不可写，仍保留 __DMUSIC_CHROME_SHIM__ */
  }
}
