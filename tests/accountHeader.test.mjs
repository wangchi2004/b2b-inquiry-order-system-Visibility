import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';

async function renderHeader(user, locale) {
  let source = await readFile(new URL('../src/components/storefront/ShopHeader.tsx', import.meta.url), 'utf8');
  source = source.replace(/^import .*;\n/gm, '');
  source = `import { shopText } from ${JSON.stringify(new URL('../src/i18n/shopText.ts', import.meta.url).href)};\nimport { createElement, Fragment } from ${JSON.stringify(import.meta.resolve('react'))};\nconst Link = ({children, ...props}) => createElement('a', props, children);\nconst ShopIcon = () => null;\nconst LanguageSwitcher = () => createElement("select", {"aria-label":"Language"});\nconst accountUser = async () => (${JSON.stringify(user)});\n${source}`;
  const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.React, jsxFactory: 'createElement', jsxFragmentFactory: 'Fragment', module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { ShopHeader } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
  return renderToStaticMarkup(await ShopHeader({ locale }));
}
test('guest header offers separate registration and sign-in destinations', async () => {
  const html = await renderHeader(null, 'zh');
  assert.match(html, /href="\/zh\/register"/);
  assert.match(html, /注册新用户/);
  assert.match(html, /href="\/zh\/account"/);
  assert.match(html, /登录/);
  assert.doesNotMatch(html, /已登录/);
});
test('authenticated header shows current email instead of guest actions', async () => {
  const html = await renderHeader({ email: 'buyer@example.com' }, 'zh');
  assert.match(html, /已登录/);
  assert.match(html, /buyer@example.com/);
  assert.match(html, /href="\/zh\/account"/);
  assert.doesNotMatch(html, /\/register/);
  assert.doesNotMatch(html, /注册新用户/);
});
test('account email is escaped and locale-specific links are preserved', async () => {
  const html = await renderHeader({ email: '<script>@example.com' }, 'en');
  assert.match(html, /&lt;script&gt;@example.com/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /Signed in/);
  assert.match(html, /href="\/en\/account"/);
});

test('Korean language selection renders Korean header text', async () => {
  const html = await renderHeader({ email: 'buyer@example.com' }, 'ko');
  assert.match(html, /신발 수선 자재/);
  assert.match(html, /로그인됨/);
  assert.doesNotMatch(html, />Shoe Repair Materials</);
});
