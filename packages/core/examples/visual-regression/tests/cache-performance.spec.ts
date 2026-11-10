import { test } from '@playwright/test';
import type {} from '../FilterHarness.js';

test('scrolling cache performance comparison', async ({ page }, testInfo) => {
	const results = [];
	for (const workload of ['scroll', 'move', 'content']) {
		for (const cached of [false, true]) {
			await page.goto('http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=webgl2');
			const result = await page.evaluate(async ({ workload, cached }) => {
				const h = window.filterHarness;
				const { Sprite, Rectangle, Bitmap, BitmapData, Texture, CanvasRenderer, WebGLRenderContext } = h.kurot;
				h.app.player.updateStageSize(640, 480, 640, 480);
				const viewport = new Sprite();
				viewport.scrollRect = new Rectangle(0, 0, 620, 440);
				h.root.addChild(viewport);
				const textures = Array.from({ length: 16 }, (_, i) => {
					const source = document.createElement('canvas');
					source.width = source.height = 24;
					const context = source.getContext('2d')!;
					context.fillStyle = `hsl(${i * 21} 70% 55%)`;
					context.fillRect(0, 0, 24, 24);
					const texture = new Texture();
					texture.bitmapData = new BitmapData(source);
					texture.initData(0, 0, 24, 24, 0, 0, 24, 24, 24, 24);
					return texture;
				});
				const rows = Array.from({ length: 20 }, (_, row) => {
					const item = new Sprite();
					item.y = row * 48;
					for (let col = 0; col < 24; col++) {
						const icon = new Bitmap(textures[col % textures.length]);
						icon.x = col * 25;
						item.addChild(icon);
					}
					item.cacheAsBitmap = cached;
					viewport.addChild(item);
					return item;
				});
				let canvasPasses = 0;
				let uploads = 0;
				let allocations = 0;
				const canvasRender = CanvasRenderer.prototype.renderToContext;
				const createTexture = WebGLRenderContext.prototype.createTexture;
				const updateTexture = WebGLRenderContext.prototype.updateTexture;
				const glCreateTexture = h.gl.createTexture.bind(h.gl);
				CanvasRenderer.prototype.renderToContext = function (...args) {
					canvasPasses++;
					return canvasRender.apply(this, args);
				};
				WebGLRenderContext.prototype.createTexture = function (...args) {
					uploads++;
					return createTexture.apply(this, args);
				};
				WebGLRenderContext.prototype.updateTexture = function (...args) {
					uploads++;
					return updateTexture.apply(this, args);
				};
				h.gl.createTexture = (): WebGLTexture => {
					allocations++;
					return glCreateTexture();
				};
				const samples: number[] = [];
				let draws = 0;
				let started = 0;
				for (let frame = 0; frame < 180; frame++) {
					await new Promise(requestAnimationFrame);
					if (frame === 60) {
						canvasPasses = uploads = allocations = 0;
						started = performance.now();
					}
					const y = (frame * 3) % 400;
					if (workload === 'move') {
						rows.forEach((row, i) => { row.y = i * 48 - y; });
					} else {
						viewport.scrollRect = new Rectangle(0, y, 620, 440);
					}
					if (workload === 'content') {
						rows.forEach(row => { row.getChildAt(0)!.alpha = frame % 2 ? 0.5 : 1; });
					}
					const before = performance.now();
					const count = h.render();
					if (frame >= 60) {
						samples.push(performance.now() - before);
						draws += count;
					}
				}
				const elapsed = performance.now() - started;
				samples.sort((a, b) => a - b);
				return {
					workload, cached, frames: samples.length, fps: 119000 / elapsed,
					renderMeanMs: samples.reduce((sum, n) => sum + n, 0) / samples.length,
					renderP95Ms: samples[Math.floor(samples.length * 0.95)],
					drawsPerFrame: draws / samples.length, uploads, canvasPasses, allocations,
					renderer: h.gl.getParameter(h.gl.RENDERER) as string,
					errors: h.errors(),
				};
			}, { workload, cached });
			results.push(result);
		}
	}
	console.log(JSON.stringify(results));
	await testInfo.attach('cache-performance.json', { body: JSON.stringify(results, undefined, 2), contentType: 'application/json' });
});
