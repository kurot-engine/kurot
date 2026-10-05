import { measureText } from '@kurot/core';

interface LabelTextMetrics {
	text: string;
	fontFamily: string;
	size: number;
	minimum: number;
	bold: boolean;
	italic: boolean;
	stroke: number;
	width: number;
	height: number;
}

interface LabelTextFit {
	size: number;
	overflow: boolean;
}

/**
 * Fits one plain-text line within externally constrained logical bounds.
 * A finite zero bound is meaningful; NaN represents an unconstrained axis.
 * Never changes authored size or text, and always measures from the base size.
 */
export function fitLabelText(metrics: LabelTextMetrics): LabelTextFit {
	const fits = (size: number): boolean => {
		const width = measureText(metrics.text, metrics.fontFamily, size, metrics.bold, metrics.italic);
		const outline = metrics.stroke * 2;
		return (
			(!Number.isFinite(metrics.width) || width + outline <= metrics.width) &&
			(!Number.isFinite(metrics.height) || size + outline <= metrics.height)
		);
	};
	if (!metrics.text || fits(metrics.size)) {
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
	return { size: Math.max(minimum, Math.floor(lower * 10) / 10), overflow: false };
}
