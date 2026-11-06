import { afterEach, describe, expect, it } from 'vitest';
import { Tween } from '../src/kurot/tween/Tween.js';

afterEach(() => {
	Tween.removeAllTweens();
});

describe('Tween callback ownership', () => {
	it('passes the second argument array to an unbound forward callback', () => {
		const target = { x: 0 };
		const payload = { message: 'complete' };
		const calls: Array<{ receiver: unknown; args: unknown[] }> = [];
		const tween = Tween.get(target)
			.to({ x: 1 }, 10)
			.call(
				function complete(this: unknown, ...args: unknown[]): void {
					calls.push({ receiver: this, args });
				},
				[payload, 0, false, undefined],
			);
		tween._tick(10);
		expect(calls).toEqual([{ receiver: undefined, args: [payload, 0, false, undefined] }]);
		expect(calls[0].args[0]).toBe(payload);
		expect(tween.isActive).toBe(false);
	});

	it('calls change and loop callbacks without falling back to the tween target', () => {
		const changes: Array<{ receiver: unknown; tween: Tween }> = [];
		const loops: Array<{ receiver: unknown; tween: Tween }> = [];
		const target = { x: 0 };
		const tween = Tween.get(target, {
			repeat: 1,
			onChange(this: unknown, current: Tween): void {
				changes.push({ receiver: this, tween: current });
			},
			onLoopComplete(this: unknown, current: Tween): void {
				loops.push({ receiver: this, tween: current });
			},
		}).to({ x: 10 }, 10);
		tween._tick(10);
		tween._tick(10);
		expect(changes.length).toBeGreaterThanOrEqual(2);
		expect(changes.every(call => call.receiver === undefined && call.tween === tween)).toBe(true);
		expect(loops).toEqual([{ receiver: undefined, tween }]);
		expect(tween.isActive).toBe(false);
	});

	it('preserves a caller-bound receiver and skips callback steps when seeking or reversing', () => {
		const owner = { calls: 0 };
		function complete(this: typeof owner): void {
			this.calls++;
		}
		const callback = complete.bind(owner);
		const tween = Tween.get({ x: 0 }, { repeat: 1, yoyo: true }).to({ x: 10 }, 10).call(callback);
		tween._tick(10);
		tween._tick(10);
		expect(owner.calls).toBe(1);
		const seek = Tween.get({ x: 0 }).to({ x: 10 }, 10).call(callback).wait(10);
		seek.setPosition(20);
		expect(owner.calls).toBe(1);
	});
});
