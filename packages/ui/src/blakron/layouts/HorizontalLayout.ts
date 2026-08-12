import { LinearLayoutBase } from './LinearLayoutBase.js';
import { JustifyAlign } from './JustifyAlign.js';
import type { ILayoutTarget } from './ILayoutTarget.js';
import type { IUIComponent } from '../core/IUIComponent.js';
import { Rectangle } from '@blakron/core';

const tmpBounds = new Rectangle();

/** Internal child info for percent distribution. */
interface ChildInfo {
	layoutElement: IUIComponent;
	size: number;
	percent: number;
	min: number;
	max: number;
}

/**
 * HorizontalLayout arranges layout elements in a horizontal sequence, left to right,
 * with optional gaps between elements and optional padding around the edges.
 *
 * Supports:
 * - `verticalAlign`: top / middle / bottom / justify / contentJustify
 * - `horizontalAlign`: left / center / right / justify
 * - `percentWidth` / `percentHeight` on $children
 * - Virtual layout
 */
export class HorizontalLayout extends LinearLayoutBase {
	// ── Override methods ──────────────────────────────────────────────────

	public override elementAdded(index: number): void {
		if (!this._useVirtualLayout) return;
		super.elementAdded(index);
		this.elementSizeTable.splice(index, 0, this.typicalWidth);
	}

	protected override measureReal(): void {
		const target = this.target!;
		const count = target.numChildren;
		let numElements = count;
		let measuredWidth = 0;
		let measuredHeight = 0;

		for (let i = 0; i < count; i++) {
			const el = asLayoutElement(target, i);
			if (!el || !el.includeInLayout) {
				numElements--;
				continue;
			}
			el.getPreferredBounds(tmpBounds);
			measuredWidth += tmpBounds.width;
			measuredHeight = Math.max(measuredHeight, tmpBounds.height);
		}
		measuredWidth += (numElements - 1) * this._gap;
		const hPadding = this._paddingLeft + this._paddingRight;
		const vPadding = this._paddingTop + this._paddingBottom;
		target.setMeasuredSize(measuredWidth + hPadding, measuredHeight + vPadding);
	}

	protected override measureVirtual(): void {
		const target = this.target!;
		const typicalWidth = this.typicalWidth;
		let measuredWidth = this.getElementTotalSize();
		let measuredHeight = Math.max(this.maxElementSize, this.typicalHeight);

		const elementSizeTable = this.elementSizeTable;
		for (let index = this.startIndex; index < this.endIndex; index++) {
			const el = asLayoutElement(target, index);
			if (!el || !el.includeInLayout) continue;
			el.getPreferredBounds(tmpBounds);
			measuredWidth += tmpBounds.width;
			measuredWidth -= isNaN(elementSizeTable[index]) ? typicalWidth : elementSizeTable[index];
			measuredHeight = Math.max(measuredHeight, tmpBounds.height);
		}
		const hPadding = this._paddingLeft + this._paddingRight;
		const vPadding = this._paddingTop + this._paddingBottom;
		target.setMeasuredSize(measuredWidth + hPadding, measuredHeight + vPadding);
	}

