import type { UIDiagnostic } from './UIDiagnostic.js';
import { addUIDiagnostic } from './validationHelpers.js';

const RESERVED_SKIN_PART_NAMES = new Set([
	'__defineGetter__',
	'__defineSetter__',
	'__lookupGetter__',
	'__lookupSetter__',
	'__proto__',
	'addEventListener',
	'constructor',
	'currentState',
	'dispatchEvent',
	'dispatchEventWith',
	'elementsContent',
	'getPart',
	'hasEventListener',
	'hasOwnProperty',
	'hasState',
	'height',
	'hostComponent',
	'isPrototypeOf',
	'maxHeight',
	'maxWidth',
	'minHeight',
	'minWidth',
	'notifyListener',
	'once',
	'propertyIsEnumerable',
	'removeEventListener',
	'setPart',
	'skinParts',
	'states',
	'toLocaleString',
	'toString',
	'unwatchAll',
	'valueOf',
	'width',
	'willTrigger',
]);

/**
 * Reports an appearance identifier that would overwrite a native Skin member.
 */
export function validateSkinPartName(
	value: string,
	path: string,
	diagnostics: UIDiagnostic[],
): void {
	if (
		!value.startsWith('$') &&
		!value.startsWith('_') &&
		!RESERVED_SKIN_PART_NAMES.has(value)
	) {
		return;
	}
	addUIDiagnostic(
		diagnostics,
		'reserved-skin-part-name',
		path,
		`Skin part name "${value}" conflicts with a reserved runtime member.`,
	);
}
