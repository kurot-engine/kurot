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
 * VerticalLayout arranges layout elements in a vertical sequence, top to bottom,
 * with optional gaps between elements and optional padding around the edges.
 *
 * Supports:
 * - `horizontalAlign`: left / center / right / justify / contentJustify
 * - `verticalAlign`: top / middle / bottom / justify
 * - `percentWidth` / `percentHeight` on $children
 * - Virtual layout (only visible elements are measured/laid out)
 */
export class VerticalLayout extends LinearLayoutBase {
	// ── Override methods ──────────────────────────────────────────────────

	public override elementAdded(index: number): void {
		if (!this._useVirtualLayout) return;
		super.elementAdded(index);
		this.elementSizeTable.splice(index, 0, this.typicalHeight);
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
			measuredHeight += tmpBounds.height;
			measuredWidth = Math.max(measuredWidth, tmpBounds.width);
		}
		measuredHeight += (numElements - 1) * this._gap;
		const hPadding = this._paddingLeft + this._paddingRight;
		const vPadding = this._paddingTop + this._paddingBottom;
		target.setMeasuredSize(measuredWidth + hPadding, measuredHeight + vPadding);
	}

	protected override measureVirtual(): void {
		const target = this.target!;
		const typicalHeight = this.typicalHeight;
		let measuredHeight = this.getElementTotalSize();
		let measuredWidth = Math.max(this.maxElementSize, this.typicalWidth);

		const elementSizeTable = this.elementSizeTable;
		for (let index = this.startIndex; index < this.endIndex; index++) {
			const el = asLayoutElement(target, index);
			if (!el || !el.includeInLayout) continue;
			el.getPreferredBounds(tmpBounds);
			measuredHeight += tmpBounds.height;
			measuredHeight -= isNaN(elementSizeTable[index]) ? typicalHeight : elementSizeTable[index];
			measuredWidth = Math.max(measuredWidth, tmpBounds.width);
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

		const vJustify = this._verticalAlign === JustifyAlign.JUSTIFY;
		const hJustify =
			this._horizontalAlign === JustifyAlign.JUSTIFY || this._horizontalAlign === JustifyAlign.CONTENT_JUSTIFY;
		const contentJustify = this._horizontalAlign === JustifyAlign.CONTENT_JUSTIFY;
		let hAlign = 0;
		if (!hJustify) {
			if (this._horizontalAlign === 'center') hAlign = 0.5;
			else if (this._horizontalAlign === 'right') hAlign = 1;
		}

		const count = target.numChildren;
		let numElements = count;
		let x = paddingL;
		let y = paddingT;

		let totalPreferredHeight = 0;
		let totalPercentHeight = 0;
		const childInfoArray: ChildInfo[] = [];
		let heightToDistribute = targetHeight;
		let maxElementWidth = this.maxElementSize;

		// First pass: gather info
		for (let i = 0; i < count; i++) {
			const el = asLayoutElement(target, i);
			if (!el || !el.includeInLayout) {
				numElements--;
				continue;
			}
			el.getPreferredBounds(tmpBounds);
			maxElementWidth = Math.max(maxElementWidth, tmpBounds.width);

			if (vJustify) {
				totalPreferredHeight += tmpBounds.height;
			} else {
				if (!isNaN(el.percentHeight)) {
					totalPercentHeight += el.percentHeight;
					childInfoArray.push({
						layoutElement: el,
						size: 0,
						percent: el.percentHeight,
						min: el.minHeight,
						max: el.maxHeight,
					});
				} else {
					heightToDistribute -= tmpBounds.height;
				}
			}
		}
		heightToDistribute -= gap * (numElements - 1);
		heightToDistribute = Math.max(0, heightToDistribute);
		const excessSpace = targetHeight - totalPreferredHeight - gap * (numElements - 1);

		// Justify mode: calculate average for shrinking
		let averageHeight: number | undefined;
		let largeChildrenCount = numElements;
		const heightDic = new Map<IUIComponent, number>();

		if (vJustify) {
			if (excessSpace < 0) {
				averageHeight = heightToDistribute / numElements;
				for (let i = 0; i < count; i++) {
					const el = asLayoutElement(target, i);
					if (!el || !el.includeInLayout) continue;
					el.getPreferredBounds(tmpBounds);
					if (tmpBounds.height <= averageHeight) {
						heightToDistribute -= tmpBounds.height;
						largeChildrenCount--;
					}
				}
				heightToDistribute = Math.max(0, heightToDistribute);
			}
		} else {
			if (totalPercentHeight > 0) {
				this.flexChildrenProportionally(targetHeight, heightToDistribute, totalPercentHeight, childInfoArray);
				let roundOff = 0;
				for (const ci of childInfoArray) {
					const childSize = Math.round(ci.size + roundOff);
					roundOff += ci.size - childSize;
					heightDic.set(ci.layoutElement, childSize);
					heightToDistribute -= childSize;
				}
				heightToDistribute = Math.max(0, heightToDistribute);
			}
		}

		// Vertical alignment offset
		if (this._verticalAlign === 'middle') {
			y = paddingT + heightToDistribute * 0.5;
		} else if (this._verticalAlign === 'bottom') {
			y = paddingT + heightToDistribute;
		}

		let maxX = paddingL;
		let maxY = paddingT;
		let justifyWidth = Math.ceil(targetWidth);
		if (contentJustify) justifyWidth = Math.ceil(Math.max(targetWidth, maxElementWidth));

		let roundOff = 0;

		// Second pass: position and size
		for (let i = 0; i < count; i++) {
			const el = asLayoutElement(target, i);
			if (!el || !el.includeInLayout) continue;

			el.getPreferredBounds(tmpBounds);
			let layoutElementHeight: number | undefined;

			if (vJustify) {
				let childHeight: number | undefined;
				if (excessSpace > 0) {
					childHeight = (heightToDistribute * tmpBounds.height) / totalPreferredHeight;
				} else if (excessSpace < 0 && averageHeight !== undefined && tmpBounds.height > averageHeight) {
					childHeight = heightToDistribute / largeChildrenCount;
				}
				if (childHeight !== undefined) {
					layoutElementHeight = Math.round(childHeight + roundOff);
					roundOff += childHeight - layoutElementHeight;
				}
			} else {
				layoutElementHeight = heightDic.get(el);
			}

			if (hJustify) {
				x = paddingL;
				el.setLayoutBoundsSize(justifyWidth, layoutElementHeight ?? NaN);
				el.getLayoutBounds(tmpBounds);
			} else {
				let layoutElementWidth: number | undefined;
				if (!isNaN(el.percentWidth)) {
					const percent = Math.min(100, el.percentWidth);
					layoutElementWidth = Math.round(targetWidth * percent * 0.01);
				}
				el.setLayoutBoundsSize(layoutElementWidth ?? NaN, layoutElementHeight ?? NaN);
				el.getLayoutBounds(tmpBounds);
				const excessW = Math.max(0, (targetWidth - tmpBounds.width) * hAlign);
				x = paddingL + excessW;
			}

			el.setLayoutBoundsPosition(Math.round(x), Math.round(y));
			const dx = Math.ceil(tmpBounds.width);
			const dy = Math.ceil(tmpBounds.height);
			maxX = Math.max(maxX, x + dx);
			maxY = Math.max(maxY, y + dy);
			y += dy + gap;
		}

		this.maxElementSize = maxElementWidth;
		target.setContentSize(maxX + paddingR, maxY + paddingB);
	}

	protected override updateDisplayListVirtual(width: number, height: number): void {
		const target = this.target!;
		if (this.indexInViewCalculated) this.indexInViewCalculated = false;
		else this.getIndexInView();

		const paddingB = this._paddingBottom;
		const paddingL = this._paddingLeft;
		const gap = this._gap;
		const numElements = target.numElements;

		if (this.startIndex === -1 || this.endIndex === -1) {
			const contentHeight = this.getStartPosition(numElements) - gap + paddingB;
			target.setContentSize(target.contentWidth || width, contentHeight);
			return;
		}

		target.setVirtualElementIndicesInView(this.startIndex, this.endIndex);

		const endIdx = this.endIndex;
		const justify =
			this._horizontalAlign === JustifyAlign.JUSTIFY || this._horizontalAlign === JustifyAlign.CONTENT_JUSTIFY;
		const contentJustify = this._horizontalAlign === JustifyAlign.CONTENT_JUSTIFY;
		let hAlign = 0;
		if (!justify) {
			if (this._horizontalAlign === 'center') hAlign = 0.5;
			else if (this._horizontalAlign === 'right') hAlign = 1;
		}

		const targetWidth = Math.max(0, width - paddingL - this._paddingRight);
		let justifyWidth = Math.ceil(targetWidth);
		const typicalH = this.typicalHeight;
		let maxElementWidth = this.maxElementSize;
		const oldMaxW = Math.max(this.typicalWidth, this.maxElementSize);

		if (contentJustify) {
			for (let index = this.startIndex; index <= endIdx; index++) {
				const el = asVirtualLayoutElement(target, index);
				if (!el || !el.includeInLayout) continue;
				el.getPreferredBounds(tmpBounds);
				maxElementWidth = Math.max(maxElementWidth, tmpBounds.width);
			}
			justifyWidth = Math.ceil(Math.max(targetWidth, maxElementWidth));
		}

		let x = 0;
		let contentWidth = 0;
		let needInvalidateSize = false;
		const elementSizeTable = this.elementSizeTable;

		for (let i = this.startIndex; i <= endIdx; i++) {
			const el = asVirtualLayoutElement(target, i);
			if (!el || !el.includeInLayout) continue;

			el.getPreferredBounds(tmpBounds);
			if (!contentJustify) {
				maxElementWidth = Math.max(maxElementWidth, tmpBounds.width);
			}

			if (justify) {
				x = paddingL;
				el.setLayoutBoundsSize(justifyWidth, NaN);
				el.getLayoutBounds(tmpBounds);
			} else {
				el.getLayoutBounds(tmpBounds);
				const excessW = Math.max(0, (targetWidth - tmpBounds.width) * hAlign);
				x = paddingL + excessW;
			}

			contentWidth = Math.max(contentWidth, tmpBounds.width);
			if (!needInvalidateSize) {
				const oldSize = isNaN(elementSizeTable[i]) ? typicalH : elementSizeTable[i];
				if (oldSize !== tmpBounds.height) needInvalidateSize = true;
			}
			elementSizeTable[i] = tmpBounds.height;

			const yPos = this.getStartPosition(i);
			el.setLayoutBoundsPosition(Math.round(x), Math.round(yPos));
		}

		contentWidth += paddingL + this._paddingRight;
		const contentHeight = this.getStartPosition(numElements) - gap + paddingB;
		this.maxElementSize = maxElementWidth;
		target.setContentSize(contentWidth, contentHeight);

		if (needInvalidateSize || oldMaxW < this.maxElementSize) {
			target.invalidateSize();
		}
	}

	protected override getStartPosition(index: number): number {
		if (!this._useVirtualLayout && this.target) {
			const el = asLayoutElement(this.target, index);
			if (el) {
				const b = new Rectangle();
				el.getLayoutBounds(b);
				return b.y;
			}
		}
		const typicalH = this.typicalHeight;
		let startPos = this._paddingTop;
		const gap = this._gap;
		for (let i = 0; i < index; i++) {
			let h = this.elementSizeTable[i];
			if (isNaN(h)) h = typicalH;
			startPos += h + gap;
		}
		return startPos;
	}

	protected override getElementSize(index: number): number {
		if (this._useVirtualLayout) {
			const size = this.elementSizeTable[index];
			return isNaN(size) ? this.typicalHeight : size;
		}
		if (this.target) {
			const el = asLayoutElement(this.target, index);
			if (el) {
				el.getLayoutBounds(tmpBounds);
				return tmpBounds.height;
			}
			return 0;
		}
		return 0;
	}

	protected override getElementTotalSize(): number {
		const typicalH = this.typicalHeight;
		const gap = this._gap;
		let totalSize = 0;
		const length = this.target!.numElements;
		for (let i = 0; i < length; i++) {
			let h = this.elementSizeTable[i];
			if (isNaN(h)) h = typicalH;
			totalSize += h + gap;
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
		const contentHeight =
			this.getStartPosition(numElements - 1) +
			(isNaN(lastSize) ? this.typicalHeight : lastSize) +
			this._paddingBottom;
		const minVisibleY = target.scrollV ?? 0;
		if (minVisibleY > contentHeight - this._paddingBottom) {
			this.startIndex = this.endIndex = -1;
			return false;
		}
		const maxVisibleY = minVisibleY + target.height;
		if (maxVisibleY < this._paddingTop) {
			this.startIndex = this.endIndex = -1;
			return false;
		}

		const oldStart = this.startIndex;
		const oldEnd = this.endIndex;
		this.startIndex = this.findIndexAt(minVisibleY, 0, numElements - 1);
		if (this.startIndex === -1) this.startIndex = 0;
		this.endIndex = this.findIndexAt(maxVisibleY, 0, numElements - 1);
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
