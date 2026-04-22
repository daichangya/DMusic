# dmusic-core

**通用播放器内核**（与宿主无关）：`player.html`、`js/`（`MusicSources`、`player-app`、宿主引导 `core-bootstrap.js` 等）、`css/`、`vendor/`、`user-sources/`、接口文档。

在 Listen1 本仓库中，**dmusic-core** 与 **dmusic-chrome**、**dmusic-desktop**、**dmusic-site** 位于 **`dmusic/`** 目录下并列；下表中的相对链接按该布局解析。

本目录**不是**可直接加载的 Chrome 扩展根目录。三端交付方式为：

| 宿主 | 目录 | 说明 |
|------|------|------|
| **Chrome MV3** | [`../dmusic-chrome`](../dmusic-chrome) | 含 `manifest.json` / `background.js` / DNR；在 `dmusic-chrome` 执行 **`npm run build`** 生成 **`dist/`**，在 Chrome 中加载 **`dist/`** 解压目录。 |
| **Electron** | [`../dmusic-desktop`](../dmusic-desktop) | `loadFile` 指向本目录下的 `player.html`。 |
| **静态网站** | [`../dmusic-site`](../dmusic-site) | `serve` 指向本目录。 |

**免责声明**：通过公开接口检索与播放音频，仅供学习与技术交流。请遵守各平台服务条款与版权法律；加载自定义用户源等同于执行任意代码，**风险自负**。

## 数据源与文档

- 实现入口：[`js/music-sources.js`](js/music-sources.js)、[`js/player-app.js`](js/player-app.js)、[`js/app-config.js`](js/app-config.js)。
- 契约与 HTTP 说明：[`docs/MUSIC_SOURCES_API.md`](docs/MUSIC_SOURCES_API.md)。
- 四包职责与同步命令：[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。

## 宿主引导

页面首屏加载 [`js/core-bootstrap.js`](js/core-bootstrap.js)：在纯网页下注入最小 `__DMUSIC_CHROME_SHIM__`；在 Electron 下配合 preload 将 shim 挂到 `window.chrome`；在 Chrome 扩展下使用原生 `chrome` 并短路。

## 致谢

- 上游 [listen1/listen1_chrome_extension](https://github.com/listen1/listen1_chrome_extension)（MIT）。
- `vendor/forge_listen1_fork.min.js` 来自 Listen1 仓库。

## 手动测试

在 **dmusic-chrome**（已 `npm run build` 并加载 **`dist/`**）、**dmusic-desktop** 或 **dmusic-site** 中打开 `player.html` 后：iTunes 搜索试听；开发者模式下加载各 `user-sources/*.js`（扩展/桌面下 Cookie 与权限由宿主提供）。
