import { Texture } from '@kurot/core';
import { Image } from '@kurot/ui';
import { createRectangle } from '../descriptors/createRectangle.js';
import { KurotUIRuntimeError } from '../KurotUIRuntimeError.js';

/**
 * Applies one property declared directly by Image.
 */
export function applyImageProperty(
	target: Image,
	name: string,
	value: unknown,
	path: string,
): boolean {
	switch (name) {
		case 'fillMode':
			target.fillMode = requireFillMode(value, path);
			return true;
		case 'scale9Grid':
			target.scale9Grid = createRectangle(value, path);
			return true;
		case 'smoothing':
			target.smoothing = requireBoolean(value, path);
			return true;
		case 'source':
			target.source = requireImageSource(value, path);
			return true;
		default:
			return false;
	}
}

function requireBoolean(value: unknown, path: string): boolean {
	if (typeof value === 'boolean') return value;
	throw invalidValue('boolean', path);
}

function requireImageSource(value: unknown, path: string): string | Texture {
	if (typeof value === 'string' || value instanceof Texture) {
		return value;
	}
	throw invalidValue('a string or Texture', path);
}

function requireFillMode(value: unknown, path: string): 'clip' | 'repeat' | 'scale' {
	if (value === 'clip' || value === 'repeat' || value === 'scale') return value;
	throw invalidValue('clip, repeat, or scale', path);
}

function invalidValue(type: string, path: string): KurotUIRuntimeError {
	return new KurotUIRuntimeError(
		'invalid-property',
		`Runtime property must be ${type}.`,
		path,
	);
}
