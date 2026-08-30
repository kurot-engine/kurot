import type { DisplayObject } from '@kurot/core';
import { Button, ProgressBar } from '@kurot/ui';
import type { UIPropertyValue } from '@kurot/ui-document';
import { KurotUIRuntimeError } from '../KurotUIRuntimeError.js';

/**
 * Applies one property owned by a built-in interactive control.
 */
export function applyControlProperty(
	target: DisplayObject,
	name: string,
	value: UIPropertyValue,
	path: string,
): boolean {
	if (target instanceof Button && applyButtonProperty(target, name, value, path)) {
		return true;
	}
	if (
		target instanceof ProgressBar &&
		applyProgressBarProperty(target, name, value, path)
	) {
		return true;
	}
	return false;
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

function applyProgressBarProperty(
	target: ProgressBar,
	name: string,
	value: UIPropertyValue,
	path: string,
): boolean {
	switch (name) {
		case 'direction':
			target.direction = requireDirection(value, path);
			return true;
		case 'maximum':
			target.maximum = requireNumber(value, path);
			return true;
		case 'minimum':
			target.minimum = requireNumber(value, path);
			return true;
		case 'slideDuration':
			target.slideDuration = requireNumber(value, path);
			return true;
		case 'value':
			target.value = requireNumber(value, path);
			return true;
		default:
			return false;
	}
}

function requireBoolean(value: UIPropertyValue, path: string): boolean {
	if (typeof value === 'boolean') return value;
	throw invalidValue('boolean', path);
}

function requireString(value: UIPropertyValue, path: string): string {
	if (typeof value === 'string') return value;
	throw invalidValue('string', path);
}

function requireDirection(
	value: UIPropertyValue,
	path: string,
): 'btt' | 'ltr' | 'rtl' | 'ttb' {
	if (value === 'btt' || value === 'ltr' || value === 'rtl' || value === 'ttb') {
		return value;
	}
	throw invalidValue('btt, ltr, rtl, or ttb', path);
}

function requireNumber(value: UIPropertyValue, path: string): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	throw invalidValue('number', path);
}

function invalidValue(type: string, path: string): KurotUIRuntimeError {
	return new KurotUIRuntimeError(
		'invalid-property',
		`Runtime property must be ${type}.`,
		path,
	);
}
