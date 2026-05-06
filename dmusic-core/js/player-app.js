/**
 * 播放器入口：加载内置插件目录快照并展示。
 *
 * @author dmusic-test
 */

const root = document.getElementById("app-root");

function renderCatalog(snapshot) {
  const lines = snapshot.entries.map(
    (e) =>
      `<li><strong>${escapeHtml(e.name)}</strong> · <code>${escapeHtml(e.stableId)}</code> · ${escapeHtml(e.adapterStatus)}</li>`,
  );
  return `
    <p>目录快照 <code>v${escapeHtml(String(snapshot.catalogVersion))}</code> · 共 ${snapshot.entries.length} 条</p>
    <ul class="dmusic-catalog">${lines.join("")}</ul>
    <p class="dmusic-hint">adapterStatus 为 <code>pending</code> 时尚未在 core 注册可播放适配器。</p>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function main() {
  if (!root) return;
  root.innerHTML = "<p>正在加载目录快照…</p>";
  try {
    const res = await fetch("./assets/plugin-catalog.snapshot.json", { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const snapshot = await res.json();
    if (!snapshot || !Array.isArray(snapshot.entries)) {
      throw new Error("快照格式无效");
    }
    root.innerHTML = renderCatalog(snapshot);
  } catch (e) {
    root.innerHTML = `<p class="dmusic-err">无法加载目录快照：${escapeHtml(/** @type {Error} */ (e).message)}</p>`;
  }
}

main();
