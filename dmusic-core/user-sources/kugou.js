/**
 * dmusic — 酷狗音乐用户数据源（ES 模块）
 *
 * 逻辑对齐上游 Listen1 `js/provider/kugou.js`（https://github.com/listen1/listen1_chrome_extension/blob/main/js/provider/kugou.js）：
 * - 搜索：`https://songsearch.kugou.com/song_search_v2`
 * - 封面 + 是否可播：`https://m.kugou.com/app/i/getSongInfo.php?cmd=playInfo&hash=...`（与 `bootstrap_track` 同源）
 *   - **可播**：返回 JSON 中 `url` 为非空字符串（有直链）。
 *   - **不可播**：`url === ''` 或缺失（版权 / VIP / 区域等，与主工程 `failure` 分支一致）。
 *
 * 使用：将本文件登记到 `js/player-app.js` 的 `PACKAGED_USER_SOURCES`，重新加载扩展后，在播放器「开发者模式」下选择并「加载选中模块」。
 * 若 `fetch` 报网络错误，请确认根目录 `manifest.json` 已包含酷狗域名 `host_permissions` 并已重新加载扩展。
 * 搜索条数与内置源一致：由 `js/app-config.js` 的 `DMUSIC_DEMO_getSearchPageSize()` 提供（player.html 须先加载 app-config.js）。
 *
 * @author listen1, dmusic
 */
/* global DMUSIC_DEMO_getSearchPageSize */

/**
 * @param {{ fetch: typeof fetch, log: (...args: unknown[]) => void }} deps
 */
