# 超级剪贴板 / Super Clipboard

[中文](#中文) · [English](#english)

吐梨邦的官方市场插件：记录文本和图片剪贴板历史，快速搜索、复制，并通过宠物派差事发送给好友。插件独立安装，不随宿主内置分发。

An official marketplace plugin for 吐梨邦 / Desktop Pet: keep text and image clipboard history, search and copy earlier items, and forward selected content to friends through pet errands. Installed separately from the host application.

## 中文

### 安装与使用

1. 使用支持外部安装超级剪贴板的新版吐梨邦。在 **设置 → 插件 → 市场** 搜索“超级剪贴板”，点击安装。
2. 阅读并同意剪贴板、面板、派差事和存储权限。安装后立即开始记录剪贴板；未安装时不运行。
3. 在已安装插件列表打开面板，或使用默认快捷键 **⌘⇧B（macOS）/ Ctrl+Shift+B（Windows/Linux）**。快捷键可在插件详情页修改。

插件版本：`1.1.0`；插件 ID：`super-clipboard`；SDK 版本：`1`；最低宿主版本：`0.21.0`，这是移除预装插件后的安装兼容边界。本次配套宿主源码已适配；正式宿主安装包另行发布。旧版客户端不能直接安装此市场版本，请在正式兼容版本发布后升级。市场列表受宿主刷新和网络状态影响。

也可从 [GitHub Releases](https://github.com/ShunyuYao/pet-plugin-super-clipboard/releases) 下载 `plugin.zip`，校验随附的 `plugin.zip.sha256` 后，通过插件管理的 ZIP 安装入口安装。不要用 GitHub 自动生成的 “Source code” ZIP 代替插件安装包。

### 功能

- 后台约每秒读取一次系统剪贴板，保留文本、富文本和图片；历史容量上限为 **1 GiB**，由宿主管理淘汰。
- 按全部、文本、图片筛选并搜索；点击记录即可复制。
- “叼给好友”将完整文本转换成 Markdown 文件，或发送原图片，并打开宿主现有的派差事确认流程。取消不会标记为已发送。
- 置顶按钮或 **Alt+Enter** 切换面板置顶并保存偏好；未置顶时，成功复制或发送会收起面板。
- 搜索框内按 **Escape** 清空关键词；“清空所有”须确认，只清除应用历史，不清除当前系统剪贴板。

### 权限与隐私

| 权限 | 用途 |
| --- | --- |
| `clipboard` | 持续读取剪贴板、保存和查询历史、复制选中记录、清空历史 |
| `ui` | 打开/关闭/置顶面板以及清空确认对话框 |
| `errands` | 由用户点击后调用宿主派差事发送流程 |
| `storage` | 保存面板置顶偏好 |

历史由宿主保存在当前用户资料目录内的插件私有存储中；不是加密保险箱，复制过的密码或其他敏感内容也可能被记录。插件未申请网络权限，不自行上传剪贴板；明确选择发送并确认后，所选内容通过宿主的好友传输通道交付对方。关闭面板后后台历史仍会运行；在插件管理中**卸载**会停止采集。需要删除已有历史时，卸载前使用“清空所有”。不宣称卸载一定删除宿主保留的全部数据。

### 开发与测试

开发环境为 Node.js 22+、npm 和 Python 3.9+。Python 仅用于构建和包体测试；插件运行时不需要 Python，也没有 npm 运行依赖。

```sh
git clone https://github.com/ShunyuYao/pet-plugin-super-clipboard.git
cd pet-plugin-super-clipboard
npm ci --ignore-scripts
npm test
npm run build
```

`dist/plugin.zip` 是安装包，`dist/plugin.zip.sha256` 是校验文件。构建仅打包 [package-files.json](package-files.json) 明确列出的文件，固定顺序、时间戳和权限；不包含 `node_modules`、测试、Git 元数据或本地环境文件。新增运行资源时须同步白名单。字体许可证随包保留。

| 命令 | 覆盖范围 |
| --- | --- |
| `npm test` / `npm run test:gate` | 下列所有独立检查 |
| `npm run test:plugin` | 外部插件声明、公开 SDK 激活及失败传播、本地资源引用 |
| `npm run test:markdown` | 原有 10 项 Markdown 转换回归 |
| `npm run test:build` | 包体白名单、可重现性、校验值、路径和符号链接拒绝 |
| `npm run build` | 生成安装 ZIP 与 SHA-256 |

面板使用宿主 `window.pet` API，直接在普通浏览器打开 HTML 不会连接真实剪贴板。开发时使用**独立宿主资料目录**安装本项目文件夹或构建出的 ZIP；不要把测试插件复制到日常使用资料目录。真实市场安装、历史持久化和卸载验收由宿主隐藏 Electron 集成测试覆盖；独立单元测试不替代这一发布门槛。迁移矩阵见 [migration-test-plan.md](docs/migration-test-plan.md)。本次迁移保持原面板视觉，不引入新设计。

### 发布

1. 同步修改 `manifest.json` 和 `package.json` 的版本，并更新 `package-lock.json`。
2. 执行 `npm test`、`npm run build` 和宿主隐藏 Electron 集成测试，审查要公开的源码及资源。
3. 推送已审核提交，再推送对应版本标签，例如 `v1.1.0`。
4. [Release workflow](.github/workflows/release.yml) 会核对标签版本，在 GitHub Actions 中重新测试、构建并发布 `plugin.zip` 与 `plugin.zip.sha256`。已发布文件不覆盖；修改须发新版本。
5. 在 [官方市场登记仓库](https://github.com/ShunyuYao/pet-plugin-registry) 登记 Release 下载链接、SHA-256、版本及权限。使用 **CI 实际产物** 的校验值；发布 Release 本身不会自动更新市场登记。

### 来源与许可

本项目迁自吐梨邦原超级剪贴板，独立源码由 [ShunyuYao](https://github.com/ShunyuYao) 维护。公开仓库尚未声明新的开源许可证（包元数据为 `UNLICENSED`）。Noto Sans SC 字体适用独立的 SIL OFL 1.1；详见 [第三方材料说明](THIRD_PARTY_NOTICES.md)。

## English

### Installation and use

1. Use a recent 吐梨邦 build that supports installing Super Clipboard as an external plugin. Open **Settings → Plugins → Marketplace**, search for “超级剪贴板”, and install it.
2. Review and approve the clipboard, UI, errands, and storage permissions. History collection starts after installation and approval; the plugin does not run when it is not installed.
3. Open its panel from the installed plugins list, or press **⌘⇧B on macOS / Ctrl+Shift+B on Windows and Linux**. Change the shortcut in the plugin details page.

Plugin version: `1.1.0`; plugin ID: `super-clipboard`; SDK API version: `1`; minimum host version: `0.21.0`, the installation boundary after removing preinstalled plugins. The companion host source has been adapted; the production host installer is released separately. Older clients cannot directly install this marketplace version; upgrade after a compatible production host is released. Marketplace visibility also depends on the host's refresh and network state.

Alternatively, download `plugin.zip` from [GitHub Releases](https://github.com/ShunyuYao/pet-plugin-super-clipboard/releases), verify it against `plugin.zip.sha256`, and use the ZIP installation entry in plugin management. GitHub's automatically generated “Source code” ZIP is not the installable plugin package.

### Features

- Polls the system clipboard approximately once per second and keeps text, rich text, and images. The host manages history eviction within a **1 GiB** capacity limit.
- Search history and filter by all items, text, or images. Click an item to copy it.
- “叼给好友” forwards complete text as a Markdown file or the original image through the host's existing errand confirmation flow. Cancelling does not mark the item as sent.
- Toggle and persist panel pinning with the pin button or **Alt+Enter**. An unpinned panel closes after a successful copy or send.
- **Escape** clears the search field. “清空所有” requires confirmation and clears application history without clearing the current system clipboard.

### Permissions and privacy

| Permission | Purpose |
| --- | --- |
| `clipboard` | Continuously read the clipboard; save/query history; copy selected records; clear history |
| `ui` | Open, close, and pin the panel; show the clear-history confirmation |
| `errands` | Invoke the host's forwarding flow after an explicit user action |
| `storage` | Persist the panel pin preference |

The host stores history in this plugin's private storage within the active user profile. This is not an encrypted vault: copied passwords and other sensitive content may be recorded. The plugin requests no network permission and does not independently upload clipboard content. Selecting and confirming a send delivers only the selected content through the host's friend-transfer channel. Closing the panel leaves background collection running; **uninstalling** the plugin stops collection. To erase existing history, use “清空所有” before uninstalling. Uninstallation is not a promise that every host-retained data file will be deleted.

### Development and tests

Use Node.js 22+, npm, and Python 3.9+. Python is used only for building and package tests; it is not required at plugin runtime. The installable plugin has no npm runtime dependencies.

```sh
git clone https://github.com/ShunyuYao/pet-plugin-super-clipboard.git
cd pet-plugin-super-clipboard
npm ci --ignore-scripts
npm test
npm run build
```

The outputs are `dist/plugin.zip` and `dist/plugin.zip.sha256`. The build includes only explicit entries from [package-files.json](package-files.json), with fixed ordering, timestamps, and file permissions. It excludes `node_modules`, tests, Git metadata, and local environment files. Update the allowlist when adding runtime assets. The font license remains inside the package.

| Command | Coverage |
| --- | --- |
| `npm test` / `npm run test:gate` | All standalone checks below |
| `npm run test:plugin` | External manifest, public SDK activation/failure propagation, local asset references |
| `npm run test:markdown` | The original 10 Markdown conversion regressions |
| `npm run test:build` | Allowlist, reproducibility, checksums, unsafe paths and symlink rejection |
| `npm run build` | Build the installable ZIP and SHA-256 |

The panel requires the host-provided `window.pet` API; opening its HTML in a regular browser does not connect it to the real clipboard. Install the project folder or ZIP into an **isolated host profile** during development. Do not copy test plugins into your daily profile. Actual marketplace installation, history persistence, and uninstall acceptance belong to the host's hidden Electron integration gate; standalone tests do not replace it. See [migration-test-plan.md](docs/migration-test-plan.md) for the acceptance matrix. This migration preserves the existing panel visuals.

### Releasing

1. Update the versions in `manifest.json` and `package.json`, and refresh `package-lock.json`.
2. Run `npm test`, `npm run build`, and the host's hidden Electron integration gate; review the source and assets intended for publication.
3. Push the reviewed commit, then the matching tag, such as `v1.1.0`.
4. The [release workflow](.github/workflows/release.yml) checks the tag against the manifest, reruns tests and builds in GitHub Actions, and publishes `plugin.zip` with `plugin.zip.sha256`. Published assets are not overwritten; changes require a new version.
5. Update the [official marketplace registry](https://github.com/ShunyuYao/pet-plugin-registry) with the release URL, SHA-256, version, and permissions. Use the checksum of the **actual CI artifact**. Creating a GitHub Release does not automatically update the marketplace entry.

### Origin and licensing

Extracted from the existing Super Clipboard plugin in 吐梨邦 and maintained independently by [ShunyuYao](https://github.com/ShunyuYao). No new open-source license has been declared for the project source (`UNLICENSED` package metadata). Noto Sans SC fonts remain under their separate SIL OFL 1.1 license. See [third-party notices](THIRD_PARTY_NOTICES.md).
