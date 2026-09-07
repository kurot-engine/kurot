import { expect, test } from '@playwright/test';
import type {} from '../FilterHarness.js';

for (const backend of ['webgl1', 'webgl2']) {
	test(`${backend}: custom programs upload scalar, vector, matrix and integer uniforms`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const box = new h.kurot.Sprite();
			box.graphics.beginFill(0xffffff);
			box.graphics.drawRect(40, 40, 40, 40);
			h.root.addChild(box);
			const body = `uniform vec4 color; uniform mat4 transform; uniform float weights[2];
				uniform int mode; uniform bool enabled; uniform ivec2 offset;
				void main() { OUTPUT = enabled && mode == 3 && offset.x == 2 ? transform * color * (weights[0] + weights[1]) : vec4(0.0); }`;
			const filter = h.kurot.CustomFilter.from({
				webgl1: { fragment: 'precision mediump float;\n' + body.replace('OUTPUT', 'gl_FragColor') },
				webgl2: { fragment: '#version 300 es\nprecision mediump float; out vec4 result;\n' + body.replace('OUTPUT', 'result') },
				uniforms: { color: [1, 0, 0, 1], transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
					weights: [0.25, 0.75], mode: 3, enabled: true, offset: new Int32Array([2, 0]) },
			});
			box.filters = [filter];
			h.render();
			const first = h.pixel(60, 60);
			filter.setUniform('color', new Float32Array([0, 1, 0, 1]));
			h.render();
			return { first, second: h.pixel(60, 60), errors: h.errors() };
		});
		expect(result.first).toEqual([255, 0, 0, 255]);
		expect(result.second).toEqual([0, 255, 0, 255]);
		expect(result.errors).toEqual([]);
	});

	test(`${backend}: identity and animated dissolve preserve framebuffer coordinates`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}&resolution=2`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const box = new h.kurot.Sprite();
			box.graphics.beginFill(0xff0000);
			box.graphics.drawRect(0, 0, 40, 20);
			box.graphics.beginFill(0x0000ff);
			box.graphics.drawRect(0, 20, 40, 20);
			box.x = box.y = 50;
			box.alpha = 0.5;
			h.root.addChild(box);
			const filter = h.kurot.CustomFilter.from({
				webgl1: { fragment: `precision mediump float; varying vec2 vTextureCoord;
				uniform sampler2D uSampler; uniform vec4 uInputClamp; uniform float threshold;
				void main() { gl_FragColor = texture2D(uSampler, clamp(vTextureCoord, uInputClamp.xy, uInputClamp.zw)) * step(threshold, vTextureCoord.x); }` },
				webgl2: { fragment: `#version 300 es
				precision mediump float; in vec2 vTextureCoord; out vec4 result;
				uniform sampler2D uSampler; uniform vec4 uInputClamp; uniform float threshold;
				void main() { result = texture(uSampler, clamp(vTextureCoord, uInputClamp.xy, uInputClamp.zw)) * step(threshold, vTextureCoord.x); }` },
				uniforms: { threshold: 0 }, padding: 2,
			});
			box.filters = [filter, new h.kurot.ColorMatrixFilter()];
			h.render();
			const top = h.pixel(60, 60);
			const bottom = h.pixel(60, 80);
			filter.setUniform('threshold', 0.5);
			h.render();
			return { top, bottom, dissolved: h.pixel(60, 60), retained: h.pixel(80, 60), errors: h.errors() };
		});
		expect(result.top[0]).toBeGreaterThanOrEqual(126);
		expect(result.top[2]).toBe(0);
		expect(result.bottom[2]).toBeGreaterThanOrEqual(126);
		expect(result.top[3]).toBeLessThanOrEqual(128);
		expect(result.dissolved[3]).toBe(0);
		expect(result.retained[3]).toBeGreaterThanOrEqual(126);
		expect(result.errors).toEqual([]);
	});

	test(`${backend}: a failed custom filter does not poison following frames`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const parent = new h.kurot.Sprite();
			parent.filters = [new h.kurot.BlurFilter(1, 1)];
			const box = new h.kurot.Sprite();
			box.graphics.beginFill(0x00ff00);
			box.graphics.drawRect(40, 40, 40, 40);
			parent.addChild(box);
			h.root.addChild(parent);
			box.filters = [new h.kurot.CustomFilter('', 'invalid shader')];
			let error = '';
			try { h.render(); } catch (cause) { error = String(cause); }
			box.filters = [];
			h.render();
			return { error, pixel: h.pixel(60, 60), errors: h.errors() };
		});
		expect(result.error).toContain('Shader compile failed');
		expect(result.pixel).toEqual([0, 255, 0, 255]);
		expect(result.errors).toEqual([]);
	});

	test(`${backend}: missing backend and invalid uniform shape fail explicitly`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const box = new h.kurot.Sprite();
			box.graphics.beginFill(0xffffff);
			box.graphics.drawRect(40, 40, 40, 40);
			h.root.addChild(box);
			const webgl1 = { fragment: 'precision mediump float; uniform vec4 color; void main(){ gl_FragColor = color; }' };
			const webgl2 = { fragment: '#version 300 es\nprecision mediump float; uniform vec4 color; out vec4 result; void main(){ result = color; }' };
			box.filters = [h.kurot.CustomFilter.from(h.gl instanceof WebGL2RenderingContext ? { webgl1 } : { webgl2 })];
			let missing = '';
			try { h.render(); } catch (cause) { missing = String(cause); }
			box.filters = [h.kurot.CustomFilter.from({ webgl1, webgl2, uniforms: { color: [1, 0] } })];
			let invalid = '';
			try { h.render(); } catch (cause) { invalid = String(cause); }
			box.filters = [];
			h.render();
			return { missing, invalid, pixel: h.pixel(60, 60), errors: h.errors() };
		});
		expect(result.missing).toContain('has no WebGL');
		expect(result.invalid).toContain('requires 4 finite');
		expect(result.pixel).toEqual([255, 255, 255, 255]);
		expect(result.errors).toEqual([]);
	});
}
