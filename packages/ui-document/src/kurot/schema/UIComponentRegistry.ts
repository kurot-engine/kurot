import type {
	UIComponentDefinition,
	UIPropertyDefinition,
	UIResolvedComponentDefinition,
} from './UIComponentDefinition.js';
import { UIComponentResolutionError } from './UIComponentResolutionError.js';
import { validateComponentDefinition } from './validateComponentDefinition.js';

/**
 * Isolated component catalog used by validators, editors, and Agent adapters.
 */
export class UIComponentRegistry {
	private readonly _definitions = new Map<string, UIComponentDefinition>();
	private readonly _resolvedDefinitions = new Map<string, UIResolvedComponentDefinition>();

	/**
	 * Adds a definition and rejects accidental replacement of an existing type.
	 */
	public register(definition: UIComponentDefinition): void {
		validateComponentDefinition(definition);
		if (this._definitions.has(definition.type)) {
			throw new Error(`Component type "${definition.type}" is already registered.`);
		}
		this._definitions.set(definition.type, normalizeDefinition(definition));
		this._resolvedDefinitions.clear();
	}

	/**
	 * Returns the registered definition for an exact component type key.
	 */
	public get(type: string): UIComponentDefinition | undefined {
		return this._definitions.get(type);
	}

	/**
	 * Returns whether an exact component type key is registered.
	 */
	public has(type: string): boolean {
		return this._definitions.has(type);
	}

	/**
	 * Returns all definitions sorted by type for deterministic tools and prompts.
	 */
	public list(): readonly UIComponentDefinition[] {
		return Object.freeze(
			[...this._definitions.values()].sort(compareDefinitions),
		);
	}

	/**
	 * Resolves inherited properties and policies for one exact component type.
	 */
	public resolve(type: string): UIResolvedComponentDefinition | undefined {
		return resolveDefinition(
			type,
			this._definitions,
			this._resolvedDefinitions,
			[],
		);
	}

	/**
	 * Resolves every definition in deterministic type order, including abstract bases.
	 */
	public resolveAll(): readonly UIResolvedComponentDefinition[] {
		const resolved: UIResolvedComponentDefinition[] = [];
		for (const definition of this.list()) {
			const result = this.resolve(definition.type);
			if (result) resolved.push(result);
		}
		return Object.freeze(resolved);
	}
}

function resolveDefinition(
	type: string,
	definitions: ReadonlyMap<string, UIComponentDefinition>,
	cache: Map<string, UIResolvedComponentDefinition>,
	chain: readonly string[],
): UIResolvedComponentDefinition | undefined {
	const cached = cache.get(type);
	if (cached) return cached;

	const definition = definitions.get(type);
	if (!definition) return undefined;

	const cycleStart = chain.indexOf(type);
	if (cycleStart >= 0) {
		const cycle = [...chain.slice(cycleStart), type];
		throw new UIComponentResolutionError(
			'circular-component-inheritance',
			`Circular component inheritance detected: ${cycle.join(' -> ')}.`,
			cycle,
		);
	}

	const nextChain = [...chain, type];
	let base: UIResolvedComponentDefinition | undefined;
	if (definition.extends) {
		base = resolveDefinition(definition.extends, definitions, cache, nextChain);
		if (!base) {
			throw new UIComponentResolutionError(
				'missing-component-base',
				`Base component type "${definition.extends}" required by "${type}" is not registered.`,
				[...nextChain, definition.extends],
			);
		}
	}

	const resolved: UIResolvedComponentDefinition = Object.freeze({
		type: definition.type,
		baseTypes: Object.freeze(base ? [...base.baseTypes, base.type] : []),
		abstract: definition.abstract ?? false,
		displayName: definition.displayName,
		description: definition.description,
		children: definition.children ?? base?.children,
		properties: mergeProperties(base?.properties, definition.properties),
		allowUnknownProperties:
			definition.allowUnknownProperties ?? base?.allowUnknownProperties ?? false,
	});
	cache.set(type, resolved);
	return resolved;
}

function compareDefinitions(a: UIComponentDefinition, b: UIComponentDefinition): number {
	return compareStrings(a.type, b.type);
}

function normalizeDefinition(definition: UIComponentDefinition): UIComponentDefinition {
	const properties = normalizeProperties(definition.properties ?? {});
	return Object.freeze({ ...definition, properties });
}

function mergeProperties(
	base?: Readonly<Record<string, UIPropertyDefinition>>,
	derived?: Readonly<Record<string, UIPropertyDefinition>>,
): Readonly<Record<string, UIPropertyDefinition>> {
	const merged = new Map(Object.entries(base ?? {}));
	for (const [name, property] of Object.entries(derived ?? {})) {
		merged.set(name, property);
	}
	const entries = [...merged.entries()].sort(([a], [b]) => compareStrings(a, b));
	return Object.freeze(Object.fromEntries(entries));
}

function compareStrings(a: string, b: string): number {
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
}

function normalizeProperties(
	properties: Readonly<Record<string, UIPropertyDefinition>>,
): Readonly<Record<string, UIPropertyDefinition>> {
	const entries = Object.entries(properties).map(
		([name, property]): [string, UIPropertyDefinition] => [
			name,
			Object.freeze({
				...property,
				valueType: Array.isArray(property.valueType)
					? Object.freeze([...property.valueType])
					: property.valueType,
				...(property.enumValues
					? { enumValues: Object.freeze([...property.enumValues]) }
					: {}),
				...(property.resourceTypes
					? { resourceTypes: Object.freeze([...property.resourceTypes]) }
					: {}),
				...(property.tokenTypes
					? { tokenTypes: Object.freeze([...property.tokenTypes]) }
					: {}),
			}),
		],
	);
	return Object.freeze(Object.fromEntries(entries));
}
