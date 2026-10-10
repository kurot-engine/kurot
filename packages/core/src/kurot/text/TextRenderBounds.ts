import type { TextField } from './TextField.js';
import { getTextVerticalOffset } from './TextVerticalLayout.js';
import { TextFieldType } from './enums/TextFieldType.js';

/**
 * Render-only margin for dynamic glyph overhang and run-level outlines.
 * Layout metrics and input viewports must not include this margin.
 */
export function getTextRenderPadding(textField: TextField): number {
	if (textField.type === TextFieldType.INPUT) return 0;

	let stroke = 0;
	let overhang = -Infinity;
	// Use the natural height so clipping an overflowing block cannot enlarge captures.
	const baselineShift = getTextVerticalOffset(textField, textField.textHeight);
	for (const line of textField.getLinesArr()) {
		if (line.inkAscent + line.inkDescent > 0) {
			const baseline = line.baseline + baselineShift;
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
	return (stroke > 0 ? Math.ceil(stroke * 2) + 2 : 0) + (overhang >= 0 ? Math.ceil(overhang) + 1 : 0);
}
