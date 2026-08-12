import { LayoutBase } from './LayoutBase.js';
import { JustifyAlign } from './JustifyAlign.js';
import { ColumnAlign } from './ColumnAlign.js';
import { RowAlign } from './RowAlign.js';
import { TileOrientation } from './TileOrientation.js';
import type { ILayoutTarget } from './ILayoutTarget.js';
import type { IUIComponent } from '../core/IUIComponent.js';
import { Rectangle } from '@blakron/core';

const tmpBounds = new Rectangle();

/**
 * TileLayout arranges layout elements in columns and rows of equally-sized cells.
 *
 * Supports orientation (rows vs columns), requested column/row counts,
 * column/row alignment justification, percent size within cells, and virtual layout.
 */
export class TileLayout extends LayoutBase {
	// ── Instance fields ───────────────────────────────────────────────────

	private _horizontalGap = 6;
	private _explicitHorizontalGap = NaN;
	private _verticalGap = 6;
	private _explicitVerticalGap = NaN;
	private _columnCount = -1;
	private _requestedColumnCount = 0;
	private _rowCount = -1;
	private _requestedRowCount = 0;
	private _columnWidth = NaN;
	private _explicitColumnWidth = NaN;
	private _rowHeight = NaN;
	private _explicitRowHeight = NaN;
	private _paddingLeft = 0;
	private _paddingRight = 0;
	private _paddingTop = 0;
	private _paddingBottom = 0;
	private _horizontalAlign: string = JustifyAlign.JUSTIFY;
	private _verticalAlign: string = JustifyAlign.JUSTIFY;
	private _columnAlign: string = ColumnAlign.LEFT;
	private _rowAlign: string = RowAlign.TOP;
	private _orientation: string = TileOrientation.ROWS;
	private _maxElementWidth = 0;
	private _maxElementHeight = 0;
	private _startIndex = -1;
	private _endIndex = -1;
	private _indexInViewCalculated = false;

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get horizontalGap(): number {
		return this._horizontalGap;
	}

	public set horizontalGap(value: number) {
		value = +value;
		if (value === this._horizontalGap) return;
		this._explicitHorizontalGap = value;
		this._horizontalGap = value;
		this._invalidateTargetLayout();
	}

	public get verticalGap(): number {
		return this._verticalGap;
	}

	public set verticalGap(value: number) {
		value = +value;
		if (value === this._verticalGap) return;
		this._explicitVerticalGap = value;
		this._verticalGap = value;
		this._invalidateTargetLayout();
	}

	public get columnCount(): number {
		return this._columnCount;
	}

	public get requestedColumnCount(): number {
		return this._requestedColumnCount;
	}

	public set requestedColumnCount(value: number) {
		value = +value || 0;
		if (this._requestedColumnCount === value) return;
		this._requestedColumnCount = value;
		this._columnCount = value;
		this._invalidateTargetLayout();
	}

	public get rowCount(): number {
		return this._rowCount;
	}

	public get requestedRowCount(): number {
		return this._requestedRowCount;
	}

	public set requestedRowCount(value: number) {
		value = +value || 0;
		if (this._requestedRowCount === value) return;
		this._requestedRowCount = value;
		this._rowCount = value;
		this._invalidateTargetLayout();
	}

	public get columnWidth(): number {
		return this._columnWidth;
	}

	public set columnWidth(value: number) {
		value = +value;
		if (value === this._columnWidth) return;
		this._explicitColumnWidth = value;
		this._columnWidth = value;
		this._invalidateTargetLayout();
	}

	public get rowHeight(): number {
		return this._rowHeight;
	}

	public set rowHeight(value: number) {
		value = +value;
		if (value === this._rowHeight) return;
		this._explicitRowHeight = value;
		this._rowHeight = value;
		this._invalidateTargetLayout();
	}

	public get paddingLeft(): number {
		return this._paddingLeft;
	}

	public set paddingLeft(value: number) {
		value = +value || 0;
		if (this._paddingLeft === value) return;
		this._paddingLeft = value;
		this._invalidateTargetLayout();
	}

	public get paddingRight(): number {
		return this._paddingRight;
	}

	public set paddingRight(value: number) {
		value = +value || 0;
		if (this._paddingRight === value) return;
		this._paddingRight = value;
		this._invalidateTargetLayout();
	}

