import type { Matrix } from '@kurot/core';

export const TRANSFORM_EPSILON = 1e-9;

interface Size {
	w: number;
	h: number;
}

interface Limits {
	minW: number;
	minH: number;
	maxW: number;
	maxH: number;
}

/**
 * Fits local dimensions to parent-space bounds. Translation and anchors affect position only.
 * Feasible two-axis allocations fill both axes; incompatible allocations fit the largest
 * rectangle inside them. Local minimum dimensions take precedence when no fit is possible.
 */
export function fitTransformedBounds(
	layoutW: number,
	layoutH: number,
	matrix: Matrix,
	explicitW: number,
	explicitH: number,
	preferredW: number,
	preferredH: number,
	minW: number,
	minH: number,
	maxW: number,
	maxH: number,
): Size {
	const limits = { minW, minH, maxW, maxH };
	const preferred = { w: clamp(preferredW, minW, maxW), h: clamp(preferredH, minH, maxH) };
	const a = coefficient(matrix.a);
	const b = coefficient(matrix.b);
	const c = coefficient(matrix.c);
	const d = coefficient(matrix.d);

	if (isNaN(layoutW) && isNaN(layoutH)) return preferred;
	if (isNaN(layoutH)) {
		return fitOneAxis(layoutW, a, c, b, d, explicitW, explicitH, preferred, limits);
	}
	if (isNaN(layoutW)) {
		return fitOneAxis(layoutH, b, d, a, c, explicitW, explicitH, preferred, limits);
	}
	return fitBothAxes(layoutW, layoutH, a, b, c, d, preferred, limits);
}

function fitBothAxes(
	width: number,
	height: number,
	a: number,
	b: number,
	c: number,
	d: number,
	preferred: Size,
	limits: Limits,
): Size {
	const { minW, minH, maxW, maxH } = limits;
	if (a * minW + c * minH > width + TRANSFORM_EPSILON || b * minW + d * minH > height + TRANSFORM_EPSILON) {
		return { w: minW, h: minH };
	}
	if (a === 0 && b === 0 && c === 0 && d === 0) return preferred;
	if (a === 0 && b === 0) {
		return { w: preferred.w, h: clamp(Math.min(c > 0 ? width / c : maxH, d > 0 ? height / d : maxH), minH, maxH) };
	}
	if (c === 0 && d === 0) {
		return { w: clamp(Math.min(a > 0 ? width / a : maxW, b > 0 ? height / b : maxW), minW, maxW), h: preferred.h };
	}

	const det = a * d - b * c;
	if (Math.abs(det) > TRANSFORM_EPSILON) {
		const exact = { w: (width * d - height * c) / det, h: (height * a - width * b) / det };
		if (withinLimits(exact, limits)) {
			return { w: clamp(exact.w, minW, maxW), h: clamp(exact.h, minH, maxH) };
		}
	}

	let best: Size = { w: minW, h: minH };
	const consider = (size: Size | undefined): void => {
		if (!size || !withinLimits(size, limits)) return;
		if (a * size.w + c * size.h > width + TRANSFORM_EPSILON || b * size.w + d * size.h > height + TRANSFORM_EPSILON)
			return;
		if (size.w * size.h > best.w * best.h) {
			best = size;
		}
	};
	const availableW = Math.min(maxW, a > 0 ? width / a : maxW, b > 0 ? height / b : maxW);
	const availableH = Math.min(maxH, c > 0 ? width / c : maxH, d > 0 ? height / d : maxH);
	consider({ w: availableW, h: minH });
	consider({ w: minW, h: availableH });
	consider({ w: availableW, h: availableH });
	consider(fitBoundary(width, a, c, height, b, d, limits));
	consider(fitBoundary(height, b, d, width, a, c, limits));
	return best;
}

function fitOneAxis(
	target: number,
	u: number,
	v: number,
	otherU: number,
	otherV: number,
	explicitW: number,
	explicitH: number,
	preferred: Size,
	limits: Limits,
): Size {
	if (u === 0 && v === 0) return preferred;
	if (u === 0) return { w: preferred.w, h: clamp(target / v, limits.minH, limits.maxH) };
	if (v === 0) return { w: clamp(target / u, limits.minW, limits.maxW), h: preferred.h };

	const keepWidth = { w: preferred.w, h: (target - u * preferred.w) / v };
	const keepHeight = { w: (target - v * preferred.h) / u, h: preferred.h };
	const widthFits = withinLimits(keepWidth, limits);
	const heightFits = withinLimits(keepHeight, limits);
	if (!isNaN(explicitW) && isNaN(explicitH) && widthFits) return keepWidth;
	if (isNaN(explicitW) && !isNaN(explicitH) && heightFits) return keepHeight;
	if (widthFits && heightFits) {
		return otherU * keepWidth.w + otherV * keepWidth.h <= otherU * keepHeight.w + otherV * keepHeight.h
			? keepWidth
			: keepHeight;
	}
	if (widthFits) return keepWidth;
	if (heightFits) return keepHeight;

	const range = boundaryRange(target, u, v, Infinity, 0, 0, limits);
	if (!range) return { w: limits.minW, h: limits.minH };
	const slope = otherU - (otherV * u) / v;
	const w =
		Math.abs(slope) <= TRANSFORM_EPSILON
			? clamp(target / (u + v), range.min, range.max)
			: slope > 0
				? range.min
				: range.max;
	return { w, h: (target - u * w) / v };
}

function fitBoundary(
	target: number,
	u: number,
	v: number,
	otherTarget: number,
	otherU: number,
	otherV: number,
	limits: Limits,
): Size | undefined {
	if (u === 0 && v === 0) return undefined;
	if (u === 0) {
		const h = target / v;
		const w = Math.min(limits.maxW, otherU > 0 ? (otherTarget - otherV * h) / otherU : limits.maxW);
		return { w, h };
	}
	if (v === 0) {
		const w = target / u;
		const h = Math.min(limits.maxH, otherV > 0 ? (otherTarget - otherU * w) / otherV : limits.maxH);
		return { w, h };
	}
	const range = boundaryRange(target, u, v, otherTarget, otherU, otherV, limits);
	if (!range) return undefined;
	const w = clamp(target / (2 * u), range.min, range.max);
	return { w, h: (target - u * w) / v };
}

function boundaryRange(
	target: number,
	u: number,
	v: number,
	otherTarget: number,
	otherU: number,
	otherV: number,
	limits: Limits,
): { min: number; max: number } | undefined {
	let min = Math.max(limits.minW, (target - v * limits.maxH) / u);
	let max = Math.min(limits.maxW, (target - v * limits.minH) / u);
	const slope = otherU - (otherV * u) / v;
	const available = otherTarget - (otherV * target) / v;
	if (slope > TRANSFORM_EPSILON) {
		max = Math.min(max, available / slope);
	} else if (slope < -TRANSFORM_EPSILON) {
		min = Math.max(min, available / slope);
	} else if (available < -TRANSFORM_EPSILON) {
		return undefined;
	}
	if (min > max) return undefined;
	return { min, max };
}

function withinLimits(size: Size, limits: Limits): boolean {
	return (
		Number.isFinite(size.w) &&
		Number.isFinite(size.h) &&
		size.w >= limits.minW - TRANSFORM_EPSILON &&
		size.h >= limits.minH - TRANSFORM_EPSILON &&
		size.w <= limits.maxW + TRANSFORM_EPSILON &&
		size.h <= limits.maxH + TRANSFORM_EPSILON
	);
}

function coefficient(value: number): number {
	return Math.abs(value) < TRANSFORM_EPSILON ? 0 : Math.abs(value);
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}
