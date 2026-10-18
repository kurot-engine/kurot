import { Tween } from './Tween.js';
import type { TweenOptions } from './types.js';

/**
 * Manages a named collection of active Tweens.
 *
 * @example
 * ```ts
 * import { TweenGroup } from '@kurot/game';
 *
 * const button = { alpha: 1 };
 * const group = new TweenGroup('ui');
 * group.get(button).to({ alpha: 0 }, 200);
 * group.pause();
 * group.resume();
 * group.removeAll();
 * ```
 */
export class TweenGroup {
	// ── Instance fields ───────────────────────────────────────────────────────

	/**
	 * Diagnostic group name, defaulting to an empty string. Names do not register
	 * or share groups; keep the group instance that owns a round's tweens.
	 */
	public readonly name: string;
	private _tweens: Tween[] = [];

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(name = '') {
		this.name = name;
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	/**
	 * Number of tracked active tweens, including paused tweens. Completed or removed
	 * tweens automatically leave the group.
	 */
	public get size(): number {
		return this._tweens.length;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Create and track a tween without overriding other tweens on the target.
	 * Uses TweenOptions defaults. Call removeAll() when this group's round ends.
	 */
	public get(target: object, options?: TweenOptions): Tween {
		const tween = Tween.get(target, options);
		this._track(tween);
		return tween;
	}

	/**
	 * Track an existing active tween. Duplicate entries and already released tweens
	 * are ignored. A tween may be tracked by multiple independent groups.
	 */
	public add(tween: Tween): void {
		this._track(tween);
	}

	/**
	 * Pause tracked tweens while retaining targets and group membership.
	 * Use removeAll() for disposal; pausing does not release them.
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
	 * Remove all tracked tweens and clear the group. Pending await/then completion
	 * resolves even on removal; guard continuation code against an ended game round.
	 * Tweens that are not tracked by this instance are unaffected.
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
