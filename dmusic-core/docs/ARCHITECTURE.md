# DMusic Core 架构（新一代最小骨架）

## 定位

- **dmusic-core**：播放器 UI 与业务逻辑的源码目录（当前为静态 HTML/CSS/JS，可逐步引入打包工具）。
- **dmusic-chrome**：负责 MV3 `manifest`、service worker，以及 **`npm run build` 将 core 资源同步到 `dist/`**。

## 与 OpenSpec 的对应关系

详见仓库根 `openspec/changes/dmusic-chrome-musicfree-player/`：`musicfree-plugin-catalog`、`player-core-integration` 将在 core 内实现目录模型与适配器；chrome 包仅负责权限与存储桥接。

## 构建约定

- 不得在 `dmusic-chrome` 中手写大段与 core 重复的播放器 UI；同步由 `dmusic-chrome/scripts/build.cjs` 完成。

## 插件目录（Music_Free）

- 源清单：`assets/sources/myPlugins.json`（与上游 `keep-alive/Music_Free/myPlugins.json` 对齐，可随版本更新）。
- 构建：`dmusic-core/scripts/generate-catalog-snapshot.cjs` 生成 `assets/plugin-catalog.snapshot.json`（已加入 `.gitignore`，由 `dmusic-chrome` 的 `npm run build` 在拷贝前调用）。
- `stableId`：由插件脚本 URL 的文件名派生，形如 `musicfree:xiaoqiu`（见 `scripts/derive-stable-id.cjs`）。
