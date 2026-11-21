import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const runtimeBase = 'ad6ecd43f7dfbe5f7e67d761bc0a95095ae69833';
const paths = ['dist/game.js', 'dist/square/host.js'];
const sourceChanges = execFileSync('git', ['diff', '--name-only', '--relative', runtimeBase, 'HEAD', '--', 'dist'], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
assert.ok(sourceChanges.length === 0 || sourceChanges.join(',') === paths.join(','), 'Runtime must match the known regression base or the scoped fix');
const touch = process.env.SQUARE_DEVICE === 'phone';
const source = await readFile('dist/game.js', 'utf8');
const marker = 'window.dormiGame=Object.freeze({getState:readState});';
assert.equal(source.split(marker).length, 2);
const approach = String.raw`

  window.squareProbe = (() => {
    const tick = square.tick.bind(square);
    const draw = renderer.render.bind(renderer);
    const clear = renderer.clear.bind(renderer);
    let samples = {}, startedAt = null, stride = 1, frame = 0, inDraw = false, capture = false;
    const shouldDraw = () => capture || frame % stride === 0;
    renderer.clear = (...args) => { if (inDraw || shouldDraw()) return clear(...args); };
    renderer.render = (...args) => {
      const paint = shouldDraw();
      frame++;
      if (paint) {
        inDraw = true;
        try { return draw(...args); }
        finally { inDraw = false; }
      }
    };
    square.tick = dt => {
      const phase = square.snapshot()?.phase;
      const now = performance.now();
      if (phase) {
        const key = phase + (stride > 1 ? '-sampled' : '-full');
        const p = samples[key] ??= { frames: 0, sim: 0, from: now, until: now };
        p.frames++;
        p.sim += dt;
        p.until = now;
      }
      return tick(dt);
    };
    return {
      reset() { samples = {}; startedAt = performance.now(); stride = 1; },
      stride(n) { stride = n; },
      capture(n) { capture = n; },
      read() {
        return {
          wallSeconds: Math.round(performance.now() - startedAt) / 1000,
          samples: Object.fromEntries(Object.entries(samples).map(([k,v]) => [k, {
            frames: v.frames, simSeconds: +v.sim.toFixed(3), wallSeconds: +((v.until-v.from)/1000).toFixed(3)
          }]))
        };
      },
    };
  })();
  window.squareApproach = () => {
    const id = 'courtyard.group-activities';
    const target = interactionWorld().interactables.find(t => t.id === id);
    if (!target) throw Error('Group activities target is missing');
    const original = player.position.clone();
    const world = collision();
    for (const distance of [0,.25,.45,.65,.8,1,1.2,1.45]) for (let i = 0; i < 24; i++) {
      const angle = i * Math.PI / 12;
      const x = target.at.x + Math.cos(angle) * distance;
      const z = target.at.z + Math.sin(angle) * distance;
      if (!canMove(world,x,z) || !lineClear(world,{x,z},target.at,RADIUS)) continue;
      player.position.set(x,.05,z);
      if (nearby()?.id !== id) continue;
      locomotion.cancel();
      cam.snapFollow?.(player.position);
      return {id,x,z,distance};
    }
    player.position.copy(original);
    throw Error('No legal approach exposes the group activities');
  };`;
const origin = 'http://127.0.0.1:4173/';
const out = 'qa/courtyard-group-use/' + (touch ? 'phone' : 'edge');
await mkdir(out, { recursive: true });
const server = spawn(process.execPath, ['scripts/serve.mjs'], { stdio: 'ignore' });
let browser;
const pageErrors = new Map();
const httpErrors = [];
const results = [];
try {
  for (let i = 0; i < 40; i++) {
    if (await fetch(origin, { signal: AbortSignal.timeout(1000) }).then(r => r.ok, () => false)) break;
    if (i === 39) throw Error('App server did not respond');
    await new Promise(r => setTimeout(r, 250));
  }
  browser = await chromium.launch({
    channel: touch ? 'chrome' : 'msedge',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio'],
  });
  const context = await browser.newContext({ viewport: touch ? { width: 320, height: 568 } : { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: touch, hasTouch: touch });
  await context.route(origin + 'game.js', route => route.fulfill({ contentType: 'application/javascript', body: source.replace(marker, marker + approach) }));
  const page = await context.newPage();
  page.on('pageerror', error => {
    if (pageErrors.has(error.message)) return;
    pageErrors.set(error.message, error.stack);
    console.error(error.stack);
  });
  page.on('response', r => { if (r.status() >= 400) httpErrors.push([r.status(), r.url()]); });
  const get = s => page.locator(s);
  const click = s => {
    const locator = typeof s === 'string' ? get(s) : s;
    return touch ? locator.tap({timeout: 12000}) : locator.click({timeout: 12000});
  };
  const state = () => page.evaluate(() => window.dormiGame.getState());
  const wait = (fn, arg = null, timeout = 30000) => page.waitForFunction(fn, arg, { timeout });
  const shot = async name => {
    await page.evaluate(() => { window.squareProbe.capture(true); return new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))); });
    try { await page.screenshot({ path: out + '/' + name + '.png', timeout: 18000 }); }
    finally { await page.evaluate(() => window.squareProbe.capture(false)); }
  };
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await wait(() => window.dormiGame?.getState().ready, null, 100000);
  await click(page.getByRole('button', { name: '마을 둘러보기', exact: true }));
  if ((await state()).roomId !== 'courtyard') {
    await click('#village-map');
    await click(get('[data-map-place="courtyard"]:visible').first());
    await click('#map-travel');
  }
  await wait(() => { const s = window.dormiGame.getState(); return s.roomId === 'courtyard' && !s.inputLocked; });

  const test = async (name, actions) => {
    try {
      await page.evaluate(() => window.squareApproach());
      await click('#action');
      await page.evaluate(() => window.squareProbe.reset());
      await click('#square-' + name);
      if (!touch && sourceChanges.length) {
        await wait(() => window.dormiGame.getState().squareRuntime?.phase === 'gathering', null, 45000);
        await page.waitForTimeout(8000);
        console.log('SQUARE_RAW_GATHER', name, JSON.stringify(await page.evaluate(() => window.squareProbe.read())));
        await page.evaluate(() => window.squareProbe.stride(8));
      }
      await get('#square-start').waitFor({ state: 'visible', timeout: sourceChanges.length ? 150000 : 10000 });
      const gather = await page.evaluate(() => window.squareProbe.read());
      console.log('SQUARE_GATHER', name, JSON.stringify(gather));
      await shot(name + '-ready');
      await click('#square-start');
      await wait(() => window.dormiGame.getState().squareRuntime?.phase === 'playing', null, 45000);
      const result = await actions();
      await click('#square-leave');
      await wait(() => { const s = window.dormiGame.getState(); return s.roomId === 'courtyard' && !s.squareRuntime && !s.inputLocked && !document.querySelector('dialog[open]'); });
      const prior = (await state()).worldPosition;
      if (!touch) {
        await page.keyboard.down('KeyW');
        try {
          await wait(p => { const q = window.dormiGame.getState().worldPosition; return Math.hypot(q.x - p.x, q.z - p.z) > .15; }, prior, 10000);
        } finally { await page.keyboard.up('KeyW'); }
      }
      await shot(name + '-exited');
      results.push({ name, passed: true, result, gather });
    } catch(error) {
      results.push({ name, passed: false, error: String(error).slice(0, 900), state: (await state()).squareRuntime, gather: await page.evaluate(() => window.squareProbe.read()) });
      await shot(name + '-error').catch(() => {});
      await click('#square-leave').catch(() => {});
    }
    console.log('SQUARE_RESULT', JSON.stringify(results.at(-1)));
  };
  await test('calm', async () => {
    await shot('exercise-playing');
    await click('#square-pause');
    assert.equal((await state()).squareRuntime.paused, true);
    await click('#square-pause');
    assert.equal((await state()).squareRuntime.paused, false);
    await wait(() => window.dormiGame.getState().squareRuntime?.phase === 'result', null, 160000);
    const result = await get('#square-status').innerText();
    assert.match(result, /함께.*움직였어요/);
    await shot('exercise-result');
    return result;
  });
  await test('rope-timed', async () => {
    await get('#square-tap').waitFor({ state: 'visible', timeout: 10000 });
    const sample = page.evaluate(() => new Promise(resolve => {
      const deadline = performance.now() + 12000;
      function frame() {
        const square = window.dormiGame.getState().squareRuntime;
        if (square?.jumpHeight > .12 || performance.now() > deadline) resolve(square?.jumpHeight ?? 0);
        else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }));
    if (touch) await click('#square-tap'); else await page.keyboard.press('Space');
    const jumpHeight = await sample;
    assert.ok(jumpHeight > .12, 'Native jump input moved the character above the ground');
    await wait(() => ['rest', 'result'].includes(window.dormiGame.getState().squareRuntime?.phase), null, 25000);
    const result = { jumpHeight, status: await get('#square-status').innerText(), completed: (await state()).squareRuntime.completed };
    assert.ok(result.completed >= 1);
    await shot('rope-result');
    return result;
  });
  assert.ok(results.every(result => result.passed), 'Both exercise and timed rope must complete and return');
  assert.deepEqual([...pageErrors], []);
  assert.deepEqual(httpErrors, []);
} finally {
  const report = { runtimeBase, sourceChanges, browser: browser?.version(), touch, results, pageErrors: [...pageErrors], httpErrors };
  await writeFile(out + '/results.json', JSON.stringify(report, null, 2));
  console.log('SQUARE_SUMMARY', JSON.stringify(report));
  await browser?.close();
  server.kill();
}
