import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';

const fixture = fileURLToPath(new URL('./cache-list-fixture.ts', import.meta.url));
const sources = { current: fileURLToPath(new URL('../src/index.ts', import.meta.url)) };
if (process.env.KUROT_CACHE_BASELINE) {
    sources.baseline = resolve(process.env.KUROT_CACHE_BASELINE, 'dist/index.js');
}
const bundles = {};
for (const [name, core] of Object.entries(sources)) {
    const { outputFiles } = await build({
        entryPoints: [fixture], bundle: true, format: 'iife', write: false,
        alias: { '@kurot/core': core },
    });
    bundles[`/${name}.js`] = outputFiles[0].text;
}
const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const script = bundles[url.pathname];
    response.setHeader('Content-Type', script ? 'text/javascript' : 'text/html');
    response.end(script ?? `<!doctype html><meta charset="utf-8"><style>canvas{width:640px;height:480px}</style><canvas width="640" height="480"></canvas><script src="/${url.searchParams.get('version') ?? 'current'}.js"></script>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const headed = process.env.KUROT_CACHE_HEADED === '1';
const browser = await chromium.launch({ headless: !headed });
try {
    const results = [];
    for (let trial = 0; trial < 3; trial++) {
        for (const workload of ['scroll', 'content']) {
            for (const cached of [false, true]) {
                const versions = Object.keys(sources);
                if (trial % 2) {
                    versions.reverse();
                }
                for (const version of versions) {
                    const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
                    const errors = [];
                    page.on('pageerror', error => errors.push(error.message));
                    await page.goto(`http://127.0.0.1:${server.address().port}/?version=${version}&cached=${cached}&workload=${workload}`);
                    const result = await page.evaluate(() => window.cacheListResult);
                    assert.deepEqual(errors, []);
                    assert.equal(result.error, 0);
                    assert.ok(result.renderers > 0 && result.contentHeight > 440);
                    results.push({ version, trial, ...result });
                    await page.close();
                }
            }
        }
    }
    console.log(JSON.stringify({ browser: browser.version(), headed, viewport: [640, 480], results }, null, 2));
} finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
}