	public get paddingTop(): number {
		return this._paddingTop;
	}

	public set paddingTop(value: number) {
		value = +value || 0;
		if (this._paddingTop === value) return;
		this._paddingTop = value;
		this._invalidateTargetLayout();
	}

	public get paddingBottom(): number {
		return this._paddingBottom;
	}

	public set paddingBottom(value: number) {
		value = +value || 0;
		if (this._paddingBottom === value) return;
		this._paddingBottom = value;
		this._invalidateTargetLayout();
	}

	public get horizontalAlign(): string {
		return this._horizontalAlign;
	}

	public set horizontalAlign(value: string) {
		if (this._horizontalAlign === value) return;
		this._horizontalAlign = value;
		this._invalidateTargetLayout();
	}

	public get verticalAlign(): string {
		return this._verticalAlign;
	}

	public set verticalAlign(value: string) {
		if (this._verticalAlign === value) return;
		this._verticalAlign = value;
		this._invalidateTargetLayout();
	}

	public get columnAlign(): string {
		return this._columnAlign;
	}

	public set columnAlign(value: string) {
		if (this._columnAlign === value) return;
		this._columnAlign = value;
		this._invalidateTargetLayout();
	}

	public get rowAlign(): string {
		return this._rowAlign;
	}

	public set rowAlign(value: string) {
		if (this._rowAlign === value) return;
		this._rowAlign = value;
		this._invalidateTargetLayout();
	}

	public get orientation(): string {
		return this._orientation;
	}

	public set orientation(value: string) {
		if (this._orientation === value) return;
		this._orientation = value;
		this._invalidateTargetLayout();
	}

	// ── Override methods ──────────────────────────────────────────────────

	public override clearVirtualLayoutCache(): void {
		super.clearVirtualLayoutCache();
		this._maxElementWidth = 0;
		this._maxElementHeight = 0;
	}

	public override scrollPositionChanged(): void {
		if (this._useVirtualLayout) {
			const changed = this._getIndexInView();
			if (changed) {
				this._indexInViewCalculated = true;
				this.target?.invalidateDisplayList();
			}
		}
	}

	public override measure(): void {
		const target = this.target!;
		const savedColumnCount = this._columnCount;
		const savedRowCount = this._rowCount;
		const savedColumnWidth = this._columnWidth;
		const savedRowHeight = this._rowHeight;

		let measuredWidth = 0;
		let measuredHeight = 0;

		this._calculateRowAndColumn(target.$explicitWidth, target.$explicitHeight);

		const columnCount = this._requestedColumnCount > 0 ? this._requestedColumnCount : this._columnCount;
		const rowCount = this._requestedRowCount > 0 ? this._requestedRowCount : this._rowCount;
		const hGap = isNaN(this._horizontalGap) ? 0 : this._horizontalGap;
		const vGap = isNaN(this._verticalGap) ? 0 : this._verticalGap;

		if (columnCount > 0) {
			measuredWidth = columnCount * (this._columnWidth + hGap) - hGap;
		}
		if (rowCount > 0) {
			measuredHeight = rowCount * (this._rowHeight + vGap) - vGap;
		}

		const hPadding = this._paddingLeft + this._paddingRight;
		const vPadding = this._paddingTop + this._paddingBottom;
		target.setMeasuredSize(measuredWidth + hPadding, measuredHeight + vPadding);

		this._columnCount = savedColumnCount;
		this._rowCount = savedRowCount;
		this._columnWidth = savedColumnWidth;
		this._rowHeight = savedRowHeight;
	}

