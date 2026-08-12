import type { IEventDispatcher, Rectangle } from '@blakron/core';

/**
 * Interface implemented by all UI components.
 * Defines the layout contract: constraint properties, invalidation cycle,
 * and bounds query methods used by layout classes.
 */
export interface IUIComponent extends IEventDispatcher {
	/**
	 * Whether this component participates in parent layout. Default true.
	 */
	includeInLayout: boolean;

	// ── Anchor constraints ────────────────────────────────────────────────
	/**
	 * Distance from the left edge of the parent container
	 */
	left: number | string;
	/**
	 * Distance from the right edge of the parent container.
	 */
	right: number | string;
	/**
	 * Distance from the top edge of the parent container.
	 */
	top: number | string;
	/**
	 * Distance from the bottom edge of the parent container.
	 */
	bottom: number | string;
	/**
	 * Offset from the horizontal center of the parent container.
	 */
	horizontalCenter: number | string;
	/**
	 * Offset from the vertical center of the parent container.
	 */
	verticalCenter: number | string;

	// ── Percentage sizing ─────────────────────────────────────────────────
	/**
	 * Width as a percentage of the parent's width (0–100).
	 */
	percentWidth: number;
	/**
	 * Height as a percentage of the parent's height (0–100).
	 */
	percentHeight: number;

	// ── Explicit / measured sizes ─────────────────────────────────────────
	readonly $explicitWidth: number;
	readonly $explicitHeight: number;
	minWidth: number;
	maxWidth: number;
	minHeight: number;
	maxHeight: number;

	// ── Invalidation cycle ────────────────────────────────────────────────
	setMeasuredSize(width: number, height: number): void;
	invalidateProperties(): void;
	validateProperties(): void;
	invalidateSize(): void;
	validateSize(recursive?: boolean): void;
	invalidateDisplayList(): void;
	validateDisplayList(): void;
	validateNow(): void;

	// ── Layout bounds ─────────────────────────────────────────────────────
	setLayoutBoundsSize(layoutWidth: number, layoutHeight: number): void;
	setLayoutBoundsPosition(x: number, y: number): void;
	getLayoutBounds(bounds: Rectangle): void;
	getPreferredBounds(bounds: Rectangle): void;
}
