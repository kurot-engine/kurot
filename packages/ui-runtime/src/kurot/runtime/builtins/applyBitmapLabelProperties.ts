import { BitmapFont } from '@kurot/core';
import type { BitmapLabel } from '@kurot/ui';
import { applyTextLayoutProperty } from './applyTextLayoutProperties.js';
import { invalidRuntimeValue, requireBoolean, requireNumber, requireString } from './valueGuards.js';

/**
 * Applies BitmapLabel content and an already resolved font resource.
 * Font descriptors and page textures remain owned by Core or the caller.
 */
export function applyBitmapLabelProperty(target: BitmapLabel, name: string, value: unknown, path: string): boolean {
	if (applyTextLayoutProperty(target, name, value, path)) {
		return true;
	}
	switch (name) {
		case 'font':
			if (typeof value !== 'string' && !(value instanceof BitmapFont)) {
				throw invalidRuntimeValue('a font resource key or BitmapFont', path);
			}
			target.font = value;
			return true;
		case 'text':
			target.text = requireString(value, path);
			return true;
		case 'letterSpacing':
			target.letterSpacing = requireNumber(value, path);
			return true;
		case 'smoothing':
			target.smoothing = requireBoolean(value, path);
			return true;
		default:
			return false;
	}
}
