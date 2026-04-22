/**
 * dmusic — Bilibili 视频用户数据源（ES 模块，MVP）
 *
 * 逻辑对齐上游 Listen1 `js/provider/bilibili.js` 中 **视频搜索** + **`bitrack_v_*` 播放**（Dash 音频）：
 * - 搜索：`GET https://api.bilibili.com/x/web-interface/search/type`（`search_type=video`），请求前写入 `buvid3` Cookie（与主工程 `cookieSet` 语义一致）。
 * - 播放：`view?bvid=` 取 `cid`（多 P 时可用 `_native.cid` 覆盖首 P），再请求 `playurl`（优先 `https://api.bilibili.com/x/player/playurl`，失败则回退 `http://api.bilibili.com/...`，与主工程 HTTP 差异见文档），取 `data.dash.audio[0].baseUrl`。
 *
 * 未实现：WBI、歌单、音频区 `bitrack_`（au）等，避免首版过大。
 *
 * @author listen1, dmusic
 */
/* global chrome, DMUSIC_DEMO_getSearchPageSize */

/**
 * 与 netease.js 一致：扩展用 `chrome.cookies`，Electron 用 `__DMUSIC_CHROME_SHIM__.cookies`。
 * @returns {{ set: Function } | null}
 */
function dmusicCookiesApi() {
  if (typeof chrome !== 'undefined' && chrome.cookies) {
    return chrome.cookies;
  }
  const s = globalThis.__DMUSIC_CHROME_SHIM__;
  return s && s.cookies ? s.cookies : null;
}

/**
 * @param {{ fetch: typeof fetch, log: (...args: unknown[]) => void }} deps
 */
