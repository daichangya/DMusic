# DMusic 四包（`dmusic/`）

原 **dmusic** 单目录已拆分为四包，请改用：

| 用途 | 目录 |
|------|------|
| 通用播放器源码（HTML/JS/CSS/用户源/vendor/文档） | [**dmusic-core**](dmusic-core/) |
| Chrome MV3 扩展（manifest / background / DNR；`npm run build` 从 core 产出 **`dist/`**） | [**dmusic-chrome**](dmusic-chrome/) |
| Electron 桌面壳 | [**dmusic-desktop**](dmusic-desktop/) |
| 本地静态网站预览 | [**dmusic-site**](dmusic-site/) |

- 加载 Chrome 扩展：进入 **`dmusic-chrome`**，执行 **`npm install`**（`postinstall` 会执行 **`npm run build`**），再在 `chrome://extensions` 中「加载已解压的扩展程序」并选择 **`dmusic-chrome/dist`**。  
- 修改业务代码：在 **`dmusic-core`** 中编辑，然后在 **`dmusic-chrome`** 下再次执行 **`npm run build`** 并重新加载扩展。

架构说明见 [dmusic-core/docs/ARCHITECTURE.md](dmusic-core/docs/ARCHITECTURE.md)。

四包均在本目录 **`dmusic/`** 下并列；若将整个 `dmusic` 挪到仓库其它路径，只要四者相对位置不变，`npm run build`（Chrome）、Electron 与 `serve` 的相对路径仍有效。

## 推送到 GitHub 前检查（查缺补漏）

1. **许可**：仓库根含 [LICENSE](LICENSE)（MIT，与上游 Listen1 一致）；`dmusic-core` 内另有副本便于单包引用。
2. **勿提交构建产物与依赖**：根 [.gitignore](.gitignore) 已忽略 `node_modules/`、`dist/` 等；克隆后须在 **`dmusic-chrome`** 执行 `npm install`（会 `build` 生成 `dist/`）再加载扩展。
3. **密钥**：确认 `user-sources`、`manifest`、脚本中无个人 token / 客户端密钥；用户源仅供本地调试时加载。
4. **子包自检**：`dmusic-desktop`、`dmusic-site` 若单独使用，各自目录下 `npm install` 一次。
5. **独立仓库**：若只推送本 `dmusic/` 目录为新仓库，请把本目录作为 Git 根（或 `git subtree split`），并在 GitHub 上补充 **About** 描述与 **Topics**（如 `chrome-extension`、`electron`、`music`）。
6. **iTunes / 网络权限**：扩展须声明 `itunes.apple.com` 等 `host_permissions`；修改 `manifest.json` 后需重新 `npm run build` 并重新加载扩展。
# dmusic
