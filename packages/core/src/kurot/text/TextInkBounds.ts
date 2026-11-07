import type { ILineElement } from './types/ITextElement.js';

interface LineInkBounds {
	left: number;
	right: number;
	italicMargin: number;
}

// Rendering observations share the line-cache lifetime, outside public layout metrics.
const bounds = new WeakMap<ILineElement, LineInkBounds>();

export function setLineInkBounds(line: ILineElement, value: LineInkBounds): void {
	bounds.set(line, value);
}

export function getLineInkBounds(line: ILineElement): LineInkBounds | undefined {
	return bounds.get(line);
}