export default function createBilibiliUserSource(deps) {
  const { fetch, log } = deps;

  function searchPageSize() {
    if (typeof globalThis.DMUSIC_DEMO_getSearchPageSize === 'function') {
      return globalThis.DMUSIC_DEMO_getSearchPageSize();
    }
    return 10;
  }

  /** B 站搜索接口单页上限常用 42，与主工程一致并 clamp 全局配置。 */
  function bilibiliPageSize() {
    return Math.min(42, Math.max(1, searchPageSize()));
  }

  /**
   * @param {string} value
   */
  function htmlDecode(value) {
    const parser = new DOMParser();
    return parser.parseFromString(String(value || ''), 'text/html').body.textContent || '';
  }

  /** 与浏览器访问 B 站一致，降低 api 域 412 / CORS 概率 */
  const BILIBILI_FETCH_INIT = {
    credentials: 'include',
    headers: {
      Referer: 'https://www.bilibili.com/',
    },
  };

  /**
   * 主工程对 api.bilibili.com 写 buvid3；部分扩展环境对 api 域 cookie 报「无 host 权限」。
   * 优先在 www 域写入 `domain: .bilibili.com`，使 api 请求也携带；失败再回退仅 api 域。
   * @returns {Promise<void>}
   */
  async function ensureBuvid3() {
    const cookiesApi = dmusicCookiesApi();
    if (!cookiesApi || !cookiesApi.set) {
      return;
    }
    const expire = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600;
    const base = {
      name: 'buvid3',
      value: '0',
      path: '/',
      secure: true,
      sameSite: 'no_restriction',
      expirationDate: expire,
    };
    const attempts = [
      {
        url: 'https://www.bilibili.com/',
        domain: '.bilibili.com',
        ...base,
      },
      {
        url: 'https://api.bilibili.com/',
        ...base,
      },
    ];

    function runtimeForLastError() {
      return typeof chrome !== 'undefined' && chrome.runtime
        ? chrome.runtime
        : globalThis.__DMUSIC_CHROME_SHIM__ &&
            globalThis.__DMUSIC_CHROME_SHIM__.runtime;
    }

    for (let i = 0; i < attempts.length; i += 1) {
      const details = attempts[i];
      try {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve, reject) => {
          cookiesApi.set(details, () => {
            const rt = runtimeForLastError();
            if (rt && rt.lastError) {
              reject(new Error(rt.lastError.message));
              return;
            }
            resolve();
          });
        });
        return;
      } catch (e) {
        log('buvid3 cookie', details.url, e);
      }
    }
  }

  /**
   * @param {Record<string, unknown>} song_info
   */
  function biConvertSong2(song_info) {
    let imgUrl = String(song_info.pic || '');
    if (imgUrl.startsWith('//')) {
      imgUrl = `https:${imgUrl}`;
    }
    const bvid = String(song_info.bvid || '');
    return {
      bvid,
      title: htmlDecode(song_info.title),
      artist: htmlDecode(song_info.author),
      img: imgUrl,
    };
  }

  const SEARCH_URL = (keyword, page) => {
    const ps = bilibiliPageSize();
    return `https://api.bilibili.com/x/web-interface/search/type?__refresh__=true&_extra=&context=&page=${page}&page_size=${ps}&platform=pc&highlight=1&single_column=0&keyword=${encodeURIComponent(
      keyword
    )}&category_id=&search_type=video&dynamic_offset=0&preload=true&com2co=true`;
  };

  /**
   * @param {string} bvid
   * @param {number | undefined} cidHint
   * @returns {Promise<string | null>}
   */
  async function resolvePlayUrlFromBvid(bvid, cidHint) {
    if (!bvid) return null;
    const viewRes = await fetch(
      `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`,
      BILIBILI_FETCH_INIT
    );
    if (!viewRes.ok) {
      log('bilibili view HTTP', viewRes.status);
      return null;
    }
    const viewJson = await viewRes.json();
    const pages = viewJson?.data?.pages;
    let cid =
      typeof cidHint === 'number' && Number.isFinite(cidHint)
        ? cidHint
        : undefined;
    if (cid == null && Array.isArray(pages) && pages[0] && pages[0].cid != null) {
      cid = Number(pages[0].cid);
    }
    if (cid == null || !Number.isFinite(cid)) {
      log('bilibili 无有效 cid', bvid);
      return null;
    }

    const playQuery = `fnval=16&bvid=${encodeURIComponent(bvid)}&cid=${encodeURIComponent(String(cid))}`;
    let playRes = await fetch(
      `https://api.bilibili.com/x/player/playurl?${playQuery}`,
      BILIBILI_FETCH_INIT
    );
    if (!playRes.ok) {
      log('bilibili playurl https HTTP', playRes.status, '尝试 http');
      playRes = await fetch(`http://api.bilibili.com/x/player/playurl?${playQuery}`, {
        ...BILIBILI_FETCH_INIT,
      });
    }
    if (!playRes.ok) {
      log('bilibili playurl HTTP', playRes.status);
      return null;
    }
    const playJson = await playRes.json();
    const audioArr = playJson?.data?.dash?.audio;
    if (!Array.isArray(audioArr) || audioArr.length === 0 || !audioArr[0].baseUrl) {
      log('bilibili 无 dash 音频', playJson?.code);
      return null;
    }
    return String(audioArr[0].baseUrl);
  }

  return {
    providerId: 'bilibili',

    /** @param {string} keyword */
    async search(keyword) {
      const q = String(keyword || '').trim();
      if (!q) return [];

      try {
        await ensureBuvid3();
      } catch (e) {
        log('buvid3 cookie', e);
      }

      const res = await fetch(SEARCH_URL(q, 1), BILIBILI_FETCH_INIT);
      if (!res.ok) {
        throw new Error(`Bilibili 搜索 HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.code !== 0) {
        log('bilibili search code', data.code, data.message);
        return [];
      }
      const rawList = data?.data?.result;
      if (!Array.isArray(rawList)) {
        log('bilibili 无 result 数组', data);
        return [];
      }

      return rawList.map((raw) => {
        const row = biConvertSong2(/** @type {Record<string, unknown>} */ (raw));
        const { bvid, title, artist, img } = row;
        return {
          providerId: 'bilibili',
          id: `bilibili:${bvid}`,
          title: title || '（无标题）',
          artist: artist || '未知',
          album: '',
          img,
          playable: Boolean(bvid),
          subtitleNote: '',
          _native: { bvid },
        };
      });
    },

    /** @param {unknown[]} tracks */
    summarizeSearch(tracks) {
      return `Bilibili 视频共 ${tracks.length} 条（有 bvid 即可尝试解析 Dash 音频；无 Dash 时播放会失败）。`;
    },

    /** @param {unknown[]} tracks */
    isSearchSummaryError(tracks) {
      const list = /** @type {{ playable?: boolean }[]} */ (tracks);
      return list.length > 0 && !list.some((t) => t && t.playable);
    },

    /** @param {{ playable?: boolean; _native?: { bvid?: string } }} track */
    canAttemptPlay(track) {
      return Boolean(
        track &&
          track.playable &&
          track._native &&
          typeof track._native.bvid === 'string' &&
          track._native.bvid
      );
    },

    /** @param {unknown} _track */
    reasonBlocked(_track) {
      return '该稿件无法解析出可播放音频（可能无 Dash 音视频流或缺少 bvid）。';
    },

    /** @param {unknown} _track */
    beforeResolveUrl(_track) {
      return '正在解析 Bilibili 播放地址…';
    },

    /** @param {{ _native?: { bvid?: string; cid?: number } }} track */
    async resolveMediaUrl(track) {
      const bvid = track._native && track._native.bvid;
      if (!bvid) return null;
      const cidHint = track._native.cid;
      try {
        return await resolvePlayUrlFromBvid(bvid, cidHint);
      } catch (e) {
        log('resolveMediaUrl', e);
        return null;
      }
    },

    /** @param {unknown} _track */
    nowPlayingLabel(_track) {
      return 'Bilibili';
    },
  };
}
