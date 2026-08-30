import { Group } from '@kurot/ui';
import { createLayout } from '../descriptors/createLayout.js';
import { requireBoolean, requireNumber } from './valueGuards.js';

/**
 * Applies one property declared directly by Group.
 */
export function applyGroupProperty(
	target: Group,
	name: string,
	value: unknown,
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
