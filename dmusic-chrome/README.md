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
- `host_permissions`（须与实现一致，变更时请更新下表）：

| 域名 | 场景 |
|------|------|
| `https://u.y.qq.com/*` | 小秋源：QQ 音乐搜索 `musicu.fcg` |
| `https://lxmusicapi.onrender.com/*` | 小秋源：播放地址解析（与 MusicFree `xiaoqiu.js` 同源第三方） |
| `https://y.gtimg.cn/*` | 封面图资源 |
- 目录合并：`chrome.storage.local` 键 `dmusic.catalog.overlay`；播放器页通过 `GET_MERGED_CATALOG` / `SET_ENTRY_ENABLED` 与 service worker 同步。
