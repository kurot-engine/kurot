import type { IUIComponent } from './IUIComponent.js';

/**
 * Scrollable UI component with measurable content bounds.
 */
export interface IViewport extends IUIComponent {
	readonly contentWidth: number;
	readonly contentHeight: number;
	scrollH: number;
	scrollV: number;
	scrollEnabled: boolean;
}
