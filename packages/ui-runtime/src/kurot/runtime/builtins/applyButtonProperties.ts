import { Texture } from '@kurot/core';
import { Button } from '@kurot/ui';
import { KurotUIRuntimeError } from '../KurotUIRuntimeError.js';

/**
 * Applies one property declared by Button and inherited by its subclasses.
 */
export function applyButtonProperty(
	target: Button,
	name: string,
	value: unknown,
	path: string,
): boolean {
	switch (name) {
		case 'icon':
			target.icon = requireImageSource(value, path);
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

function requireBoolean(value: unknown, path: string): boolean {
	if (typeof value === 'boolean') return value;
	throw invalidValue('boolean', path);
}

function requireString(value: unknown, path: string): string {
	if (typeof value === 'string') return value;
	throw invalidValue('string', path);
}

function requireImageSource(value: unknown, path: string): string | Texture {
	if (typeof value === 'string' || value instanceof Texture) {
		return value;
	}
	throw invalidValue('a string or Texture', path);
}

function invalidValue(type: string, path: string): KurotUIRuntimeError {
	return new KurotUIRuntimeError(
		'invalid-property',
		`Runtime property must be ${type}.`,
		path,
	);
}
