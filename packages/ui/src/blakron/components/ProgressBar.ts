import { Component } from './Component.js';
import { Event, Rectangle } from '@blakron/core';
import { Direction } from '../core/Direction.js';
import { Animation } from './Animation.js';
import type { Label } from './Label.js';

/**
 * ProgressBar component that visualizes the progress of a task over time.
 *
 * The progress bar fills from `minimum` to `maximum` based on the current `value`.
 * The direction of fill is controlled by the `direction` property.
 *
 * States: none (non-interactive visual element).
 */
export class ProgressBar extends Component {
	// ── Instance fields ───────────────────────────────────────────────────

	public thumb?: Component;
	public labelDisplay?: Label;

	private _minimum = 0;
	private _maximum = 100;
	private _value = 0;
	private _direction = Direction.LTR;
	private _labelFunction?: (value: number, maximum: number) => string;
	private _slideDuration = 500;
	private _animationValue = 0;
	private readonly _animation: Animation;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor() {
		super();
		this._animation = new Animation(this._onAnimationUpdate, this);
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get minimum(): number {
		return this._minimum;
	}

	public set minimum(value: number) {
		if (this._minimum === value) return;
		this._minimum = value;
		if (this._value < value) this._value = value;
		this.invalidateDisplayList();
	}

	public get maximum(): number {
		return this._maximum;
	}

	public set maximum(value: number) {
		if (this._maximum === value) return;
		this._maximum = value;
		if (this._value > value) this._value = value;
		this.invalidateDisplayList();
	}

	public get value(): number {
		return this._value;
	}

	public set value(val: number) {
		val = Math.max(this._minimum, Math.min(this._maximum, val));
		if (this._value === val) return;
		if (this._slideDuration > 0 && this.stage) {
			this._startSlide(val);
		} else {
			this._applyValue(val);
			this.dispatchEventWith(Event.CHANGE);
		}
	}

	private _applyValue(val: number): void {
		this._value = val;
		this._animationValue = val;
		this.invalidateDisplayList();
	}

	private _startSlide(targetValue: number): void {
		if (this._animation.isPlaying) {
			this._animation.stop();
		}
		const range = this._maximum - this._minimum;
		const distance = Math.abs(targetValue - this._animationValue);
		const duration = range > 0 ? this._slideDuration * (distance / range) : 0;
		this._animation.duration = duration === Infinity ? 0 : duration;
		this._animation.from = this._animationValue;
		this._animation.to = targetValue;
		this._animation.play();
	}

	private _onAnimationUpdate = (_anim: Animation): void => {
		this._animationValue = _anim.currentValue;
		this._value = _anim.currentValue;
		this.invalidateDisplayList();
	};

	public get direction(): string {
		return this._direction;
	}

	public set direction(value: string) {
		if (this._direction === value) return;
		this._direction = value;
		this.invalidateDisplayList();
	}

	public get labelFunction(): ((value: number, maximum: number) => string) | undefined {
		return this._labelFunction;
	}

	public set labelFunction(fn: ((value: number, maximum: number) => string) | undefined) {
		if (this._labelFunction === fn) return;
		this._labelFunction = fn;
		this.invalidateDisplayList();
	}

	/** Duration (ms) of the value-change slide animation. 0 = instant. @default 500 */
	public get slideDuration(): number {
		return this._slideDuration;
	}

	public set slideDuration(value: number) {
		value = +value || 0;
		if (this._slideDuration === value) return;
		this._slideDuration = value;
		if (this._animation.isPlaying) {
			this._animation.stop();
			this._applyValue(this._animation.to);
		}
	}

	public get ratio(): number {
		const v = this._animation.isPlaying ? this._animationValue : this._value;
		const range = this._maximum - this._minimum;
		if (range <= 0) return 0;
		return (v - this._minimum) / range;
	}

	// ── Override methods ──────────────────────────────────────────────────

	public override updateDisplayList(unscaledWidth: number, unscaledHeight: number): void {
		super.updateDisplayList(unscaledWidth, unscaledHeight);

		const thumb = this.thumb;
		if (thumb) {
			const thumbWidth = thumb.width;
			const thumbHeight = thumb.height;
			const r = this.ratio;
			let clipW = Math.round(r * thumbWidth);
			if (clipW < 0 || clipW === Infinity) clipW = 0;
			let clipH = Math.round(r * thumbHeight);
			if (clipH < 0 || clipH === Infinity) clipH = 0;

			const rect = thumb.scrollRect ?? new Rectangle();
			switch (this._direction) {
				case Direction.RTL:
					rect.setTo(thumbWidth - clipW, 0, clipW, thumbHeight);
					thumb.x = thumbWidth - clipW;
					break;
				case Direction.TTB:
					rect.setTo(0, 0, thumbWidth, clipH);
					break;
				case Direction.BTT:
					rect.setTo(0, thumbHeight - clipH, thumbWidth, clipH);
					thumb.y = thumbHeight - clipH;
					break;
				default: // LTR
					rect.setTo(0, 0, clipW, thumbHeight);
					break;
			}
			thumb.scrollRect = rect;
		}

		if (this.labelDisplay) {
			const v = this._animation.isPlaying ? this._animationValue : this._value;
			this.labelDisplay.text = this._valueToLabel(v, this._maximum);
		}
	}

	// ── Protected methods ─────────────────────────────────────────────────

	/**
	 * Converts the current value to display text.
	 * Override this method to customize the label format.
	 * The default format is `"value / maximum"`.
	 */
	protected _valueToLabel(value: number, maximum: number): string {
		if (this._labelFunction) {
			return this._labelFunction(value, maximum);
		}
		return value + ' / ' + maximum;
	}
}
