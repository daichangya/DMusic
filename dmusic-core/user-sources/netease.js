/**
 * dmusic — 网易云用户数据源（ES 模块）
 *
 * 内含 PC 搜索 + eapi 播放解析，与上游 Listen1 逻辑对齐；对外仅 `export default` 为 `MusicSource` 工厂。
 * 依赖：全局 `forge`（须先加载 `vendor/forge_listen1_fork.min.js`）、`chrome.cookies`；`DMUSIC_DEMO_getSearchPageSize`（`app-config.js`）。
 *
 * @author listen1, dmusic
 */
/* global forge, chrome, DMUSIC_DEMO_getSearchPageSize */

/**
 * Electron（dmusic-desktop）下 `window.chrome` 可能无 cookies；preload 提供 `__DMUSIC_CHROME_SHIM__`。
 * @returns {{ get: Function; set: Function } | null}
 */
function dmusicCookiesApi() {
  if (typeof chrome !== 'undefined' && chrome.cookies) {
    return chrome.cookies;
  }
  const s = globalThis.__DMUSIC_CHROME_SHIM__;
  return s && s.cookies ? s.cookies : null;
}

/** @returns {{ lastError?: { message: string } } | undefined} */
function dmusicRuntimeApi() {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    return chrome.runtime;
  }
  const s = globalThis.__DMUSIC_CHROME_SHIM__;
  return s && s.runtime ? s.runtime : undefined;
}

/** 用于 cookie API 的完整 URL（需带路径），与 fetch 用的 origin 区分 */
const MUSIC_COOKIE_URL = 'https://music.163.com/';
const MUSIC_ORIGIN = 'https://music.163.com';
const INTERFACE3_COOKIE_URL = 'https://interface3.music.163.com/';

function cookieExpireSeconds() {
  return Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600;
}

function createSecretKey(size) {
  const choice = '012345679abcdef'.split('');
  const result = [];
  for (let i = 0; i < size; i += 1) {
    result.push(choice[Math.floor(Math.random() * choice.length)]);
  }
  return result.join('');
}

function aesEncrypt(text, secKey, algo) {
  const cipher = forge.cipher.createCipher(algo, secKey);
  cipher.start({ iv: '0102030405060708' });
  cipher.update(forge.util.createBuffer(text));
  cipher.finish();
  return cipher.output;
}

/**
 * @param {string} url eapi 路径，如 /api/song/enhance/player/url
 * @param {object} object 请求体对象
 */
function eapi(url, object) {
  const eapiKey = 'e82ckenh8dichen8';
  const text = typeof object === 'object' ? JSON.stringify(object) : object;
  const message = `nobody${url}use${text}md5forencrypt`;
  const digest = forge.md5
    .create()
    .update(forge.util.encodeUtf8(message))
    .digest()
    .toHex();
  const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;
  return {
    params: aesEncrypt(data, eapiKey, 'AES-ECB').toHex().toUpperCase(),
  };
}

function cookieGet(details) {
  return new Promise((resolve) => {
    const api = dmusicCookiesApi();
    if (!api) {
      resolve(null);
      return;
    }
    api.get(details, (c) => {
      const rt = dmusicRuntimeApi();
      if (rt && rt.lastError) {
        resolve(null);
        return;
      }
      resolve(c);
    });
  });
}

function cookieSet(details) {
  return new Promise((resolve, reject) => {
    const api = dmusicCookiesApi();
    if (!api) {
      reject(new Error('chrome.cookies 不可用'));
      return;
    }
    api.set(details, () => {
      const rt = dmusicRuntimeApi();
      if (rt && rt.lastError) {
        reject(new Error(rt.lastError.message));
        return;
      }
      resolve(undefined);
    });
  });
}

/**
 * 与主工程 netease.ne_ensure_cookie 一致：缺少访客 Cookie 时写入 music.163.com。
 * @returns {Promise<void>}
 */
async function ensureNeteaseCookies() {
  const expire = cookieExpireSeconds();
  const nuidName = '_ntes_nuid';
  const nnidName = '_ntes_nnid3';
  const nmtidName = 'NMTID';
  const nuidValue = createSecretKey(32);
  const nnidValue = `${nuidValue},${Date.now()}`;
  const nmtidValue = '0';

  const checks = await Promise.all([
    cookieGet({ url: MUSIC_COOKIE_URL, name: nuidName }),
    cookieGet({ url: MUSIC_COOKIE_URL, name: nnidName }),
    cookieGet({ url: MUSIC_COOKIE_URL, name: nmtidName }),
  ]);
  if (checks.every(Boolean)) {
    return;
  }
  const base = {
    url: MUSIC_COOKIE_URL,
    path: '/',
    secure: true,
    sameSite: 'no_restriction',
    expirationDate: expire,
  };
  await Promise.all([
    cookieSet({ ...base, name: nuidName, value: nuidValue }),
    cookieSet({ ...base, name: nnidName, value: nnidValue }),
    cookieSet({ ...base, name: nmtidName, value: nmtidValue }),
  ]);
}

