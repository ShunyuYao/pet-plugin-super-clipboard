'use strict';

const assert = require('assert');
const { DOMParser } = require('@xmldom/xmldom');
const markdown = require('../panel/markdown.js');

let passed = 0;
let failed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log('  PASS  ' + name);
  } catch (error) {
    failed++;
    console.error('  FAIL  ' + name + '\n        ' + error.stack);
  }
}

const parserOptions = { DOMParser };

console.log('Super Clipboard Markdown');

check('标题、粗体、斜体、段落和 br 转换', () => {
  const actual = markdown.toMarkdown({
    html: '<h1>一级</h1><h2>二级</h2><h3>三级</h3><p>普通 <strong>粗体</strong> 与 <em>斜体</em><br>下一行</p>',
    plain: '不应使用的降级文本'
  }, parserOptions);
  assert.strictEqual(actual, '# 一级\n\n## 二级\n\n### 三级\n\n普通 **粗体** 与 *斜体*\n下一行');
});

check('有序/无序列表保留合理嵌套', () => {
  const actual = markdown.htmlToMarkdown('<ol><li>第一<ul><li>子项 A</li><li>子项 B</li></ul></li><li>第二</li></ol>', parserOptions);
  assert.strictEqual(actual, '1. 第一\n  - 子项 A\n  - 子项 B\n2. 第二');
});

check('安全链接仅允许 http/https/mailto', () => {
  const actual = markdown.htmlToMarkdown([
    '<p>',
    '<a href="https://example.com/a?b=1">HTTPS</a> ',
    '<a href="http://example.com">HTTP</a> ',
    '<a href="mailto:hello@example.com">邮件</a> ',
    '<a href="javascript:alert(1)">JS</a> ',
    '<a href="data:text/html,bad">Data</a> ',
    '<a href="/relative">相对</a>',
    '</p>'
  ].join(''), parserOptions);
  assert.strictEqual(actual, '[HTTPS](https://example.com/a?b=1) [HTTP](http://example.com) [邮件](mailto:hello@example.com) JS Data 相对');
});

check('行内代码和 fenced pre code 转换且 fence 可扩展', () => {
  const actual = markdown.htmlToMarkdown('<p>执行 <code>a`b</code></p><pre><code class="language-js">const tick = "```";\nrun();</code></pre>', parserOptions);
  assert.strictEqual(actual, '执行 ``a`b``\n\n````js\nconst tick = "```";\nrun();\n````');
});

check('blockquote 保留多行语义', () => {
  const actual = markdown.htmlToMarkdown('<blockquote><p>第一行<br>第二行</p><p>第二段</p></blockquote>', parserOptions);
  assert.strictEqual(actual, '> 第一行\n> 第二行\n>\n> 第二段');
});

check('script/style/iframe 等危险节点连内容一起丢弃，普通未知标签保留安全可见文本', () => {
  const actual = markdown.htmlToMarkdown('<div>保留 <span style="color:red">正文</span><script>steal()</script><style>.x{}</style><iframe>evil</iframe><custom>尾部</custom></div>', parserOptions);
  assert.strictEqual(actual, '保留 正文尾部');
  assert.ok(!actual.includes('steal'));
  assert.ok(!actual.includes('.x'));
  assert.ok(!actual.includes('evil'));
});

check('解析失败完整回落 plain 并规范化空行', () => {
  class BrokenParser { parseFromString() { throw new Error('broken'); } }
  const plain = '完整第一段\r\n\r\n\r\n完整第二段\n末行   ';
  assert.strictEqual(markdown.toMarkdown({ html: '<p>截断预览</p>', plain }, { DOMParser: BrokenParser }), '完整第一段\n\n完整第二段\n末行');
});

check('生成内容来自完整原文而非 preview 字段', () => {
  const input = {
    html: '<p>第一段完整内容</p><p>第二段完整内容和结尾</p>',
    plain: '第一段完整内容\n\n第二段完整内容和结尾',
    preview: '第一段完…'
  };
  const actual = markdown.toMarkdown(input, parserOptions);
  assert.ok(actual.includes('第二段完整内容和结尾'));
  assert.ok(!actual.includes('第一段完…'));
});

check('plain-only 内容保留完整段落与换行', () => {
  assert.strictEqual(markdown.toMarkdown({ plain: '甲\n乙\n\n丙' }, parserOptions), '甲\n乙\n\n丙');
});

check('同一分钟文件名使用 -2/-3 序号，跨分钟重置', () => {
  const next = markdown.createFilenameFactory();
  const sameMinute = new Date(2026, 7, 16, 14, 30, 12);
  assert.strictEqual(next(sameMinute), '剪贴板内容-2026-08-16-1430.md');
  assert.strictEqual(next(new Date(2026, 7, 16, 14, 30, 59)), '剪贴板内容-2026-08-16-1430-2.md');
  assert.strictEqual(next(new Date(2026, 7, 16, 14, 30, 59)), '剪贴板内容-2026-08-16-1430-3.md');
  assert.strictEqual(next(new Date(2026, 7, 16, 14, 31, 0)), '剪贴板内容-2026-08-16-1431.md');
});

console.log(failed ? `\n${failed} 项失败 / ${passed} 项通过` : `\n全部通过（${passed} 项）`);
process.exit(failed ? 1 : 0);
