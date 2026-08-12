import { Rectangle } from '@blakron/core';
import { SliderBase } from './SliderBase.js';
import { Direction } from '../core/Direction.js';
import { isUIComponent } from '../core/UIComponent.js';

/**
 * HSlider — a horizontal slider (left-to-right).
 *
 * Overrides `pointToValue` and `updateSkinDisplayList` to position the thumb
 * using the track's layout bounds (not the slider's own width), matching egret.
 */
export class HSlider extends SliderBase {

	public constructor() {
		super();
		this.direction = Direction.LTR;
	}

	/**
	 * Range of thumb movement = track width − thumb width.
	 */
	private _getThumbRange(): number {
		const track = this.track;
		const thumb = this.thumb;
		if (!track || !thumb || !isUIComponent(track) || !isUIComponent(thumb)) return 0;
		const b = new Rectangle();
		track.getLayoutBounds(b);
		const trackWidth = b.width;
		thumb.getLayoutBounds(b);
		return trackWidth - b.width;
	}

	protected override pointToValue(x: number, _y: number): number {
		const range = this.maximum - this.minimum;
		const thumbRange = this._getThumbRange();
		return this.minimum + (thumbRange !== 0 ? (x / thumbRange) * range : 0);
	}

	protected override updateSkinDisplayList(): void {
		const thumb = this.thumb;
		const track = this.track;
		if (!thumb || !track || !isUIComponent(track)) return;

		const thumbRange = this._getThumbRange();
		const range = this.maximum - this.minimum;
		const ratio = range > 0 ? (this.value - this.minimum) / range : 0;

		const trackBounds = new Rectangle();
		track.getLayoutBounds(trackBounds);
		thumb.x = trackBounds.x + ratio * thumbRange;
	}
}
