import type { DisplayObject } from '@blakron/core';
import type { IUIComponent } from '../core/IUIComponent.js';

/**
 * Interface that layout algorithms require from their target container.
 * Both Group and Component implement this.
 */
export interface ILayoutTarget extends IUIComponent {
	readonly numChildren: number;
	readonly numElements: number;
	readonly contentWidth: number;
	readonly contentHeight: number;
	readonly $explicitWidth: number;
	readonly $explicitHeight: number;
	scrollH: number;
	scrollV: number;
	width: number;
	height: number;
	getChildAt(index: number): DisplayObject | undefined;
	getElementAt(index: number): DisplayObject | undefined;
	getVirtualElementAt(index: number): DisplayObject | undefined;
	setVirtualElementIndicesInView(startIndex: number, endIndex: number): void;
	setMeasuredSize(w: number, h: number): void;
	setContentSize(w: number, h: number): void;
}
