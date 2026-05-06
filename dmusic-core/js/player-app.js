/**
 * 播放器入口：扩展内通过 SW 拉取「快照 + storage overlay」合并目录；非扩展环境回退 fetch。
 *
 * @author dmusic-test
 */

const root = document.getElementById("app-root");

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderCatalog(snapshot) {
  const lines = snapshot.entries.map((e) => {
    const disabled = e.enabled === false;
    const toggleLabel = disabled ? "启用" : "禁用";
    return `<li class="${disabled ? "dmusic-row-off" : ""}">
      <strong>${escapeHtml(e.name)}</strong>
      · <code>${escapeHtml(e.stableId)}</code>
      · ${escapeHtml(e.adapterStatus)}
      · enabled=<code>${escapeHtml(String(e.enabled))}</code>
      <button type="button" class="dmusic-toggle" data-stable-id="${escapeHtml(e.stableId)}" data-next-enabled="${disabled ? "true" : "false"}">${escapeHtml(toggleLabel)}</button>
    </li>`;
  });
  return `
    <p>合并后目录 <code>v${escapeHtml(String(snapshot.catalogVersion))}</code> · 共 ${snapshot.entries.length} 条</p>
    <ul class="dmusic-catalog">${lines.join("")}</ul>
    <p class="dmusic-hint">adapterStatus 为 <code>pending</code> 时尚未注册可播放适配器。启用/禁用写入 <code>chrome.storage.local</code>（<code>dmusic.catalog.overlay</code>）。</p>
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

async function main() {
  if (!root) return;
  root.innerHTML = "<p>正在加载目录…</p>";
  try {
    const isExt = typeof chrome !== "undefined" && !!chrome?.runtime?.id;
    const snapshot = isExt ? await loadCatalogExtension() : await loadCatalogFetch();
    if (!snapshot || !Array.isArray(snapshot.entries)) {
      throw new Error("目录格式无效");
    }
    root.innerHTML = renderCatalog(snapshot);

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
        root.innerHTML = renderCatalog(/** @type {{ entries: unknown[] }} */ (res.catalog));
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
