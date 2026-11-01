import { afterEach, describe, expect, it, vi } from 'vitest';
import { BitmapData } from '../src/kurot/display/texture/BitmapData.js';
import { createTextureUploadHarness } from './helpers/texture-upload-harness.js';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('BitmapData upload registration work', () => {
	it.each([100, 1000, 2000])('bounds every new registration to 8 weak checks with %i live sources', count => {
		const context = createTextureUploadHarness();
		const canvas = document.createElement('canvas');
		const sources = Array.from({ length: count }, () => new BitmapData(canvas));
		const checks = vi.spyOn(WeakRef.prototype, 'deref');
		for (const data of sources) {
			const before = checks.mock.calls.length;
			context.getWebGLTexture(data);
			expect(checks.mock.calls.length - before).toBeLessThanOrEqual(8);
		}
		expect(checks.mock.calls.length).toBeLessThanOrEqual(8 * count);
		expect(context._trackedBitmapDatas.size).toBe(count);
	});

	it('performs no weak scan for cached uploads or indexed reuploads and reuses the original registrations', () => {
		const context = createTextureUploadHarness();
		const canvas = document.createElement('canvas');
		const sources = Array.from({ length: 1000 }, () => new BitmapData(canvas));
		for (const data of sources) {
			context.getWebGLTexture(data);
		}
		const registrations = [...context._trackedBitmapDatas];
		const checks = vi.spyOn(WeakRef.prototype, 'deref');
		for (const data of sources) {
			context.getWebGLTexture(data);
		}
		expect(checks.mock.calls.length).toBe(0);
		for (const data of sources) {
			const before = checks.mock.calls.length;
			data.webGLTexture = undefined;
			context.getWebGLTexture(data);
			expect(checks.mock.calls.length - before).toBe(0);
		}
		expect(checks.mock.calls.length).toBe(0);
		expect([...context._trackedBitmapDatas]).toEqual(registrations);
		for (const data of sources) {
			expect(context._trackedBitmapDatas.has(context._bitmapDataRefs.get(data)!)).toBe(true);
		}
	});

	it('advances past a live prefix to reclaim dead registrations without a full scan', () => {
		const context = createTextureUploadHarness();
		const canvas = document.createElement('canvas');
		const sources = Array.from({ length: 64 }, () => new BitmapData(canvas));
		for (const data of sources) {
			context.getWebGLTexture(data);
		}
		context._bitmapDataSweep = undefined;
		const dead = Array.from({ length: 40 }, (): WeakRef<BitmapData> => ({
			deref: () => undefined,
			[Symbol.toStringTag]: 'WeakRef',
		}));
		for (const ref of dead) {
			context._trackedBitmapDatas.add(ref);
		}
		const next = new BitmapData(canvas);
		sources.push(next);
		context.getWebGLTexture(next);
		expect(dead.every(ref => context._trackedBitmapDatas.has(ref))).toBe(true);
		for (let i = 1; i < 13; i++) {
			const data = new BitmapData(canvas);
			sources.push(data);
			context.getWebGLTexture(data);
		}
		expect(dead.some(ref => context._trackedBitmapDatas.has(ref))).toBe(false);
		expect(context._trackedBitmapDatas.size).toBe(sources.length);
	});

	it('removes the index and sweep cursor on explicit disposal, including re-registration', () => {
		const context = createTextureUploadHarness();
		const canvas = document.createElement('canvas');
		const first = new BitmapData(canvas);
		const second = new BitmapData(canvas);
		context.getWebGLTexture(first);
		context.getWebGLTexture(second);
		expect(context._bitmapDataRefs.has(first)).toBe(true);
		expect(context._bitmapDataRefs.has(second)).toBe(true);
		const oldRef = context._bitmapDataRefs.get(first);
		first.dispose();
		second.dispose();
		expect(context._bitmapDataRefs.has(first)).toBe(false);
		expect(context._bitmapDataRefs.has(second)).toBe(false);
		expect(context._trackedBitmapDatas.size).toBe(0);
		expect(context._bitmapDataSweep).toBeUndefined();
		first.source = canvas;
		context.getWebGLTexture(first);
		expect(context._bitmapDataRefs.get(first)).not.toBe(oldRef);
		expect(context._trackedBitmapDatas.size).toBe(1);
		first.dispose();
	});
});
