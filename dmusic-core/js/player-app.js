/**
 * 播放器入口（最小骨架）。后续在此挂载音源目录、搜索与播放。
 *
 * @author dmusic-test
 */

const root = document.getElementById("app-root");
if (root) {
  root.innerHTML = `
    <p>播放器已加载。下一步：接入 Music_Free 目录快照与 <code>adapterId</code> 注册表。</p>
    <p>构建来源：<code>dmusic-core</code> → <code>dmusic-chrome/dist</code></p>
  `;
}
