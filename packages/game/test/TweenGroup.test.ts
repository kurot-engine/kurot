import { describe, it, expect } from 'vitest';
import { Tween } from '../src/blakron/tween/Tween.js';
import { TweenGroup } from '../src/blakron/tween/TweenGroup.js';

describe('TweenGroup', () => {
	it('removeAll() removes every tween it tracks', () => {
		const targetA = { x: 0 };
		const targetB = { x: 0 };
		const group = new TweenGroup('test');

		group.get(targetA).to({ x: 100 }, 500);
		group.get(targetB).to({ x: 100 }, 500);

		expect(group.size).toBe(2);

		group.removeAll();

		expect(Tween.getCount(targetA)).toBe(0);
		expect(Tween.getCount(targetB)).toBe(0);

		expect(group.size).toBe(0);
	});

	it('removeAll() clears the group so a subsequent call is a no-op', () => {
		const target = { x: 0 };
		const group = new TweenGroup('test');

		group.get(target).to({ x: 100 }, 500);
		group.removeAll();
		expect(() => group.removeAll()).not.toThrow();
		expect(group.size).toBe(0);
	});

	it('a tween removed via removeAll() no longer advances on tick', () => {
		const target = { x: 0 };
		const group = new TweenGroup('test');
		const tween = group.get(target).to({ x: 100 }, 100);

		group.removeAll();

		tween._tick(50);
		expect(target.x).toBe(0);
	});

	it('removeAll() releases its tween instances', () => {
		const target = { x: 0 };
		const group = new TweenGroup('test');
		const removed = group.get(target).to({ x: 100 }, 500);

		group.removeAll();

		expect(removed.isActive).toBe(false);
	});
});

describe('TweenGroup lifecycle safety', () => {
	it('removes naturally completed members without affecting later tweens', () => {
		const completedTarget = { x: 0 };
		const replacementTarget = { x: 0 };
		const group = new TweenGroup('test');
		const completed = group.get(completedTarget).to({ x: 100 }, 100);

		completed._tick(100);
		expect(group.size).toBe(0);

		const replacement = Tween.get(replacementTarget).to({ x: 100 }, 100);
		group.removeAll();

		expect(replacement).not.toBe(completed);
		expect(Tween.getCount(replacementTarget)).toBe(1);
		replacement.remove();
	});

	it('does not track an inactive tween added after completion', () => {
		const target = { x: 0 };
		const group = new TweenGroup('test');
		const tween = Tween.get(target).to({ x: 100 }, 100);

		tween.remove();
		group.add(tween);

		expect(group.size).toBe(0);
	});
});

describe('TweenGroup active members', () => {
	it('deduplicates active additions and controls their pause lifecycle', () => {
		const target = { x: 0 };
		const group = new TweenGroup('test');
		const tween = Tween.get(target).to({ x: 100 }, 100);

		group.add(tween);
		group.add(tween);
		expect(group.size).toBe(1);

		group.pause();
		tween._tick(50);
		expect(target.x).toBe(0);

		group.resume();
		tween._tick(50);
		expect(target.x).toBe(50);
		tween.remove();
	});
});
