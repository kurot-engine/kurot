import type { TextField } from './TextField.js';
import { TextFieldType } from './enums/TextFieldType.js';
import { VerticalAlign } from './enums/VerticalAlign.js';

/**
 * Single-line dynamic middle alignment centers visible ink. Multiline and input
 * retain nominal line boxes so changing glyphs cannot move their baselines.
 */
export function getTextVerticalOffset(field: TextField): number {
	const lines = field.getLinesArr();
	const height = !isNaN(field.$explicitHeight) ? field.$explicitHeight : field.textHeight;
	const line = lines[0];
	if (field.verticalAlign === VerticalAlign.MIDDLE) {
		if (field.type === TextFieldType.DYNAMIC && !field.multiline && line
			&& line.inkAscent + line.inkDescent > 0) {
			return (height - line.inkAscent - line.inkDescent) / 2 + line.inkAscent - line.baseline;
		}
		return Math.max(0, (height - field.textHeight) / 2);
	}
	if (field.verticalAlign === VerticalAlign.BOTTOM) {
		return Math.max(0, height - field.textHeight);
	}
	return 0;
}
