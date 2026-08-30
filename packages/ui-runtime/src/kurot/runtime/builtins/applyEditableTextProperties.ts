import { EditableText } from '@kurot/ui';
import { requireNumber, requireString, invalidRuntimeValue } from './valueGuards.js';

/**
 * Applies one property declared directly by EditableText.
 */
export function applyEditableTextProperty(
	target: EditableText,
	name: string,
	value: unknown,
	path: string,
): boolean {
	switch (name) {
		case 'inputType':
			target.inputType = requireInputType(value, path);
			return true;
		case 'prompt':
			target.prompt = requireString(value, path);
			return true;
		case 'promptColor':
			target.promptColor = requireNumber(value, path);
			return true;
		case 'restrict':
			target.restrict = requireString(value, path);
			return true;
		default:
			return false;
	}
}

function requireInputType(value: unknown, path: string): 'text' {
	if (value === 'text') return value;
	throw invalidRuntimeValue('text', path);
}
