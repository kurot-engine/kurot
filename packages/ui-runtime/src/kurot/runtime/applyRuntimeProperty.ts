import type { DisplayObject } from '@kurot/core';
import type { UIPropertyValue } from '@kurot/ui-document';
import { applyComponentProperty } from './builtins/applyComponentProperties.js';
import { applyDisplayProperty } from './builtins/applyDisplayProperties.js';
import { KurotUIRuntimeError } from './KurotUIRuntimeError.js';
import { resolvePropertyValue } from './resolvePropertyValue.js';
import type { KurotUICreationContext } from './types.js';

/**
 * Applies one resolved semantic property to an existing runtime object.
 */
export function applyRuntimeProperty(
	target: DisplayObject,
	type: string,
	name: string,
	value: UIPropertyValue,
	path: string,
	context: KurotUICreationContext,
): void {
	const resolved = resolvePropertyValue(value, path, context);
	const adapter = context.adapters[type];
	const handled =
		applyDisplayProperty(target, name, resolved, path) ||
		applyComponentProperty(target, name, resolved, path) ||
		adapter?.applyProperty?.(target, name, resolved, path) === true;
	if (!handled) {
		throw new KurotUIRuntimeError(
			'invalid-property',
			`Runtime property "${name}" is not supported by ${type}.`,
			path,
		);
	}
}
