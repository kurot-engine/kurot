import { expect, test } from '@playwright/test';
import type {} from '../FilterHarness.js';

for (const backend of ['webgl1', 'webgl2']) {
	test(`${backend}: auxiliary images map correctly, update and preserve sprite sampling`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const map = document.createElement('canvas');
			map.width = map.height = 2;
			const ctx = map.getContext('2d')!;
			ctx.fillStyle = 'red'; ctx.fillRect(0, 0, 2, 1);
			ctx.fillStyle = 'blue'; ctx.fillRect(0, 1, 2, 1);
			const data = new h.kurot.BitmapData(map);
			const box = new h.kurot.Sprite();
			box.graphics.beginFill(0xffffff);
			box.graphics.drawRect(40, 40, 40, 40);
			h.root.addChild(box);
			const filter = h.kurot.CustomFilter.from({
				webgl1: { fragment: `precision mediump float; varying vec2 vTextureCoord;
				uniform sampler2D uMap; uniform mat3 uMapMatrix; uniform vec4 uMapClamp;
				void main(){ vec2 uv = (uMapMatrix * vec3(vTextureCoord,1.0)).xy; gl_FragColor = texture2D(uMap, clamp(uv,uMapClamp.xy,uMapClamp.zw)); }` },
				webgl2: { fragment: `#version 300 es
				precision mediump float; in vec2 vTextureCoord; out vec4 result;
				uniform sampler2D uMap; uniform mat3 uMapMatrix; uniform vec4 uMapClamp;
				void main(){ vec2 uv = (uMapMatrix * vec3(vTextureCoord,1.0)).xy; result = texture(uMap, clamp(uv,uMapClamp.xy,uMapClamp.zw)); }` },
				textures: { uMap: { source: data, smoothing: false } },
			});
			box.filters = [filter];
			const texture = new h.kurot.Texture();
			texture.setBitmapData(data);
			const bitmap = new h.kurot.Bitmap(texture);
			bitmap.x = 150; bitmap.y = 40; bitmap.width = bitmap.height = 40;
			bitmap.smoothing = false;
			h.root.addChild(bitmap);
			h.render();
			const top = h.pixel(50, 45), bottom = h.pixel(50, 75), original = h.pixel(160, 45);
			ctx.fillStyle = 'lime'; ctx.fillRect(0, 0, 2, 1);
			h.kurot.BitmapData.invalidate(data);
			h.render();
			const updated = h.pixel(50, 45);
			filter.setTexture('uMap', { source: data, smoothing: true });
			h.render();
			const linear = h.pixel(50, 59), nearest = h.pixel(160, 59);
			return { top, bottom, original, updated, linear, nearest, errors: h.errors() };
		});
		expect(result.top).toEqual([255, 0, 0, 255]);
		expect(result.bottom).toEqual([0, 0, 255, 255]);
		expect(result.original).toEqual(result.top);
		expect(result.updated).toEqual([0, 255, 0, 255]);
		expect(result.linear[1]).toBeGreaterThan(0);
		expect(result.linear[2]).toBeGreaterThan(0);
		expect(result.nearest).toEqual([0, 255, 0, 255]);
		expect(result.errors).toEqual([]);
	});

	test(`${backend}: extra texture programs and resources survive context restoration`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const supported = await page.evaluate(() => !!window.filterHarness.gl.getExtension('WEBGL_lose_context'));
		test.skip(!supported, 'Context restoration unavailable.');
		const result = await page.evaluate(async () => {
			const h = window.filterHarness;
			const source = document.createElement('canvas'); source.width = source.height = 2;
			const ctx = source.getContext('2d')!; ctx.fillStyle = 'lime'; ctx.fillRect(0, 0, 2, 2);
			const box = new h.kurot.Sprite();
			box.graphics.beginFill(0xffffff); box.graphics.drawRect(40, 40, 40, 40);
			const filter = h.kurot.CustomFilter.from({
				webgl1: { fragment: 'precision mediump float; uniform sampler2D uMap; void main(){gl_FragColor=texture2D(uMap,vec2(0.5));}' },
				webgl2: { fragment: '#version 300 es\nprecision mediump float; uniform sampler2D uMap; out vec4 result; void main(){result=texture(uMap,vec2(0.5));}' },
				textures: { uMap: { source: new h.kurot.BitmapData(source) } },
			});
			box.filters = [filter, new h.kurot.BloomFilter()]; h.root.addChild(box); h.render();
			const before = h.pixel(60, 60);
			const extension = h.gl.getExtension('WEBGL_lose_context')!;
			const once = (type: string): Promise<void> => new Promise(resolve => h.gl.canvas.addEventListener(type, () => resolve(), { once: true }));
			const lost = once('webglcontextlost'); extension.loseContext(); await lost;
			await new Promise(resolve => setTimeout(resolve, 100));
			const restored = once('webglcontextrestored'); extension.restoreContext(); await restored;
			h.errors(); h.render();
			return { before, after: h.pixel(60, 60), errors: h.errors() };
		});
		expect(result.before).toEqual([0, 255, 0, 255]);
		expect(result.after).toEqual(result.before);
		expect(result.errors).toEqual([]);
	});

	test(`${backend}: disposed auxiliary input fails clearly and can be replaced`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const image = document.createElement('canvas'); image.width = image.height = 1;
			const data = new h.kurot.BitmapData(image); data.dispose();
			const box = new h.kurot.Sprite(); box.graphics.beginFill(0xffffff); box.graphics.drawRect(40, 40, 40, 40);
			box.filters = [h.kurot.CustomFilter.from({
				webgl1: { fragment: 'precision mediump float; uniform sampler2D uMap; void main(){gl_FragColor=texture2D(uMap,vec2(0.5));}' },
				webgl2: { fragment: '#version 300 es\nprecision mediump float; uniform sampler2D uMap; out vec4 result; void main(){result=texture(uMap,vec2(0.5));}' },
				textures: { uMap: { source: data } },
			})];
			h.root.addChild(box);
			let error = ''; try { h.render(); } catch (cause) { error = String(cause); }
			box.filters = []; h.render();
			return { error, recovered: h.pixel(60, 60), errors: h.errors() };
		});
		expect(result.error).toContain('uMap has no image source');
		expect(result.recovered).toEqual([255, 255, 255, 255]);
		expect(result.errors).toEqual([]);
	});
}
