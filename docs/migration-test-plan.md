# 官方市场迁移与验收计划 / Marketplace migration and test plan

## 范围 / Scope

将已有超级剪贴板作为独立官方市场插件发布，保留 `super-clipboard` 身份、既有面板资源及全部行为。删除内置专用的默认停用声明；用户安装并授权后按普通插件启用。源码来自桌宠宿主 2026-09-13 归档，归档只读。本项目不修改宿主 UI、插件运行时或用户数据。

Publish the existing Super Clipboard as an independently installed official marketplace plugin. Preserve the `super-clipboard` identity, panel assets, and behavior. Remove the built-in-only opt-in activation flag; normal installation and permission approval enable the plugin. The source archive remains untouched. Host UI, runtime, and user profiles are outside this repository's scope.

最低宿主版本采用 `0.21.0`：旧版仍包含同 ID 内置插件，不能视为可安装市场版本。配套宿主源码已适配，正式宿主安装包另行发布。

The minimum host version is `0.21.0`: older hosts retain a built-in plugin with the same ID and cannot be treated as marketplace-installation-compatible. Companion host source is adapted; the production host installer is released separately.

## 文件与边界 / Files and boundaries

- `manifest.json`: 1.1.0、公开 SDK 权限、最低宿主版本；无 builtin/host/auth 特权。 / Version 1.1.0, public SDK permissions, minimum host version; no built-in privileges.
- `tool.js`, `panel/**`: 原样迁入；补字体授权文件。 / Preserve application code and visuals; add font licensing material.
- `scripts/build-plugin.py`, `package-files.json`: 确定性白名单 ZIP 和 SHA-256；拒绝符号链接、缺文件、路径穿越。 / Reproducible allowlisted ZIP and SHA-256; reject symlinks, missing files, and path traversal.
- `tests/**`, `package.json`: 独立具名测试与 `test:gate` 聚合。 / Named standalone tests and an aggregate gate.
- `.github/workflows/**`: CI 验证，版本标签触发 GitHub Release，发布 ZIP 与校验值。 / CI checks; tagged releases publish ZIP and checksum.
- `README.md`, `THIRD_PARTY_NOTICES.md`: 中英双语安装、权限隐私、开发发布说明；不擅自授予新的源码许可。 / Bilingual installation, permissions/privacy, development/release guidance; no newly invented source license.

## 验收矩阵 / Acceptance matrix

| 路径 / Path | 断言 / Assertion | 层次 / Layer |
| --- | --- | --- |
| 正常启用 / Activation | 仅通过公开 clipboard SDK 启动历史；错误传回宿主 / Starts history using the public clipboard SDK; errors propagate | 独立 Node 测试 / Node test |
| 文本发送 / Text forwarding | 纯文本回退、HTML 格式/安全链接、文件名去重行为保留 / Preserve plain-text fallback, HTML formatting/safe links, and filename uniqueness | 独立 Node 测试 / Node test |
| 安装包 / Package | manifest 根目录、白名单字节一致、hash 与 ZIP 对应 / Root manifest, exact allowlisted bytes, matching checksum | Python 测试 / Python test |
| 失败路径 / Invalid source | 缺文件、重复条目、符号链接、路径穿越、版本错配均拒绝构建 / Reject missing files, duplicate entries, symlinks, path traversal, and version mismatch | Python 测试 / Python test |
| 可重现性 / Reproducibility | 源时间戳/权限变化、无关敏感文件不影响产物；固定 ZIP 元数据 / Metadata changes and unrelated sensitive files do not affect output | Python 测试 / Python test |
| 真实市场安装 / Marketplace installation | 安装后 builtin=false，面板可用，剪贴板历史/置顶数据跨重启，卸载停止资源 / Ordinary installation, working panel, history/pin persistence, uninstall cleanup | 主任务隐藏 Electron E2E / Lead agent hidden Electron E2E |

独立测试不会假称完成真实 Electron 验收。主任务负责在发布前跑宿主真实市场安装链路及相邻回归。测试使用隔离资料目录，自动窗口在首帧前隐藏，不操作日常剪贴板。

Standalone checks do not substitute for Electron acceptance. The lead task runs the actual marketplace installation path and adjacent regression suite before publication, with isolated profiles and windows hidden before first paint; it does not manipulate the daily clipboard.

## 风险与回滚 / Risks and rollback

剪贴板历史属于高敏权限；说明其后台采集、本地存储和手动发送边界。剪贴板与派差事 SDK 尚属 experimental，最低宿主版本以已核实实现为准。不重写归档和宿主 Git 历史。回滚发布使用新补丁版或市场下架，不覆盖已发布 ZIP，也不删回归断言。

Clipboard history is sensitive: document background collection, local storage, and explicit forwarding boundaries. Clipboard and errands SDKs remain experimental; set the minimum host version to a verified implementation. Preserve archive and host Git history. Roll back with a new patch release or marketplace removal, never by replacing published ZIP bytes or deleting regression assertions.

## 执行命令 / Commands

`npm test` / `npm run test:gate`, `npm run test:plugin`, `npm run test:markdown`, `npm run test:build`, `npm run build`, `git diff --check`.
