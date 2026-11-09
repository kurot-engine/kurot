import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

test('a rebuilt List draws the cached, versioned avatar on its first render', async ({ page }) => {
	const bundle = await build({
		alias: { '@kurot/core': fileURLToPath(new URL('../../../core/src/index.ts', import.meta.url)) },
		entryPoints: [fileURLToPath(new URL('./asset-adapter-fixture.ts', import.meta.url))],
		bundle: true, write: false, format: 'iife', target: 'es2022',
	});
	const images: string[] = [];
	await page.route('http://assets.test/**', route => {
		const url = new URL(route.request().url());
		if (url.pathname === '/') {
			return route.fulfill({ contentType: 'text/html', body: '<meta name="kurot-resource-version" content="41"><canvas width="32" height="32"></canvas>' });
		}
		if (url.pathname !== '/resource/portrait') {
			return route.abort();
		}
		images.push(url.search);
		return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#ea3456"/></svg>' });
	});
	await page.goto('http://assets.test/');
	await page.addScriptTag({ content: bundle.outputFiles[0].text });
	expect(await page.evaluate(() => window.rebuildAvatarList())).toEqual({ same: true, pixel: [234, 52, 86, 255] });
	expect(images).toEqual(['?variant=small&v=41']);
});
