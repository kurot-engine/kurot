import type { TextField } from './TextField.js';
import { TextFieldType } from './enums/TextFieldType.js';
import { VerticalAlign } from './enums/VerticalAlign.js';

/**
 * Render-only margin for dynamic glyph overhang and run-level outlines.
 * Layout metrics and input viewports must not include this margin.
 */
export function getTextRenderPadding(textField: TextField): number {
	if (textField.type === TextFieldType.INPUT) return 0;

	let stroke = 0;
	let overhang = 0;
	for (const line of textField.getLinesArr()) {
		if (line.inkAscent + line.inkDescent > 0) {
			const baseline = !textField.multiline && textField.verticalAlign === VerticalAlign.MIDDLE
				? (line.height + line.inkAscent - line.inkDescent) / 2 : line.baseline;
			overhang = Math.max(overhang, line.inkAscent - baseline, baseline + line.inkDescent - line.height);
		}
		for (const element of line.elements) {
			const value = element.style?.stroke ?? textField.stroke;
			if (Number.isFinite(value) && value > stroke) {
				stroke = value;
			}
		}
	}

	// Conservative ink margin covers glyph overhang and stroke antialiasing.
	return (stroke > 0 ? Math.ceil(stroke * 2) + 2 : 0) + (overhang > 0 ? Math.ceil(overhang) + 1 : 0);
}
