import type { IUIComponent } from './IUIComponent.js';

/**
 * UI component that renders one item from a data provider.
 */
export interface IItemRenderer extends IUIComponent {
	/**
	 * The data object to render.
	 */
	data: unknown;
	/**
	 * Whether this item is currently selected.
	 */
	selected: boolean;
	/**
	 * The index of this item in the data provider.
	 */
	itemIndex: number;
}
