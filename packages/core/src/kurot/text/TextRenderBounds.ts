import type { TextField } from './TextField.js';
import { TextFieldType } from './enums/TextFieldType.js';

/**
 * Render-only margin for outlined dynamic text, including run-level strokes.
 * Layout metrics and input viewports must not include this margin.
 */
export function getTextRenderPadding(textField: TextField): number {
	if (textField.type === TextFieldType.INPUT) return 0;

	let stroke = 0;
	for (const line of textField.getLinesArr()) {
		for (const element of line.elements) {
			const value = element.style?.stroke ?? textField.stroke;
			if (Number.isFinite(value) && value > stroke) {
				stroke = value;
			}
		}
	}

	// Conservative ink margin covers glyph overhang and stroke antialiasing.
	return stroke > 0 ? Math.ceil(stroke * 2) + 2 : 0;
}
