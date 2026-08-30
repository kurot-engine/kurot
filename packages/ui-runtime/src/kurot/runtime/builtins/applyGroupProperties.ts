import { Group } from '@kurot/ui';
import type { UIPropertyValue } from '@kurot/ui-document';
import { createLayout } from '../descriptors/createLayout.js';
import { KurotUIRuntimeError } from '../KurotUIRuntimeError.js';

/**
 * Applies one property declared directly by Group.
 */
export function applyGroupProperty(
	target: Group,
	name: string,
	value: UIPropertyValue,
	path: string,
): boolean {
	switch (name) {
		case 'layout':
			target.layout = createLayout(value, path);
			return true;
		case 'scrollEnabled':
			target.scrollEnabled = requireBoolean(value, path);
			return true;
		case 'scrollH':
			target.scrollH = requireNumber(value, path);
			return true;
		case 'scrollV':
			target.scrollV = requireNumber(value, path);
			return true;
		case 'touchThrough':
			target.touchThrough = requireBoolean(value, path);
			return true;
		default:
			return false;
	}
}

function requireBoolean(value: UIPropertyValue, path: string): boolean {
	if (typeof value === 'boolean') return value;
	throw invalidValue('boolean', path);
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
