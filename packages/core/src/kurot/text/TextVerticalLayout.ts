import type { TextField } from './TextField.js';
import { getTextBlockBounds } from './TextBlockBounds.js';
import { TextFieldType } from './enums/TextFieldType.js';
import { VerticalAlign } from './enums/VerticalAlign.js';

/**
 * Dynamic middle alignment centers the complete glyph block independently of
 * multiline. Input retains nominal rows for stable editing geometry.
 */
export function getTextVerticalOffset(field: TextField): number {
	const height = !isNaN(field.$explicitHeight) ? field.$explicitHeight : field.textHeight;
	if (field.verticalAlign === VerticalAlign.MIDDLE) {
		if (field.type === TextFieldType.DYNAMIC) {
			const bounds = getTextBlockBounds(field);
			return (height - bounds.top - bounds.bottom) / 2;
		}
		return Math.max(0, (height - field.textHeight) / 2);
	}
	if (field.verticalAlign === VerticalAlign.BOTTOM) {
		return Math.max(0, height - field.textHeight);
	}
	return 0;
}
