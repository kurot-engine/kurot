import { EditableText } from '@kurot/ui';
import type { UIPropertyValue } from '@kurot/ui-document';
import { KurotUIRuntimeError } from '../KurotUIRuntimeError.js';

/**
 * Applies one property declared directly by EditableText.
 */
export function applyEditableTextProperty(
	target: EditableText,
	name: string,
	value: UIPropertyValue,
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

function requireInputType(value: UIPropertyValue, path: string): 'text' {
	if (value === 'text') return value;
	throw invalidValue('text', path);
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
