# DMusic Core 架构（新一代最小骨架）

## 定位

- **dmusic-core**：播放器 UI 与业务逻辑的源码目录（当前为静态 HTML/CSS/JS，可逐步引入打包工具）。
- **dmusic-chrome**：负责 MV3 `manifest`、service worker，以及 **`npm run build` 将 core 资源同步到 `dist/`**。

## 与 OpenSpec 的对应关系

详见仓库根 `openspec/changes/dmusic-chrome-musicfree-player/`：`musicfree-plugin-catalog`、`player-core-integration` 将在 core 内实现目录模型与适配器；chrome 包仅负责权限与存储桥接。

## 构建约定

- 不得在 `dmusic-chrome` 中手写大段与 core 重复的播放器 UI；同步由 `dmusic-chrome/scripts/build.cjs` 完成。
