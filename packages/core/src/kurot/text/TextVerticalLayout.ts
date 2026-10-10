import type { TextField } from './TextField.js';
import { getTextBlockBounds } from './TextBlockBounds.js';
import { TextFieldType } from './enums/TextFieldType.js';
import { VerticalAlign } from './enums/VerticalAlign.js';

/**
 * Aligns one complete block independently of multiline. Dynamic text uses glyph
 * bounds; input uses nominal rows and keeps overflowing editing rows top-aligned.
 */
export function getTextVerticalOffset(
	field: TextField,
	height: number = !isNaN(field.$explicitHeight) ? field.$explicitHeight : field.textHeight,
): number {
	const input = field.type === TextFieldType.INPUT;
	const bounds = input ? { top: 0, bottom: field.textHeight } : getTextBlockBounds(field);
	const remaining = height - (bounds.bottom - bounds.top);
	const space = input ? Math.max(0, remaining) : remaining;

	if (field.verticalAlign === VerticalAlign.BOTTOM) {
		return space - bounds.top;
	}
	if (field.verticalAlign === VerticalAlign.MIDDLE) {
		return space / 2 - bounds.top;
	}
	return 0 - bounds.top;
}
