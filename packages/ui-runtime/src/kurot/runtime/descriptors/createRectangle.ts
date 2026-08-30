import { Rectangle } from '@kurot/core';
import type { UIPropertyObject, UIPropertyValue } from '@kurot/ui-document';
import { KurotUIRuntimeError } from '../KurotUIRuntimeError.js';

/**
 * Converts a canonical rectangle object into a Kurot Rectangle instance.
 */
export function createRectangle(value: UIPropertyValue, path: string): Rectangle {
	const descriptor = requireObject(value, path);
	const allowed = new Set(['height', 'width', 'x', 'y']);
	for (const key of Object.keys(descriptor)) {
		if (!allowed.has(key)) {
			throw new KurotUIRuntimeError(
				'invalid-rectangle',
				`Rectangle property "${key}" is not supported.`,
				`${path}.${key}`,
			);
		}
	}
	return new Rectangle(
		requireNumber(descriptor.x, `${path}.x`),
		requireNumber(descriptor.y, `${path}.y`),
		requireNonNegativeNumber(descriptor.width, `${path}.width`),
		requireNonNegativeNumber(descriptor.height, `${path}.height`),
	);
}

function requireObject(value: UIPropertyValue, path: string): UIPropertyObject {
	if (isPropertyObject(value)) return value;
	throw new KurotUIRuntimeError('invalid-rectangle', 'Rectangle must be an object.', path);
}

function isPropertyObject(value: UIPropertyValue): value is UIPropertyObject {
	return typeof value === 'object' && !Array.isArray(value);
}

function requireNumber(value: UIPropertyValue | undefined, path: string): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	throw new KurotUIRuntimeError('invalid-rectangle', 'Rectangle field must be a number.', path);
}

function requireNonNegativeNumber(
	value: UIPropertyValue | undefined,
	path: string,
): number {
	const number = requireNumber(value, path);
	if (number >= 0) return number;
	throw new KurotUIRuntimeError(
		'invalid-rectangle',
		'Rectangle size must not be negative.',
		path,
	);
}
