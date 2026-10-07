import { describe, expect, test } from 'vitest';
import { AtlasError, packAtlas } from '../src/index.js';
import type { AtlasOptions } from '../src/index.js';
import { makeSource, pixel, setPixel } from './helpers.js';

describe('pixel and frame contracts', () => {
	test('preserves full basis-style images and keeps extrusion outside the frame', () => {
		const source = makeSource('button', 5, 3, 128);
		const original = source.pixels.slice();
		const result = packAtlas([source], { file: 'r_basis.png' });
		expect(result.image.width).toBe(8);
		expect(result.image.height).toBe(8);
		expect(result.data.file).toBe('r_basis.png');
		expect(result.data.frames.button).toEqual({ x: 1, y: 1, w: 5, h: 3 });
		for (let y = -1; y <= 3; y++) {
			for (let x = -1; x <= 5; x++) {
				expect(pixel(result.image, x + 1, y + 1)).toEqual(pixel(source, Math.max(0, Math.min(4, x)), Math.max(0, Math.min(2, y))));
			}
		}
		expect(source.pixels).toEqual(original);
	});

	test('crops icon-style borders with margin and preserves original logical dimensions', () => {
		const source = makeSource('icon', 10, 9, 0);
		setPixel(source, 4, 3, [200, 100, 50, 128]);
		setPixel(source, 6, 4, [20, 40, 80, 255]);
		const result = packAtlas([source]);
		expect(result.data.frames.icon).toEqual({ x: 1, y: 1, w: 5, h: 4, offX: 3, offY: 2, sourceW: 10, sourceH: 9 });
		expect(pixel(result.image, 2, 2)).toEqual([200, 100, 50, 128]);
		expect(pixel(result.image, 1, 1)).toEqual([0, 0, 0, 0]);
	});

	test('clamps trim margin at source edges and supports trim disabled', () => {
		const source = makeSource('edge', 4, 4, 0);
		setPixel(source, 0, 0, [4, 5, 6, 1]);
		expect(packAtlas([source]).data.frames.edge).toMatchObject({ w: 2, h: 2, offX: 0, offY: 0, sourceW: 4, sourceH: 4 });
		expect(packAtlas([source], { trim: false }).data.frames.edge).toEqual({ x: 1, y: 1, w: 4, h: 4 });
	});

	test('uses threshold only for bounds and retains weak-alpha pixels inside the retained rectangle', () => {
		const source = makeSource('threshold', 5, 1, 0);
		setPixel(source, 0, 0, [10, 20, 30, 1]);
		setPixel(source, 2, 0, [40, 50, 60, 200]);
		setPixel(source, 3, 0, [70, 80, 90, 1]);
		const result = packAtlas([source], { alphaThreshold: 100 });
		const frame = result.data.frames.threshold!;
		expect(frame).toMatchObject({ w: 3, h: 1, offX: 1, offY: 0, sourceW: 5 });
		expect(pixel(result.image, frame.x + 2, frame.y)).toEqual([70, 80, 90, 1]);
	});

	test('represents fully transparent sources by a clear 1×1 frame without losing logical size', () => {
		const source = makeSource('empty', 20, 30, 0);
		const result = packAtlas([source]);
		expect(result.data.frames.empty).toEqual({ x: 1, y: 1, w: 1, h: 1, offX: 0, offY: 0, sourceW: 20, sourceH: 30 });
		expect(result.image.pixels.every(value => value === 0)).toBe(true);
	});

	test('keeps border and shape padding clear and writes every extruded corner', () => {
		const source = makeSource('padded', 2, 2);
		const result = packAtlas([source], { extrude: 2, borderPadding: 1, shapePadding: 1 });
		const frame = result.data.frames.padded!;
		expect(frame.x).toBe(3);
		expect(frame.y).toBe(3);
		expect(pixel(result.image, 1, 1)).toEqual(pixel(source, 0, 0));
		expect(pixel(result.image, 6, 6)).toEqual(pixel(source, 1, 1));
		expect(pixel(result.image, 7, 7)).toEqual([0, 0, 0, 0]);
		expect(pixel(result.image, 0, 0)).toEqual([0, 0, 0, 0]);
	});

	test('supports resource names that overlap Object members as own frame entries', () => {
		const result = packAtlas([makeSource('constructor', 1, 1), makeSource('toString', 1, 1)]);
		expect(Object.keys(result.data.frames)).toEqual(['constructor', 'toString']);
		expect(JSON.parse(JSON.stringify(result.data)).frames.constructor.w).toBe(1);
	});
});

