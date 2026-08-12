import { afterEach, describe, expect, it, vi } from 'vitest';
import { ticker } from '@kurot/core';
import { Tween } from '../src/blakron/tween/Tween.js';
import { Ease } from '../src/blakron/tween/Ease.js';

afterEach(() => {
	Tween.removeAllTweens();
	Tween.resumeAll();
	vi.restoreAllMocks();
});

describe('Tween', () => {
	it('remove() detaches the tween', () => {
		const target = { x: 0 };
		const tween = Tween.get(target).to({ x: 100 }, 100);

		tween.remove();
		tween._tick(50);

		expect(target.x).toBe(0);
		expect(Tween.getCount(target)).toBe(0);
		expect(tween.isActive).toBe(false);
	});

	it('removeTweens() detaches all tweens targeting an object', () => {
		const target = { x: 0 };
		const tween = Tween.get(target).to({ x: 100 }, 100);

		Tween.removeTweens(target);

		expect(Tween.getCount(target)).toBe(0);
		expect(tween.isActive).toBe(false);
	});

	it('removeAllTweens() detaches every active tween', () => {
		const targetA = { x: 0 };
		const targetB = { x: 0 };
		const a = Tween.get(targetA).to({ x: 100 }, 100);
		const b = Tween.get(targetB).to({ x: 100 }, 100);

		Tween.removeAllTweens();

		expect(Tween.getCount(targetA)).toBe(0);
		expect(Tween.getCount(targetB)).toBe(0);
		expect(a.isActive).toBe(false);
		expect(b.isActive).toBe(false);
	});

	it('marks a naturally completed tween as inactive', () => {
		const target = { x: 0 };
		const tween = Tween.get(target).to({ x: 100 }, 100);

		tween._tick(100);

		expect(target.x).toBe(100);
		expect(tween.isActive).toBe(false);
	});

	it('getCount() tracks active tweens per target without touching the target object', () => {
		const target: Record<string, unknown> = { x: 0 };
		expect(Tween.getCount(target)).toBe(0);

		const a = Tween.get(target).to({ x: 100 }, 100);
		expect(Tween.getCount(target)).toBe(1);

		const b = Tween.get(target).to({ x: 200 }, 100);
		expect(Tween.getCount(target)).toBe(2);

		expect(target.tween_count).toBeUndefined();

		a.remove();
		expect(Tween.getCount(target)).toBe(1);

		b.remove();
		expect(Tween.getCount(target)).toBe(0);
	});
});

describe('Tween lifecycle safety', () => {
	it('does not release a replacement tween created from a completion callback', () => {
		const originalTarget = { x: 0 };
		const replacementTarget = { x: 0 };
		let replacement: Tween | undefined;
		const tween = Tween.get(originalTarget, {
			onChange: () => {
				Tween.removeTweens(originalTarget);
				replacement = Tween.get(replacementTarget).to({ x: 100 }, 100);
			},
		}).to({ x: 100 }, 100);

		tween._tick(100);

		expect(Tween.getCount(originalTarget)).toBe(0);
		expect(replacement).toBeDefined();
		expect(Tween.getCount(replacementTarget)).toBe(1);
		replacement!._tick(100);
		expect(replacementTarget.x).toBe(100);
	});

	it('completes an empty tween on the next tick', async () => {
		const target = { x: 0 };
		const tween = Tween.get(target);
		const done = tween.then();

		tween._tick(0);

		await expect(done).resolves.toBeUndefined();
		expect(Tween.getCount(target)).toBe(0);
	});
});

