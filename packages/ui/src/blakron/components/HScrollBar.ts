import { Rectangle } from '@blakron/core';
import { ScrollBarBase } from './ScrollBarBase.js';
import { PropertyEvent } from '../events/PropertyEvent.js';

/**
 * Horizontal scroll bar.
 *
 * Positions the `thumb` skin part proportionally based on the viewport's
 * horizontal scroll position (`scrollH`) relative to content width.
 */
export class HScrollBar extends ScrollBarBase {
	// ── Override methods ──────────────────────────────────────────────────

	public override updateDisplayList(unscaledWidth: number, unscaledHeight: number): void {
		super.updateDisplayList(unscaledWidth, unscaledHeight);
		const thumb = this.thumb;
		const viewport = this.viewport;
		if (!thumb || !viewport) return;

		const bounds = new Rectangle();
		thumb.getPreferredBounds(bounds);
		const minThumbWidth = bounds.width;
		const thumbY = bounds.y;
		const hsp = viewport.scrollH;
		const contentWidth = viewport.contentWidth;
		const vpBounds = new Rectangle();
		viewport.getLayoutBounds(vpBounds);
		const vpWidth = vpBounds.width;
		const proportionalWidth = contentWidth > 0 ? Math.round((unscaledWidth * vpWidth) / contentWidth) : unscaledWidth;
		const thumbWidth = Math.min(unscaledWidth, Math.max(minThumbWidth, proportionalWidth));

		if (hsp <= 0) {
			let scaleWidth = thumbWidth * (1 - -hsp / (vpWidth * 0.5));
			scaleWidth = Math.max(5, Math.round(scaleWidth));
			thumb.setLayoutBoundsSize(scaleWidth, NaN);
			thumb.setLayoutBoundsPosition(0, thumbY);
		} else if (hsp >= contentWidth - vpWidth) {
			let scaleWidth = thumbWidth * (1 - (hsp - contentWidth + vpWidth) / (vpWidth * 0.5));
			scaleWidth = Math.max(5, Math.round(scaleWidth));
			thumb.setLayoutBoundsSize(scaleWidth, NaN);
			thumb.setLayoutBoundsPosition(unscaledWidth - scaleWidth, thumbY);
		} else {
			const thumbX = ((unscaledWidth - thumbWidth) * hsp) / (contentWidth - vpWidth);
			thumb.setLayoutBoundsSize(thumbWidth, NaN);
			thumb.setLayoutBoundsPosition(thumbX, thumbY);
		}
	}

	protected override onPropertyChanged(event: PropertyEvent): void {
		switch (event.property) {
			case 'scrollH':
			case 'contentWidth':
				this.invalidateDisplayList();
				break;
		}
	}
}
