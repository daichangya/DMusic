/**
 * dmusic — QQ 音乐用户数据源（ES 模块，MVP：单曲搜索）
 *
 * 逻辑对齐上游 Listen1 `js/provider/qq.js`：
 * - 搜索：`POST https://u.y.qq.com/cgi-bin/musicu.fcg`，body 与主工程 `search` 中 `type=0`（`search_type: 0`）一致。
 * - 播放：与 `bootstrap_track` 一致，`M500` 128kbps、`vkey.GetVkeyServer` / `CgiGetVkey`，`sip[0] + purl`；`purl === ''` 视为不可播（VIP/无版权等）。
 * - **`switch` 可播位**：与主工程 `qq_is_playable` 一致；若列表项无 `switch` 字段则保守为不可播（避免误点）。
 *
 * 未实现：歌单搜索（`type=1`）等。
 *
 * @author listen1, dmusic
 */
/* global DMUSIC_DEMO_getSearchPageSize */

const MUSICU_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg';

/**
 * @param {{ fetch: typeof fetch, log: (...args: unknown[]) => void }} deps
 */
export default function createQqUserSource(deps) {
  const { fetch, log } = deps;

  function searchPageSize() {
    if (typeof globalThis.DMUSIC_DEMO_getSearchPageSize === 'function') {
      return globalThis.DMUSIC_DEMO_getSearchPageSize();
    }
    return 10;
  }

  /**
   * @param {string} value
   */
  function htmlDecode(value) {
    const parser = new DOMParser();
    return parser.parseFromString(String(value || ''), 'text/html').body.textContent || '';
  }

  /**
   * @param {string | null | undefined} qqimgid
   * @param {'album' | 'artist'} img_type
   */
  function qqGetImageUrl(qqimgid, img_type) {
    if (qqimgid == null || qqimgid === '') {
      return '';
    }
    let category = '';
    if (img_type === 'artist') {
      category = 'T001R300x300M000';
    }
    if (img_type === 'album') {
      category = 'T002R300x300M000';
    }
    const s = category + qqimgid;
    return `https://y.gtimg.cn/music/photo_new/${s}.jpg`;
  }

  /**
   * 与主工程 `qq_is_playable` 一致（`switch` 二进制位）。
   * @param {Record<string, unknown>} song
   */
  function qqIsPlayable(song) {
    if (song == null || song.switch == null || song.switch === '') {
      return false;
    }
    const n = Number(song.switch);
    if (!Number.isFinite(n)) {
      return false;
    }
    const switchFlag = n.toString(2).split('');
    switchFlag.pop();
    switchFlag.reverse();
    const playFlag = switchFlag[0];
    const tryFlag = switchFlag[13];
    return playFlag === '1' || (playFlag === '1' && tryFlag === '1');
  }

  /**
   * @param {Record<string, unknown>} song
   */
  function qqConvertSong2ToDemo(song) {
    const rawMid = song.mid != null ? song.mid : song.songmid;
    const mid = rawMid != null ? String(rawMid) : '';
    const singer0 =
      Array.isArray(song.singer) && song.singer[0]
        ? /** @type {{ name?: string; mid?: string }} */ (song.singer[0])
        : { name: '', mid: '' };
    const album = /** @type {{ name?: string; mid?: string }} */ (song.album) || {};
    const albumMid = album.mid != null ? String(album.mid) : '';
    const playable = qqIsPlayable(song);

    return {
      providerId: 'qq',
      id: `qq:${mid}`,
      title: htmlDecode(String(song.name || '（无标题）')),
      artist: htmlDecode(String(singer0.name || '未知')),
      album: htmlDecode(String(album.name || '')),
      img: qqGetImageUrl(albumMid, 'album'),
      playable,
      subtitleNote: playable ? '' : '无版权或不可播',
      _native: { songmid: mid },
    };
  }

  return {
    providerId: 'qq',

    /** @param {string} keyword */
    async search(keyword) {
      const q = String(keyword || '').trim();
      if (!q) return [];

      const limit = Math.min(50, Math.max(1, searchPageSize()));
      const query = {
        comm: {
          ct: '19',
          cv: '1859',
          uin: '0',
        },
        req: {
          method: 'DoSearchForQQMusicDesktop',
          module: 'music.search.SearchCgiService',
          param: {
            grp: 1,
            num_per_page: limit,
            page_num: 1,
            query: q,
            search_type: 0,
          },
        },
      };

      const res = await fetch(MUSICU_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });
      if (!res.ok) {
        throw new Error(`QQ 搜索 HTTP ${res.status}`);
      }
      const data = await res.json();
      const list = data?.req?.data?.body?.song?.list;
      if (!Array.isArray(list)) {
        log('qq search 无 song.list', data);
        return [];
      }
      return list.map((item) =>
        qqConvertSong2ToDemo(/** @type {Record<string, unknown>} */ (item))
      );
    },

    /** @param {unknown[]} tracks */
    summarizeSearch(tracks) {
      const list = /** @type {{ playable?: boolean }[]} */ (tracks);
      const ok = list.filter((t) => t && t.playable).length;
      return `QQ 音乐共 ${tracks.length} 条，其中约 ${ok} 条当前可尝试解析播放（其余多为 VIP/无版权）。`;
    },

    /** @param {unknown[]} tracks */
    isSearchSummaryError(tracks) {
      const list = /** @type {{ playable?: boolean }[]} */ (tracks);
      return list.length > 0 && !list.some((t) => t && t.playable);
    },

    /** @param {{ playable?: boolean; _native?: { songmid?: string } }} track */
    canAttemptPlay(track) {
      return Boolean(
        track &&
          track.playable &&
          track._native &&
          typeof track._native.songmid === 'string' &&
          track._native.songmid
      );
    },

    /** @param {unknown} _track */
    reasonBlocked(_track) {
      return '当前条目不可播或未返回 vkey 播放地址（VIP/无版权等）。';
    },

    /** @param {unknown} _track */
    beforeResolveUrl(_track) {
      return '正在解析 QQ 音乐播放地址…';
    },

    /** @param {{ _native?: { songmid?: string } }} track */
    async resolveMediaUrl(track) {
      const songmid = track._native && track._native.songmid;
      if (!songmid) return null;

      const guid = '10000';
      const uin = '0';
      const fileType = '128';
      const fileConfig = {
        128: { s: 'M500', e: '.mp3', bitrate: '128kbps' },
      };
      const fileInfo = fileConfig[fileType];
      const file = `${fileInfo.s}${songmid}${songmid}${fileInfo.e}`;

      const reqData = {
        req_1: {
          module: 'vkey.GetVkeyServer',
          method: 'CgiGetVkey',
          param: {
            filename: file ? [file] : [],
            guid,
            songmid: [songmid],
            songtype: [0],
            uin,
            loginflag: 1,
            platform: '20',
          },
        },
        loginUin: uin,
        comm: {
          uin,
          format: 'json',
          ct: 24,
          cv: 0,
        },
      };

      const res = await fetch(MUSICU_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqData),
      });
      if (!res.ok) {
        log('qq vkey HTTP', res.status);
        return null;
      }
      const data = await res.json();
      const midurl = data?.req_1?.data?.midurlinfo;
      if (!Array.isArray(midurl) || !midurl[0]) {
        log('qq vkey 无 midurlinfo', data);
        return null;
      }
      const { purl } = midurl[0];
      if (purl === '' || purl == null) {
        log('qq vkey 空 purl');
        return null;
      }
      const sip = data?.req_1?.data?.sip;
      const base = Array.isArray(sip) && sip[0] ? String(sip[0]) : '';
      if (!base) {
        log('qq vkey 无 sip');
        return null;
      }
      return base + String(purl);
    },

    /** @param {unknown} _track */
    nowPlayingLabel(_track) {
      return 'QQ 音乐';
    },
  };
}
