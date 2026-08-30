import { Component } from '@kurot/ui';
import { requireBoolean } from './valueGuards.js';

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
