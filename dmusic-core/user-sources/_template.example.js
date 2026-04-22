/**
 * dmusic 用户自定义音乐源 — 最小 ES 模块模板。
 * 复制本文件为 `user-sources/` 下任意 .js，在 `js/player-app.js` 的 `PACKAGED_USER_SOURCES` 中登记路径，重新加载扩展后在「开发者模式」下加载选中模块。
 *
 * 约定：
 * - 必须 `export default function (deps) { return MusicSource }`；deps 仅含白名单：fetch、log（见 MUSIC_SOURCES_API.md）。
 * - 返回对象的 `providerId` 须与注册 id 一致，且符合 `^[a-z][a-z0-9_-]{0,31}$`，不得为内置 id `itunes`。
 * - 每条 `DemoTrack` 的 `providerId` 须与 `providerId` 相同；`id` 建议 `${providerId}:...` 避免碰撞。
 * - 用户脚本与扩展页面同源执行，权限与 fetch 域仍受 manifest 限制；风险自负。
 *
 * @author listen1, dmusic
 */

/**
 * @param {{ fetch: typeof fetch, log: (...args: unknown[]) => void }} deps
 */
export default function createDemoEchoSource(deps) {
  const { log } = deps;

  return {
    providerId: 'demo_echo',

    /** @param {string} keyword */
    async search(keyword) {
      log('search', keyword);
      const q = String(keyword || '').trim() || '（空）';
      return [
        {
          providerId: 'demo_echo',
          id: `demo_echo:${encodeURIComponent(q)}`,
          title: `示例：${q}`,
          artist: 'Template',
          album: '',
          img: '',
          playable: true,
          subtitleNote: '模板占位',
          _native: { echo: q },
        },
      ];
    },

    /** @param {unknown[]} tracks */
    summarizeSearch(tracks) {
      return `模板源返回 ${tracks.length} 条（未接真实媒体）。`;
    },

    /** @param {unknown[]} tracks */
    isSearchSummaryError(tracks) {
      return tracks.length > 0;
    },

    /** @param {{ playable?: boolean }} track */
    canAttemptPlay(track) {
      return Boolean(track && track.playable);
    },

    /** @param {unknown} _track */
    reasonBlocked(_track) {
      return '模板曲目不可播放。';
    },

    /** @param {unknown} _track */
    beforeResolveUrl(_track) {
      return '模板：未实现真实解析…';
    },

    /** @param {unknown} _track */
    async resolveMediaUrl(_track) {
      return null;
    },

    /** @param {unknown} _track */
    nowPlayingLabel(_track) {
      return 'Demo 模板';
    },
  };
}