describe('Tween repeat', () => {
	it('plays once by default (repeat: 0)', () => {
		const target = { x: 0 };
		const tween = Tween.get(target).to({ x: 100 }, 100);

		tween._tick(100);

		expect(target.x).toBe(100);
		expect(Tween.getCount(target)).toBe(0);
	});

	it('repeat: 2 plays a total of 3 times', () => {
		const target = { x: 0 };
		let onLoopCompleteCalls = 0;
		const tween = Tween.get(target, { repeat: 2, onLoopComplete: () => onLoopCompleteCalls++ }).to({ x: 100 }, 100);

		tween._tick(100);
		expect(target.x).toBe(100);
		expect(onLoopCompleteCalls).toBe(1);
		expect(Tween.getCount(target)).toBe(1);

		tween._tick(100);
		expect(onLoopCompleteCalls).toBe(2);
		expect(Tween.getCount(target)).toBe(1);

		tween._tick(100);
		expect(target.x).toBe(100);
		expect(Tween.getCount(target)).toBe(0);
	});

	it('reuses the original endpoints when repeating a to() step', () => {
		const target = { x: 0 };
		const tween = Tween.get(target, { repeat: 1 }).to({ x: 100 }, 100);

		tween._tick(100);
		tween._tick(50);

		expect(target.x).toBe(50);
		tween.remove();
	});

	it('consumes multiple repeat cycles from a single large tick', () => {
		const target = { x: 0 };
		let onLoopCompleteCalls = 0;
		const tween = Tween.get(target, { repeat: 2, onLoopComplete: () => onLoopCompleteCalls++ }).to({ x: 100 }, 100);

		tween._tick(250);

		expect(target.x).toBe(50);
		expect(onLoopCompleteCalls).toBe(2);
		expect(Tween.getCount(target)).toBe(1);

		tween._tick(50);
		expect(Tween.getCount(target)).toBe(0);
	});

	it('normalizes invalid repeat values to a single play', () => {
		const target = { x: 0 };
		const tween = Tween.get(target, { repeat: -2 }).to({ x: 100 }, 100);

		tween._tick(100);

		expect(Tween.getCount(target)).toBe(0);
	});

	it('repeat: -1 (equivalent to loop: true) never stops on its own', () => {
		const target = { x: 0 };
		const tween = Tween.get(target, { repeat: -1 }).to({ x: 100 }, 100);

		for (let i = 0; i < 50; i++) {
			tween._tick(100);
		}

		expect(Tween.getCount(target)).toBe(1);
		tween.remove();
	});

	it('loop: true is still honoured as repeat: -1 for backward compatibility', () => {
		const target = { x: 0 };
		const tween = Tween.get(target, { loop: true }).to({ x: 100 }, 100);

		for (let i = 0; i < 10; i++) {
			tween._tick(100);
		}

		expect(Tween.getCount(target)).toBe(1);
		tween.remove();
	});
});

describe('Tween yoyo', () => {
	it('alternates direction each repeat, animating back to the start value', () => {
		const target = { x: 0 };
		const tween = Tween.get(target, { repeat: 1, yoyo: true }).to({ x: 100 }, 100);

		tween._tick(50);
		expect(target.x).toBeCloseTo(50, 5);

		tween._tick(50);
		expect(target.x).toBe(100);

		tween._tick(50);
		expect(target.x).toBeCloseTo(50, 5);

		tween._tick(50);
		expect(target.x).toBe(0);
		expect(Tween.getCount(target)).toBe(0);
	});

	it('keeps a multi-step sequence continuous across the reverse pass', () => {
		const target = { x: 0 };
		const tween = Tween.get(target, { repeat: 1, yoyo: true }).to({ x: 100 }, 100).to({ x: 200 }, 100);

		tween._tick(200);
		expect(target.x).toBe(200);

		tween._tick(1);
		expect(target.x).toBeLessThan(200);
		expect(target.x).toBeGreaterThan(90);

		tween._tick(199);
		tween._tick(200);
		expect(target.x).toBe(0);
	});

	it('does not re-trigger call() or set() steps on the reverse pass', () => {
		const target = { x: 0, value: 0 };
		let calls = 0;
		const tween = Tween.get(target, { repeat: 1, yoyo: true })
			.to({ x: 100 }, 100)
			.call(() => calls++)
			.set({ value: 1 });

		tween._tick(100);
		expect(calls).toBe(1);
		expect(target.value).toBe(1);

		tween._tick(100);
		expect(calls).toBe(1);
		expect(target.value).toBe(1);
		expect(target.x).toBe(0);
	});

	it('handles a zero-duration property step as an instant step', () => {
		const target = { x: 0 };
		const tween = Tween.get(target).to({ x: 100 }, 0);

		tween._tick(0);

		expect(target.x).toBe(100);
		expect(Tween.getCount(target)).toBe(0);
	});

	it('reuses its first-pass end values while reversing a from() step', () => {
		const target = { x: 100 };
		const tween = Tween.get(target, { repeat: 1, yoyo: true }).from({ x: 0 }, 100);

		tween._tick(50);
		expect(target.x).toBe(50);

		tween._tick(50);
		expect(target.x).toBe(100);

		tween._tick(50);
		expect(target.x).toBe(50);

		tween._tick(50);
		expect(target.x).toBe(0);
		expect(Tween.getCount(target)).toBe(0);
	});
});

