import { TextInput } from '@kurot/ui';
import { KurotUIRuntimeError } from '../KurotUIRuntimeError.js';

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

function requireBoolean(value: unknown, path: string): boolean {
	if (typeof value === 'boolean') return value;
	throw invalidValue('boolean', path);
}

function requireInputType(value: unknown, path: string): 'text' {
	if (value === 'text') return value;
	throw invalidValue('text', path);
}

function requireNumber(value: unknown, path: string): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	throw invalidValue('number', path);
}

function requireString(value: unknown, path: string): string {
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
