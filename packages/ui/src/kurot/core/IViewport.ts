import type { IUIComponent } from './IUIComponent.js';

/**
 * Interface for scrollable container components.
 */
export interface IViewport extends IUIComponent {
	readonly contentWidth: number;
	readonly contentHeight: number;
	scrollH: number;
	scrollV: number;
	scrollEnabled: boolean;
}
