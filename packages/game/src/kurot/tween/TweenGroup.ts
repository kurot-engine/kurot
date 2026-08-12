import { Tween } from './Tween.js';
import type { TweenOptions } from './types.js';

/**
 * Manages a named collection of active Tweens.
 *
 * @example
 * ```ts
 * const group = new TweenGroup('ui');
 * group.get(button).to({ alpha: 0 }, 200);
 * group.pause();
 * group.resume();
 * group.removeAll();
 * ```
 */
export class TweenGroup {
	// ── Instance fields ───────────────────────────────────────────────────────

	public readonly name: string;
	private _tweens: Tween[] = [];

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(name = '') {
		this.name = name;
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	/**
	 * Number of active Tweens currently tracked by this group.
	 */
	public get size(): number {
		return this._tweens.length;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Create and track a Tween for the specified target.
	 */
	public get(target: object, options?: TweenOptions): Tween {
		const tween = Tween.get(target, options);
		this._track(tween);
		return tween;
	}

	/**
	 * Add an existing active Tween to this group.
	 */
	public add(tween: Tween): void {
		this._track(tween);
	}

	/**
	 * Pause every tracked Tween.
	 */
	public pause(): void {
		for (const tween of this._tweens) {
			tween.pause();
		}
	}

	/**
	 * Resume every tracked Tween.
	 */
	public resume(): void {
		for (const tween of this._tweens) {
			tween.resume();
		}
	}

	/**
	 * Remove every tracked Tween and clear the group.
	 */
	public removeAll(): void {
		for (const tween of this._tweens.slice()) {
			tween.remove();
		}
		this._tweens = [];
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private _track(tween: Tween): void {
		if (!tween.isActive || this._tweens.includes(tween)) {
			return;
		}
		this._tweens.push(tween);
		tween._addReleaseListener(() => {
			const index = this._tweens.indexOf(tween);
			if (index !== -1) {
				this._tweens.splice(index, 1);
			}
		});
	}
}
