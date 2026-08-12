import { describe, it, expect, beforeEach } from 'vitest';
import { DebugLog } from '../src/blakron/utils/DebugLog.js';

describe('DebugLog', () => {
	beforeEach(() => {
		// Reset state — enable then tick past limit to disable
		DebugLog.enable();
		DebugLog['_frameCount'] = 99;
		DebugLog['_enabled'] = false;
		DebugLog['_frameCount'] = 0;
	});

	it('initially not enabled and not active', () => {
		DebugLog['_enabled'] = false;
		DebugLog['_frameCount'] = 0;
		expect(DebugLog.active).toBe(false);
	});

	it('enable sets enabled=true and resets frameCount', () => {
		DebugLog['_enabled'] = false;
		DebugLog['_frameCount'] = 99;
		DebugLog.enable();
		expect(DebugLog.active).toBe(true);
	});

	it('active returns true when enabled and frameCount < maxFrames', () => {
		DebugLog.enable();
		expect(DebugLog.active).toBe(true);
	});

	it('tickFrame increments frameCount', () => {
		DebugLog.enable();
		DebugLog.tickFrame();
		expect(DebugLog.active).toBe(true); // frame 1 of 3
		DebugLog.tickFrame();
		expect(DebugLog.active).toBe(true); // frame 2 of 3
	});

	it('tickFrame disables after maxFrames reached', () => {
		DebugLog.enable();
		DebugLog.tickFrame(); // 1
		DebugLog.tickFrame(); // 2
		DebugLog.tickFrame(); // 3 → disables
		expect(DebugLog.active).toBe(false);
	});

	it('tickFrame is no-op when not enabled', () => {
		DebugLog['_enabled'] = false;
		DebugLog['_frameCount'] = 0;
		DebugLog.tickFrame();
		expect(DebugLog.active).toBe(false);
	});

	it('enable re-enables after auto-disable', () => {
		DebugLog.enable();
		DebugLog.tickFrame();
		DebugLog.tickFrame();
		DebugLog.tickFrame();
		expect(DebugLog.active).toBe(false);

		DebugLog.enable();
		expect(DebugLog.active).toBe(true);
	});

	it('exposed on globalThis', () => {
		expect((globalThis as Record<string, unknown>).DebugLog).toBe(DebugLog);
	});
});
