import { ProgressBar } from '@kurot/ui';
import { requireNumber, invalidRuntimeValue } from './valueGuards.js';

/**
 * Applies one property declared directly by ProgressBar.
 */
export function applyProgressBarProperty(
	target: ProgressBar,
	name: string,
	value: unknown,
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
	value: unknown,
	path: string,
): 'btt' | 'ltr' | 'rtl' | 'ttb' {
	if (value === 'btt' || value === 'ltr' || value === 'rtl' || value === 'ttb') {
		return value;
	}
	throw invalidRuntimeValue('btt, ltr, rtl, or ttb', path);
}
