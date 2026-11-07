import type { TextField } from './TextField.js';
import { TextFieldType } from './enums/TextFieldType.js';
import { getLineInkBounds } from './TextInkBounds.js';

/**
 * Render-only margin for dynamic glyph overhang and run-level outlines.
 * Layout metrics and input viewports must not include this margin.
 */
export function getTextRenderPadding(textField: TextField): number {
	if (textField.type === TextFieldType.INPUT) {
		return 0;
	}

	let stroke = 0;
	let overhang = -Infinity;
	// Natural line frames keep padding independent of the viewport alignment.
	for (const line of textField.getLinesArr()) {
		const ink = getLineInkBounds(line);
		if (ink && (ink.left > 0 || ink.right > line.width || ink.italicMargin > 0)) {
			overhang = Math.max(overhang, ink.left, ink.right - line.width, ink.italicMargin);
		}
		if (line.inkAscent + line.inkDescent > 0) {
			const baseline = line.baseline;
			// Fractional advance clipping can trim AA even when geometric ink fits.
			overhang = Math.max(overhang, 1, line.inkAscent - baseline, baseline + line.inkDescent - line.height);
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
