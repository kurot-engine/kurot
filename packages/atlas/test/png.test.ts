import { Buffer } from 'node:buffer';
import { PNG } from 'pngjs';
import { expect, test } from 'vitest';
import { AtlasError } from '../src/index.js';
import { decodePNG, encodePNG, packPNGAtlas } from '../src/png/index.js';
import { makeSource, pixel } from './helpers.js';

test('PNG roundtrip retains every RGBA byte, including straight alpha', () => {
	const source = makeSource('image', 5, 3, 128);
	expect(decodePNG(encodePNG(source))).toEqual({ width: source.width, height: source.height, pixels: source.pixels });
});

test('packs named PNG inputs and emits readable RGBA8 without altering source bytes', () => {
	const source = makeSource('button', 3, 2, 128);
	const bytes = encodePNG(source);
	const before = bytes.slice();
	const result = packPNGAtlas([{ name: 'button', png: bytes }], { file: 'r_basis.png' });
	const png = PNG.sync.read(Buffer.from(result.png));
	expect(png.depth).toBe(8);
	expect(png.colorType).toBe(6);
	expect([png.width, png.height]).toEqual([result.width, result.height]);
	const frame = result.data.frames.button!;
	expect(pixel(decodePNG(result.png), frame.x + 1, frame.y + 1)).toEqual(pixel(source, 1, 1));
	expect(bytes).toEqual(before);
	expect(packPNGAtlas([{ name: 'button', png: bytes }], { file: 'r_basis.png' })).toEqual(result);
});

test('accepts RGB and grayscale PNG inputs and normalizes to RGBA', () => {
	const png = new PNG({ width: 2, height: 1 });
	png.data.set([50, 50, 50, 255, 70, 70, 70, 255]);
	for (const colorType of [0, 2] as const) {
		const result = decodePNG(PNG.sync.write(png, { colorType }));
		expect(Array.from(result.pixels)).toEqual(Array.from(png.data));
	}
});

test('rejects malformed signatures, truncated chunks and corrupted CRC', () => {
	expect(() => decodePNG(new Uint8Array(40))).toThrow(/signature/);
	const bytes = encodePNG(makeSource('a', 2, 2));
	expect(() => decodePNG(bytes.slice(0, 36))).toThrow(AtlasError);
	const corrupt = bytes.slice();
	corrupt[29] = corrupt[29]! ^ 255;
	expect(() => decodePNG(corrupt)).toThrow(/decode PNG/);
});

test('limits dimensions from the header before decoding and total batch size', () => {
	const bytes = encodePNG(makeSource('a', 2, 2));
	expect(() => decodePNG(bytes, 3)).toThrow(/maxPixels/);
	expect(() => packPNGAtlas([{ name: 'a', png: bytes }, { name: 'b', png: bytes }], { maxPixels: 7 })).toThrow(/source pixels/);
	const giant = Buffer.from(bytes);
	giant.writeUInt32BE(100_000, 16);
	giant.writeUInt32BE(100_000, 20);
	expect(() => decodePNG(giant)).toThrow(/maxPixels/);
	expect(() => decodePNG(bytes, NaN)).toThrow(/limit/);
});

test('rejects APNG rather than silently packing just the first frame', () => {
	const bytes = encodePNG(makeSource('a', 2, 2));
	const chunk = Buffer.alloc(20);
	chunk.writeUInt32BE(8, 0);
	chunk.write('acTL', 4, 'ascii');
	const animated = Buffer.concat([bytes.slice(0, 33), chunk, bytes.slice(33)]);
	expect(() => decodePNG(animated)).toThrow(/Animated/);
});

test('rejects invalid output images and empty PNG batches', () => {
	expect(() => encodePNG({ width: 1, height: 2, pixels: new Uint8Array(4) })).toThrow(/Invalid RGBA/);
	expect(() => packPNGAtlas([])).toThrow(/between/);
});
