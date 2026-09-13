'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const manifest = require('../manifest.json');
const tool = require('../tool');

test('market installation requests only the four existing public permissions', () => {
  assert.equal(manifest.id, 'super-clipboard');
  assert.equal(manifest.version, require('../package.json').version);
  assert.equal(manifest.apiVersion, 1);
  assert.equal(manifest.minHostVersion, '0.21.0');
  assert.equal(Object.hasOwn(manifest, 'activation'), false);
  assert.equal(Object.hasOwn(manifest, 'builtin'), false);
  assert.deepEqual(manifest.permissions, ['clipboard', 'ui', 'errands', 'storage']);
  assert.deepEqual(manifest.entry.panel, {
    src: 'panel/index.html', title: '超级剪贴板', width: 380, height: 735, transparent: true
  });
});

test('activation runs without privileged host/auth APIs and waits for clipboard readiness', async () => {
  let release;
  let activated = false;
  const pending = new Promise((resolve) => { release = resolve; });
  let options;
  const ready = tool.activate({ clipboard: { startHistory(value) { options = value; return pending; } } })
    .then(() => { activated = true; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(activated, false);
  assert.deepEqual(options, { pollIntervalMs: 1000, maxBytes: 1073741824 });
  release(true);
  await ready;
  assert.equal(activated, true);
});

test('clipboard startup failure reaches the host instead of reporting successful activation', async () => {
  const error = new Error('Clipboard permission denied');
  await assert.rejects(tool.activate({ clipboard: { startHistory: async () => { throw error; } } }), error);
});

test('the panel loads only packaged scripts, styles, and assets', () => {
  const root = path.resolve(__dirname, '..');
  const allowlist = new Set(require('../package-files.json'));
  for (const name of ['panel/index.html', 'panel/panel.css', 'panel/panel.js']) {
    const source = fs.readFileSync(path.join(root, name), 'utf8');
    const references = name.endsWith('.html')
      ? [...source.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1])
      : name.endsWith('.css')
        ? [...source.matchAll(/url\(['"]?([^)'"\s]+)/g)].map((match) => match[1])
        : [...source.matchAll(/['"](assets\/[^'"]+)['"]/g)].map((match) => match[1]);
    for (const reference of references) {
      assert.equal(/^(?:https?:)?\/\//i.test(reference), false, reference);
      assert.equal(allowlist.has('panel/' + reference), true, reference);
    }
  }
});
