# dmusic-desktop

基于 **Electron** 的桌面壳，用于在桌面环境运行与 [**dmusic-core**](../dmusic-core) 相同的播放器页面（`player.html` + `js/player-app.js` 等）。**preload** 将完整 API 挂在 `globalThis.__DMUSIC_CHROME_SHIM__`（避免覆盖 Chromium 预置的只读 `window.chrome`）；`chrome.cookies` 经 **IPC** 由主进程 `session.defaultSession` 执行（preload 中无 `session` 对象，否则会报 `defaultSession` undefined）。页面内 [`js/core-bootstrap.js`](../dmusic-core/js/core-bootstrap.js) 在可行时把 shim 赋给 `window.chrome`，且 `player-app.js` / 各用户源在必要时直接读取 `__DMUSIC_CHROME_SHIM__`。

## 目录关系（必须满足）

`dmusic-desktop` 与 **`dmusic-core`** 须位于仓库 **`dmusic/`** 目录下**并列**（与 `dmusic-chrome`、`dmusic-site` 同级），例如：

```text
listen1_chrome_extension/    ← 仓库根（示例名）
  dmusic/
    dmusic-core/               ← 播放器静态资源（真源）
    dmusic-desktop/            ← 本目录（仅 Electron 与 package.json）
```

若将本目录挪到 `dmusic-core/` 内部，默认路径 `../dmusic-core/player.html` 会失效。

## 环境要求

- **Node.js** 18+（建议 LTS），用于安装依赖与启动 Electron。

## 安装与运行

```bash
cd dmusic/dmusic-desktop
npm install
npm start
```

首次运行前请确认**同级**目录 **`../dmusic-core/player.html`** 存在（即与 `dmusic-desktop` 并列的 `dmusic-core`）。

若 `npm install` 后执行 `npm start` 报错 **Electron failed to install correctly**，多为 Electron 二进制下载不完整：删除 `node_modules/electron` 后重新执行 `npm install`（需能访问 npm 与 Electron 镜像的网络环境）。

## 与 Chrome 扩展的差异

- **Cookie**：写入 Electron 默认 `session`，与浏览器里安装的 **dmusic-chrome** 扩展**不共享**。
- **权限**：无 MV3 `host_permissions` 与 **Declarative Net Request**。Chrome 扩展通过 [`dmusic-chrome/dnr_bilibili_cdn.json`](../dmusic-chrome/dnr_bilibili_cdn.json) 为 B 站 CDN 等媒体请求注入 `Referer`/`Origin`。桌面端若出现同类 **403**，需在主进程用 `session.defaultSession.webRequest.onBeforeSendHeaders`（或等价）对匹配 URL 追加相同请求头后再测。
- **后台页**：不加载扩展的 `background.js`；本应用仅打开播放器窗口。

## 手动测试建议

1. `npm start` 后窗口应打开且无「未找到播放器」报错。
2. 内置 **iTunes**：搜索关键词，确认列表与试听。
3. 勾选 **开发者模式**，从下拉加载 `netease.js` 等包内模块，确认无 Console 报错、可搜索与播放（与 [dmusic-core/README.md](../dmusic-core/README.md) 手测类似）。

## 安全说明

当前 `webPreferences` 为 `sandbox: false` 以便 preload 使用 Node 的 `path` / `url` 与 `session.cookies`；页面脚本仍为 `nodeIntegration: false`。**请勿**在播放器页加载不可信用户源（与扩展侧说明一致）。

## 后续（可选）

使用 `electron-builder` 将 `../dmusic-core` 打入 `extraResources`，可在无源码树的用户机器上分发。
