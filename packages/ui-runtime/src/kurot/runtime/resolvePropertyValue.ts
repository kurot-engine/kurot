import type {
	UIDesignTokenReference,
	UIPropertyObject,
	UIPropertyValue,
	UIResourceReference,
} from '@kurot/ui-document';
import { KurotUIRuntimeError } from './KurotUIRuntimeError.js';
import type { KurotUICreationContext } from './types.js';

/**
 * Resolves nested token and resource references into runtime property values.
 */
export function resolvePropertyValue(
	value: UIPropertyValue,
	path: string,
	context: KurotUICreationContext,
): UIPropertyValue {
	if (isPropertyArray(value)) {
		return value.map((item, index) =>
			resolvePropertyValue(item, `${path}[${index}]`, context),
		);
	}
	if (typeof value !== 'object') return value;
	if (isTokenReference(value)) {
		const definition = context.assets.getToken(value.key);
		if (!definition) throw unresolvedReference('design token', value.key, path);
		return resolvePropertyValue(definition.value, path, context);
	}
	if (isResourceReference(value)) {
		const definition = context.assets.getResource(value.key);
		if (!definition) throw unresolvedReference('resource', value.key, path);
		return context.resolveResource(value, definition);
	}
	const resolved: Record<string, UIPropertyValue> = {};
	for (const key of Object.keys(value).sort()) {
		resolved[key] = resolvePropertyValue(value[key], `${path}.${key}`, context);
	}
	return resolved;
}

function isPropertyArray(
	value: UIPropertyValue,
): value is readonly UIPropertyValue[] {
	return Array.isArray(value);
}

function isTokenReference(value: UIPropertyObject): value is UIDesignTokenReference {
	return value.kind === 'token' && typeof value.key === 'string';
}

function isResourceReference(value: UIPropertyObject): value is UIResourceReference {
	return value.kind === 'resource' && typeof value.key === 'string';
}

function unresolvedReference(kind: string, key: string, path: string): KurotUIRuntimeError {
	return new KurotUIRuntimeError(
		'invalid-property',
		`Cannot resolve UI ${kind} "${key}".`,
		path,
	);
}
