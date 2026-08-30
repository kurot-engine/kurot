import { Texture } from '@kurot/core';
import { Button } from '@kurot/ui';
import { requireBoolean, requireString, invalidRuntimeValue } from './valueGuards.js';

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

function requireImageSource(value: unknown, path: string): string | Texture {
	if (typeof value === 'string' || value instanceof Texture) {
		return value;
	}
	throw invalidRuntimeValue('a string or Texture', path);
}
