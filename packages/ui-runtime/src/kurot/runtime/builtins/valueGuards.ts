import { KurotUIRuntimeError } from '../KurotUIRuntimeError.js';

/**
 * Builds the shared failure for one runtime property value of the wrong type.
 */
export function invalidRuntimeValue(type: string, path: string): KurotUIRuntimeError {
	return new KurotUIRuntimeError(
		'invalid-property',
		`Runtime property must be ${type}.`,
		path,
	);
}

/**
 * Asserts one authored runtime value is a boolean.
 */
export function requireBoolean(value: unknown, path: string): boolean {
	if (typeof value === 'boolean') return value;
	throw invalidRuntimeValue('boolean', path);
}

/**
 * Asserts one authored runtime value is a finite number.
 */
export function requireNumber(value: unknown, path: string): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	throw invalidRuntimeValue('number', path);
}

/**
 * Asserts one authored runtime value is a string.
 */
export function requireString(value: unknown, path: string): string {
	if (typeof value === 'string') return value;
	throw invalidRuntimeValue('string', path);
}
