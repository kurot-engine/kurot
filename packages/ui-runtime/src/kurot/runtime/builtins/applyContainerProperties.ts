import type { DisplayObject } from '@kurot/core';
import { Group } from '@kurot/ui';
import type { UIPropertyValue } from '@kurot/ui-document';
import { createLayout } from '../descriptors/createLayout.js';
import { KurotUIRuntimeError } from '../KurotUIRuntimeError.js';

/**
 * Applies one property owned by a built-in container component.
 */
export function applyContainerProperty(
	target: DisplayObject,
	name: string,
	value: UIPropertyValue,
	path: string,
): boolean {
	if (!(target instanceof Group)) return false;
	switch (name) {
		case 'currentState':
			target.currentState = requireString(value, path);
			return true;
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

function requireString(value: UIPropertyValue, path: string): string {
	if (typeof value === 'string') return value;
	throw invalidValue('string', path);
}

function invalidValue(type: string, path: string): KurotUIRuntimeError {
	return new KurotUIRuntimeError(
		'invalid-property',
		`Runtime property must be ${type}.`,
		path,
	);
}