describe('Tween pause lifecycle', () => {
	it('tracks a tween started paused and allows removeTweens() to remove it', () => {
		const target = { x: 0 };
		const tween = Tween.get(target, { paused: true }).to({ x: 100 }, 100);

		expect(Tween.getCount(target)).toBe(1);
		tween._tick(100);
		expect(target.x).toBe(0);

		Tween.removeTweens(target);
		expect(Tween.getCount(target)).toBe(0);
		tween._tick(100);
		expect(target.x).toBe(0);
	});

	it('allows an ignoreGlobalPause tween to advance while globally paused', () => {
		const target = { x: 0 };
		const tween = Tween.get(target, { ignoreGlobalPause: true }).to({ x: 100 }, 100);

		Tween.pauseAll();
		tween._tick(100);
		Tween.resumeAll();

		expect(target.x).toBe(100);
		expect(Tween.getCount(target)).toBe(0);
	});
});

describe('Tween as a thenable', () => {
	it('resolves with undefined when the tween completes naturally', async () => {
		const target = { x: 0 };
		const tween = Tween.get(target).to({ x: 100 }, 100);

		const done = tween.then(value => value);
		tween._tick(100);

		await expect(done).resolves.toBeUndefined();
	});

	it('allows multiple completion callbacks', async () => {
		const target = { x: 0 };
		const tween = Tween.get(target).to({ x: 100 }, 100);
		const first = tween.then(() => 'first');
		const second = tween.then(() => 'second');

		tween._tick(100);

		await expect(Promise.all([first, second])).resolves.toEqual(['first', 'second']);
	});

	it('resolves without rejecting when removed early via remove()', async () => {
		const target = { x: 0 };
		const tween = Tween.get(target).to({ x: 100 }, 1000);

		const done = tween.then(() => 'settled');
		tween.remove();

		await expect(done).resolves.toBe('settled');
	});

	it('resolves when removed via Tween.removeTweens()', async () => {
		const target = { x: 0 };
		const tween = Tween.get(target).to({ x: 100 }, 1000);

		const done = tween.then(() => 'settled');
		Tween.removeTweens(target);

		await expect(done).resolves.toBe('settled');
	});

	it('supports await directly when the tween completes before then is invoked', async () => {
		const target = { x: 0 };
		const tween = Tween.get(target).to({ x: 100 }, 100);
		const done = (async (): Promise<void> => await tween)();

		tween._tick(100);

		await expect(done).resolves.toBeUndefined();
	});
});

describe('Tween safety and seeking', () => {
	it('does not let an old reference remove a newer tween', () => {
		const oldTarget = { x: 0 };
		const newTarget = { x: 0 };
		const oldTween = Tween.get(oldTarget).to({ x: 100 }, 100);

		oldTween.remove();
		const newTween = Tween.get(newTarget).to({ x: 100 }, 100);
		oldTween.remove();

		expect(newTween).not.toBe(oldTween);
		expect(newTween.isActive).toBe(true);
		expect(Tween.getCount(newTarget)).toBe(1);
		newTween._tick(100);
		expect(newTarget.x).toBe(100);
	});

	it('applies every preceding step when seeking into a sequence', () => {
		const target = { x: 0, visible: true };
		const tween = Tween.get(target).to({ x: 100 }, 100).set({ visible: false }).to({ x: 200 }, 100);

		tween.setPosition(150);

		expect(target.x).toBe(150);
		expect(target.visible).toBe(false);
		tween.remove();
	});

	it('does not execute callback steps while seeking', () => {
		const target = { x: 0 };
		let calls = 0;
		const tween = Tween.get(target)
			.to({ x: 100 }, 100)
			.call(() => calls++)
			.to({ x: 200 }, 100);

		tween.setPosition(150);

		expect(target.x).toBe(150);
		expect(calls).toBe(0);
		tween.remove();
	});

	it('applies an initial position after chained steps are added', () => {
		const target = { x: 0 };
		const tween = Tween.get(target, { position: 150 }).to({ x: 100 }, 100).to({ x: 200 }, 100);

		tween._tick(0);

		expect(target.x).toBe(150);
		tween.remove();
	});

	it('rejects invalid durations and positions', () => {
		const target = { x: 0 };
		const tween = Tween.get(target);

		expect(() => tween.to({ x: 100 }, Number.NaN)).toThrow(RangeError);
		expect(() => tween.from({ x: 100 }, Number.POSITIVE_INFINITY)).toThrow(RangeError);
		expect(() => tween.wait(-1)).toThrow(RangeError);
		expect(() => tween.setPosition(Number.NaN)).toThrow(RangeError);
		tween.remove();
	});
});

