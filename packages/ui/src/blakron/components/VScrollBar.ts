import { Rectangle } from '@blakron/core';
import { ScrollBarBase } from './ScrollBarBase.js';
import { PropertyEvent } from '../events/PropertyEvent.js';

/**
 * Vertical scroll bar.
 *
 * Positions the `thumb` skin part proportionally based on the viewport's
 * vertical scroll position (`scrollV`) relative to content height.
 */
export class VScrollBar extends ScrollBarBase {
	// ── Override methods ──────────────────────────────────────────────────

	public override updateDisplayList(unscaledWidth: number, unscaledHeight: number): void {
		super.updateDisplayList(unscaledWidth, unscaledHeight);
		const thumb = this.thumb;
		const viewport = this.viewport;
		if (!thumb || !viewport) return;

		const bounds = new Rectangle();
		thumb.getPreferredBounds(bounds);
		const minThumbHeight = bounds.height;
		const thumbX = bounds.x;
		const vsp = viewport.scrollV;
		const contentHeight = viewport.contentHeight;
		const vpBounds = new Rectangle();
		viewport.getLayoutBounds(vpBounds);
		const vpHeight = vpBounds.height;
		const proportionalHeight = contentHeight > 0 ? Math.round((unscaledHeight * vpHeight) / contentHeight) : unscaledHeight;
		const thumbHeight = Math.min(unscaledHeight, Math.max(minThumbHeight, proportionalHeight));

		if (vsp <= 0) {
			let scaleHeight = thumbHeight * (1 - -vsp / (vpHeight * 0.5));
			scaleHeight = Math.max(5, Math.round(scaleHeight));
			thumb.setLayoutBoundsSize(NaN, scaleHeight);
			thumb.setLayoutBoundsPosition(thumbX, 0);
		} else if (vsp >= contentHeight - vpHeight) {
			let scaleHeight = thumbHeight * (1 - (vsp - contentHeight + vpHeight) / (vpHeight * 0.5));
			scaleHeight = Math.max(5, Math.round(scaleHeight));
			thumb.setLayoutBoundsSize(NaN, scaleHeight);
			thumb.setLayoutBoundsPosition(thumbX, unscaledHeight - scaleHeight);
		} else {
			const thumbY = ((unscaledHeight - thumbHeight) * vsp) / (contentHeight - vpHeight);
			thumb.setLayoutBoundsSize(NaN, thumbHeight);
			thumb.setLayoutBoundsPosition(thumbX, thumbY);
		}
	}

	protected override onPropertyChanged(event: PropertyEvent): void {
		switch (event.property) {
			case 'scrollV':
			case 'contentHeight':
				this.invalidateDisplayList();
				break;
		}
	}
}
