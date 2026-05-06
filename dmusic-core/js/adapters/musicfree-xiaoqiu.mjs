/**
 * 小秋（QQ 曲库）适配器：搜索走 u.y.qq.com；播放地址与 MusicFree 脚本一致走 lxmusicapi。
 *
 * @author dmusic-test
 */

const QQ_HEADERS = {
  referer: "https://y.qq.com",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
  Cookie: "uin=",
};

const PAGE_SIZE = 20;

const QUALITY_LEVELS = {
  low: "128k",
  standard: "320k",
  high: "320k",
  super: "320k",
};

/**
 * @param {Record<string, unknown>} _
 */
function formatMusicItem(_) {
  const rawAlbum = _.album;
  const album =
    rawAlbum && typeof rawAlbum === "object"
      ? /** @type {{ id?: unknown; mid?: unknown; title?: unknown }} */ (rawAlbum)
      : null;
  const albumid = _.albumid ?? album?.id;
  const albummid = _.albummid ?? album?.mid;
  const albumname = _.albumname ?? album?.title;
  const singers = Array.isArray(_.singer) ? _.singer : [];
  const albummidStr = typeof albummid === "string" ? albummid : "";
  return {
    id: String(_.id || _.songid || ""),
    songmid: /** @type {string} */ (_.mid || _.songmid || ""),
    title: /** @type {string} */ (_.title || _.songname || ""),
    artist: singers.map((/** @type {{ name?: string }} */ s) => s.name).join(", "),
    artwork: albummidStr
      ? `https://y.gtimg.cn/music/photo_new/T002R800x800M000${albummidStr}.jpg`
      : undefined,
    album: typeof albumname === "string" ? albumname : undefined,
    albumid,
    albummid: albummidStr || undefined,
  };
}

/**
 * @param {{ postJson: (u: string, b: unknown, h?: Record<string, string>) => Promise<unknown>; getJson: (u: string, h?: Record<string, string>) => Promise<unknown> }} http
 */
export function createXiaoqiuAdapter(http) {
  return {
    adapterId: "musicfree:xiaoqiu",

    /**
     * @param {string} query
     * @param {number} [page]
     */
    async searchTracks(query, page = 1) {
      const body = {
        req_1: {
          method: "DoSearchForQQMusicDesktop",
          module: "music.search.SearchCgiService",
          param: {
            num_per_page: PAGE_SIZE,
            page_num: page,
            query,
            search_type: 0,
          },
        },
      };
      const res = /** @type {{ req_1?: { data?: { body?: { song?: { list?: unknown[] } } } } }} */ (
        await http.postJson("https://u.y.qq.com/cgi-bin/musicu.fcg", body, QQ_HEADERS)
      );
      const list = res?.req_1?.data?.body?.song?.list;
      if (!Array.isArray(list)) {
        throw new Error("搜索返回格式异常");
      }
      return list.map((item) => formatMusicItem(/** @type {Record<string, unknown>} */ (item)));
    },

    /**
     * @param {string} songmid
     * @param {keyof typeof QUALITY_LEVELS} [quality]
     */
    async resolvePlayableUrl(songmid, quality = "standard") {
      const q = QUALITY_LEVELS[quality] || "320k";
      const url = `https://lxmusicapi.onrender.com/url/tx/${encodeURIComponent(songmid)}/${q}`;
      const data = /** @type {{ url?: string }} */ (
        await http.getJson(url, { "X-Request-Key": "share-v3" })
      );
      if (!data?.url || typeof data.url !== "string") {
        throw new Error("解析播放地址失败");
      }
      return data.url;
    },
  };
}
