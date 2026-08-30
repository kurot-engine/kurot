import type { DisplayObject } from '@kurot/core';
import type { UIPropertyValue } from '@kurot/ui-document';
import { Component, Image, Rect } from '@kurot/ui';
import { createRectangle } from '../descriptors/createRectangle.js';
import { KurotUIRuntimeError } from '../KurotUIRuntimeError.js';
import { applyContainerProperty } from './applyContainerProperties.js';
import { applyControlProperty } from './applyControlProperties.js';
import { applyTextProperty } from './applyTextProperties.js';

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
	if (applyContainerProperty(target, name, value, path)) {
		return true;
	}
	if (applyTextProperty(target, name, value, path)) {
		return true;
	}
	if (target instanceof Image && applyImageProperty(target, name, value, path)) {
		return true;
	}
	if (target instanceof Rect && applyRectProperty(target, name, value, path)) {
		return true;
	}
	return applyControlProperty(target, name, value, path);
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
