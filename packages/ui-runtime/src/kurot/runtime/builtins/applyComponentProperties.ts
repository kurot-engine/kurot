import { Component } from '@kurot/ui';
import type { UIPropertyValue } from '@kurot/ui-document';
import { KurotUIRuntimeError } from '../KurotUIRuntimeError.js';

/**
 * Applies one property declared directly by Component.
 */
export function applyComponentProperty(
	target: Component,
	name: string,
	value: UIPropertyValue,
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

function requireBoolean(value: UIPropertyValue, path: string): boolean {
	if (typeof value === 'boolean') return value;
	throw new KurotUIRuntimeError(
		'invalid-property',
		'Runtime property must be boolean.',
		path,
	);
}
