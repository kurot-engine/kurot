import { Rectangle } from '@blakron/core';
import { LayoutBase } from './LayoutBase.js';
import { isUIComponent } from '../core/UIComponent.js';

/**
 * Absolute (constraint-based) layout.
 * Positions $children using left/right/top/bottom/horizontalCenter/verticalCenter
 * and percentWidth/percentHeight constraints.
 */
export class BasicLayout extends LayoutBase {
	// ── Getters / Setters ─────────────────────────────────────────────────

	public override get useVirtualLayout(): boolean {
		return false;
	}

	public override set useVirtualLayout(_v: boolean) {
		/* no-op */
	}

	// ── Override methods ──────────────────────────────────────────────────

	public override measure(): void {
		const target = this.target;
		if (!target) return;

		let width = 0;
		let height = 0;
		const bounds = new Rectangle();
		const count = target.numChildren;

		for (let i = 0; i < count; i++) {
			const child = target.getChildAt(i);
			if (!child || !isUIComponent(child) || !child.includeInLayout) continue;

			const left = +child.left;
			const right = +child.right;
			const top = +child.top;
			const bottom = +child.bottom;
			const hCenter = +child.horizontalCenter;
			const vCenter = +child.verticalCenter;

			child.getPreferredBounds(bounds);

			let extX: number;
			if (!isNaN(left) && !isNaN(right)) {
				extX = left + right;
			} else if (!isNaN(hCenter)) {
				extX = Math.abs(hCenter) * 2;
			} else if (!isNaN(left) || !isNaN(right)) {
				extX = (isNaN(left) ? 0 : left) + (isNaN(right) ? 0 : right);
			} else {
				extX = bounds.x;
			}

			let extY: number;
			if (!isNaN(top) && !isNaN(bottom)) {
				extY = top + bottom;
			} else if (!isNaN(vCenter)) {
				extY = Math.abs(vCenter) * 2;
			} else if (!isNaN(top) || !isNaN(bottom)) {
				extY = (isNaN(top) ? 0 : top) + (isNaN(bottom) ? 0 : bottom);
			} else {
				extY = bounds.y;
			}

			width = Math.ceil(Math.max(width, extX + bounds.width));
			height = Math.ceil(Math.max(height, extY + bounds.height));
		}

		target.setMeasuredSize(width, height);
	}

	public override updateDisplayList(unscaledWidth: number, unscaledHeight: number): void {
		const target = this.target;
		if (!target) return;

		let maxX = 0;
		let maxY = 0;
		const bounds = new Rectangle();
		const count = target.numChildren;

		for (let i = 0; i < count; i++) {
			const child = target.getChildAt(i);
			if (!child || !isUIComponent(child) || !child.includeInLayout) continue;

			const left = fmt(child.left, unscaledWidth);
			const right = fmt(child.right, unscaledWidth);
			const top = fmt(child.top, unscaledHeight);
			const bottom = fmt(child.bottom, unscaledHeight);
			const hCenter = fmt(child.horizontalCenter, unscaledWidth * 0.5);
			const vCenter = fmt(child.verticalCenter, unscaledHeight * 0.5);
			const pctW = child.percentWidth;
			const pctH = child.percentHeight;

			let childW = NaN;
			let childH = NaN;

			if (!isNaN(left) && !isNaN(right)) {
				childW = unscaledWidth - right - left;
			} else if (!isNaN(pctW)) {
				childW = Math.round(unscaledWidth * Math.min(pctW * 0.01, 1));
			}

			if (!isNaN(top) && !isNaN(bottom)) {
				childH = unscaledHeight - bottom - top;
			} else if (!isNaN(pctH)) {
				childH = Math.round(unscaledHeight * Math.min(pctH * 0.01, 1));
			}

			child.setLayoutBoundsSize(childW, childH);
			child.getLayoutBounds(bounds);

			let childX: number;
			if (!isNaN(hCenter)) {
				childX = Math.round((unscaledWidth - bounds.width) / 2 + hCenter);
			} else if (!isNaN(left)) {
				childX = left;
			} else if (!isNaN(right)) {
				childX = unscaledWidth - bounds.width - right;
			} else {
				childX = bounds.x;
			}

			let childY: number;
			if (!isNaN(vCenter)) {
				childY = Math.round((unscaledHeight - bounds.height) / 2 + vCenter);
			} else if (!isNaN(top)) {
				childY = top;
			} else if (!isNaN(bottom)) {
				childY = unscaledHeight - bounds.height - bottom;
			} else {
				childY = bounds.y;
			}

			child.setLayoutBoundsPosition(childX, childY);
			maxX = Math.max(maxX, childX + bounds.width);
			maxY = Math.max(maxY, childY + bounds.height);
		}

		target.setContentSize(Math.ceil(maxX), Math.ceil(maxY));
	}
}

function fmt(value: number | string, total: number): number {
	if (typeof value === 'number' || !value) return +(value as number);
	const s = value as string;
	const pct = s.indexOf('%');
	if (pct === -1) return +s;
	return +s.substring(0, pct) * 0.01 * total;
}
