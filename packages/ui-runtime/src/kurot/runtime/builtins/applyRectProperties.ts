import { Rect } from '@kurot/ui';
import { requireNumber } from './valueGuards.js';

/**
 * Applies one property declared directly by Rect.
 */
export function applyRectProperty(
	target: Rect,
	name: string,
	value: unknown,
	path: string,
): boolean {
	switch (name) {
		case 'ellipseHeight':
			target.ellipseHeight = requireNumber(value, path);
			return true;
		case 'ellipseWidth':
			target.ellipseWidth = requireNumber(value, path);
			return true;
		case 'fillAlpha':
			target.fillAlpha = requireNumber(value, path);
			return true;
		case 'fillColor':
			target.fillColor = requireNumber(value, path);
			return true;
		case 'strokeAlpha':
			target.strokeAlpha = requireNumber(value, path);
			return true;
		case 'strokeColor':
			target.strokeColor = requireNumber(value, path);
			return true;
		case 'strokeWeight':
			target.strokeWeight = requireNumber(value, path);
			return true;
		default:
			return false;
	}
}
