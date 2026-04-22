/**
 * player.html 页面逻辑：搜索、列表、播放（经 MusicSources 抽象层）；开发者模式下加载扩展包内用户源模块。
 * @author listen1, dmusic
 */
/* global MusicSources, chrome */

(function playerPage() {
  /**
   * 包内用户源：`import(chrome-extension://…/path.js)`（MV3 禁止 blob 动态脚本）。
   * 须在开启「开发者模式」后通过「加载选中模块」注册，无单独特例。
   * @type {{ path: string, label: string }[]}
   */
  const PACKAGED_USER_SOURCES = [
    { path: 'user-sources/netease.js', label: '网易云音乐（netease.js）' },
    { path: 'user-sources/kugou.js', label: '酷狗（kugou.js）' },
    { path: 'user-sources/bilibili.js', label: 'Bilibili（bilibili.js）' },
    { path: 'user-sources/qq.js', label: 'QQ 音乐（qq.js）' },
    { path: 'user-sources/_template.example.js', label: '模板 demo_echo（_template.example.js）' },
  ];

  function initSourceSelect() {
    const sel = document.getElementById('source');
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = '';
    const items = MusicSources.list();
    items.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item.label;
      sel.appendChild(opt);
    });
    const ids = items.map((x) => x.id);
    if (prev && ids.includes(prev)) {
      sel.value = prev;
    }
  }

  const form = document.getElementById('search-form');
  const sourceEl = document.getElementById('source');
  const input = document.getElementById('q');
  const btn = document.getElementById('search-btn');
  const msg = document.getElementById('msg');
  const list = document.getElementById('results');
  const audio = document.getElementById('player');
  const nowPlaying = document.getElementById('now-playing');

  function setMessage(text, isError) {
    msg.textContent = text || '';
    msg.classList.toggle('error', Boolean(isError));
  }

  const devModeCb = document.getElementById('dev-mode');
  const devTools = document.getElementById('dev-tools');
  const userSourcePackaged = document.getElementById('user-source-packaged');
  const userSourceLoadPackagedBtn = document.getElementById('user-source-load-packaged-btn');
  const userSourceUnregisterBtn = document.getElementById('user-source-unregister-btn');

  if (userSourcePackaged && PACKAGED_USER_SOURCES.length) {
    PACKAGED_USER_SOURCES.forEach((entry) => {
      const opt = document.createElement('option');
      opt.value = entry.path;
      opt.textContent = entry.label;
      userSourcePackaged.appendChild(opt);
    });
  }

  initSourceSelect();

  async function loadPackagedUserSource(relativePath, labelHint) {
    if (!relativePath) {
      throw new Error('未选择模块');
    }
    const runtimeApi =
      typeof chrome !== 'undefined' &&
      chrome.runtime &&
      typeof chrome.runtime.getURL === 'function'
        ? chrome.runtime
        : typeof globalThis.__DMUSIC_CHROME_SHIM__ !== 'undefined' &&
            globalThis.__DMUSIC_CHROME_SHIM__.runtime &&
            typeof globalThis.__DMUSIC_CHROME_SHIM__.runtime.getURL === 'function'
          ? globalThis.__DMUSIC_CHROME_SHIM__.runtime
          : null;
    if (!runtimeApi) {
      throw new Error(
        '请在 dmusic-chrome 扩展页中打开，或使用 dmusic-desktop 启动（chrome.runtime.getURL 不可用）'
      );
    }
    const url = runtimeApi.getURL(relativePath);
    const mod = await import(/* webpackIgnore: true */ url);
    const factory = mod && mod.default;
    if (typeof factory !== 'function') {
      throw new Error('模块需 export default function(deps) { return MusicSource }');
    }
    const impl = factory(MusicSources.getPluginDeps());
    const id = impl && impl.providerId;
    if (typeof id !== 'string' || !id) {
      throw new Error('返回对象须包含字符串 providerId');
    }
    const label =
      (labelHint && String(labelHint).trim()) ||
      (typeof impl.label === 'string' && impl.label.trim()) ||
      `${id}（自定义）`;
    MusicSources.registerUserSource({ id, label }, impl);
  }

  function syncDevModeUi() {
    const on = MusicSources.isDeveloperMode();
    if (devModeCb) devModeCb.checked = on;
    if (devTools) devTools.hidden = !on;
  }

  syncDevModeUi();

  if (devModeCb) {
    devModeCb.addEventListener('change', () => {
      MusicSources.setDeveloperMode(devModeCb.checked);
      syncDevModeUi();
      initSourceSelect();
      if (!devModeCb.checked) {
        setMessage('已关闭开发者模式并清除用户自定义数据源。', false);
      }
    });
  }

  if (userSourceLoadPackagedBtn && userSourcePackaged) {
    userSourceLoadPackagedBtn.addEventListener('click', async () => {
      const path = userSourcePackaged.value;
      const meta = PACKAGED_USER_SOURCES.find((x) => x.path === path);
      const labelHint = meta ? meta.label : null;
      try {
        await loadPackagedUserSource(path, labelHint);
        initSourceSelect();
        setMessage(`已加载扩展内模块：${path}`, false);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : String(err), true);
      }
    });
  }

  if (userSourceUnregisterBtn) {
    userSourceUnregisterBtn.addEventListener('click', () => {
      const id = sourceEl.value;
      try {
        if (!MusicSources.isUserRegistered(id)) {
          setMessage('当前选中的不是用户自定义数据源，或已卸载。', true);
          return;
        }
        MusicSources.unregisterUserSource(id);
        initSourceSelect();
        setMessage(`已移除用户数据源：${id}`, false);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : String(err), true);
      }
    });
  }

  /** 停止当前播放并释放上一首资源，避免切歌时两路声音叠加 */
  function hardStopAudio() {
    audio.pause();
    audio.currentTime = 0;
    audio.removeAttribute('src');
    audio.load();
  }

  /**
   * @param {object[]} tracks
   */
  function renderResults(tracks) {
    list.innerHTML = '';

    tracks.forEach((t) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'track';
      b.dataset.providerId = t.providerId;

      const img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      if (t.img) {
        img.src = t.img;
      }

      const meta = document.createElement('div');
      meta.className = 'track-meta';
      const title = document.createElement('span');
      title.className = 'track-title';
      title.textContent = t.title;
      const sub = document.createElement('span');
      sub.className = 'track-sub';
      const parts = [t.artist, t.album].filter(Boolean);
      sub.textContent = parts.join(' · ');
      if (t.subtitleNote) {
        sub.textContent += sub.textContent ? ' · ' : '';
        sub.textContent += t.subtitleNote;
      }

      meta.appendChild(title);
      meta.appendChild(sub);
      b.appendChild(img);
      b.appendChild(meta);

      b.addEventListener('click', () => {
        playTrack(t, b).catch((err) => {
          setMessage(err instanceof Error ? err.message : String(err), true);
        });
      });
      li.appendChild(b);
      list.appendChild(li);
    });
  }

  /**
   * @param {object} t DemoTrack
   * @param {HTMLButtonElement} buttonEl
   * @returns {Promise<void>}
   */
  async function playTrack(t, buttonEl) {
    const src = MusicSources.get(t.providerId);

    list.querySelectorAll('button.track').forEach((el) => {
      el.classList.toggle('active', el === buttonEl);
    });

    if (!src.canAttemptPlay(t)) {
      setMessage(src.reasonBlocked(t), true);
      return;
    }

    const pending = src.beforeResolveUrl(t);
    if (pending) {
      setMessage(pending);
    }

    const playUrl = await src.resolveMediaUrl(t);
    if (!playUrl) {
      setMessage('未获取到播放地址（可能需登录或版权限制）。', true);
      return;
    }

    hardStopAudio();
    audio.src = playUrl;
    audio.load();
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        setMessage('无法自动播放，请点击播放器上的播放。', true);
      });
    }

    const label = src.nowPlayingLabel(t);
    nowPlaying.innerHTML = `${escapeHtml(label)}：<strong>${escapeHtml(
      t.title
    )}</strong> — ${escapeHtml(t.artist)}`;
    setMessage('');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const term = input.value.trim();
    if (!term) return;

    const src = MusicSources.get(sourceEl.value);
    btn.disabled = true;
    setMessage('搜索中…');
    list.innerHTML = '';
    hardStopAudio();
    nowPlaying.textContent = '未选择曲目';

    try {
      const tracks = await src.search(term);

      if (!tracks.length) {
        setMessage('没有结果，换个关键词试试。');
        return;
      }

      const summaryText = src.summarizeSearch(tracks);
      const summaryErr =
        typeof src.isSearchSummaryError === 'function'
          ? src.isSearchSummaryError(tracks)
          : false;
      setMessage(summaryText, Boolean(summaryErr));
      renderResults(tracks);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err), true);
    } finally {
      btn.disabled = false;
    }
  });
})();
