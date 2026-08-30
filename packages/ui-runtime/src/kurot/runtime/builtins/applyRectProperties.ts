import { Rect } from '@kurot/ui';
import type { UIPropertyValue } from '@kurot/ui-document';
import { KurotUIRuntimeError } from '../KurotUIRuntimeError.js';

/**
 * Applies one property declared directly by Rect.
 */
export function applyRectProperty(
	target: Rect,
	name: string,
	value: UIPropertyValue,
	path: string,
): boolean {
	switch (name) {
		case 'ellipseHeight':
			target.ellipseHeight = requireNumber(value, path);
			return true;
		case 'ellipseWidth':
			target.ellipseWidth = requireNumber(value, path);
			return true;
		case 'fillAlpha':
			target.fillAlpha = requireNumber(value, path);
			return true;
		case 'fillColor':
			target.fillColor = requireNumber(value, path);
			return true;
		case 'strokeAlpha':
			target.strokeAlpha = requireNumber(value, path);
			return true;
		case 'strokeColor':
			target.strokeColor = requireNumber(value, path);
			return true;
		case 'strokeWeight':
			target.strokeWeight = requireNumber(value, path);
			return true;
		default:
			return false;
	}
}

function requireNumber(value: UIPropertyValue, path: string): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	throw invalidValue('number', path);
}

function invalidValue(type: string, path: string): KurotUIRuntimeError {
	return new KurotUIRuntimeError(
		'invalid-property',
		`Runtime property must be ${type}.`,
		path,
	);
}
