import type { IUIComponent } from './IUIComponent.js';

/**
 * UI component that renders one item from a data provider.
 */
export interface IItemRenderer<T = unknown> extends IUIComponent {
	/**
	 * The data object to render.
	 */
	data: T | undefined;
	/**
	 * Whether this item is currently selected.
	 */
	selected: boolean;
	/**
	 * The index of this item in the data provider.
	 */
	itemIndex: number;
}
