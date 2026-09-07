import { expect, test } from '@playwright/test';
import type {} from '../FilterHarness.js';

for (const backend of ['webgl1', 'webgl2']) {
	test(`${backend}: filter workloads reuse GPU targets after warmup`, async ({ page }, testInfo) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const profile = await page.evaluate(() => {
			const h = window.filterHarness;
			h.app.player.updateStageSize(800, 600, 800, 600);
			const world = new h.kurot.Sprite();
			world.graphics.beginFill(0x101820); world.graphics.drawRect(0, 0, 800, 600);
			world.graphics.beginFill(0xffffff); world.graphics.drawRect(300, 200, 100, 100);
			h.root.addChild(world);
			let allocations = 0;
			const createTexture = h.gl.createTexture.bind(h.gl);
			h.gl.createTexture = (): ReturnType<typeof createTexture> => { allocations++; return createTexture(); };
			const scenarios = [
				{ name: 'plain', filters: [] },
				{ name: 'blur8', filters: [new h.kurot.BlurFilter(8, 8)] },
				{ name: 'blur64', filters: [new h.kurot.BlurFilter(64, 64)] },
				{ name: 'bloom', filters: [new h.kurot.BloomFilter({ blur: 12 })] },
			];
			const results = scenarios.map(scenario => {
				world.filters = scenario.filters;
				for (let i = 0; i < 20; i++) { h.render(); h.gl.finish(); }
				const before = allocations;
				const times: number[] = [];
				let draws = 0;
				for (let i = 0; i < 40; i++) {
					world.x = i % 2;
					const start = performance.now();
					draws = h.render();
					h.gl.finish();
					times.push(performance.now() - start);
				}
				times.sort((a, b) => a - b);
				return { name: scenario.name, medianMs: times[20], p95Ms: times[38], draws,
					newTextures: allocations - before, poolCount: h.app.player.framebufferPoolSize, poolBytes: h.app.player.framebufferPoolBytes };
			});
			return { width: 800, height: 600, samples: 40, timing: 'synchronous render + gl.finish; not presentation FPS', results, errors: h.errors() };
		});
		for (const result of profile.results) {
			expect(result.newTextures).toBe(0);
			expect(result.poolCount).toBeLessThanOrEqual(16);
			expect(result.poolBytes).toBeLessThanOrEqual(64 * 1024 * 1024);
		}
		expect(profile.errors).toEqual([]);
		await testInfo.attach('filter-profile', { body: JSON.stringify({ backend, ...profile }, undefined, 2), contentType: 'application/json' });
	});
}
