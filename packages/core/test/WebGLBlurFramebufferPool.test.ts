import { describe, expect, it, vi } from 'vitest';
import { WebGLFilterTargetPool } from '../src/kurot/player/webgl/WebGLFilterTargetPool.js';
import type { WebGLRenderTarget } from '../src/kurot/player/webgl/WebGLRenderTarget.js';
import type { GL } from '../src/kurot/player/webgl/WebGLUtils.js';

function target(width = 1, height = 1): WebGLRenderTarget {
	return { width, height, dispose: vi.fn() } as unknown as WebGLRenderTarget;
}

// Blur and custom multi-pass effects share the same bounded pool.
describe('WebGL filter target pool', () => {
	it('caps retained targets and disposes the oldest', () => {
		const pool = new WebGLFilterTargetPool({} as GL);
		const first = target();
		pool.release(first);
		for (let i = 1; i < 17; i++) { pool.release(target(i + 1)); }
		expect(pool.size).toBe(16);
		expect(first.dispose).toHaveBeenCalledOnce();
	});

	it('reuses an exact-size target and removes its retained bytes', () => {
		const pool = new WebGLFilterTargetPool({} as GL);
		const entry = target(20, 30);
		pool.release(entry);
		expect(pool.bytes).toBe(2400);
		expect(pool.acquire(20, 30)).toBe(entry);
		expect(pool.size).toBe(0);
		expect(pool.bytes).toBe(0);
	});

	it('keeps idle targets within 64 MiB and drops oversized targets', () => {
		const pool = new WebGLFilterTargetPool({} as GL);
		const full = target(4096, 4096);
		pool.release(full);
		pool.release(target());
		expect(full.dispose).toHaveBeenCalledOnce();
		expect(pool.bytes).toBe(4);
		const oversized = target(8192, 8192);
		pool.release(oversized);
		expect(oversized.dispose).toHaveBeenCalledOnce();
		expect(pool.bytes).toBe(4);
	});

	it('releases live handles on explicit cleanup and discards lost handles without deleting', () => {
		const pool = new WebGLFilterTargetPool({} as GL);
		const first = target(); pool.release(first); pool.clear();
		expect(first.dispose).toHaveBeenCalledOnce();
		const lost = target(); pool.release(lost); pool.clear(true);
		expect(lost.dispose).not.toHaveBeenCalled();
		expect(pool.size).toBe(0);
		expect(pool.bytes).toBe(0);
	});
});