	protected override updateDisplayListReal(width: number, height: number): void {
		const target = this.target!;
		const paddingL = this._paddingLeft;
		const paddingR = this._paddingRight;
		const paddingT = this._paddingTop;
		const paddingB = this._paddingBottom;
		const gap = this._gap;
		const targetWidth = Math.max(0, width - paddingL - paddingR);
		const targetHeight = Math.max(0, height - paddingT - paddingB);

		const hJustify = this._horizontalAlign === JustifyAlign.JUSTIFY;
		const vJustify =
			this._verticalAlign === JustifyAlign.JUSTIFY || this._verticalAlign === JustifyAlign.CONTENT_JUSTIFY;
		const contentJustify = this._verticalAlign === JustifyAlign.CONTENT_JUSTIFY;
		let vAlign = 0;
		if (!vJustify) {
			if (this._verticalAlign === 'middle') vAlign = 0.5;
			else if (this._verticalAlign === 'bottom') vAlign = 1;
		}

		const count = target.numChildren;
		let numElements = count;
		let x = paddingL;
		let y = paddingT;

		let totalPreferredWidth = 0;
		let totalPercentWidth = 0;
		const childInfoArray: ChildInfo[] = [];
		let widthToDistribute = targetWidth;
		let maxElementHeight = this.maxElementSize;

		// First pass: gather info
		for (let i = 0; i < count; i++) {
			const el = asLayoutElement(target, i);
			if (!el || !el.includeInLayout) {
				numElements--;
				continue;
			}
			el.getPreferredBounds(tmpBounds);
			maxElementHeight = Math.max(maxElementHeight, tmpBounds.height);

			if (hJustify) {
				totalPreferredWidth += tmpBounds.width;
			} else {
				if (!isNaN(el.percentWidth)) {
					totalPercentWidth += el.percentWidth;
					childInfoArray.push({
						layoutElement: el,
						size: 0,
						percent: el.percentWidth,
						min: el.minWidth,
						max: el.maxWidth,
					});
				} else {
					widthToDistribute -= tmpBounds.width;
				}
			}
		}
		widthToDistribute -= gap * (numElements - 1);
		widthToDistribute = Math.max(0, widthToDistribute);
		const excessSpace = targetWidth - totalPreferredWidth - gap * (numElements - 1);

		let averageWidth: number | undefined;
		let largeChildrenCount = numElements;
		const widthDic = new Map<IUIComponent, number>();

		if (hJustify) {
			if (excessSpace < 0) {
				averageWidth = widthToDistribute / numElements;
				for (let i = 0; i < count; i++) {
					const el = asLayoutElement(target, i);
					if (!el || !el.includeInLayout) continue;
					el.getPreferredBounds(tmpBounds);
					if (tmpBounds.width <= averageWidth) {
						widthToDistribute -= tmpBounds.width;
						largeChildrenCount--;
					}
				}
				widthToDistribute = Math.max(0, widthToDistribute);
			}
		} else {
			if (totalPercentWidth > 0) {
				this.flexChildrenProportionally(targetWidth, widthToDistribute, totalPercentWidth, childInfoArray);
				let roundOff = 0;
				for (const ci of childInfoArray) {
					const childSize = Math.round(ci.size + roundOff);
					roundOff += ci.size - childSize;
					widthDic.set(ci.layoutElement, childSize);
					widthToDistribute -= childSize;
				}
				widthToDistribute = Math.max(0, widthToDistribute);
			}
		}

		// Horizontal alignment offset
		if (this._horizontalAlign === 'center') {
			x = paddingL + widthToDistribute * 0.5;
		} else if (this._horizontalAlign === 'right') {
			x = paddingL + widthToDistribute;
		}

		let maxX = paddingL;
		let maxY = paddingT;
		let justifyHeight = Math.ceil(targetHeight);
		if (contentJustify) justifyHeight = Math.ceil(Math.max(targetHeight, maxElementHeight));

		let roundOff = 0;

		// Second pass: position and size
		for (let i = 0; i < count; i++) {
			const el = asLayoutElement(target, i);
			if (!el || !el.includeInLayout) continue;

			el.getPreferredBounds(tmpBounds);
			let layoutElementWidth: number | undefined;

			if (hJustify) {
				let childWidth: number | undefined;
				if (excessSpace > 0) {
					childWidth = (widthToDistribute * tmpBounds.width) / totalPreferredWidth;
				} else if (excessSpace < 0 && averageWidth !== undefined && tmpBounds.width > averageWidth) {
					childWidth = widthToDistribute / largeChildrenCount;
				}
				if (childWidth !== undefined) {
					layoutElementWidth = Math.round(childWidth + roundOff);
					roundOff += childWidth - layoutElementWidth;
				}
			} else {
				layoutElementWidth = widthDic.get(el);
			}

			if (vJustify) {
				y = paddingT;
				el.setLayoutBoundsSize(layoutElementWidth ?? NaN, justifyHeight);
				el.getLayoutBounds(tmpBounds);
			} else {
				let layoutElementHeight: number | undefined;
				if (!isNaN(el.percentHeight)) {
					const percent = Math.min(100, el.percentHeight);
					layoutElementHeight = Math.round(targetHeight * percent * 0.01);
				}
				el.setLayoutBoundsSize(layoutElementWidth ?? NaN, layoutElementHeight ?? NaN);
				el.getLayoutBounds(tmpBounds);
				const excessH = Math.max(0, (targetHeight - tmpBounds.height) * vAlign);
				y = paddingT + excessH;
			}

			el.setLayoutBoundsPosition(Math.round(x), Math.round(y));
			const dx = Math.ceil(tmpBounds.width);
			const dy = Math.ceil(tmpBounds.height);
			maxX = Math.max(maxX, x + dx);
			maxY = Math.max(maxY, y + dy);
			x += dx + gap;
		}

		this.maxElementSize = maxElementHeight;
		target.setContentSize(maxX + paddingR, maxY + paddingB);
	}