describe('Ease', () => {
	it('keeps the linear cubic bezier curve linear', () => {
		const ease = Ease.cubicBezier(0, 0, 1, 1);

		expect(ease(0.1)).toBeCloseTo(0.1, 6);
		expect(ease(0.5)).toBeCloseTo(0.5, 6);
		expect(ease(0.9)).toBeCloseTo(0.9, 6);
	});
});

describe('Tween ticker integration', () => {
	it('registers on first use, advances from frame deltas, and unregisters after completion', () => {
		const startTick = vi.spyOn(ticker, 'startTick').mockImplementation(() => undefined);
		const stopTick = vi.spyOn(ticker, 'stopTick');
		const target = { x: 0 };
		Tween.get(target).to({ x: 100 }, 100);

		expect(startTick).toHaveBeenCalledTimes(1);
		const tick = startTick.mock.calls[0]?.[0];
		expect(tick).toBeDefined();

		tick!(0);
		expect(target.x).toBe(0);
		tick!(50);
		expect(target.x).toBe(50);
		tick!(100);

		expect(target.x).toBe(100);
		expect(stopTick).toHaveBeenCalledWith(tick, null);
	});
});

describe('Tween step scheduling', () => {
	it('carries remaining time from wait() into the next step', () => {
		const target = { x: 0 };
		const tween = Tween.get(target).wait(100).to({ x: 100 }, 100);

		tween._tick(150);

		expect(target.x).toBe(50);
		expect(tween.isActive).toBe(true);
	});

	it('keeps instant infinite repeats active without looping within one tick', () => {
		const target = { x: 0 };
		let calls = 0;
		const tween = Tween.get(target, { repeat: -1 }).call(() => calls++);

		tween._tick(0);
		expect(calls).toBe(1);
		expect(tween.isActive).toBe(true);

		tween._tick(0);
		expect(calls).toBe(2);
	});
});

describe('Tween pause controls', () => {
	it('does not advance a normal tween while globally paused', () => {
		const target = { x: 0 };
		const tween = Tween.get(target).to({ x: 100 }, 100);

		Tween.pauseAll();
		tween._tick(50);
		expect(target.x).toBe(0);

		Tween.resumeAll();
		tween._tick(50);
		expect(target.x).toBe(50);
	});

	it('pauses and resumes only tweens targeting the requested object', () => {
		const target = { x: 0, y: 0 };
		const otherTarget = { x: 0 };
		const xTween = Tween.get(target).to({ x: 100 }, 100);
		const yTween = Tween.get(target).to({ y: 100 }, 100);
		const otherTween = Tween.get(otherTarget).to({ x: 100 }, 100);

		Tween.pauseTweens(target);
		xTween._tick(50);
		yTween._tick(50);
		otherTween._tick(50);
		expect(target).toEqual({ x: 0, y: 0 });
		expect(otherTarget.x).toBe(50);

		Tween.resumeTweens(target);
		xTween._tick(50);
		yTween._tick(50);
		expect(target).toEqual({ x: 50, y: 50 });
	});
});

describe('Tween seek boundaries', () => {
	it('releases and settles when seeking to the sequence end', async () => {
		const target = { x: 0 };
		const tween = Tween.get(target).to({ x: 100 }, 100);
		const done = tween.then();

		tween.setPosition(100);

		expect(target.x).toBe(100);
		expect(tween.isActive).toBe(false);
		await expect(done).resolves.toBeUndefined();
	});

	it('clamps negative positions and rejects infinite positions', () => {
		const target = { x: 0 };
		const tween = Tween.get(target).to({ x: 100 }, 100);

		tween.setPosition(-10);
		expect(target.x).toBe(0);
		expect(() => tween.setPosition(Number.POSITIVE_INFINITY)).toThrow(RangeError);
		expect(() => Tween.get({ x: 0 }, { position: Number.NEGATIVE_INFINITY })).toThrow(RangeError);
	});
});

describe('Tween thenable completion', () => {
	it('resolves immediately when subscribed after completion', async () => {
		const target = { x: 0 };
		const tween = Tween.get(target).to({ x: 100 }, 100);

		tween._tick(100);

		await expect(tween.then()).resolves.toBeUndefined();
	});
});

describe('Ease edge cases', () => {
	it('keeps Elastic InOut endpoints exact', () => {
		const ease = Ease.getElasticInOut(1, 0.3);

		expect(ease(0)).toBe(0);
		expect(ease(1)).toBe(1);
	});

	it('solves non-linear cubic bezier curves', () => {
		const ease = Ease.cubicBezier(0, 0, 0, 1);

		expect(ease(0.125)).toBeCloseTo(0.5, 6);
	});
});