function isPlayable(song) {
  return song.fee !== 4 && song.fee !== 1;
}

/**
 * @param {string} keyword
 * @param {number} limit
 * @returns {Promise<object[]>} 统一曲目结构（供 MusicSource.search 映射）
 */
async function searchSongs(keyword, limit) {
  await ensureNeteaseCookies();
  const body = new URLSearchParams({
    s: keyword,
    offset: '0',
    limit: String(limit),
    type: '1',
  });
  const res = await fetch(`${MUSIC_ORIGIN}/api/search/pc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Referer: `${MUSIC_ORIGIN}/`,
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`网易云搜索 HTTP ${res.status}`);
  }
  const data = await res.json();
  const songs = (data && data.result && data.result.songs) || [];
  return songs.map((songInfo) => ({
    source: 'netease',
    neSongId: songInfo.id,
    title: songInfo.name || '（无标题）',
    artist: (songInfo.artists && songInfo.artists[0] && songInfo.artists[0].name) || '',
    album: (songInfo.album && songInfo.album.name) || '',
    img: (songInfo.album && songInfo.album.picUrl) || '',
    playable: isPlayable(songInfo),
  }));
}

/**
 * @param {number|string} songId
 * @returns {Promise<string|null>}
 */
async function getSongPlayUrl(songId) {
  await cookieSet({
    url: INTERFACE3_COOKIE_URL,
    path: '/',
    name: 'os',
    value: 'pc',
    secure: true,
    sameSite: 'no_restriction',
    expirationDate: cookieExpireSeconds(),
  });

  const eapiUrl = '/api/song/enhance/player/url';
  const payload = eapi(eapiUrl, { ids: `[${songId}]`, br: 999000 });
  const res = await fetch('https://interface3.music.163.com/eapi/song/enhance/player/url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Referer: `${MUSIC_ORIGIN}/`,
    },
    body: new URLSearchParams(payload),
  });
  if (!res.ok) {
    throw new Error(`网易云播放接口 HTTP ${res.status}`);
  }
  const json = await res.json();
  const row = json && json.data && json.data[0];
  return row && row.url ? row.url : null;
}

/**
 * @param {unknown} _deps `getPluginDeps()`（本模块未使用，保留契约）
 */
export default function createNeteaseSource(_deps) {
  if (typeof forge === 'undefined') {
    throw new Error('forge 未加载：请在 player.html 中先于本模块引入 vendor/forge_listen1_fork.min.js');
  }
  if (!dmusicCookiesApi()) {
    throw new Error(
      'chrome.cookies 不可用：请在扩展页中打开并声明 cookies 权限，或使用 dmusic-desktop'
    );
  }

  function searchPageSize() {
    if (typeof globalThis.DMUSIC_DEMO_getSearchPageSize === 'function') {
      return globalThis.DMUSIC_DEMO_getSearchPageSize();
    }
    return 10;
  }

  /**
   * @param {{ _native?: { neSongId?: number } }} track
   */
  function assertNeteaseNative(track) {
    const id = track._native && track._native.neSongId;
    if (id == null) {
      throw new Error('网易云曲目缺少 neSongId');
    }
    return id;
  }

  return {
    providerId: 'netease',

    /** @param {string} keyword */
    async search(keyword) {
      const rows = await searchSongs(keyword, searchPageSize());
      return rows.map((row) => ({
        providerId: 'netease',
        id: `ne:${row.neSongId}`,
        title: row.title,
        artist: row.artist,
        album: row.album,
        img: row.img,
        playable: row.playable,
        subtitleNote: row.playable ? '' : '无版权/试听',
        _native: { neSongId: row.neSongId },
      }));
    },

    /**
     * @param {unknown[]} tracks
     * @returns {string}
     */
    summarizeSearch(tracks) {
      let playableCount = 0;
      tracks.forEach((x) => {
        if (x && /** @type {{ playable?: boolean }} */ (x).playable) playableCount += 1;
      });
      return `共 ${tracks.length} 条，其中 ${playableCount} 条可尝试播放。`;
    },

    /**
     * @param {unknown[]} _tracks
     * @returns {boolean}
     */
    isSearchSummaryError(_tracks) {
      return false;
    },

    /** @param {{ playable?: boolean }} track */
    canAttemptPlay(track) {
      return Boolean(track && track.playable);
    },

    /** @param {unknown} _track */
    reasonBlocked(_track) {
      return '该曲在网易云无播放权限（版权限制）。';
    },

    /** @param {unknown} _track */
    beforeResolveUrl(_track) {
      return '正在获取网易云播放地址…';
    },

    /** @param {{ _native?: { neSongId?: number } }} track */
    async resolveMediaUrl(track) {
      const songId = assertNeteaseNative(track);
      return getSongPlayUrl(songId);
    },

    /** @param {unknown} _track */
    nowPlayingLabel(_track) {
      return '网易云';
    },
  };
}
