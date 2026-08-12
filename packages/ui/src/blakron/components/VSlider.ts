import { Rectangle } from '@blakron/core';
import { SliderBase } from './SliderBase.js';
import { Direction } from '../core/Direction.js';
import { isUIComponent } from '../core/UIComponent.js';

/**
 * VSlider — a vertical slider (bottom-to-top, standard slider convention).
 *
 * Overrides `pointToValue` and `updateSkinDisplayList` to position the thumb
 * using the track's layout bounds (not the slider's own height), matching egret.
 */
export class VSlider extends SliderBase {

	public constructor() {
		super();
		this.direction = Direction.BTT;
	}

	/**
	 * Range of thumb movement = track height − thumb height.
	 */
	private _getThumbRange(): number {
		const track = this.track;
		const thumb = this.thumb;
		if (!track || !thumb || !isUIComponent(track) || !isUIComponent(thumb)) return 0;
		const b = new Rectangle();
		track.getLayoutBounds(b);
		const trackHeight = b.height;
		thumb.getLayoutBounds(b);
		return trackHeight - b.height;
	}

	protected override pointToValue(_x: number, y: number): number {
		const range = this.maximum - this.minimum;
		const thumbRange = this._getThumbRange();
		// BTT: y=0 at bottom (max), y=thumbRange at top (min) → invert.
		return this.minimum + (thumbRange !== 0 ? ((thumbRange - y) / thumbRange) * range : 0);
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
		thumb.y = trackBounds.y + (1 - ratio) * thumbRange;
	}
}