describe('packing invariants', () => {
	test('is byte deterministic across input order without changing source arrays', () => {
		const sources = [makeSource('b', 21, 7), makeSource('a', 3, 18), makeSource('c', 9, 9)];
		const first = packAtlas(sources);
		const second = packAtlas([...sources].reverse());
		expect(second).toEqual(first);
		expect(sources.map(source => source.name)).toEqual(['b', 'a', 'c']);
	});

	test('allows rectangular POT sheets and bounds exclude padding from frame dimensions', () => {
		const result = packAtlas([makeSource('wide', 29, 3)], { maxWidth: 32, maxHeight: 8 });
		expect([result.image.width, result.image.height]).toEqual([32, 8]);
	});

	test('packing varied batches never overlaps padded frames or corrupts their pixels', () => {
		let seed = 123456;
		const random = (): number => {
			seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
			return seed;
		};
		for (let batch = 0; batch < 20; batch++) {
			const sources = Array.from({ length: 25 }, (_, index) => makeSource(`frame-${index}`, 1 + random() % 30, 1 + random() % 30));
			const result = packAtlas(sources, { maxWidth: 256, maxHeight: 256 });
			const frames = Object.values(result.data.frames);
			expect(Math.log2(result.image.width) % 1).toBe(0);
			expect(Math.log2(result.image.height) % 1).toBe(0);
			for (let i = 0; i < frames.length; i++) {
				const a = frames[i]!;
				expect(a.x - 1).toBeGreaterThanOrEqual(0);
				expect(a.y - 1).toBeGreaterThanOrEqual(0);
				expect(a.x + a.w + 1).toBeLessThanOrEqual(result.image.width);
				expect(a.y + a.h + 1).toBeLessThanOrEqual(result.image.height);
				for (const b of frames.slice(i + 1)) {
					expect(a.x + a.w + 1 <= b.x - 1 || b.x + b.w + 1 <= a.x - 1 ||
						a.y + a.h + 1 <= b.y - 1 || b.y + b.h + 1 <= a.y - 1).toBe(true);
				}
			}
			for (const source of sources) {
				const frame = result.data.frames[source.name]!;
				for (let y = 0; y < source.height; y++) {
					for (let x = 0; x < source.width; x++) {
						expect(pixel(result.image, frame.x + x, frame.y + y)).toEqual(pixel(source, x, y));
					}
				}
			}
		}
	});
});

describe('validation and failures', () => {
	test('rejects duplicate names, unsafe names and malformed pixel buffers', () => {
		expect(() => packAtlas([])).toThrow(AtlasError);
		expect(() => packAtlas([makeSource('a', 1, 1), makeSource('a', 2, 2)])).toThrow(/Duplicate/);
		for (const name of ['', '../x', 'a,b', 'a b', 'a/b']) {
			expect(() => packAtlas([makeSource(name, 1, 1)])).toThrow(/names/);
		}
		expect(() => packAtlas([{ name: 'a', width: 2, height: 2, pixels: new Uint8Array(4) }])).toThrow(/RGBA/);
		expect(() => packAtlas([{ ...makeSource('a', 1, 1), width: 0 }])).toThrow(/dimensions/);
	});

	test('validates option ranges and filename before allocating output', () => {
		const badOptions: AtlasOptions[] = [
			{ maxWidth: 0 }, { maxHeight: Infinity }, { extrude: -1 }, { trimMargin: 1.5 },
			{ alphaThreshold: 0 }, { alphaThreshold: 256 }, { file: '../a.png' }, { file: 'a.jpg' },
			{ borderPadding: -1 }, { shapePadding: NaN }, { maxPixels: 0 },
		];
		for (const options of badOptions) {
			expect(() => packAtlas([makeSource('a', 1, 1)], options)).toThrow(AtlasError);
		}
	});

	test('reports single-sheet overflow without rotating or allocating a partial result', () => {
		expect(() => packAtlas([makeSource('wide', 7, 1)], { maxWidth: 8, maxHeight: 8 })).toThrow(/do not fit/);
		expect(() => packAtlas([makeSource('wide', 7, 2)], { extrude: 0, maxWidth: 4, maxHeight: 8 })).toThrow(/do not fit/);
	});

	test('limits total decoded source pixels and output area independently of dimension bounds', () => {
		expect(() => packAtlas([makeSource('large', 3, 3)], { maxPixels: 8 })).toThrow(/source pixels/);
		expect(() => packAtlas([makeSource('a', 3, 3)], { maxPixels: 16 })).toThrow(/maxPixels/);
	});
});
