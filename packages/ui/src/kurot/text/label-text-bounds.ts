import { TextFieldType } from '@kurot/core';
import type { TextField } from '@kurot/core';

/**
 * Font frames already contain the vertical glyph body. Reserve the stroke
 * radius plus rounding/AA space vertically; horizontal ink can overhang its
 * advance, especially with italic text. Keep both insets independent of text
 * prefixes and fitting candidates by using the authored font size.
 */
export function getLabelOutlineInsets(field: TextField, authoredSize: number = field.size): { x: number; y: number } {
	if (field.type === TextFieldType.INPUT || !field.text || !Number.isFinite(field.stroke) || field.stroke <= 0) {
		return { x: 0, y: 0 };
	}
	if (!field.multiline && !field.displayAsPassword && /^[\n\r\v\f\u0085\u2028\u2029]/u.test(field.text)) {
		return { x: 0, y: 0 };
	}
	return {
		x: Math.ceil(field.stroke * 2) + 2 + (field.italic ? Math.ceil(authoredSize / 4) : 0),
		y: Math.ceil(field.stroke) + 2,
	};
}
