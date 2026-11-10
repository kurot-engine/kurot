/**
 * Symmetric logical-pixel space outside a text content frame.
 */
export interface OutlineInsets {
	readonly x: number;
	readonly y: number;
}

/**
 * Outline/AA space for one authored style. Callers decide whether a paragraph
 * reserves space at all; an unoutlined italic run can still contribute its
 * overhang when another run enables outline-safe layout.
 */
export function getOutlineInsets(stroke: number, size: number, italic: boolean): OutlineInsets {
	return {
		x: Math.ceil(stroke * 2) + 2 + (italic ? Math.ceil(size / 4) : 0),
		y: Math.ceil(stroke) + 2,
	};
}
