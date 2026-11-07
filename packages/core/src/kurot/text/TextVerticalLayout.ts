import type { TextField } from './TextField.js';
import { TextFieldType } from './enums/TextFieldType.js';
import { VerticalAlign } from './enums/VerticalAlign.js';

/**
 * Aligns stable line frames independently of the currently painted glyphs.
 * Input keeps overflowing editing rows top-aligned for caret scrolling.
 */
export function getTextVerticalOffset(
	field: TextField,
	height: number = !isNaN(field.$explicitHeight) ? field.$explicitHeight : field.textHeight,
): number {
	const input = field.type === TextFieldType.INPUT;
	const remaining = height - field.textHeight;
	const space = input ? Math.max(0, remaining) : remaining;

	if (field.verticalAlign === VerticalAlign.BOTTOM) {
		return space;
	}
	if (field.verticalAlign === VerticalAlign.MIDDLE) {
		return space / 2;
	}
	return 0;
}
