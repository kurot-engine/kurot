import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
const core = fileURLToPath(new URL('../src/index.ts', import.meta.url));
const fixture = fileURLToPath(new URL('./background-fixture.ts', import.meta.url));
const { outputFiles } = await build({
    entryPoints: [fixture], bundle: true, format: 'iife', write: false,
    alias: { '@kurot/core': core },
});
const html = '<!doctype html><meta charset="utf-8"><title>Background logic test</title><canvas width="640" height="240"></canvas><script src="engine.js"></script>';
const server = createServer((request, response) => {
    response.setHeader('Content-Type', request.url === '/engine.js' ? 'text/javascript' : 'text/html');
    response.end(request.url === '/engine.js' ? outputFiles[0].text : html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true });
try {
    const context = await browser.newContext();
    const game = await context.newPage();
    await game.goto(url);
    await game.waitForFunction(() => probe.snapshot().frames >= 6);
    const away = await context.newPage();
    await away.goto('about:blank');
    await away.bringToFront();
    await game.evaluate(() => { window.hiddenForTest = true; Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.hiddenForTest }); document.dispatchEvent(new window.Event('visibilitychange')); });
    await game.waitForFunction(() => document.hidden, {}, { polling: 100, timeout: 5000 });
    const before = await game.evaluate(() => probe.snapshot());
    await game.waitForFunction(t => probe.snapshot().time >= t + 2200, before.time, { polling: 100 });
    const hidden = await game.evaluate(() => probe.snapshot());
    assert.equal(hidden.renders, before.renders);
    assert.ok(hidden.frames - before.frames >= 60);
    await game.evaluate(() => probe.suspend());
    const frozen = await game.evaluate(() => probe.snapshot());
    await away.evaluate(() => new Promise(r => setTimeout(r, 2200)));
    const stillFrozen = await game.evaluate(() => probe.snapshot());
    assert.equal(stillFrozen.frames, frozen.frames);
    await game.evaluate(() => probe.restore());
    await game.evaluate(() => { window.hiddenForTest = false; document.dispatchEvent(new window.Event('visibilitychange')); });
    await game.bringToFront();
    await game.waitForFunction(t => probe.snapshot().time >= t + 2100 && probe.snapshot().pending < 34, hidden.time);
    const resumed = await game.evaluate(() => probe.snapshot());
    assert.ok(resumed.frames - hidden.frames >= 60);
    await game.evaluate(() => probe.pause());
    const paused = await game.evaluate(() => probe.snapshot());
    await game.evaluate(() => { window.hiddenForTest = true; document.dispatchEvent(new window.Event('visibilitychange')); });
    await away.bringToFront();
    await away.evaluate(() => new Promise(r => setTimeout(r, 1100)));
    await game.evaluate(() => { window.hiddenForTest = false; document.dispatchEvent(new window.Event('visibilitychange')); });
    await game.bringToFront();
    const stillPaused = await game.evaluate(() => probe.snapshot());
    assert.equal(stillPaused.frames, paused.frames);
    await game.evaluate(() => probe.resume());
    await game.waitForFunction(f => probe.snapshot().frames > f + 5, paused.frames);
    await game.evaluate(() => probe.destroy());
    const destroyed = await game.evaluate(() => probe.snapshot());
    await away.bringToFront();
    await away.evaluate(() => new Promise(r => setTimeout(r, 1200)));
    await game.bringToFront();
    const afterDestroy = await game.evaluate(() => probe.snapshot());
    assert.equal(afterDestroy.frames, destroyed.frames);
    assert.equal(afterDestroy.renders, destroyed.renders);
    console.log(JSON.stringify({ controlledVisibility: true, controlledHostSuspension: true, before, hidden, frozen, stillFrozen, resumed, paused, stillPaused, destroyed, afterDestroy }, null, 2));
}
finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
}
