import type { TextField } from './TextField.js';
import type { ILineElement } from './types/ITextElement.js';

interface TextBlockBounds {
	readonly top: number;
	readonly bottom: number;
}

// Font, wrapping and line-spacing invalidation replace the field's line array.
const boundsCache = new WeakMap<ILineElement[], TextBlockBounds>();

/**
 * Measures the complete glyph block, retaining nominal rows for blank lines.
 * Outlines belong to render padding and do not change alignment.
 */
export function getTextBlockBounds(field: TextField): TextBlockBounds {
	const lines = field.getLinesArr();
	const cached = boundsCache.get(lines);
	if (cached) return cached;

	let top = Infinity;
	let bottom = -Infinity;
	let lineTop = 0;
	for (const line of lines) {
		const hasInk = line.inkAscent + line.inkDescent > 0;
		top = Math.min(top, lineTop + (hasInk ? line.baseline - line.inkAscent : 0));
		bottom = Math.max(bottom, lineTop + (hasInk ? line.baseline + line.inkDescent : line.height));
		lineTop += line.height + field.lineSpacing;
	}

	const bounds = { top: top === Infinity ? 0 : top, bottom: bottom === -Infinity ? 0 : bottom };
	boundsCache.set(lines, bounds);
	return bounds;
}
