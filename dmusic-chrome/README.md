# dmusic-chrome

Chrome Manifest V3 扩展：**`npm install`**（会执行 **`postinstall` → `npm run build`**）生成 **`dist/`**。

## 开发

```bash
cd dmusic-chrome
npm install
npm run verify:manifest
```

在 Chrome 打开 `chrome://extensions` →「加载已解压的扩展程序」→ 选择本目录下的 **`dist`**。

## 说明

- 业务与 UI 源码在 **`../dmusic-core`**；构建脚本将其同步到 `dist/`（见 `scripts/build.cjs`）。
- 当前 `host_permissions` 为空壳；接入具体音源适配器后按 OpenSpec 逐条追加并附场景说明。
- 目录合并：`chrome.storage.local` 键 `dmusic.catalog.overlay`；播放器页通过 `GET_MERGED_CATALOG` / `SET_ENTRY_ENABLED` 与 service worker 同步。
