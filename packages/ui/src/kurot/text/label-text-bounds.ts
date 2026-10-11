import { TextFieldType } from '@kurot/core';
import type { ILineElement, TextField } from '@kurot/core';

const heightCache = new WeakMap<ILineElement[], number>();

/**
 * Dynamic outlines need layout space inside external clips. Keep this allowance
 * independent of glyphs so a typewriter prefix cannot move its drawing origin.
 * Input retains its native editing viewport and empty Labels add no inset.
 */
export function getLabelOutlinePadding(field: TextField): number {
	if (field.type === TextFieldType.INPUT || !field.text || !Number.isFinite(field.stroke) || field.stroke <= 0) {
		return 0;
	}
	if (!field.multiline && !field.displayAsPassword && /^[\n\r\v\f\u0085\u2028\u2029]/u.test(field.text)) {
		return 0;
	}
	return Math.ceil(field.stroke * 2) + 2;
}

/**
 * Preserve nominal rows, including blanks, while containing the complete glyph
 * block of an outlined Label. Core measurement itself remains nominal.
 */
export function getLabelTextHeight(field: TextField): number {
	const nominalHeight = field.textHeight;
	if (getLabelOutlinePadding(field) === 0) return nominalHeight;
	const lines = field.getLinesArr();
	const cached = heightCache.get(lines);
	if (cached !== undefined) return cached;

	let top = Infinity;
	let bottom = -Infinity;
	let lineTop = 0;
	for (const line of lines) {
		const hasInk = line.inkAscent + line.inkDescent > 0;
		top = Math.min(top, lineTop + (hasInk ? line.baseline - line.inkAscent : 0));
		bottom = Math.max(bottom, lineTop + (hasInk ? line.baseline + line.inkDescent : line.height));
		lineTop += line.height + field.lineSpacing;
	}
	const height = Math.max(nominalHeight, lines.length === 0 ? 0 : bottom - top);
	heightCache.set(lines, height);
	return height;
}
