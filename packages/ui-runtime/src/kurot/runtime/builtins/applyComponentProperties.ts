import { Component } from '@kurot/ui';
import { KurotUIRuntimeError } from '../KurotUIRuntimeError.js';

/**
 * Applies one property declared directly by Component.
 */
export function applyComponentProperty(
	target: Component,
	name: string,
	value: unknown,
	path: string,
): boolean {
	switch (name) {
		case 'enabled':
			target.enabled = requireBoolean(value, path);
			return true;
		default:
			return false;
	}
}

function requireBoolean(value: unknown, path: string): boolean {
	if (typeof value === 'boolean') return value;
	throw new KurotUIRuntimeError(
		'invalid-property',
		'Runtime property must be boolean.',
		path,
	);
}
