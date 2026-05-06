/**
 * 播放器入口：目录合并 + 已就绪适配器搜索/试播（musicfree:xiaoqiu）。
 *
 * @author dmusic-test
 */

import { FetchHttpClient } from "./http/fetch-http-client.mjs";
import { createAdapterRegistry } from "./adapters/registry.mjs";
import { createXiaoqiuAdapter } from "./adapters/musicfree-xiaoqiu.mjs";

const root = document.getElementById("app-root");

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusBadge(e) {
  if (e.adapterStatus === "ready") {
    return `<span class="dmusic-badge dmusic-badge-ready" title="已在 core 注册适配器">可搜可播</span>`;
  }
  return `<span class="dmusic-badge dmusic-badge-pending" title="未在浏览器内实现适配，不可搜索/试听">未适配</span>`;
}

function renderCatalog(snapshot) {
  const lines = snapshot.entries.map((e) => {
    const disabled = e.enabled === false;
    const toggleLabel = disabled ? "启用" : "禁用";
    const badge = statusBadge(e);
    const pendingNote =
      e.adapterStatus === "pending"
        ? ` <span class="dmusic-inline-note">（此源不提供搜索/播放入口）</span>`
        : "";
    return `<li class="${disabled ? "dmusic-row-off" : ""}">
      <strong>${escapeHtml(e.name)}</strong>
      ${badge}
      · <code>${escapeHtml(e.stableId)}</code>
      · ${escapeHtml(String(e.adapterStatus))}
      · enabled=<code>${escapeHtml(String(e.enabled))}</code>${pendingNote}
      <button type="button" class="dmusic-toggle" data-stable-id="${escapeHtml(e.stableId)}" data-next-enabled="${disabled ? "true" : "false"}">${escapeHtml(toggleLabel)}</button>
    </li>`;
  });
  return `
    <p>合并后目录 <code>v${escapeHtml(String(snapshot.catalogVersion))}</code> · 共 ${snapshot.entries.length} 条</p>
    <ul class="dmusic-catalog">${lines.join("")}</ul>
    <p class="dmusic-hint"><strong>未适配</strong>条目不会在下方出现搜索或试听按钮；搜播仅在 <code>adapterStatus=ready</code> 且已启用、且 core 已注册对应适配器时可用。</p>
  `;
}

/**
 * 无可用搜播时给出明确说明（OpenSpec：未适配源不可播放 / 场景可理解）
 * @param {{ entries: Array<{ adapterStatus?: string; enabled?: boolean }> }} snapshot
 */
function renderPendingBanner(snapshot) {
  if (hasReadyEnabledSource(snapshot)) return "";
  const hasReady = snapshot.entries.some((e) => e.adapterStatus === "ready");
  const allPending = snapshot.entries.every((e) => e.adapterStatus === "pending");
  let msg = "";
  if (allPending) {
    msg =
      "当前无法使用搜索与试听：目录中均为「未适配」状态。浏览器扩展不会执行 MusicFree 原始 .js 插件，仅在 core 中实现 fetch 适配器后才可搜播。";
  } else if (hasReady) {
    msg = "当前无法使用搜索与试听：已将「可搜可播」源全部禁用。请在上方列表启用对应条目。";
  } else {
    msg = "当前无法使用搜索与试听：目录中无 adapterStatus=ready 的条目。";
  }
  return `<section class="dmusic-banner dmusic-banner-warn" role="status"><p>${escapeHtml(msg)}</p></section>`;
}

function renderSearchPanel() {
  return `
    <section class="dmusic-search" id="dmusic-search">
      <h2 class="dmusic-h2">搜索</h2>
      <div class="dmusic-search-row">
        <input type="search" id="dmusic-q" class="dmusic-input" placeholder="关键词" />
        <button type="button" id="dmusic-search-btn" class="dmusic-btn">搜索</button>
      </div>
      <p id="dmusic-search-status" class="dmusic-hint" aria-live="polite"></p>
      <ul id="dmusic-results" class="dmusic-results"></ul>
      <audio id="dmusic-audio" class="dmusic-audio" controls></audio>
    </section>
  `;
}

async function loadCatalogExtension() {
  /** @type {{ ok: boolean, catalog?: unknown, error?: string }} */
  const res = await chrome.runtime.sendMessage({ type: "GET_MERGED_CATALOG" });
  if (!res?.ok) {
    throw new Error(res?.error || "GET_MERGED_CATALOG 失败");
  }
  return res.catalog;
}

