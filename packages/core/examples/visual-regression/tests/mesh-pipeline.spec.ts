import { expect, test } from '@playwright/test';
import type {} from '../FilterHarness.js';

for (const backend of ['webgl1', 'webgl2']) {
	for (const precedingBitmap of [false, true]) {
		test(`${backend}: arbitrary mesh indices after bitmap=${precedingBitmap}`, async ({ page }) => {
			await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
			const result = await page.evaluate(preceding => {
				const h = window.filterHarness;
				const source = document.createElement('canvas'); source.width = source.height = 2;
				const ctx = source.getContext('2d')!; ctx.fillStyle = 'red'; ctx.fillRect(0, 0, 2, 2);
				const texture = new h.kurot.Texture(); texture.setBitmapData(new h.kurot.BitmapData(source));
				if (preceding) { const sprite = new h.kurot.Bitmap(texture); sprite.x = 180; h.root.addChild(sprite); }
				const mesh = new h.kurot.Mesh(texture);
				mesh.vertices = [20, 20, 100, 20, 100, 100, 20, 100];
				mesh.uvs = [0, 0, 1, 0, 1, 1, 0, 1]; mesh.indices = [0, 2, 3]; mesh.updateVertices();
				h.root.addChild(mesh); h.render();
				return { lower: h.pixel(30, 80), upper: h.pixel(80, 30), errors: h.errors() };
			}, precedingBitmap);
			expect(result.errors).toEqual([]);
			expect(result.lower).toEqual([255, 0, 0, 255]);
			expect(result.upper).toEqual([0, 0, 0, 0]);
		});
	}

	test(`${backend}: mesh larger than one batch renders its last triangle`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const source = document.createElement('canvas'); source.width = source.height = 2;
			const ctx = source.getContext('2d')!; ctx.fillStyle = 'lime'; ctx.fillRect(0, 0, 2, 2);
			const texture = new h.kurot.Texture(); texture.setBitmapData(new h.kurot.BitmapData(source));
			const mesh = new h.kurot.Mesh(texture);
			for (let i = 0; i < 2800; i++) {
				const x = i === 2799 ? 100 : 10;
				mesh.vertices.push(x, 20, x + 30, 20, x, 50);
				mesh.uvs.push(0, 0, 1, 0, 0, 1); mesh.indices.push(i * 3, i * 3 + 1, i * 3 + 2);
			}
			mesh.updateVertices(); h.root.addChild(mesh); h.render();
			return { tail: h.pixel(105, 25), errors: h.errors() };
		});
		expect(result.errors).toEqual([]);
		expect(result.tail).toEqual([0, 255, 0, 255]);
	});

	test(`${backend}: UV and geometry updates survive empty geometry and repopulation`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const source = document.createElement('canvas'); source.width = 4; source.height = 2;
			const ctx = source.getContext('2d')!; ctx.fillStyle = 'red'; ctx.fillRect(0, 0, 2, 2);
			ctx.fillStyle = 'blue'; ctx.fillRect(2, 0, 2, 2);
			const texture = new h.kurot.Texture(); texture.setBitmapData(new h.kurot.BitmapData(source));
			const mesh = new h.kurot.Mesh(texture); mesh.smoothing = false;
			const vertices = [20, 20, 100, 20, 100, 100, 20, 100];
			mesh.vertices = vertices; mesh.uvs = [0, 0, 0.5, 0, 0.5, 1, 0, 1]; mesh.indices = [0, 1, 2, 0, 2, 3];
			mesh.updateVertices(); h.root.addChild(mesh); h.render(); const red = h.pixel(40, 40);
			mesh.uvs = [0.5, 0, 1, 0, 1, 1, 0.5, 1]; mesh.updateVertices(); h.render(); const blue = h.pixel(40, 40);
			mesh.vertices = []; mesh.indices = []; mesh.uvs = []; mesh.updateVertices(); h.render(); const empty = h.pixel(40, 40);
			mesh.vertices = vertices.map((v, i) => i % 2 === 0 ? v + 100 : v);
			mesh.uvs = [0, 0, 0.5, 0, 0.5, 1, 0, 1]; mesh.indices = [0, 1, 2, 0, 2, 3]; mesh.updateVertices(); h.render();
			return { red, blue, empty, moved: h.pixel(140, 40), old: h.pixel(40, 40), bounds: mesh.getBounds(), errors: h.errors() };
		});
		expect(result.errors).toEqual([]);
		expect(result.red).toEqual([255, 0, 0, 255]); expect(result.blue).toEqual([0, 0, 255, 255]);
		expect(result.empty).toEqual([0, 0, 0, 0]); expect(result.old).toEqual(result.empty); expect(result.moved).toEqual(result.red);
		expect(result.bounds).toMatchObject({ x: 120, y: 20, width: 80, height: 80 });
	});
	for (const atlas of ['rotated', 'rotated-tinted', 'trimmed', 'plain']) {
		test(`${backend}: ${atlas} mesh agrees with Canvas away from triangle seams`, async ({ page }) => {
			await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
			const result = await page.evaluate(kind => {
				const h = window.filterHarness;
				const source = document.createElement('canvas'); source.width = source.height = 8;
				const ctx = source.getContext('2d')!;
				ctx.fillStyle = 'red'; ctx.fillRect(0, 0, 8, 4); ctx.fillStyle = 'blue'; ctx.fillRect(0, 4, 8, 4);
				const texture = new h.kurot.Texture(); texture.setBitmapData(new h.kurot.BitmapData(source));
				texture.initData(0, 0, kind.startsWith('rotated') ? 4 : 8, 8, kind === 'trimmed' ? 30 : 0, 0, 8, 8, 8, 8, kind.startsWith('rotated'));
				if (kind.startsWith('rotated')) { ctx.fillStyle = 'blue'; ctx.fillRect(0, 2, 8, 2); }
				const mesh = new h.kurot.Mesh(texture); mesh.smoothing = false;
				if (kind === 'rotated-tinted') mesh.tint = 0x808080;
				mesh.vertices = [20, 20, 100, 20, 100, 100, 20, 100];
				mesh.uvs = [0, 0, 1, 0, 1, 1, 0, 1]; mesh.indices = [0, 1, 2, 0, 2, 3]; mesh.updateVertices();
				h.root.addChild(mesh); h.render();
				const points = [[30, 40], [80, 40], [70, 80], [120, 60]];
				const gpu = points.map(([x, y]) => h.pixel(x, y));
				const buffer = new h.kurot.CanvasBuffer(256, 256);
				new h.kurot.CanvasRenderer().render(h.root, buffer);
				const cpu = points.map(([x, y]) => Array.from(buffer.context.getImageData(x, y, 1, 1).data));
				return { gpu, cpu, errors: h.errors() };
			}, atlas);
			expect(result.errors).toEqual([]);
			expect(result.gpu).toEqual(result.cpu);
		});
	}

}
