import { Component } from './Component.js';
import { PropertyEvent } from '../events/PropertyEvent.js';

/**
 * Range holds a numeric value constrained between `minimum` and `maximum`.
 * Optionally snaps to multiples of `snapInterval`.
 *
 * Base class for future Slider / ScrollBar-with-value components.
 */
export class Range extends Component {
	// ── Instance fields ───────────────────────────────────────────────────

	private _maximum = 100;
	private _maxChanged = false;
	private _minimum = 0;
	private _minChanged = false;
	private _value = 0;
	private _changedValue = 0;
	private _valueChanged = false;
	private _snapInterval = 1;
	private _snapIntervalChanged = false;
	private _explicitSnapInterval = false;

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get maximum(): number {
		return this._maximum;
	}

	public set maximum(value: number) {
		value = +value || 0;
		if (this._maximum === value) return;
		this._maximum = value;
		this._maxChanged = true;
		this.invalidateProperties();
		this.invalidateDisplayList();
	}

	public get minimum(): number {
		return this._minimum;
	}

	public set minimum(value: number) {
		value = +value || 0;
		if (this._minimum === value) return;
		this._minimum = value;
		this._minChanged = true;
		this.invalidateProperties();
		this.invalidateDisplayList();
	}

	public get value(): number {
		return this._valueChanged ? this._changedValue : this._value;
	}

	public set value(newValue: number) {
		newValue = +newValue || 0;
		this.setValuePending(newValue);
	}

	public get snapInterval(): number {
		return this._snapInterval;
	}

	public set snapInterval(value: number) {
		this._explicitSnapInterval = true;
		value = +value || 0;
		if (value === this._snapInterval) return;
		if (isNaN(value)) {
			this._snapInterval = 1;
			this._explicitSnapInterval = false;
		} else {
			this._snapInterval = value;
		}
		this._snapIntervalChanged = true;
		this.invalidateProperties();
	}

	// ── Override methods ──────────────────────────────────────────────────

	public override commitProperties(): void {
		super.commitProperties();

		if (this._minimum > this._maximum) {
			if (!this._maxChanged) {
				this._minimum = this._maximum;
			} else {
				this._maximum = this._minimum;
			}
		}

		if (this._valueChanged || this._maxChanged || this._minChanged || this._snapIntervalChanged) {
			const currentValue = this._valueChanged ? this._changedValue : this._value;
			this._valueChanged = false;
			this._maxChanged = false;
			this._minChanged = false;
			this._snapIntervalChanged = false;
			this.setValue(this.nearestValidValue(currentValue, this._snapInterval));
		}
	}

	public override updateDisplayList(w: number, h: number): void {
		super.updateDisplayList(w, h);
		this.updateSkinDisplayList();
	}

	// ── Protected methods ─────────────────────────────────────────────────

	protected setValuePending(newValue: number): boolean {
		if (newValue === this.value) return false;
		this._changedValue = newValue;
		this._valueChanged = true;
		this.invalidateProperties();
		return true;
	}

	/**
	 * Returns the closest valid value to `value` that is between minimum and maximum
	 * and snaps to multiples of `interval`.
	 */
	protected nearestValidValue(value: number, interval: number): number {
		if (interval === 0) {
			return Math.max(this._minimum, Math.min(this._maximum, value));
		}

		const maxValue = this._maximum - this._minimum;
		let scale = 1;
		value -= this._minimum;

		if (interval !== Math.round(interval)) {
			const parts = (1 + interval).toString().split('.');
			scale = Math.pow(10, parts[1].length);
			value = Math.round(value * scale);
			interval = Math.round(interval * scale);
		}

		const lower = Math.max(0, Math.floor(value / interval) * interval);
		const upper = Math.min(maxValue * scale, Math.floor((value + interval) / interval) * interval);
		const validValue = value - lower >= (upper - lower) / 2 ? upper : lower;

		return validValue / scale + this._minimum;
	}

	protected setValue(value: number): void {
		if (this._value === value) return;
		if (this._maximum > this._minimum) {
			this._value = Math.min(this._maximum, Math.max(this._minimum, value));
		} else {
			this._value = value;
		}
		this._valueChanged = false;
		this.invalidateDisplayList();
		PropertyEvent.dispatchPropertyEvent(this, 'value');
	}

	/**
	 * Override to update skin parts based on minimum, maximum, and value.
	 */
	protected updateSkinDisplayList(): void {}
}
