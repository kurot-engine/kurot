import { isPlainRecord } from '../validation/validationHelpers.js';

/**
 * Literal per-run appearance supported by the RichLabel authoring contract.
 * Omitted fields inherit native TextField defaults, independently of Label presets.
 */
export type UITextRunStyle = {
	readonly bold?: boolean;
	readonly fontFamily?: string;
	readonly italic?: boolean;
	readonly size?: number;
	readonly stroke?: number;
	readonly strokeColor?: number;
	readonly textColor?: number;
};

/**
 * One literal text segment in a continuous rich-text layout.
 */
export type UITextRun = {
	readonly text: string;
	readonly style?: UITextRunStyle;
};

/**
 * Ordered rich-text segments. An empty array explicitly clears the content.
 */
export type UITextFlow = readonly UITextRun[];

/**
 * Checks the complete authoring shape without importing Core or UI.
 * Links, HTML, whole-component presets and arbitrary nested values are excluded.
 */
export function isUITextFlow(value: unknown): value is UITextFlow {
	if (!Array.isArray(value)) return false;
	for (const run of value) {
		if (!isTextRun(run)) return false;
	}
	return true;
}

function isTextRun(value: unknown): value is UITextRun {
	if (!isPlainRecord(value) || typeof value.text !== 'string') return false;
	if (Object.keys(value).some(key => key !== 'text' && key !== 'style')) return false;
	if (!Object.hasOwn(value, 'style')) return true;
	if (!isPlainRecord(value.style)) return false;
	return Object.entries(value.style).every(([key, field]) => matchesStyleField(key, field));
}

function matchesStyleField(key: string, value: unknown): boolean {
	switch (key) {
		case 'bold':
		case 'italic':
			return typeof value === 'boolean';
		case 'fontFamily':
			return typeof value === 'string';
		case 'size':
		case 'stroke':
			return typeof value === 'number' && Number.isFinite(value) && value >= 0;
		case 'strokeColor':
		case 'textColor':
			return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xffffff;
		default:
			return false;
	}
}
