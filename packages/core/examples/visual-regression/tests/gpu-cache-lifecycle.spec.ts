import { expect, test } from '@playwright/test';
import type {} from '../FilterHarness.js';

for (const backend of ['webgl1', 'webgl2']) {
	test(`${backend}: cache surfaces reuse storage, resize, release and survive context restoration`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(async () => {
			const h = window.filterHarness;
			h.app.player.updateStageSize(256, 256, 256, 256);
			const { Sprite } = h.kurot;
			const outer = new Sprite();
			const inner = new Sprite();
			inner.graphics.beginFill(0x3388ff);
			inner.graphics.drawRect(-4, -2, 32, 24);
			inner.x = inner.y = 16;
			outer.addChild(inner);
			h.root.addChild(outer);
			outer.cacheAsBitmap = inner.cacheAsBitmap = true;
			h.render();
			const first = outer.$displayList!.$gpuCache!.buffer!;
			const texture = first.rootRenderTarget.texture!;
			const nestedTexture = inner.$displayList!.$gpuCache!.buffer!.rootRenderTarget.texture!;
			const before = h.pixel(20, 20);
			let allocations = 0;
			const createTexture = h.gl.createTexture.bind(h.gl);
			h.gl.createTexture = (): WebGLTexture => {
				allocations++;
				return createTexture();
			};
			for (let i = 0; i < 4; i++) {
				inner.alpha = i % 2 ? 1 : 0.5;
				h.render();
			}
			const stableAllocations = allocations;
			const initialSize = [first.width, first.height];
			h.app.player.updateStageSize(256, 256, 512, 512);
			h.render();
			const automaticSize = [first.width, first.height];
			outer.cacheAsTexture({ resolution: 1, scaleMode: 'nearest' });
			h.render();
			const explicitSize = [first.width, first.height];
			const sameTexture = texture === first.rootRenderTarget.texture;
			h.gl.bindTexture(h.gl.TEXTURE_2D, texture);
			const smoothing = h.gl.getTexParameter(h.gl.TEXTURE_2D, h.gl.TEXTURE_MIN_FILTER) as number;
			const glContext = first.context;
			const limit = glContext.maxTextureSize;
			glContext.maxTextureSize = 16;
			outer.updateCacheTexture();
			h.render();
			const limitedSize = [first.width, first.height];
			glContext.maxTextureSize = limit;
			outer.cacheAsTexture(true);
			h.app.player.updateStageSize(256, 256, 256, 256);
			h.render();
			const extension = h.gl.getExtension('WEBGL_lose_context');
			if (!extension) {
				throw new Error('Context restoration must be exercised.');
			}
			const canvas = document.querySelector<HTMLCanvasElement>('#filters')!;
			const lost = new Promise(resolve => canvas.addEventListener('webglcontextlost', resolve, { once: true }));
			extension.loseContext();
			await lost;
			await new Promise(resolve => setTimeout(resolve, 30));
			const restored = new Promise(resolve => canvas.addEventListener('webglcontextrestored', resolve, { once: true }));
			extension.restoreContext();
			await restored;
			h.render();
			const after = h.pixel(20, 20);
			const restoredTexture = first.rootRenderTarget.texture!;
			const restoredNested = inner.$displayList!.$gpuCache!.buffer!.rootRenderTarget.texture!;
			const rebuilt = restoredTexture !== texture && restoredNested !== nestedTexture;
			outer.cacheAsBitmap = false;
			const releasedOuter = !h.gl.isTexture(restoredTexture);
			const retainedInner = h.gl.isTexture(restoredNested);
			h.app.destroy();
			const releasedInner = !h.gl.isTexture(restoredNested);
			return { before, after, stableAllocations, initialSize, automaticSize, explicitSize, sameTexture, smoothing, limitedSize, rebuilt, releasedOuter, retainedInner, releasedInner, errors: h.errors() };
		});
		expect(result.stableAllocations).toBe(0);
		expect(result.initialSize).toEqual([32, 24]);
		expect(result.automaticSize).toEqual([64, 48]);
		expect(result.explicitSize).toEqual([32, 24]);
		expect(result.limitedSize).toEqual([16, 12]);
		expect(result.sameTexture).toBe(true);
		expect(result.smoothing).toBe(9728);
		expect(result.after).toEqual(result.before);
		expect(result).toMatchObject({ rebuilt: true, releasedOuter: true, retainedInner: true, releasedInner: true, errors: [] });
	});
}
