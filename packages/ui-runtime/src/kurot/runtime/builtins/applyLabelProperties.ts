import { Label } from '@kurot/ui';
import { KurotUIRuntimeError } from '../KurotUIRuntimeError.js';

/**
 * Applies one property owned by Label and inherited by its subclasses.
 */
export function applyLabelProperty(
	target: Label,
	name: string,
	value: unknown,
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

function requireBoolean(value: unknown, path: string): boolean {
	if (typeof value === 'boolean') return value;
	throw invalidValue('boolean', path);
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
