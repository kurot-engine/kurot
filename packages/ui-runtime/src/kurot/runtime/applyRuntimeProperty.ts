import type { DisplayObject } from '@kurot/core';
import type { UIPropertyValue } from '@kurot/ui-document';
import { applyBuiltInProperty } from './builtins/applyBuiltInProperties.js';
import { KurotUIRuntimeError } from './KurotUIRuntimeError.js';
import { resolvePropertyValue } from './resolvePropertyValue.js';
import type {
	KurotUIComponentAdapter,
	KurotUICreationContext,
} from './types.js';

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

	if (applyBuiltInProperty(target, name, resolved, path)) {
		return;
    }

	const adapter = context.adapters[type];
	if (applyAdapterProperty(adapter, target, name, resolved, path)) {
		return;
	}

	throw new KurotUIRuntimeError(
		'invalid-property',
		`Runtime property "${name}" is not supported by ${type}.`,
		path,
	);
}

function applyAdapterProperty(
	adapter: KurotUIComponentAdapter | undefined,
	target: DisplayObject,
	name: string,
	value: UIPropertyValue,
	path: string,
): boolean {
	if (adapter === undefined) {
		return false;
    }

	if (adapter.applyProperty === undefined) {
		return false;
	}

    return adapter.applyProperty(target, name, value, path);
}
