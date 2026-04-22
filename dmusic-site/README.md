# dmusic-site

在**普通浏览器**中运行与 [**dmusic-core**](../dmusic-core) 相同的播放器页面（`player.html` + `js/player-app.js` 等），**不依赖** Chrome 扩展或 Electron。通过同级目录下的 **`serve`** 将 **`dmusic-core/`** 作为静态资源根目录提供。

## 目录关系（必须满足）

`dmusic-site` 与 **`dmusic-core`** 须位于仓库 **`dmusic/`** 目录下**并列**，例如：

```text
listen1_chrome_extension/   ← 仓库根（示例名）
  dmusic/
    dmusic-core/             ← 播放器静态资源（真源）
    dmusic-site/             ← 本目录（仅 package.json 与说明）
```

本包 `npm run dev` 使用 `serve ../dmusic-core`，若移动目录导致路径错误，请相应修改 `package.json` 中的目录参数。

## 环境要求

- **Node.js** 18+（建议 LTS），用于安装依赖与启动静态服务。

## 安装与运行

```bash
cd dmusic/dmusic-site
npm install
npm run dev
```

在浏览器中打开：

**http://127.0.0.1:5173/player.html**

（`serve` 会列出目录链接，也可从列表进入 `player.html`。）

`--cors` 会为静态响应加上宽松 CORS 头，便于页面内 `fetch` 第三方 API（如 iTunes）在本地调试时减少被浏览器策略误伤的概率；**生产部署**请自行配置 CDN / 反向代理与安全策略。

## 能力说明（MVP）

| 能力 | 网站版 |
|------|--------|
| **iTunes** | 推荐作为网站版主要验证对象：搜索与 `previewUrl` 试听。 |
| **包内用户源**（网易云、QQ、Bilibili、酷狗等） | **不保证可用**：多数依赖 `chrome.cookies`、`host_permissions`、扩展侧 DNR 或厂商接口的 CORS；纯网页无 MV3 能力。完整体验请使用 **[dmusic-chrome](../dmusic-chrome)**（须 `npm run build` 后加载 **`dist/`** 解压目录）或 **[dmusic-desktop](../dmusic-desktop)**。 |
| **`js/core-bootstrap.js`** | 在扩展与 Electron 下会短路或使用原生 `chrome`；仅在纯 HTTP 打开时注入最小 `__DMUSIC_CHROME_SHIM__.runtime.getURL`，以便动态 `import()` `user-sources/*.js`。`cookies` 为 `null`。 |

## 部署到静态主机

将 **`dmusic-core` 整个目录**（含 `player.html`、`js/`、`css/`、`vendor/`、`user-sources/` 等）上传到任意静态站点根路径或子路径，保证 `player.html` 与其引用的相对路径可访问即可；**无需**构建 `dmusic-site/dist`。若部署在子路径（例如 `https://example.com/music/`），请确认 `player.html` 的 URL 为 `…/music/player.html`，相对脚本路径仍能解析到同目录下的 `js/`、`user-sources/`。

## 手测建议

1. `npm run dev` 后打开 `http://127.0.0.1:5173/player.html`，确认无 404。
2. 数据源选 **iTunes**，搜索关键词，点击一条结果，确认能播放预览音频。
3. （可选）开启「开发者模式」并尝试加载 `netease.js`：预期可能因无 `chrome.cookies` 而失败，属本文档所述范围。

## 安全说明

与 [dmusic-core/README.md](../dmusic-core/README.md) 一致：开发者模式下加载的用户源等同于执行任意脚本，**仅用于本地调试**，勿在不可信环境启用。
