import { expect, test } from '@playwright/test';
import type {} from '../FilterHarness.js';

for (const backend of ['webgl1', 'webgl2']) {
	test(`${backend}: Canvas snapshots and explicit refresh cannot leave stale GPU pixels`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const { Sprite, Bitmap, BitmapData, Texture, RenderTexture } = h.kurot;
			const source = document.createElement('canvas');
			source.width = source.height = 20;
			const context = source.getContext('2d')!;
			context.fillStyle = '#ff0000';
			context.fillRect(0, 0, 20, 20);
			const data = new BitmapData(source);
			const texture = new Texture();
			texture.setBitmapData(data);
			const outer = new Sprite();
			const cached = new Sprite();
			cached.addChild(new Bitmap(texture));
			outer.addChild(cached);
			h.root.addChild(outer);
			cached.cacheAsBitmap = true;
			h.render();
			const snapshot = new RenderTexture();
			const checks = [];
			for (const color of ['#00ff00', '#0000ff', '#ff0000']) {
				context.fillStyle = color;
				context.fillRect(0, 0, 20, 20);
				BitmapData.invalidate(data);
				cached.updateCacheTexture();
				snapshot.drawToTexture(cached);
				const canvasFirst = snapshot.getPixel32(8, 8);
				h.render();
				snapshot.drawToTexture(outer);
				checks.push({ canvasFirst, gpu: h.pixel(8, 8), canvasLast: snapshot.getPixel32(8, 8) });
			}
			return { checks, errors: h.errors() };
		});
		for (const [i, rgba] of [[0, [0, 255, 0, 255]], [1, [0, 0, 255, 255]], [2, [255, 0, 0, 255]]] as const) {
			expect(result.checks[i]).toEqual({ canvasFirst: rgba, gpu: rgba, canvasLast: rgba });
		}
		expect(result.errors).toEqual([]);
	});

	test(`${backend}: descendant custom filters update inside nested caches`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const { Sprite, CustomFilter } = h.kurot;
			const outer = new Sprite();
			const child = new Sprite();
			child.graphics.beginFill(0xffffff);
			child.graphics.drawRect(10, 10, 30, 30);
			const filter = CustomFilter.from({
				webgl1: { fragment: 'precision mediump float; uniform float uRed; void main(){gl_FragColor=vec4(uRed,0.0,1.0-uRed,1.0);}' },
				webgl2: { fragment: '#version 300 es\nprecision mediump float; uniform float uRed; out vec4 result; void main(){result=vec4(uRed,0.0,1.0-uRed,1.0);}' },
				uniforms: { uRed: 1 },
			});
			child.filters = [filter];
			outer.addChild(child);
			h.root.addChild(outer);
			outer.cacheAsBitmap = child.cacheAsBitmap = true;
			h.render();
			const red = h.pixel(20, 20);
			filter.setUniform('uRed', 0);
			h.render();
			const blue = h.pixel(20, 20);
			outer.alpha = 0.5;
			h.render();
			return { red, blue, faded: h.pixel(20, 20), errors: h.errors() };
		});
		expect(result).toEqual({ red: [255, 0, 0, 255], blue: [0, 0, 255, 255], faded: [0, 0, 128, 128], errors: [] });
	});

	test(`${backend}: empty caches recreated after context loss leave no GPU attachments behind`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(async () => {
			const h = window.filterHarness;
			const cached = new h.kurot.Sprite();
			const child = new h.kurot.Sprite();
			child.graphics.beginFill(0xffffff);
			child.graphics.drawRect(0, 0, 20, 20);
			cached.addChild(child);
			cached.cacheAsBitmap = true;
			h.root.addChild(cached);
			h.render();
			const initial = cached.$displayList!.$gpuCache!.buffer!.rootRenderTarget.texture!;
			cached.removeChild(child);
			h.render();
			const emptyReleased = !h.gl.isTexture(initial);
			const extension = h.gl.getExtension('WEBGL_lose_context')!;
			const once = (type: string): Promise<void> => new Promise(resolve => h.gl.canvas.addEventListener(type, () => resolve(), { once: true }));
			const lost = once('webglcontextlost');
			extension.loseContext();
			await lost;
			await new Promise(resolve => setTimeout(resolve, 30));
			const restored = once('webglcontextrestored');
			extension.restoreContext();
			await restored;
			const allocated: WebGLFramebuffer[] = [];
			const create = h.gl.createFramebuffer.bind(h.gl);
			h.gl.createFramebuffer = (): WebGLFramebuffer => {
				const target = create();
				if (target) {
					allocated.push(target);
				}
				return target;
			};
			cached.addChild(child);
			h.render();
			const pixel = h.pixel(10, 10);
			h.root.removeChild(cached); // Detached owners must also be disposed.
			h.app.destroy();
			return { emptyReleased, pixel, allocations: allocated.length, survivors: allocated.filter(target => h.gl.isFramebuffer(target)).length, errors: h.errors() };
		});
		expect(result.emptyReleased).toBe(true);
		expect(result.allocations).toBeGreaterThan(0);
		expect(result.survivors).toBe(0);
		expect(result.pixel).toEqual([255, 255, 255, 255]);
		expect(result.errors).toEqual([]);
	});
}
