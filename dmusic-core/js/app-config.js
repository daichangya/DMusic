/**
 * dmusic 全局配置（单文件维护，修改后请在 chrome://extensions 重新加载扩展）。
 * 在 player.html 中须早于 music-sources.js 及通过 `import()` 加载的用户源模块（如网易云）加载。
 *
 * @author listen1, dmusic
 */
(function dmusicAppConfig(global) {
  'use strict';

  /**
   * 各数据源搜索接口单次返回的最大条数（会经 clamp 落到 1–100）。
   * @type {{ searchPageSize: number }}
   */
  global.DMUSIC_CONFIG = Object.seal({
    searchPageSize: 10,
  });

  /**
   * @returns {number}
   */
  function getSearchPageSize() {
    const raw = global.DMUSIC_CONFIG && global.DMUSIC_CONFIG.searchPageSize;
    let n = typeof raw === 'number' ? raw : Number(raw);
    n = Math.floor(n);
    if (!Number.isFinite(n) || n < 1) return 1;
    if (n > 100) return 100;
    return n;
  }

  global.DMUSIC_DEMO_getSearchPageSize = getSearchPageSize;
})(typeof window !== 'undefined' ? window : globalThis);
