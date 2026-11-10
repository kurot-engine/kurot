import type { TextField } from '@kurot/core';
import { getOutlineInsets } from './outline-insets.js';
import type { OutlineInsets } from './outline-insets.js';

/**
 * Derives one paragraph inset from authored runs, never from wrapped or clipped
 * lines. Single-line content stops at its first hard separator. This keeps
 * width negotiation and scrolling from changing the content origin.
 */
export function getRichLabelOutlineInsets(field: TextField): OutlineInsets {
	let x = 0;
	let y = 0;
	let outlined = false;
	for (const run of field.textFlow ?? []) {
		const end = field.multiline ? -1 : run.text.search(/[\n\r\v\f\u0085\u2028\u2029]/u);
		if ((end < 0 ? run.text.length : end) > 0) {
			const authoredStroke = run.style?.stroke ?? field.stroke;
			const stroke = Number.isFinite(authoredStroke) && authoredStroke > 0 ? authoredStroke : 0;
			const inset = getOutlineInsets(stroke, run.style?.size ?? field.size, run.style?.italic ?? field.italic);
			x = Math.max(x, inset.x);
			y = Math.max(y, inset.y);
			outlined ||= stroke > 0;
		}
		if (end >= 0) {
			break;
		}
	}
	return outlined ? { x, y } : { x: 0, y: 0 };
}
