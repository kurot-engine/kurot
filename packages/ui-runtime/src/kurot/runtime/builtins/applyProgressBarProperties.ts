import { ProgressBar } from '@kurot/ui';
import type { UIPropertyValue } from '@kurot/ui-document';
import { KurotUIRuntimeError } from '../KurotUIRuntimeError.js';

/**
 * Applies one property declared directly by ProgressBar.
 */
export function applyProgressBarProperty(
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
