import { LayoutBase } from './LayoutBase.js';
import type { IUIComponent } from '../core/IUIComponent.js';

/**
 * Internal info for percent-based layout calculation.
 */
interface ChildInfo {
	layoutElement: IUIComponent;
	size: number;
	percent: number;
	min: number;
	max: number;
}

/**
 * Base class for HorizontalLayout and VerticalLayout.
 * Provides common properties: gap, padding, horizontalAlign, verticalAlign,
 * virtual layout caching, and percent-size distribution.
 */
export abstract class LinearLayoutBase extends LayoutBase {
	// ── Instance fields ───────────────────────────────────────────────────

	protected _horizontalAlign = 'left';
	protected _verticalAlign = 'top';
	protected _gap = 6;
	protected _paddingLeft = 0;
	protected _paddingRight = 0;
	protected _paddingTop = 0;
	protected _paddingBottom = 0;
	protected elementSizeTable: number[] = [];
	protected maxElementSize = 0;
	protected startIndex = -1;
	protected endIndex = -1;
	protected indexInViewCalculated = false;

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get horizontalAlign(): string {
		return this._horizontalAlign;
	}

	public set horizontalAlign(value: string) {
		if (this._horizontalAlign === value) return;
		this._horizontalAlign = value;
		if (this.target) this.target.invalidateDisplayList();
	}

	public get verticalAlign(): string {
		return this._verticalAlign;
	}

	public set verticalAlign(value: string) {
		if (this._verticalAlign === value) return;
		this._verticalAlign = value;
		if (this.target) this.target.invalidateDisplayList();
	}

	public get gap(): number {
		return this._gap;
	}

	public set gap(value: number) {
		value = +value || 0;
		if (this._gap === value) return;
		this._gap = value;
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

	// ── Override methods ──────────────────────────────────────────────────

	public override clearVirtualLayoutCache(): void {
		if (!this._useVirtualLayout) return;
		this.elementSizeTable = [];
		this.maxElementSize = 0;
	}

	public override elementRemoved(index: number): void {
		if (!this._useVirtualLayout) return;
		super.elementRemoved(index);
		this.elementSizeTable.splice(index, 1);
	}

	public override scrollPositionChanged(): void {
		super.scrollPositionChanged();
		if (this._useVirtualLayout) {
			const changed = this.getIndexInView();
			if (changed) {
				this.indexInViewCalculated = true;
				this.target?.invalidateDisplayList();
			}
		}
	}

	public override measure(): void {
		if (!this.target) return;
		if (this._useVirtualLayout) {
			this.measureVirtual();
		} else {
			this.measureReal();
		}
	}

	public override updateDisplayList(width: number, height: number): void {
		const target = this.target;
		if (!target) return;

		if (target.numChildren === 0) {
			target.setContentSize(
				Math.ceil(this._paddingLeft + this._paddingRight),
				Math.ceil(this._paddingTop + this._paddingBottom),
			);
			return;
		}

		if (this._useVirtualLayout) {
			this.updateDisplayListVirtual(width, height);
		} else {
			this.updateDisplayListReal(width, height);
		}
	}

	// ── Protected methods ─────────────────────────────────────────────────

	protected measureReal(): void {
		// override in subclass
	}

	protected measureVirtual(): void {
		// override in subclass
	}

	protected updateDisplayListReal(_width: number, _height: number): void {
		// override in subclass
	}

	protected updateDisplayListVirtual(_width: number, _height: number): void {
		// override in subclass
	}

	protected getStartPosition(_index: number): number {
		return 0;
	}

	protected getElementSize(_index: number): number {
		return 0;
	}

	protected getElementTotalSize(): number {
		return 0;
	}

	/**
	 * Binary search to find the element index at a given position.
	 */
	protected findIndexAt(x: number, i0: number, i1: number): number {
		const index = ((i0 + i1) * 0.5) | 0;
		const elementX = this.getStartPosition(index);
		const elementWidth = this.getElementSize(index);
		if (x >= elementX && x < elementX + elementWidth + this._gap) return index;
		else if (i0 === i1) return -1;
		else if (x < elementX) return this.findIndexAt(x, i0, Math.max(i0, index - 1));
		else return this.findIndexAt(x, Math.min(index + 1, i1), i1);
	}

	protected getIndexInView(): boolean {
		return false;
	}

	/**
	 * Distribute available space among percent-sized $children,
	 * respecting min/max constraints.
	 */
	protected flexChildrenProportionally(
		spaceForChildren: number,
		spaceToDistribute: number,
		totalPercent: number,
		childInfoArray: ChildInfo[],
	): void {
		let numElements = childInfoArray.length;
		let done: boolean;

		do {
			done = true;

			let unused = spaceToDistribute - (spaceForChildren * totalPercent) / 100;
			if (unused > 0) spaceToDistribute -= unused;
			else unused = 0;

			const spacePerPercent = spaceToDistribute / totalPercent;

			for (let i = 0; i < numElements; i++) {
				const childInfo = childInfoArray[i];
				const size = childInfo.percent * spacePerPercent;

				if (size < childInfo.min) {
					const min = childInfo.min;
					childInfo.size = min;
					childInfoArray[i] = childInfoArray[--numElements];
					childInfoArray[numElements] = childInfo;
					totalPercent -= childInfo.percent;
					if (unused >= min) {
						unused -= min;
					} else {
						spaceToDistribute -= min - unused;
						unused = 0;
					}
					done = false;
					break;
				} else if (size > childInfo.max) {
					const max = childInfo.max;
					childInfo.size = max;
					childInfoArray[i] = childInfoArray[--numElements];
					childInfoArray[numElements] = childInfo;
					totalPercent -= childInfo.percent;
					if (unused >= max) {
						unused -= max;
					} else {
						spaceToDistribute -= max - unused;
						unused = 0;
					}
					done = false;
					break;
				} else {
					childInfo.size = size;
				}
			}
		} while (!done);
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _invalidateTargetLayout(): void {
		const target = this.target;
		if (target) {
			target.invalidateSize();
			target.invalidateDisplayList();
		}
	}
}
