import type { DisplayObject } from '@kurot/core';
import { Button } from '@kurot/ui';
import type { UIPropertyValue } from '@kurot/ui-document';
import { KurotUIRuntimeError } from '../KurotUIRuntimeError.js';

/**
 * Applies one property owned by a built-in interactive control.
 */
export function applyControlProperty(
	target: DisplayObject,
	name: string,
	value: UIPropertyValue,
	path: string,
): boolean {
	if (!(target instanceof Button)) return false;
	switch (name) {
		case 'icon':
			target.icon = requireString(value, path);
			return true;
		case 'label':
			target.label = requireString(value, path);
			return true;
		case 'selected':
			target.selected = requireBoolean(value, path);
			return true;
		case 'toggle':
			target.toggle = requireBoolean(value, path);
			return true;
		default:
			return false;
	}
}

function requireBoolean(value: UIPropertyValue, path: string): boolean {
	if (typeof value === 'boolean') return value;
	throw invalidValue('boolean', path);
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
