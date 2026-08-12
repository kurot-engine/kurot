import type { IUIComponent } from './IUIComponent.js';

/**
 * Interface for list item renderers.
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
