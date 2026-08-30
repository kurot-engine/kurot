import type { DisplayObject } from '@kurot/core';
import { requireBoolean, requireNumber, requireString } from './valueGuards.js';

/**
 * Applies one property declared by kurot.DisplayObject.
 */
export function applyDisplayObjectProperty(
	target: DisplayObject,
	name: string,
	value: unknown,
	path: string,
): boolean {
	switch (name) {
		case 'alpha':
			target.alpha = requireNumber(value, path);
			return true;
		case 'anchorOffsetX':
			target.anchorOffsetX = requireNumber(value, path);
			return true;
		case 'anchorOffsetY':
			target.anchorOffsetY = requireNumber(value, path);
			return true;
		case 'blendMode':
			target.blendMode = requireString(value, path);
			return true;
		case 'cacheAsBitmap':
			target.cacheAsBitmap = requireBoolean(value, path);
			return true;
		case 'height':
			target.height = requireNumber(value, path);
			return true;
		case 'name':
			target.name = requireString(value, path);
			return true;
		case 'rotation':
			target.rotation = requireNumber(value, path);
			return true;
		case 'scaleX':
			target.scaleX = requireNumber(value, path);
			return true;
		case 'scaleY':
			target.scaleY = requireNumber(value, path);
			return true;
		case 'skewX':
			target.skewX = requireNumber(value, path);
			return true;
		case 'skewY':
			target.skewY = requireNumber(value, path);
			return true;
		case 'sortableChildren':
			target.sortableChildren = requireBoolean(value, path);
			return true;
		case 'tint':
			target.tint = requireNumber(value, path);
			return true;
		case 'touchEnabled':
			target.touchEnabled = requireBoolean(value, path);
			return true;
		case 'visible':
			target.visible = requireBoolean(value, path);
			return true;
		case 'width':
			target.width = requireNumber(value, path);
			return true;
		case 'x':
			target.x = requireNumber(value, path);
			return true;
		case 'y':
			target.y = requireNumber(value, path);
			return true;
		case 'zIndex':
			target.zIndex = requireNumber(value, path);
			return true;
		default:
			return false;
	}
}
