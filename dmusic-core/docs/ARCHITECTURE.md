# dmusic 四包架构

## 目录与职责

| 包 | 职责 |
|----|------|
| **dmusic-core** | 播放器 UI 与业务逻辑、样式、`user-sources` 模块、`vendor/forge`、API 文档；[`js/core-bootstrap.js`](../js/core-bootstrap.js) 负责跨宿主的最小 `chrome` 兼容（网页 / Electron / 扩展检测）。 |
| **dmusic-chrome** | Chrome MV3：`manifest.json`、`background.js`、`dnr_bilibili_cdn.json`；**不含**业务源码真源。在 `dmusic-chrome` 执行 **`npm run build`（Vite）** 从 `dmusic-core` 产出 **`dist/`** 可加载目录；Chrome「加载已解压」须指向 **`dist/`**（扩展资源须在安装根内可解析，不要求在 git 中保留与 core 逐文件镜像）。 |
| **dmusic-desktop** | Electron：`main.js`、`preload.js`；从 `../dmusic-core/player.html` 加载窗口；Cookie 经 IPC。 |
| **dmusic-site** | 本地静态预览：`serve ../dmusic-core`；无 MV3。 |

## Chrome 扩展单根约束

扩展页在 **`chrome-extension://…`** 下运行；`player.html` 及其引用的脚本、样式、`user-sources` 等须能在**所选安装根**（例如解压目录 **`dist/`**）内解析。`dmusic-core` 仍是业务真源；**不要求**在 `dmusic-chrome` 仓库根再维护一份与 core 完全相同的 `js/` 树，由构建写入 `dist/` 即可。

## 构建命令（dmusic-chrome）

在 [`dmusic-chrome`](../../dmusic-chrome) 目录（与 `dmusic-core` 同在 `dmusic/` 下并列）执行：

```bash
npm install
npm run build
```

然后在 Chrome「加载已解压的扩展程序」中选择 **`dmusic-chrome/dist`**（不要选 `dmusic-core` 或仅含源码的 `dmusic-chrome` 根目录）。

旧命令 **`npm run sync`** 已弃用，仅打印说明。

## 能力矩阵（简要）

| 能力 | dmusic-chrome | dmusic-desktop | dmusic-site |
|------|---------------|----------------|-------------|
| `host_permissions` / DNR | 是 | 否 | 否 |
| `chrome.cookies` | 是 | IPC 模拟 | 否 |
| 动态 `import(user-sources)` | `chrome-extension:` URL | `file:` URL（preload getURL） | `http(s):` URL（core-bootstrap） |

更细的接口说明见 [MUSIC_SOURCES_API.md](./MUSIC_SOURCES_API.md)。