export default function createKugouUserSource(deps) {
  const { fetch, log } = deps;

  function searchPageSize() {
    if (typeof globalThis.DMUSIC_DEMO_getSearchPageSize === 'function') {
      return globalThis.DMUSIC_DEMO_getSearchPageSize();
    }
    return 10;
  }

  const SEARCH_URL = (keyword, page) =>
    `https://songsearch.kugou.com/song_search_v2?keyword=${encodeURIComponent(
      keyword
    )}&page=${page}&pagesize=${searchPageSize()}&platform=WebFilter`;

  const PLAY_INFO_URL = (fileHash) =>
    `https://m.kugou.com/app/i/getSongInfo.php?cmd=playInfo&hash=${encodeURIComponent(
      fileHash
    )}`;

  /**
   * 与主工程 `bootstrap_track` / `kg_render_album_result_item` 一致：用 playInfo 判断是否有播放 URL，并用 `imgUrl` 作封面。
   * @param {string} fileHash
   * @returns {Promise<{ playable: boolean, img: string }>}
   */
  async function fetchPlayInfoMeta(fileHash) {
    if (!fileHash) {
      return { playable: false, img: '' };
    }
    try {
      const res = await fetch(PLAY_INFO_URL(fileHash));
      if (!res.ok) {
        log('playInfo HTTP', fileHash.slice(0, 8), res.status);
        return { playable: false, img: '' };
      }
      const info = await res.json();
      const url = typeof info.url === 'string' ? info.url : '';
      const playable = url.length > 0;

      let img = '';
      if (typeof info.imgUrl === 'string' && info.imgUrl) {
        img = info.imgUrl.replace('{size}', '400');
      } else if (typeof info.album_img === 'string' && info.album_img) {
        img = info.album_img.replace('{size}', '400');
      }

      return { playable, img };
    } catch (e) {
      log('playInfo 异常', fileHash.slice(0, 8), e);
      return { playable: false, img: '' };
    }
  }

  /**
   * 限制并发，减轻酷狗侧限流概率（仍可能因网络失败，属正常）。
   * @template T, R
   * @param {T[]} items
   * @param {number} concurrency
   * @param {(item: T, index: number) => Promise<R>} worker
   * @returns {Promise<R[]>}
   */
  async function mapPool(items, concurrency, worker) {
    const ret = /** @type {R[]} */ ([]);
    let i = 0;
    async function run() {
      while (i < items.length) {
        const idx = i;
        i += 1;
        ret[idx] = await worker(items[idx], idx);
      }
    }
    const n = Math.min(concurrency, items.length || 1);
    await Promise.all(Array.from({ length: n }, () => run()));
    return ret;
  }

  /**
   * @param {Record<string, unknown>} song
   */
  function pickFileHash(song) {
    const h = song.FileHash || song.fileHash || song.Hash || song.hash;
    return typeof h === 'string' ? h : '';
  }

  /**
   * @param {Record<string, unknown>} song
   */
  function pickArtist(song) {
    let name = song.SingerName;
    if (Array.isArray(name)) {
      name = name[0];
    }
    if (typeof name === 'string' && name.includes('、')) {
      name = name.split('、')[0];
    }
    return String(name || '').trim() || '未知';
  }

  return {
    providerId: 'kugou',

    /** @param {string} keyword */
    async search(keyword) {
      const q = String(keyword || '').trim();
      if (!q) return [];

      const res = await fetch(SEARCH_URL(q, 1));
      if (!res.ok) {
        throw new Error(`酷狗搜索 HTTP ${res.status}`);
      }
      const data = await res.json();
      const lists = data && data.data && data.data.lists;
      if (!Array.isArray(lists)) {
        log('search: 无 lists 字段', data);
        return [];
      }

      const bases = lists.map((raw) => {
        const song = /** @type {Record<string, unknown>} */ (raw);
        const fileHash = pickFileHash(song);
        const albumId = song.AlbumID != null ? song.AlbumID : song.album_id;
        return {
          providerId: 'kugou',
          id: `kugou:${fileHash}`,
          title: String(song.SongName || song.Songname || '（无标题）'),
          artist: pickArtist(song),
          album: String(song.AlbumName || ''),
          img: '',
          playable: false,
          subtitleNote: '',
          _native: {
            fileHash,
            albumId: albumId != null ? String(albumId) : '',
          },
        };
      });

      const enriched = await mapPool(bases, 5, async (track) => {
        const hash = track._native && track._native.fileHash;
        const { playable, img } = await fetchPlayInfoMeta(hash);
        return {
          ...track,
          img,
          playable,
          subtitleNote: playable ? '' : '无播放地址',
        };
      });

      return enriched;
    },

    /** @param {unknown[]} tracks */
    summarizeSearch(tracks) {
      const list = /** @type {{ playable?: boolean }[]} */ (tracks);
      const ok = list.filter((t) => t && t.playable).length;
      return `酷狗共 ${tracks.length} 条，其中约 ${ok} 条当前可解析出播放链接（其余多为版权/VIP 等）。`;
    },

    /** @param {unknown[]} tracks */
    isSearchSummaryError(tracks) {
      const list = /** @type {{ playable?: boolean }[]} */ (tracks);
      return list.length > 0 && !list.some((t) => t && t.playable);
    },

    /** @param {{ playable?: boolean }} track */
    canAttemptPlay(track) {
      return Boolean(track && track.playable && track._native && track._native.fileHash);
    },

    /** @param {unknown} _track */
    reasonBlocked(_track) {
      return '当前条目无可用播放地址（版权限制或未返回直链）。';
    },

    /** @param {unknown} _track */
    beforeResolveUrl(_track) {
      return '正在获取酷狗播放地址…';
    },

    /** @param {{ _native?: { fileHash?: string } }} track */
    async resolveMediaUrl(track) {
      const hash = track._native && track._native.fileHash;
      if (!hash) return null;

      const res = await fetch(PLAY_INFO_URL(hash));
      if (!res.ok) {
        log('playInfo HTTP', res.status);
        return null;
      }
      const info = await res.json();
      const url = typeof info.url === 'string' ? info.url : '';
      if (!url) {
        log('playInfo 无 url', info);
        return null;
      }
      return url;
    },

    /** @param {unknown} _track */
    nowPlayingLabel(_track) {
      return '酷狗';
    },
  };
}