	protected override updateDisplayListVirtual(width: number, height: number): void {
		const target = this.target!;
		if (this.indexInViewCalculated) this.indexInViewCalculated = false;
		else this.getIndexInView();

		const paddingR = this._paddingRight;
		const paddingT = this._paddingTop;
		const gap = this._gap;
		const numElements = target.numElements;

		if (this.startIndex === -1 || this.endIndex === -1) {
			const contentWidth = this.getStartPosition(numElements) - gap + paddingR;
			target.setContentSize(contentWidth, target.contentHeight || height);
			return;
		}

		target.setVirtualElementIndicesInView(this.startIndex, this.endIndex);

		const endIdx = this.endIndex;
		const justify =
			this._verticalAlign === JustifyAlign.JUSTIFY || this._verticalAlign === JustifyAlign.CONTENT_JUSTIFY;
		const contentJustify = this._verticalAlign === JustifyAlign.CONTENT_JUSTIFY;
		let vAlign = 0;
		if (!justify) {
			if (this._verticalAlign === 'middle') vAlign = 0.5;
			else if (this._verticalAlign === 'bottom') vAlign = 1;
		}

		const targetHeight = Math.max(0, height - paddingT - this._paddingBottom);
		let justifyHeight = Math.ceil(targetHeight);
		const typicalW = this.typicalWidth;
		let maxElementHeight = this.maxElementSize;
		const oldMaxH = Math.max(this.typicalHeight, this.maxElementSize);

		if (contentJustify) {
			for (let index = this.startIndex; index <= endIdx; index++) {
				const el = asVirtualLayoutElement(target, index);
				if (!el || !el.includeInLayout) continue;
				el.getPreferredBounds(tmpBounds);
				maxElementHeight = Math.max(maxElementHeight, tmpBounds.height);
			}
			justifyHeight = Math.ceil(Math.max(targetHeight, maxElementHeight));
		}

		let y = 0;
		let contentHeight = 0;
		let needInvalidateSize = false;
		const elementSizeTable = this.elementSizeTable;

		for (let i = this.startIndex; i <= endIdx; i++) {
			const el = asVirtualLayoutElement(target, i);
			if (!el || !el.includeInLayout) continue;

			el.getPreferredBounds(tmpBounds);
			if (!contentJustify) {
				maxElementHeight = Math.max(maxElementHeight, tmpBounds.height);
			}

			if (justify) {
				y = paddingT;
				el.setLayoutBoundsSize(NaN, justifyHeight);
				el.getLayoutBounds(tmpBounds);
			} else {
				el.getLayoutBounds(tmpBounds);
				const excessH = Math.max(0, (targetHeight - tmpBounds.height) * vAlign);
				y = paddingT + excessH;
			}

			contentHeight = Math.max(contentHeight, tmpBounds.height);
			if (!needInvalidateSize) {
				const oldSize = isNaN(elementSizeTable[i]) ? typicalW : elementSizeTable[i];
				if (oldSize !== tmpBounds.width) needInvalidateSize = true;
			}
			elementSizeTable[i] = tmpBounds.width;

			const xPos = this.getStartPosition(i);
			el.setLayoutBoundsPosition(Math.round(xPos), Math.round(y));
		}

		contentHeight += paddingT + this._paddingBottom;
		const contentWidth = this.getStartPosition(numElements) - gap + paddingR;
		this.maxElementSize = maxElementHeight;
		target.setContentSize(contentWidth, contentHeight);

		if (needInvalidateSize || oldMaxH < this.maxElementSize) {
			target.invalidateSize();
		}
	}

