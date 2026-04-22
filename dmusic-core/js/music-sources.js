/**
 * dmusic 音乐源注册表：内置源 + 开发者模式下可注册的用户脚本源。
 * 网易云实现见 {@link ../user-sources/netease.js}（与其它用户源相同，须在开发者模式下从包内模块加载）。
 * @see ../docs/MUSIC_SOURCES_API.md 数据源 HTTP、MusicSource 契约与用户插件说明
 * @see ./app-config.js DMUSIC_CONFIG / DMUSIC_DEMO_getSearchPageSize
 * @author listen1, dmusic
 */
/* global DMUSIC_DEMO_getSearchPageSize */

(function musicSourcesFactory(global) {
  'use strict';

  function searchPageSize() {
    if (typeof global.DMUSIC_DEMO_getSearchPageSize === 'function') {
      return global.DMUSIC_DEMO_getSearchPageSize();
    }
    return 10;
  }

  const DEV_MODE_KEY = 'dmusic_dev_mode';

  /** @type {Record<string, Object>} */
  const builtinRegistry = {};

  /** @type {Map<string, { label: string, impl: Object }>} */
  const userRegistry = new Map();

  const BUILTIN_IDS = ['itunes'];

  const BUILTIN_LIST = [{ id: 'itunes', label: 'iTunes（约 30 秒预览）' }];

  const REQUIRED_SOURCE_METHODS = [
    'search',
    'summarizeSearch',
    'canAttemptPlay',
    'reasonBlocked',
    'beforeResolveUrl',
    'resolveMediaUrl',
    'nowPlayingLabel',
  ];

  /**
   * @typedef {Object} DemoTrack
   * @property {string} providerId 源标识，与 MusicSources.get 参数一致
   * @property {string} id 列表内唯一 id（如 itunes:trackId、ne:songId）
   * @property {string} title
   * @property {string} artist
   * @property {string} album
   * @property {string} img 封面 URL，可为空
   * @property {boolean} playable 是否允许进入解析/播放
   * @property {string} [subtitleNote] 列表副标题追加说明（如「无版权/试听」）
   * @property {Object} _native 解析播放所需最小载荷
   */

  function isDeveloperMode() {
    try {
      return global.localStorage.getItem(DEV_MODE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  function isReservedBuiltinId(id) {
    return BUILTIN_IDS.includes(id);
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  function validateUserSourceId(id) {
    if (typeof id !== 'string' || !id) return false;
    if (isReservedBuiltinId(id)) return false;
    return /^[a-z][a-z0-9_-]{0,31}$/.test(id);
  }

  /**
   * @param {Object} impl
   * @param {string} expectedProviderId
   */
  function validateMusicSourceImpl(impl, expectedProviderId) {
    if (!impl || typeof impl !== 'object') {
      throw new Error('数据源实现必须为非 null 对象');
    }
    if (impl.providerId !== expectedProviderId) {
      throw new Error(`providerId 必须与注册 id 一致（期望 ${expectedProviderId}，实际 ${impl.providerId}）`);
    }
    const missing = REQUIRED_SOURCE_METHODS.filter((m) => typeof impl[m] !== 'function');
    if (missing.length) {
      throw new Error(`数据源缺少必选方法: ${missing.join(', ')}`);
    }
  }

  /** @returns {Object} MusicSource */
  function createItunesSource() {
    return {
      providerId: 'itunes',

      /** @param {string} keyword */
      async search(keyword) {
        const url = new URL('https://itunes.apple.com/search');
        url.searchParams.set('term', keyword);
        url.searchParams.set('media', 'music');
        url.searchParams.set('entity', 'song');
        url.searchParams.set('limit', String(searchPageSize()));

        const res = await fetch(url.toString(), { method: 'GET' });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        const rows = Array.isArray(data.results) ? data.results : [];
        return rows.map((r) => {
          const trackId = r.trackId;
          return {
            providerId: 'itunes',
            id: `itunes:${trackId}`,
            title: r.trackName || '（无标题）',
            artist: r.artistName || '',
            album: r.collectionName || '',
            img: r.artworkUrl60 ? r.artworkUrl60.replace('60x60', '100x100') : '',
            playable: Boolean(r.previewUrl),
            subtitleNote: '',
            _native: { previewUrl: r.previewUrl || '' },
          };
        });
      },

      /**
       * @param {DemoTrack[]} tracks
       * @returns {string}
       */
      summarizeSearch(tracks) {
        const withPreview = tracks.filter((x) => x.playable);
        if (!withPreview.length) {
          return '有结果但均无试听链接。';
        }
        return `共 ${tracks.length} 条，其中 ${withPreview.length} 条可试听。`;
      },

      /**
       * @param {DemoTrack[]} tracks
       * @returns {boolean}
       */
      isSearchSummaryError(tracks) {
        return !tracks.some((x) => x.playable);
      },

      /** @param {DemoTrack} track */
      canAttemptPlay(track) {
        return Boolean(track._native && track._native.previewUrl);
      },

      /** @param {DemoTrack} _track */
      reasonBlocked(_track) {
        return '该条目没有试听地址。';
      },

      /** @param {DemoTrack} _track */
      beforeResolveUrl(_track) {
        return null;
      },

      /** @param {DemoTrack} track */
      async resolveMediaUrl(track) {
        const u = track._native && track._native.previewUrl;
        return u || null;
      },

      /** @param {DemoTrack} _track */
      nowPlayingLabel(_track) {
        return 'iTunes 试听';
      },
    };
  }

  builtinRegistry.itunes = createItunesSource();

  function getPluginDeps() {
    return {
      fetch: global.fetch.bind(global),
      log: (...args) => {
        // eslint-disable-next-line no-console
        console.log('[DemoUserSource]', ...args);
      },
    };
  }

  /**
   * @param {{ id: string, label: string }} meta
   * @param {Object} impl MusicSource
   */
  function registerUserSource(meta, impl) {
    if (!isDeveloperMode()) {
      throw new Error('请先开启「开发者模式」后再注册自定义数据源。');
    }
    if (!meta || typeof meta.id !== 'string' || typeof meta.label !== 'string') {
      throw new Error('meta 须包含字符串字段 id、label');
    }
    if (!meta.label.trim()) {
      throw new Error('label 不能为空');
    }
    if (!validateUserSourceId(meta.id)) {
      throw new Error(
        '非法 id：须为小写字母开头，仅含小写字母、数字、下划线、连字符，长度 1–32，且不能为内置 id（itunes）'
      );
    }
    validateMusicSourceImpl(impl, meta.id);
    userRegistry.set(meta.id, { label: meta.label.trim(), impl });
  }

  /**
   * 供用户脚本在开发者模式下调用：可传入已实现对象，或 (deps) => impl 工厂。
   * @param {{ id: string, label: string }} meta
   * @param {Object|function(Object): Object} implOrFactory
   */
  function registerUserSourceFromGlobal(meta, implOrFactory) {
    if (typeof implOrFactory === 'function') {
      const impl = implOrFactory(getPluginDeps());
      registerUserSource(meta, impl);
      return;
    }
    registerUserSource(meta, implOrFactory);
  }

  /**
   * @param {string} id
   */
  function unregisterUserSource(id) {
    if (isReservedBuiltinId(id)) {
      throw new Error('不能卸载内置数据源');
    }
    if (!userRegistry.has(id)) {
      throw new Error(`未注册的用户数据源: ${id}`);
    }
    userRegistry.delete(id);
  }

  function clearUserSources() {
    userRegistry.clear();
  }

  /**
   * @param {boolean} enabled
   */
  function setDeveloperMode(enabled) {
    try {
      if (enabled) {
        global.localStorage.setItem(DEV_MODE_KEY, '1');
      } else {
        global.localStorage.removeItem(DEV_MODE_KEY);
        clearUserSources();
      }
    } catch (e) {
      // ignore
    }
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  function isUserRegistered(id) {
    return userRegistry.has(id);
  }

  global.MusicSources = {
    list() {
      const out = BUILTIN_LIST.slice();
      [...userRegistry.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([id, row]) => {
          out.push({ id, label: row.label });
        });
      return out;
    },

    /**
     * @param {string} id
     * @returns {Object}
     */
    get(id) {
      const builtin = builtinRegistry[id];
      if (builtin) return builtin;
      const row = userRegistry.get(id);
      if (row) return row.impl;
      throw new Error(`未知音乐源: ${id}`);
    },

    isDeveloperMode,
    setDeveloperMode,
    getPluginDeps,
    registerUserSource,
    registerUserSourceFromGlobal,
    unregisterUserSource,
    clearUserSources,
    isUserRegistered,
  };
})(typeof window !== 'undefined' ? window : this);
