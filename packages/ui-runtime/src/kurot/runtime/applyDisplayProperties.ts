import { DisplayObject, DisplayObjectContainer } from '@kurot/core';
import type { UIPropertyValue } from '@kurot/ui-document';
import { isUIComponent } from '@kurot/ui';
import { KurotUIRuntimeError } from './KurotUIRuntimeError.js';

/**
 * Applies one inherited display or UI-layout property when recognized.
 */
export function applyDisplayProperty(
	target: DisplayObject,
	name: string,
	value: UIPropertyValue,
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
			return applyUIProperty(target, name, value, path);
	}
}

function applyUIProperty(
	target: DisplayObject,
	name: string,
	value: UIPropertyValue,
	path: string,
): boolean {
	if (!isUIComponent(target)) return false;
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

function requireBoolean(value: UIPropertyValue, path: string): boolean {
	if (typeof value === 'boolean') return value;
	throw invalidValue('boolean', path);
}

function requireConstraint(value: UIPropertyValue, path: string): number | string {
	if (typeof value === 'number' || typeof value === 'string') return value;
	throw invalidValue('number or string', path);
}

function requireNumber(value: UIPropertyValue, path: string): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	throw invalidValue('number', path);
}

function requireString(value: UIPropertyValue, path: string): string {
	if (typeof value === 'string') return value;
	throw invalidValue('string', path);
}

function invalidValue(type: string, path: string): KurotUIRuntimeError {
	return new KurotUIRuntimeError(
		'invalid-property',
		`Runtime property must be ${type}.`,
		path,
	);
}