	protected override getStartPosition(index: number): number {
		if (!this._useVirtualLayout && this.target) {
			const el = asLayoutElement(this.target, index);
			if (el) {
				const b = new Rectangle();
				el.getLayoutBounds(b);
				return b.x;
			}
		}
		const typicalW = this.typicalWidth;
		let startPos = this._paddingLeft;
		const gap = this._gap;
		for (let i = 0; i < index; i++) {
			let w = this.elementSizeTable[i];
			if (isNaN(w)) w = typicalW;
			startPos += w + gap;
		}
		return startPos;
	}

	protected override getElementSize(index: number): number {
		if (this._useVirtualLayout) {
			const size = this.elementSizeTable[index];
			return isNaN(size) ? this.typicalWidth : size;
		}
		if (this.target) {
			const el = asLayoutElement(this.target, index);
			if (el) {
				el.getLayoutBounds(tmpBounds);
				return tmpBounds.width;
			}
			return 0;
		}
		return 0;
	}

	protected override getElementTotalSize(): number {
		const typicalW = this.typicalWidth;
		const gap = this._gap;
		let totalSize = 0;
		const length = this.target!.numElements;
		for (let i = 0; i < length; i++) {
			let w = this.elementSizeTable[i];
			if (isNaN(w)) w = typicalW;
			totalSize += w + gap;
		}
		totalSize -= gap;
		return totalSize;
	}

	protected override getIndexInView(): boolean {
		const target = this.target;
		if (!target || target.numElements === 0) {
			this.startIndex = this.endIndex = -1;
			return false;
		}
		if (target.width === 0 || target.height === 0) {
			this.startIndex = this.endIndex = -1;
			return false;
		}

		const numElements = target.numElements;
		const lastSize = this.elementSizeTable[numElements - 1];
		const contentWidth =
			this.getStartPosition(numElements - 1) +
			(isNaN(lastSize) ? this.typicalWidth : lastSize) +
			this._paddingRight;
		const minVisibleX = target.scrollH ?? 0;
		if (minVisibleX > contentWidth - this._paddingRight) {
			this.startIndex = this.endIndex = -1;
			return false;
		}
		const maxVisibleX = minVisibleX + target.width;
		if (maxVisibleX < this._paddingLeft) {
			this.startIndex = this.endIndex = -1;
			return false;
		}

		const oldStart = this.startIndex;
		const oldEnd = this.endIndex;
		this.startIndex = this.findIndexAt(minVisibleX, 0, numElements - 1);
		if (this.startIndex === -1) this.startIndex = 0;
		this.endIndex = this.findIndexAt(maxVisibleX, 0, numElements - 1);
		if (this.endIndex === -1) this.endIndex = numElements - 1;
		return oldStart !== this.startIndex || oldEnd !== this.endIndex;
	}
}

// ── Helpers ─────────────────────────────────────────────────────────────

function asLayoutElement(target: ILayoutTarget, index: number): IUIComponent | undefined {
	const child = target.getChildAt(index);
	if (!child) return undefined;
	const el = child as unknown as IUIComponent;
	if (typeof el.getPreferredBounds === 'function') return el;
	return undefined;
}

/**
 * Get a virtual element (creates/reuses renderer on demand) as IUIComponent.
 * Used by updateDisplayListVirtual to only instantiate visible renderers.
 */
function asVirtualLayoutElement(target: ILayoutTarget, index: number): IUIComponent | undefined {
	const child = target.getVirtualElementAt(index);
	if (!child) return undefined;
	const el = child as unknown as IUIComponent;
	if (typeof el.getPreferredBounds === 'function') return el;
	return undefined;
}
