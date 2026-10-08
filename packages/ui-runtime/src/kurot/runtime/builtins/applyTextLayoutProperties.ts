import type { BitmapLabel, RichLabel } from '@kurot/ui';
import { invalidRuntimeValue, requireBoolean, requireNumber, requireString } from './valueGuards.js';

/**
 * Applies layout shared by native bitmap and rich text, without Label typography.
 */
export function applyTextLayoutProperty(
	target: BitmapLabel | RichLabel,
	name: string,
	value: unknown,
	path: string,
): boolean {
	switch (name) {
		case 'multiline':
			target.multiline = requireBoolean(value, path);
			return true;
		case 'lineSpacing': {
			const spacing = requireNumber(value, path);
			if (spacing < 0) {
				throw invalidRuntimeValue('a nonnegative number', path);
			}
			target.lineSpacing = spacing;
			return true;
		}
		case 'textAlign': {
			const alignment = requireString(value, path);
			if (alignment !== 'left' && alignment !== 'center' && alignment !== 'right') {
				throw invalidRuntimeValue('left, center or right', path);
			}
			target.textAlign = alignment;
			return true;
		}
		case 'verticalAlign': {
			const alignment = requireString(value, path);
			if (alignment !== 'top' && alignment !== 'middle' && alignment !== 'bottom') {
				throw invalidRuntimeValue('top, middle or bottom', path);
			}
			target.verticalAlign = alignment;
			return true;
		}
		default:
			return false;
	}
}
