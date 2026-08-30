import type { DisplayObject } from '@kurot/core';
import type { UIPropertyValue } from '@kurot/ui-document';
import { Button, Component, Group, Image, Label, Rect } from '@kurot/ui';
import { KurotUIRuntimeError } from './KurotUIRuntimeError.js';
import { createLayout } from './createLayout.js';
import { createRectangle } from './createRectangle.js';

/**
 * Applies one property declared directly by a built-in Kurot UI component.
 */
export function applyComponentProperty(
	target: DisplayObject,
	name: string,
	value: UIPropertyValue,
	path: string,
): boolean {
	if (target instanceof Component && applySkinnableProperty(target, name, value, path)) {
		return true;
	}
	if (target instanceof Group && applyGroupProperty(target, name, value, path)) {
		return true;
	}
	if (target instanceof Label && applyLabelProperty(target, name, value, path)) {
		return true;
	}
	if (target instanceof Image && applyImageProperty(target, name, value, path)) {
		return true;
	}
	if (target instanceof Rect && applyRectProperty(target, name, value, path)) {
		return true;
	}
	return target instanceof Button && applyButtonProperty(target, name, value, path);
}

function applySkinnableProperty(
	target: Component,
	name: string,
	value: UIPropertyValue,
	path: string,
): boolean {
	switch (name) {
		case 'currentState':
			target.currentState = requireString(value, path);
			return true;
		case 'enabled':
			target.enabled = requireBoolean(value, path);
			return true;
		case 'hostComponentKey':
			target.hostComponentKey = requireString(value, path);
			return true;
		case 'skinName':
			target.skinName = requireString(value, path);
			return true;
		default:
			return false;
	}
}

function applyGroupProperty(
	target: Group,
	name: string,
	value: UIPropertyValue,
	path: string,
): boolean {
	switch (name) {
		case 'currentState':
			target.currentState = requireString(value, path);
			return true;
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

function applyLabelProperty(
	target: Label,
	name: string,
	value: UIPropertyValue,
	path: string,
): boolean {
	switch (name) {
		case 'bold':
			target.bold = requireBoolean(value, path);
			return true;
		case 'displayAsPassword':
			target.displayAsPassword = requireBoolean(value, path);
			return true;
		case 'fontFamily':
			target.fontFamily = requireString(value, path);
			return true;
		case 'italic':
			target.italic = requireBoolean(value, path);
			return true;
		case 'lineSpacing':
			target.lineSpacing = requireNumber(value, path);
			return true;
		case 'maxChars':
			target.maxChars = requireNumber(value, path);
			return true;
		case 'multiline':
			target.multiline = requireBoolean(value, path);
			return true;
		case 'size':
			target.size = requireNumber(value, path);
			return true;
		case 'stroke':
			target.stroke = requireNumber(value, path);
			return true;
		case 'strokeColor':
			target.strokeColor = requireNumber(value, path);
			return true;
		case 'text':
			target.text = requireString(value, path);
			return true;
		case 'textAlign':
			target.textAlign = requireString(value, path);
			return true;
		case 'textColor':
			target.textColor = requireNumber(value, path);
			return true;
		case 'verticalAlign':
			target.verticalAlign = requireString(value, path);
			return true;
		case 'wordWrap':
			target.wordWrap = requireBoolean(value, path);
			return true;
		default:
			return false;
	}
}

function applyImageProperty(
	target: Image,
	name: string,
	value: UIPropertyValue,
	path: string,
): boolean {
	switch (name) {
		case 'fillMode':
			target.fillMode = requireFillMode(value, path);
			return true;
		case 'scale9Grid':
			target.scale9Grid = createRectangle(value, path);
			return true;
		case 'smoothing':
			target.smoothing = requireBoolean(value, path);
			return true;
		case 'source':
			target.source = requireString(value, path);
			return true;
		default:
			return false;
	}
}

function applyRectProperty(
	target: Rect,
	name: string,
	value: UIPropertyValue,
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

function applyButtonProperty(
	target: Button,
	name: string,
	value: UIPropertyValue,
	path: string,
): boolean {
	switch (name) {
		case 'icon':
			target.icon = requireString(value, path);
			return true;
		case 'label':
			target.label = requireString(value, path);
			return true;
		case 'selected':
			target.selected = requireBoolean(value, path);
			return true;
		case 'toggle':
			target.toggle = requireBoolean(value, path);
			return true;
		default:
			return false;
	}
}

function requireBoolean(value: UIPropertyValue, path: string): boolean {
	if (typeof value === 'boolean') return value;
	throw invalidValue('boolean', path);
}

function requireNumber(value: UIPropertyValue, path: string): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	throw invalidValue('number', path);
}

function requireString(value: UIPropertyValue, path: string): string {
	if (typeof value === 'string') return value;
	throw invalidValue('string', path);
}

function requireFillMode(value: UIPropertyValue, path: string): 'clip' | 'repeat' | 'scale' {
	if (value === 'clip' || value === 'repeat' || value === 'scale') return value;
	throw invalidValue('clip, repeat, or scale', path);
}

function invalidValue(type: string, path: string): KurotUIRuntimeError {
	return new KurotUIRuntimeError(
		'invalid-property',
		`Runtime property must be ${type}.`,
		path,
	);
}
