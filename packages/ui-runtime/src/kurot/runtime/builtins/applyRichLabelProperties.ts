import type { RichLabel } from '@kurot/ui';
import { isUITextFlow } from '@kurot/ui-document';
import { applyTextLayoutProperty } from './applyTextLayoutProperties.js';
import { invalidRuntimeValue, requireBoolean, requireNumber, requireString } from './valueGuards.js';

/**
 * Applies the shared textFlow contract; the native setter owns its run copies.
 */
export function applyRichLabelProperty(target: RichLabel, name: string, value: unknown, path: string): boolean {
	if (applyTextLayoutProperty(target, name, value, path)) {
		return true;
	}
	switch (name) {
		case 'fontFamily':
			target.fontFamily = requireString(value, path);
			return true;
		case 'size':
			target.size = requireNonnegativeNumber(value, path);
			return true;
		case 'bold':
			target.bold = requireBoolean(value, path);
			return true;
		case 'italic':
			target.italic = requireBoolean(value, path);
			return true;
		case 'textColor':
			target.textColor = requireColor(value, path);
			return true;
		case 'stroke':
			target.stroke = requireNonnegativeNumber(value, path);
			return true;
		case 'strokeColor':
			target.strokeColor = requireColor(value, path);
			return true;
		case 'outlineLayout':
			if (value !== 'render-only' && value !== 'reserve-space') {
				throw invalidRuntimeValue('render-only or reserve-space', path);
			}
			requireRichLabelOutlineLayout(target, path);
			target.outlineLayout = value;
			return true;
		case 'textFlow':
			if (!isUITextFlow(value)) {
				throw invalidRuntimeValue('a valid textFlow array', path);
			}
			target.textFlow = value;
			return true;
		case 'wordWrap':
			target.wordWrap = requireBoolean(value, path);
			return true;
		default:
			return false;
	}
}

/**
 * Also checks state-only settings before native SetProperty bypasses the adapter.
 */
export function requireRichLabelOutlineLayout(
	target: RichLabel,
	path: string,
): asserts target is RichLabel & { outlineLayout: 'render-only' | 'reserve-space' } {
	if (!('outlineLayout' in target)) {
		throw invalidRuntimeValue('an outlineLayout-capable RichLabel (@kurot/ui >= 5.3.0)', path);
	}
}

function requireNonnegativeNumber(value: unknown, path: string): number {
	const number = requireNumber(value, path);
	if (number < 0) {
		throw invalidRuntimeValue('a nonnegative number', path);
	}
	return number;
}

function requireColor(value: unknown, path: string): number {
	const number = requireNumber(value, path);
	if (!Number.isInteger(number) || number < 0 || number > 0xffffff) {
		throw invalidRuntimeValue('an RGB integer', path);
	}
	return number;
}
