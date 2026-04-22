# dmusic-chrome

**Chrome MV3 扩展工程目录**：`manifest.json`、`background.js`、`dnr_bilibili_cdn.json`、`vite.config.mjs`、`player.html`（Vite 入口）、`src/player-entry.js`。业务真源在同级 **`dmusic-core`**；执行 **`npm run build`** 后产出 **`dist/`**，在 Chrome 中「加载已解压的扩展程序」应选择 **`dist/`**。

## 目录关系

```text
仓库根/
  dmusic/
    dmusic-core/     # 通用源码（真源）
    dmusic-chrome/   # 本目录（构建配置 + MV3 壳；可加载目录为 dist/）
```

## 开发与加载

1. 在本目录安装依赖（`postinstall` 会执行一次 **`npm run build`** 生成 `dist/`）：

   ```bash
   cd dmusic/dmusic-chrome
   npm install
   ```

2. Chrome 打开 `chrome://extensions` → **加载已解压的扩展程序** → 选择 **`dmusic-chrome/dist`**（不要选 `dmusic-core`）。

3. 修改 **`dmusic-core`** 下 `js/`、`css/`、`user-sources/` 等后，在本目录执行 **`npm run build`**，再在扩展卡片上点 **重新加载**。

4. 本地调试可用 **`npm run dev`**（Vite）；仍须在 `chrome://extensions` 中加载 **`dist`** 时，请在改代码后执行 **`npm run build`** 再重载扩展（或自行配置扩展热重载流程）。

## 说明

- **`npm run sync`** 已弃用，仅打印迁移提示；请勿依赖整树复制到 `dmusic-chrome` 根目录。
- 若曾存在根下的 `js/`、`css/` 等镜像目录，可删除；**`.gitignore`** 已忽略这些路径以免误提交。
- 架构说明见 [`../dmusic-core/docs/ARCHITECTURE.md`](../dmusic-core/docs/ARCHITECTURE.md)。
