import { expect, test } from '@playwright/test';
import type {} from '../FilterHarness.js';

for (const backend of ['webgl1', 'webgl2']) {
	test(`${backend}: bloom preserves the original and spreads only bright pixels`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const box = new h.kurot.Sprite();
			box.graphics.beginFill(0xffffff); box.graphics.drawRect(60, 60, 20, 20);
			box.graphics.beginFill(0x333333); box.graphics.drawRect(140, 60, 20, 20);
			const bloom = new h.kurot.BloomFilter({ threshold: 0.7, blur: 12 });
			box.filters = [bloom]; h.root.addChild(box);
			h.render();
			const bright = h.pixel(70, 70), halo = h.pixel(56, 70), dark = h.pixel(150, 70), darkHalo = h.pixel(136, 70);
			const warmCount = h.app.player.framebufferPoolSize;
			for (let i = 0; i < 20; i++) { h.render(); }
			const count = h.app.player.framebufferPoolSize, bytes = h.app.player.framebufferPoolBytes;
			bloom.intensity = 0; h.render();
			return { bright, halo, dark, darkHalo, disabled: h.pixel(56, 70), original: h.pixel(150, 70), warmCount, count, bytes, errors: h.errors() };
		});
		expect(result.bright).toEqual([255, 255, 255, 255]);
		expect(result.halo[3]).toBeGreaterThan(0);
		expect(result.dark).toEqual([51, 51, 51, 255]);
		expect(result.darkHalo[3]).toBe(0);
		expect(result.disabled[3]).toBe(0);
		expect(result.original).toEqual(result.dark);
		expect(result.count).toBeLessThanOrEqual(result.warmCount + 1);
		expect(result.bytes).toBeLessThanOrEqual(64 * 1024 * 1024);
		expect(result.errors).toEqual([]);
	});

	test(`${backend}: large blur has support beyond 32 physical pixels`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const box = new h.kurot.Sprite(); box.graphics.beginFill(0xffffff); box.graphics.drawRect(100, 100, 30, 30);
			const blur = new h.kurot.BlurFilter(16, 16); box.filters = [blur]; h.root.addChild(box);
			h.render(); const small = h.pixel(65, 115);
			blur.blurX = blur.blurY = 64;
			h.render(); const large = h.pixel(65, 115);
			return { small, large, errors: h.errors() };
		});
		expect(result.small[3]).toBe(0);
		expect(result.large[3]).toBeGreaterThan(0);
		expect(result.errors).toEqual([]);
	});

	test(`${backend}: multi-pass original input is retained while processing at lower resolution`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const box = new h.kurot.Sprite(); box.graphics.beginFill(0xff0000); box.graphics.drawRect(40, 40, 40, 40);
			const first = h.kurot.CustomFilter.from({
				webgl1: { fragment: 'precision mediump float; uniform vec4 uOutputSize; void main(){gl_FragColor=vec4(0.0,uOutputSize.x/10.0,0.0,1.0);}' },
				webgl2: { fragment: '#version 300 es\nprecision mediump float; uniform vec4 uOutputSize; out vec4 result; void main(){result=vec4(0.0,uOutputSize.x/10.0,0.0,1.0);}' },
			});
			const combine = h.kurot.CustomFilter.from({
				webgl1: { fragment: 'precision mediump float; varying vec2 vTextureCoord; uniform sampler2D uSampler; uniform sampler2D uOriginal; void main(){gl_FragColor=mix(texture2D(uSampler,vTextureCoord),texture2D(uOriginal,vTextureCoord),0.5);}' },
				webgl2: { fragment: '#version 300 es\nprecision mediump float; in vec2 vTextureCoord; uniform sampler2D uSampler; uniform sampler2D uOriginal; out vec4 result; void main(){result=mix(texture(uSampler,vTextureCoord),texture(uOriginal,vTextureCoord),0.5);}' },
			});
			const effect = new h.kurot.MultiPassFilter([{ filter: first, scale: 0.5 }, { filter: combine, textures: { uOriginal: 'original' } }]);
			effect.resolution = 0.5;
			box.filters = [effect]; h.root.addChild(box); h.render();
			const color = h.pixel(60, 60);
			h.app.player.destroy();
			return { color, pool: h.app.player.framebufferPoolSize, bytes: h.app.player.framebufferPoolBytes, errors: h.errors() };
		});
		expect(result.color[0]).toBeGreaterThanOrEqual(127);
		expect(result.color[1]).toBeGreaterThanOrEqual(127);
		expect(result.color[2]).toBe(0);
		expect(result.color[3]).toBe(255);
		expect(result.pool).toBe(0);
		expect(result.bytes).toBe(0);
		expect(result.errors).toEqual([]);
	});
}
