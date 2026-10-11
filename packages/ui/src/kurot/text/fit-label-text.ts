import { TextField } from '@kurot/core';
import { getLabelOutlinePadding, getLabelTextHeight } from './label-text-bounds.js';

interface LabelTextMetrics {
	text: string;
	fontFamily: string;
	size: number;
	minimum: number;
	bold: boolean;
	italic: boolean;
	stroke: number;
	multiline: boolean;
	wordWrap: boolean;
	lineSpacing: number;
	width: number;
	height: number;
}

interface LabelTextFit {
	size: number;
	overflow: boolean;
}

/**
 * Fits plain text using the same line generation as the rendered TextField.
 * A finite zero bound is meaningful; NaN represents an unconstrained axis.
 * Never changes authored size or text, and always measures from the base size.
 */
export function fitLabelText(metrics: LabelTextMetrics): LabelTextFit {
	if (!metrics.text) return { size: metrics.size, overflow: false };
	const field = new TextField();
	field.text = metrics.text;
	field.fontFamily = metrics.fontFamily;
	field.bold = metrics.bold;
	field.italic = metrics.italic;
	field.multiline = metrics.multiline;
	field.wordWrap = metrics.wordWrap;
	field.lineSpacing = metrics.lineSpacing;
	field.stroke = metrics.stroke;
	const outline = getLabelOutlinePadding(field) * 2;
	const width = Number.isFinite(metrics.width) ? Math.max(0, metrics.width - outline) : NaN;
	const fits = (size: number): boolean => {
		// Core intentionally measures zero-width content as empty, not as overflow.
		if (width === 0) return false;
		field.size = size;
		field.width = width;
		return (
			(!Number.isFinite(metrics.width) || field.textWidth + outline <= metrics.width) &&
			(!Number.isFinite(metrics.height) || getLabelTextHeight(field) + outline <= metrics.height)
		);
	};
	if (fits(metrics.size)) {
		return { size: metrics.size, overflow: false };
	}
	const minimum = Math.min(metrics.minimum, metrics.size);
	if (!fits(minimum)) {
		return { size: minimum, overflow: true };
	}

	let lower = minimum;
	let upper = metrics.size;
	// Bounded work even for unusual author-supplied font sizes. Keeping the
	// fitting lower bound avoids rounding a result back into overflow.
	for (let attempt = 0; attempt < 16 && upper - lower > 0.1; attempt++) {
		const candidate = (lower + upper) / 2;
		if (fits(candidate)) {
			lower = candidate;
		} else {
			upper = candidate;
		}
	}
	const size = Math.max(minimum, Math.floor(lower * 10) / 10);
	return { size: fits(size) ? size : minimum, overflow: false };
}
