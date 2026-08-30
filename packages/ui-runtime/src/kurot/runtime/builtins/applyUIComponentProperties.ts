import { DisplayObject, DisplayObjectContainer } from '@kurot/core';
import type { IUIComponent } from '@kurot/ui';
import { KurotUIRuntimeError } from '../KurotUIRuntimeError.js';
import { requireBoolean, requireNumber, invalidRuntimeValue } from './valueGuards.js';

type RuntimeUIComponent = DisplayObject & IUIComponent;

/**
 * Applies one property declared by kui.UIComponent.
 */
export function applyUIComponentProperty(
	target: RuntimeUIComponent,
	name: string,
	value: unknown,
	path: string,
): boolean {
	switch (name) {
		case 'bottom':
			target.bottom = requireConstraint(value, path);
			return true;
		case 'horizontalCenter':
			target.horizontalCenter = requireConstraint(value, path);
			return true;
		case 'includeInLayout':
			target.includeInLayout = requireBoolean(value, path);
			return true;
		case 'isRenderGroup':
			requireContainer(target, path).isRenderGroup = requireBoolean(value, path);
			return true;
		case 'left':
			target.left = requireConstraint(value, path);
			return true;
		case 'maxHeight':
			target.maxHeight = requireNumber(value, path);
			return true;
		case 'maxWidth':
			target.maxWidth = requireNumber(value, path);
			return true;
		case 'minHeight':
			target.minHeight = requireNumber(value, path);
			return true;
		case 'minWidth':
			target.minWidth = requireNumber(value, path);
			return true;
		case 'percentHeight':
			target.percentHeight = requireNumber(value, path);
			return true;
		case 'percentWidth':
			target.percentWidth = requireNumber(value, path);
			return true;
		case 'right':
			target.right = requireConstraint(value, path);
			return true;
		case 'top':
			target.top = requireConstraint(value, path);
			return true;
		case 'touchChildren':
			requireContainer(target, path).touchChildren = requireBoolean(value, path);
			return true;
		case 'verticalCenter':
			target.verticalCenter = requireConstraint(value, path);
			return true;
		default:
			return false;
	}
}

function requireContainer(target: DisplayObject, path: string): DisplayObjectContainer {
	if (target instanceof DisplayObjectContainer) return target;
	throw new KurotUIRuntimeError(
		'invalid-property',
		'Property requires a display-object container.',
		path,
	);
}

function requireConstraint(value: unknown, path: string): number | string {
	if (typeof value === 'number' || typeof value === 'string') return value;
	throw invalidRuntimeValue('number or string', path);
}
