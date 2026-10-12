import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const html = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const bootstrap = html.match(/<script id="startup-bootstrap">([\s\S]*?)<\/script>/)?.[1];

function runBootstrap(createLoader) {
  assert.ok(bootstrap, 'index.html must keep the startup recovery bootstrap');
  assert.match(bootstrap, /return import\('\.\/game\.js'\)\.catch\(/);
  const fallback = { hidden: true };
  const title = { textContent: '3D 화면을 열지 못했어요' };
  const message = { textContent: '' };
  const loading = { hidden: false };
  const retry = {
    disabled: false,
    textContent: '다시 열기',
    onclick: null,
  };
  const elements = { fallback, 'fallback-title': title, 'fallback-text': message, loading, retry };
  let reloads = 0;
  const logged = [];
  const document = {
    body: { dataset: {} },
    getElementById(id) {
      assert.ok(elements[id], `unexpected bootstrap element: ${id}`);
      return elements[id];
    },
  };
  const window = { loadGame: createLoader(retry), location: { reload() { reloads++; } } };
  // Replace only the browser's module-loader primitive. The production catch,
  // accessible error UI, click guard and reload path run unmodified.
  const executable = bootstrap.replace("import('./game.js')", 'window.loadGame()');
  assert.notEqual(executable, bootstrap);
  const context = vm.createContext({ document, window, console: { error: (...args) => logged.push(args) } });
  const result = new vm.Script(executable, { filename: 'dist/index.html#startup-bootstrap' }).runInContext(context);
  return { result, fallback, title, message, loading, retry, document, logged, get reloads() { return reloads; } };
}

test('startup module/dependency rejection announces failure and offers one safe full-page retry', async () => {
  let imports = 0;
  let priorHandlerCalls = 0;
  const state = runBootstrap(retry => () => {
    imports++;
    // Simulate the rare case where game.js bound its own runtime retry UI
    // before a later top-level exception rejected module evaluation.
    retry.onclick = () => priorHandlerCalls++;
    return Promise.reject(new TypeError('simulated module fetch or dependency evaluation failure'));
  });
  await state.result;

  assert.equal(imports, 1);
  assert.equal(state.loading.hidden, true);
  assert.equal(state.fallback.hidden, false);
  assert.equal(state.document.body.dataset.state, 'error');
  assert.equal(state.title.textContent, '게임을 시작하지 못했어요');
  assert.match(state.message.textContent, /게임 시작에 필요한 파일을 불러오거나 실행하지 못했어요/);
  assert.match(state.message.textContent, /다시 열기를 눌러 주세요/);
  assert.match(state.message.textContent, /문제가 계속되면 인터넷 연결을 확인해 주세요/);
  assert.match(state.message.textContent, /저장된 놀이는 그대로 남아 있어요/);
  assert.equal(typeof state.retry.onclick, 'function');

  state.retry.onclick();
  state.retry.onclick();
  assert.equal(state.reloads, 1, 'double-click must not request multiple reloads');
  assert.equal(state.retry.disabled, true);
  assert.equal(state.retry.textContent, '다시 여는 중…');
  assert.equal(imports, 1, 'retry reloads the document rather than initializing the game twice');
  assert.equal(priorHandlerCalls, 0, 'the bootstrap takes exclusive retry ownership after import rejection');
  assert.equal(state.logged.length, 1);
});

test('successful game-module load leaves normal startup UI and the existing runtime retry owner untouched', async () => {
  let imports = 0;
  const runtimeRetry = () => {};
  const state = runBootstrap(retry => () => {
    imports++;
    retry.onclick = runtimeRetry;
    return Promise.resolve({});
  });
  await state.result;

  assert.equal(imports, 1);
  assert.equal(state.loading.hidden, false);
  assert.equal(state.fallback.hidden, true);
  assert.equal(state.retry.onclick, runtimeRetry);
  assert.equal(state.reloads, 0);
});

test('startup bootstrap is self-contained and replaces the former uncaught static module entry', () => {
  assert.doesNotMatch(html, /<script type="module" src="game\.js"><\/script>/);
  assert.doesNotThrow(() => new vm.Script(bootstrap), 'the inline classic bootstrap must parse before it can catch network failures');
  assert.match(bootstrap, /console\.error\('Dormi startup failed',error\)/);
  assert.match(bootstrap, /retry\.onclick=/);
  assert.match(bootstrap, /window\.location\.reload\(\)/);
});
