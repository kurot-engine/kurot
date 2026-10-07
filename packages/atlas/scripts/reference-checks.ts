import assert from 'node:assert/strict';
import type { AtlasData, AtlasFrame, AtlasImage } from '../src/AtlasTypes.js';

const FRAME_FIELDS = ['x', 'y', 'w', 'h', 'offX', 'offY', 'sourceW', 'sourceH'];

export function parseSheet(text: string, file: string): AtlasData {
	const value: unknown = JSON.parse(text);
	assert(value && typeof value === 'object' && !Array.isArray(value));
	assert('file' in value && value.file === file);
	assert('frames' in value && value.frames && typeof value.frames === 'object' && !Array.isArray(value.frames));
	for (const entry of Object.values(value.frames as Record<string, unknown>)) {
		assert(entry && typeof entry === 'object' && !Array.isArray(entry));
		const frame = entry as Record<string, unknown>;
		assert(Object.keys(frame).every(key => FRAME_FIELDS.includes(key)));
		for (const key of FRAME_FIELDS) {
			const entry: unknown = frame[key];
			assert(entry === undefined || (Number.isSafeInteger(entry) && Number(entry) >= 0));
		}
		for (const key of ['x', 'y', 'w', 'h']) {
			assert(key in frame);
		}
		assert(Number(frame.w) > 0 && Number(frame.h) > 0);
	}
	return value as AtlasData;
}

export function checkFrame(image: AtlasImage, frame: AtlasFrame, source: AtlasImage, label: string): number {
	const { x, y, w, h } = frame;
	const offX = frame.offX ?? 0;
	const offY = frame.offY ?? 0;
	assert.equal(frame.sourceW ?? w, source.width, `${label}: sourceW`);
	assert.equal(frame.sourceH ?? h, source.height, `${label}: sourceH`);
	assert(x >= 1 && y >= 1 && x + w < image.width && y + h < image.height, `${label}: extrusion bounds`);
	assert(offX + w <= source.width && offY + h <= source.height, `${label}: logical bounds`);
	assert.deepEqual([offX, offY, w, h], expectedCrop(source), `${label}: alpha crop + margin`);
	for (let sy = 0; sy < source.height; sy++) {
		for (let sx = 0; sx < source.width; sx++) {
			const inside = sx >= offX && sx < offX + w && sy >= offY && sy < offY + h;
			if (!inside) {
				assert.equal(source.pixels[(sy * source.width + sx) * 4 + 3], 0, `${label}: cropped visible pixel`);
				continue;
			}
			comparePixel(image, x + sx - offX, y + sy - offY, source, sx, sy, label);
		}
	}
	for (let dy = -1; dy <= h; dy++) {
		for (let dx = -1; dx <= w; dx++) {
			if (dx >= 0 && dx < w && dy >= 0 && dy < h) continue;
			comparePixel(image, x + dx, y + dy, source,
				offX + Math.max(0, Math.min(w - 1, dx)), offY + Math.max(0, Math.min(h - 1, dy)), label);
		}
	}
	return w * h;
}

export function checkOverlap(data: AtlasData): void {
	const frames = Object.entries(data.frames);
	for (let i = 0; i < frames.length; i++) {
		const a = frames[i]!;
		for (let j = i + 1; j < frames.length; j++) {
			const b = frames[j]!;
			assert(a[1].x + a[1].w + 1 <= b[1].x - 1 || b[1].x + b[1].w + 1 <= a[1].x - 1 ||
				a[1].y + a[1].h + 1 <= b[1].y - 1 || b[1].y + b[1].h + 1 <= a[1].y - 1,
				`Extruded frames overlap: ${a[0]}, ${b[0]}`);
		}
	}
}

function comparePixel(a: AtlasImage, ax: number, ay: number, b: AtlasImage, bx: number, by: number, label: string): void {
	const ai = (ay * a.width + ax) * 4;
	const bi = (by * b.width + bx) * 4;
	const alpha = b.pixels[bi + 3]!;
	for (let channel = 0; channel < 4; channel++) {
		const expected = alpha === 0 && channel < 3 ? 0 : b.pixels[bi + channel];
		assert.equal(a.pixels[ai + channel], expected, `${label}: pixel ${ax},${ay}, channel ${channel}`);
	}
}

function expectedCrop(source: AtlasImage): number[] {
	let left = source.width;
	let top = source.height;
	let right = -1;
	let bottom = -1;
	for (let y = 0; y < source.height; y++) {
		for (let x = 0; x < source.width; x++) {
			if (source.pixels[(y * source.width + x) * 4 + 3] === 0) continue;
			left = Math.min(left, x);
			top = Math.min(top, y);
			right = Math.max(right, x);
			bottom = Math.max(bottom, y);
		}
	}
	if (right < 0) return [0, 0, 1, 1];
	left = Math.max(0, left - 1);
	top = Math.max(0, top - 1);
	right = Math.min(source.width - 1, right + 1);
	bottom = Math.min(source.height - 1, bottom + 1);
	return [left, top, right - left + 1, bottom - top + 1];
}
