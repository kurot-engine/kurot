import { EventDispatcher } from '@blakron/core';
import type { ILayoutTarget } from './ILayoutTarget.js';

/**
 * Base class for all layout algorithms.
 * Subclasses must implement `measure()` and `updateDisplayList()`.
 */
export abstract class LayoutBase extends EventDispatcher {
	// ── Instance fields ───────────────────────────────────────────────────

	public target?: ILayoutTarget;
	public typicalWidth = 71;
	public typicalHeight = 22;

	protected _useVirtualLayout = false;

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get useVirtualLayout(): boolean {
		return this._useVirtualLayout;
	}

	public set useVirtualLayout(value: boolean) {
		value = !!value;
		if (this._useVirtualLayout === value) return;
		this._useVirtualLayout = value;
		this.dispatchEventWith('useVirtualLayoutChanged');
		if (!value) this.clearVirtualLayoutCache();
		if (this.target) this.target.invalidateDisplayList();
	}

	// ── Public methods ────────────────────────────────────────────────────

	public setTypicalSize(width: number, height: number): void {
		width = +width || 71;
		height = +height || 22;
		if (width !== this.typicalWidth || height !== this.typicalHeight) {
			this.typicalWidth = width;
			this.typicalHeight = height;
			this.target?.invalidateSize();
		}
	}

	public scrollPositionChanged(): void {}

	public clearVirtualLayoutCache(): void {}

	public elementAdded(_index: number): void {}

	public elementRemoved(_index: number): void {}

	public getElementIndicesInView(): number[] {
		return [];
	}

	public abstract measure(): void;

	public abstract updateDisplayList(width: number, height: number): void;
}
