import { TextInput } from '@kurot/ui';
import { requireBoolean, requireNumber, requireString, invalidRuntimeValue } from './valueGuards.js';

/**
 * Applies one property declared directly by TextInput.
 */
export function applyTextInputProperty(
	target: TextInput,
	name: string,
	value: unknown,
	path: string,
): boolean {
	switch (name) {
		case 'displayAsPassword':
			target.displayAsPassword = requireBoolean(value, path);
			return true;
		case 'inputType':
			target.inputType = requireInputType(value, path);
			return true;
		case 'maxChars':
			target.maxChars = requireNumber(value, path);
			return true;
		case 'prompt':
			target.prompt = requireString(value, path);
			return true;
		case 'restrict':
			target.restrict = requireString(value, path);
			return true;
		case 'text':
			target.text = requireString(value, path);
			return true;
		case 'textColor':
			target.textColor = requireNumber(value, path);
			return true;
		default:
			return false;
	}
}

function requireInputType(value: unknown, path: string): 'text' {
	if (value === 'text') return value;
	throw invalidRuntimeValue('text', path);
}