	public override updateDisplayList(width: number, height: number): void {
		const target = this.target;
		if (!target) return;

		const paddingL = this._paddingLeft;
		const paddingR = this._paddingRight;
		const paddingT = this._paddingTop;
		const paddingB = this._paddingBottom;

		if (this._indexInViewCalculated) {
			this._indexInViewCalculated = false;
		} else {
			this._calculateRowAndColumn(width, height);
			if (this._rowCount === 0 || this._columnCount === 0) {
				target.setContentSize(paddingL + paddingR, paddingT + paddingB);
				return;
			}
			this._adjustForJustify(width, height);
			this._getIndexInView();
		}

		if (this._useVirtualLayout) {
			this._calculateRowAndColumn(width, height);
			this._adjustForJustify(width, height);
		}

		if (this._startIndex === -1 || this._endIndex === -1) {
			target.setContentSize(0, 0);
			return;
		}

		const endIdx = this._endIndex;

		const orientedByColumns = this._orientation === TileOrientation.COLUMNS;
		let index = this._startIndex;
		const hGap = isNaN(this._horizontalGap) ? 0 : this._horizontalGap;
		const vGap = isNaN(this._verticalGap) ? 0 : this._verticalGap;
		const rowCount = this._rowCount;
		const columnCount = this._columnCount;
		const columnWidth = this._columnWidth;
		const rowHeight = this._rowHeight;

		for (let i = this._startIndex; i <= endIdx; i++) {
			const el = asLayoutElement(target, i);
			if (!el || !el.includeInLayout) {
				continue;
			}

			let columnIndex: number;
			let rowIndex: number;

			if (orientedByColumns) {
				columnIndex = Math.ceil((index + 1) / rowCount) - 1;
				rowIndex = Math.ceil((index + 1) % rowCount) - 1;
				if (rowIndex === -1) rowIndex = rowCount - 1;
			} else {
				columnIndex = Math.ceil((index + 1) % columnCount) - 1;
				if (columnIndex === -1) columnIndex = columnCount - 1;
				rowIndex = Math.ceil((index + 1) / columnCount) - 1;
			}

			let x: number;
			switch (this._horizontalAlign) {
				case 'right':
					x = width - (columnIndex + 1) * (columnWidth + hGap) + hGap - paddingR;
					break;
				case 'left':
					x = columnIndex * (columnWidth + hGap) + paddingL;
					break;
				default:
					x = columnIndex * (columnWidth + hGap) + paddingL;
			}

			let y: number;
			switch (this._verticalAlign) {
				case 'top':
					y = rowIndex * (rowHeight + vGap) + paddingT;
					break;
				case 'bottom':
					y = height - (rowIndex + 1) * (rowHeight + vGap) + vGap - paddingB;
					break;
				default:
					y = rowIndex * (rowHeight + vGap) + paddingT;
			}

			this._sizeAndPositionElement(el, x, y, columnWidth, rowHeight);
			index++;
		}

		const hPadding = paddingL + paddingR;
		const vPadding = paddingT + paddingB;
		const contentWidth = (columnWidth + hGap) * columnCount - hGap;
		const contentHeight = (rowHeight + vGap) * rowCount - vGap;
		target.setContentSize(contentWidth + hPadding, contentHeight + vPadding);
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _invalidateTargetLayout(): void {
		if (this.target) {
			this.target.invalidateSize();
			this.target.invalidateDisplayList();
		}
	}

	private _updateMaxElementSize(): void {
		if (!this.target) return;
		if (this._useVirtualLayout) {
			this._maxElementWidth = Math.max(this._maxElementWidth, this.typicalWidth);
			this._maxElementHeight = Math.max(this._maxElementHeight, this.typicalHeight);
			this._doUpdateMaxElementSize(this._startIndex, this._endIndex);
		} else {
			this._doUpdateMaxElementSize(0, this.target.numChildren - 1);
		}
	}

	private _doUpdateMaxElementSize(startIdx: number, endIdx: number): void {
		let maxW = this._maxElementWidth;
		let maxH = this._maxElementHeight;
		if (startIdx !== -1 && endIdx !== -1) {
			for (let i = startIdx; i <= endIdx; i++) {
				const el = asLayoutElement(this.target!, i);
				if (!el || !el.includeInLayout) continue;
				el.getPreferredBounds(tmpBounds);
				maxW = Math.max(maxW, tmpBounds.width);
				maxH = Math.max(maxH, tmpBounds.height);
			}
		}
		this._maxElementWidth = maxW;
		this._maxElementHeight = maxH;
	}

	private _calculateRowAndColumn($explicitWidth: number, $explicitHeight: number): void {
		const target = this.target!;
		const hGap = isNaN(this._horizontalGap) ? 0 : this._horizontalGap;
		const vGap = isNaN(this._verticalGap) ? 0 : this._verticalGap;
		this._rowCount = this._columnCount = -1;

		let numElements = target.numChildren;
		for (let i = 0; i < target.numChildren; i++) {
			const el = asLayoutElement(target, i);
			if (el && !el.includeInLayout) numElements--;
		}

		if (numElements === 0) {
			this._rowCount = this._columnCount = 0;
			return;
		}

		if (isNaN(this._explicitColumnWidth) || isNaN(this._explicitRowHeight)) {
			this._updateMaxElementSize();
		}

		this._columnWidth = isNaN(this._explicitColumnWidth) ? this._maxElementWidth : this._explicitColumnWidth;
		this._rowHeight = isNaN(this._explicitRowHeight) ? this._maxElementHeight : this._explicitRowHeight;

		let itemWidth = this._columnWidth + hGap;
		if (itemWidth <= 0) itemWidth = 1;
		let itemHeight = this._rowHeight + vGap;
		if (itemHeight <= 0) itemHeight = 1;

		const orientedByColumns = this._orientation === TileOrientation.COLUMNS;
		const widthHasSet = !isNaN($explicitWidth);
		const heightHasSet = !isNaN($explicitHeight);

		if (this._requestedColumnCount > 0 || this._requestedRowCount > 0) {
			if (this._requestedRowCount > 0) this._rowCount = Math.min(this._requestedRowCount, numElements);
			if (this._requestedColumnCount > 0) this._columnCount = Math.min(this._requestedColumnCount, numElements);
		} else if (!widthHasSet && !heightHasSet) {
			const side = Math.sqrt(numElements * itemWidth * itemHeight);
			if (orientedByColumns) {
				this._rowCount = Math.max(1, Math.round(side / itemHeight));
			} else {
				this._columnCount = Math.max(1, Math.round(side / itemWidth));
			}
		} else if (widthHasSet && (!heightHasSet || !orientedByColumns)) {
			const targetWidth = Math.max(0, $explicitWidth - this._paddingLeft - this._paddingRight);
			this._columnCount = Math.floor((targetWidth + hGap) / itemWidth);
			this._columnCount = Math.max(1, Math.min(this._columnCount, numElements));
		} else {
			const targetHeight = Math.max(0, $explicitHeight - this._paddingTop - this._paddingBottom);
			this._rowCount = Math.floor((targetHeight + vGap) / itemHeight);
			this._rowCount = Math.max(1, Math.min(this._rowCount, numElements));
		}

		if (this._rowCount === -1) this._rowCount = Math.max(1, Math.ceil(numElements / this._columnCount));
		if (this._columnCount === -1) this._columnCount = Math.max(1, Math.ceil(numElements / this._rowCount));

		if (this._requestedColumnCount > 0 && this._requestedRowCount > 0) {
			if (this._orientation === TileOrientation.ROWS) {
				this._rowCount = Math.max(1, Math.ceil(numElements / this._requestedColumnCount));
			} else {
				this._columnCount = Math.max(1, Math.ceil(numElements / this._requestedRowCount));
			}
		}
	}

	private _getIndexInView(): boolean {
		const target = this.target;
		if (!target || target.numChildren === 0) {
			this._startIndex = this._endIndex = -1;
			return false;
		}

		const numElements = target.numChildren;
		if (!this._useVirtualLayout) {
			this._startIndex = 0;
			this._endIndex = numElements - 1;
			return false;
		}

		if (target.width === 0 || target.height === 0) {
			this._startIndex = this._endIndex = -1;
			return false;
		}

		const oldStartIndex = this._startIndex;
		const oldEndIndex = this._endIndex;
		const paddingL = this._paddingLeft;
		const paddingT = this._paddingTop;
		const hGap = isNaN(this._horizontalGap) ? 0 : this._horizontalGap;
		const vGap = isNaN(this._verticalGap) ? 0 : this._verticalGap;

		if (this._orientation === TileOrientation.COLUMNS) {
			const itemWidth = this._columnWidth + hGap;
			if (itemWidth <= 0) {
				this._startIndex = 0;
				this._endIndex = numElements - 1;
				return false;
			}
			const minVisibleX = target.scrollH ?? 0;
			const maxVisibleX = minVisibleX + target.width;
			let startColumn = Math.floor((minVisibleX - paddingL) / itemWidth);
			if (startColumn < 0) startColumn = 0;
			let endColumn = Math.ceil((maxVisibleX - paddingL) / itemWidth);
			if (endColumn < 0) endColumn = 0;
			this._startIndex = Math.min(numElements - 1, Math.max(0, startColumn * this._rowCount));
			this._endIndex = Math.min(numElements - 1, Math.max(0, endColumn * this._rowCount - 1));
		} else {
			const itemHeight = this._rowHeight + vGap;
			if (itemHeight <= 0) {
				this._startIndex = 0;
				this._endIndex = numElements - 1;
				return false;
			}
			const minVisibleY = target.scrollV ?? 0;
			const maxVisibleY = minVisibleY + target.height;
			let startRow = Math.floor((minVisibleY - paddingT) / itemHeight);
			if (startRow < 0) startRow = 0;
			let endRow = Math.ceil((maxVisibleY - paddingT) / itemHeight);
			if (endRow < 0) endRow = 0;
			this._startIndex = Math.min(numElements - 1, Math.max(0, startRow * this._columnCount));
			this._endIndex = Math.min(numElements - 1, Math.max(0, endRow * this._columnCount - 1));
		}

		return this._startIndex !== oldStartIndex || this._endIndex !== oldEndIndex;
	}

	private _adjustForJustify(width: number, height: number): void {
		const paddingL = this._paddingLeft;
		const paddingR = this._paddingRight;
		const paddingT = this._paddingTop;
		const paddingB = this._paddingBottom;

		const targetWidth = Math.max(0, width - paddingL - paddingR);
		const targetHeight = Math.max(0, height - paddingT - paddingB);

		if (!isNaN(this._explicitVerticalGap)) this._verticalGap = this._explicitVerticalGap;
		if (!isNaN(this._explicitHorizontalGap)) this._horizontalGap = this._explicitHorizontalGap;
		this._verticalGap = isNaN(this._verticalGap) ? 0 : this._verticalGap;
		this._horizontalGap = isNaN(this._horizontalGap) ? 0 : this._horizontalGap;

		const offsetY = targetHeight - this._rowHeight * this._rowCount;
		const offsetX = targetWidth - this._columnWidth * this._columnCount;

		if (offsetY > 0) {
			if (this._rowAlign === RowAlign.JUSTIFY_USING_GAP) {
				const gapCount = Math.max(1, this._rowCount - 1);
				this._verticalGap = offsetY / gapCount;
			} else if (this._rowAlign === RowAlign.JUSTIFY_USING_HEIGHT) {
				if (this._rowCount > 0) {
					this._rowHeight += (offsetY - (this._rowCount - 1) * this._verticalGap) / this._rowCount;
				}
			}
		}
		if (offsetX > 0) {
			if (this._columnAlign === ColumnAlign.JUSTIFY_USING_GAP) {
				const gapCount = Math.max(1, this._columnCount - 1);
				this._horizontalGap = offsetX / gapCount;
			} else if (this._columnAlign === ColumnAlign.JUSTIFY_USING_WIDTH) {
				if (this._columnCount > 0) {
					this._columnWidth += (offsetX - (this._columnCount - 1) * this._horizontalGap) / this._columnCount;
				}
			}
		}
	}

	private _sizeAndPositionElement(
		element: IUIComponent,
		cellX: number,
		cellY: number,
		cellWidth: number,
		cellHeight: number,
	): void {
		let elementWidth = NaN;
		let elementHeight = NaN;

		if (this._horizontalAlign === JustifyAlign.JUSTIFY) {
			elementWidth = cellWidth;
		} else if (!isNaN(element.percentWidth)) {
			elementWidth = cellWidth * element.percentWidth * 0.01;
		}

		if (this._verticalAlign === JustifyAlign.JUSTIFY) {
			elementHeight = cellHeight;
		} else if (!isNaN(element.percentHeight)) {
			elementHeight = cellHeight * element.percentHeight * 0.01;
		}

		element.setLayoutBoundsSize(Math.round(elementWidth), Math.round(elementHeight));

		let x = cellX;
		element.getLayoutBounds(tmpBounds);
		switch (this._horizontalAlign) {
			case 'right':
				x += cellWidth - tmpBounds.width;
				break;
			case 'center':
				x = cellX + (cellWidth - tmpBounds.width) / 2;
				break;
		}

		let y = cellY;
		switch (this._verticalAlign) {
			case 'bottom':
				y += cellHeight - tmpBounds.height;
				break;
			case 'middle':
				y += (cellHeight - tmpBounds.height) / 2;
				break;
		}

		element.setLayoutBoundsPosition(Math.round(x), Math.round(y));
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
