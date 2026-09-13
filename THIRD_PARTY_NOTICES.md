# 第三方材料说明 / Third-party notices

## Noto Sans SC 字体 / Fonts

`panel/assets/noto-sans-sc-{400,500,700}.woff2` 是从原宿主插件原样迁入的本地 Noto Sans SC 字体。三份字体内嵌版权信息均为：

The three local Noto Sans SC font files were preserved byte-for-byte from the original host plugin. Their embedded copyright metadata identifies:

> (c) 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source'.

字体适用 SIL Open Font License 1.1。完整许可证随安装包保存在 [OFL-NotoSansSC.txt](panel/assets/OFL-NotoSansSC.txt)，来源为 [Google Fonts 的 Noto Sans SC 许可证](https://github.com/google/fonts/blob/main/ofl/notosanssc/OFL.txt)。插件源码的许可状态不改变字体许可。

The fonts are licensed under the SIL Open Font License 1.1. The full license is included in [OFL-NotoSansSC.txt](panel/assets/OFL-NotoSansSC.txt), sourced from [Google Fonts' Noto Sans SC license](https://github.com/google/fonts/blob/main/ofl/notosanssc/OFL.txt). The plugin source's licensing status does not override this font license.

## 项目代码与图形 / Project code and artwork

`tool.js`、`panel/*.js`、`panel/*.html`、`panel/*.css` 和其余图形资源迁自吐梨邦原超级剪贴板插件。本仓库公开不等于新增开源授权；当前未为这些文件声明新的开源许可证。`panel/markdown.js` 是原插件自身的转换器，并未打包第三方 Markdown 库。

`tool.js`, the panel scripts, HTML/CSS, and remaining artwork originate from the existing Super Clipboard plugin in 吐梨邦. Making this repository public does not grant a new open-source license; none has been declared for these files. `panel/markdown.js` is the original plugin's converter, not a bundled third-party Markdown library.

## 仅开发依赖 / Development-only dependency

[`@xmldom/xmldom`](https://github.com/xmldom/xmldom)（MIT）仅用于独立的 Markdown 回归测试。它不进入 `plugin.zip`；安装开发依赖后，其许可证位于 `node_modules/@xmldom/xmldom/LICENSE`。

[`@xmldom/xmldom`](https://github.com/xmldom/xmldom) (MIT) is used only by standalone Markdown regression tests. It is excluded from `plugin.zip`; its license is available at `node_modules/@xmldom/xmldom/LICENSE` after installing development dependencies.