async function loadCatalogFetch() {
  const r = await fetch("./assets/plugin-catalog.snapshot.json", { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function hasReadyEnabledSource(snapshot) {
  return snapshot.entries.some((e) => e.enabled !== false && e.adapterStatus === "ready");
}

/**
 * @param {{ get: (id: string) => unknown; has: (id: string) => boolean }} registry
 * @param {{ entries: Array<{ enabled?: boolean; adapterStatus?: string; adapterId?: string }> }} snapshot
 */
function bindSearchUi(registry, snapshot) {
  const qEl = /** @type {HTMLInputElement | null} */ (document.getElementById("dmusic-q"));
  const btn = /** @type {HTMLButtonElement | null} */ (document.getElementById("dmusic-search-btn"));
  const status = document.getElementById("dmusic-search-status");
  const results = document.getElementById("dmusic-results");
  const audio = /** @type {HTMLAudioElement | null} */ (document.getElementById("dmusic-audio"));
  if (!qEl || !btn || !status || !results || !audio) return;

  const readyEntry = snapshot.entries.find((e) => e.enabled !== false && e.adapterStatus === "ready");
  const adapterId = readyEntry?.adapterId;
  if (!adapterId || !registry.has(adapterId)) {
    status.textContent =
      adapterId && !registry.has(adapterId)
        ? `条目标记为 ready（${adapterId}），但 core 未注册对应适配器；已锁定搜索。`
        : "无已注册且就绪的适配器。";
    qEl.disabled = true;
    btn.disabled = true;
    return;
  }
  const impl = /** @type {{ searchTracks: (q: string, p?: number) => Promise<unknown[]>; resolvePlayableUrl: (m: string) => Promise<string> }} */ (
    registry.get(adapterId)
  );

  btn.addEventListener("click", async () => {
    const q = qEl.value.trim();
    if (!q) {
      status.textContent = "请输入关键词。";
      return;
    }
    btn.disabled = true;
    status.textContent = "搜索中…";
    results.innerHTML = "";
    try {
      const tracks = await impl.searchTracks(q, 1);
      if (!tracks.length) {
        status.textContent = "无结果。";
        return;
      }
      status.textContent = `共 ${tracks.length} 条（仅首页）`;
      for (const t of tracks) {
        const tr = /** @type {{ title?: string; artist?: string; songmid?: string }} */ (t);
        const li = document.createElement("li");
        const sm = tr.songmid || "";
        li.innerHTML = `<span class="dmusic-track-title">${escapeHtml(tr.title || "")}</span>
          <span class="dmusic-track-meta">${escapeHtml(tr.artist || "")}</span>
          <button type="button" class="dmusic-btn dmusic-play" data-songmid="${escapeHtml(sm)}">试听</button>`;
        results.appendChild(li);
      }
    } catch (err) {
      status.textContent = /** @type {Error} */ (err).message;
    } finally {
      btn.disabled = false;
    }
  });

  results.addEventListener("click", async (ev) => {
    const t = /** @type {HTMLElement} */ (ev.target);
    if (!t.classList.contains("dmusic-play")) return;
    const songmid = t.getAttribute("data-songmid");
    if (!songmid) return;
    t.disabled = true;
    status.textContent = "解析播放地址…";
    try {
      const url = await impl.resolvePlayableUrl(songmid);
      audio.src = url;
      await audio.play().catch(() => {});
      status.textContent = "播放中（若失败多为网络或第三方解析限制）。";
    } catch (err) {
      status.textContent = /** @type {Error} */ (err).message;
    } finally {
      t.disabled = false;
    }
  });
}

async function main() {
  if (!root) return;
  root.innerHTML = "<p>正在加载目录…</p>";
  try {
    const isExt = typeof chrome !== "undefined" && !!chrome?.runtime?.id;
    const snapshot = isExt ? await loadCatalogExtension() : await loadCatalogFetch();
    if (!snapshot || !Array.isArray(snapshot.entries)) {
      throw new Error("目录格式无效");
    }

    const catalogHtml = renderCatalog(snapshot);
    const bannerHtml = renderPendingBanner(snapshot);
    const searchHtml = hasReadyEnabledSource(snapshot) ? renderSearchPanel() : "";
    root.innerHTML = catalogHtml + bannerHtml + searchHtml;

    const http = new FetchHttpClient(globalThis.fetch);
    const registry = createAdapterRegistry();
    registry.register("musicfree:xiaoqiu", createXiaoqiuAdapter(http));

    if (searchHtml) {
      bindSearchUi(registry, snapshot);
    }

    if (!isExt) return;

    root.addEventListener("click", async (ev) => {
      const t = /** @type {HTMLElement} */ (ev.target);
      if (!t.classList.contains("dmusic-toggle")) return;
      const stableId = t.getAttribute("data-stable-id");
      const next = t.getAttribute("data-next-enabled") === "true";
      if (!stableId) return;
      t.disabled = true;
      try {
        /** @type {{ ok: boolean, catalog?: unknown, error?: string }} */
        const res = await chrome.runtime.sendMessage({
          type: "SET_ENTRY_ENABLED",
          stableId,
          enabled: next,
        });
        if (!res?.ok) throw new Error(res?.error || "SET_ENTRY_ENABLED 失败");
        const cat = /** @type {{ catalogVersion?: number; entries: unknown[] }} */ (res.catalog);
        const catHtml = renderCatalog(cat);
        const ban = renderPendingBanner(cat);
        const sh = hasReadyEnabledSource(cat) ? renderSearchPanel() : "";
        root.innerHTML = catHtml + ban + sh;
        const http2 = new FetchHttpClient(globalThis.fetch);
        const reg2 = createAdapterRegistry();
        reg2.register("musicfree:xiaoqiu", createXiaoqiuAdapter(http2));
        if (sh) bindSearchUi(reg2, cat);
      } catch (err) {
        root.insertAdjacentHTML(
          "beforeend",
          `<p class="dmusic-err">${escapeHtml(/** @type {Error} */ (err).message)}</p>`,
        );
      } finally {
        const btn = [...root.querySelectorAll("button.dmusic-toggle")].find(
          (b) => b.getAttribute("data-stable-id") === stableId,
        );
        if (btn) btn.disabled = false;
      }
    });
  } catch (e) {
    root.innerHTML = `<p class="dmusic-err">无法加载目录：${escapeHtml(/** @type {Error} */ (e).message)}</p>`;
  }
}

main();
