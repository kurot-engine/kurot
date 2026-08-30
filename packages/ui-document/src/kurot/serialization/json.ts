import type {
	UIAssetContract,
	UIPropertyOverride,
	UIStateDefinition,
	UIVariantDefinition,
} from '../model/UIAssetContract.js';
import type {
	UIComponentInstance,
	UIInstanceOverride,
} from '../model/UIComponentInstance.js';
import type { UIDocument } from '../model/UIDocument.js';
import type { UINode } from '../model/UINode.js';
import type { UIPropertyObject, UIPropertyValue } from '../model/UIPropertyValue.js';
import type { UIPropertyDefinition } from '../schema/UIComponentDefinition.js';
import type { UIDiagnostic } from '../validation/UIDiagnostic.js';
import { isUIDocument, validateUIDocument } from '../validation/validateUIDocument.js';
import { UIDocumentParseError } from './UIDocumentParseError.js';
import { UIDocumentValidationError } from './UIDocumentValidationError.js';

/**
 * Serializes a document with stable schema and property-key ordering.
 */
export function serializeUIDocument(document: UIDocument, space = 2): string {
	const diagnostics = validateUIDocument(document);
	if (diagnostics.length > 0) {
		throw new UIDocumentValidationError(diagnostics);
	}
	return JSON.stringify(normalizeDocument(document), undefined, space);
}

/**
 * Parses and validates a current-format semantic UI document.
 */
export function parseUIDocument(source: string): UIDocument {
	let value: unknown;
	try {
		value = JSON.parse(source) as unknown;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Input is not valid JSON.';
		const diagnostics: UIDiagnostic[] = [
			{
				code: 'invalid-json',
				severity: 'error',
				path: '$',
				message,
			},
		];
		throw new UIDocumentParseError(
			diagnostics,
			error instanceof Error ? error : undefined,
		);
	}

	if (!isUIDocument(value)) {
		throw new UIDocumentParseError(validateUIDocument(value));
	}
	return value;
}

function normalizeDocument(document: UIDocument): UIDocument {
	return {
		kind: document.kind,
		formatVersion: document.formatVersion,
		id: document.id,
		assetKind: document.assetKind,
		contract: normalizeContract(document.contract),
		root: normalizeNode(document.root),
	};
}

function normalizeNode(node: UINode): UINode {
	const entries = Object.keys(node.properties)
		.sort()
		.map<[string, UIPropertyValue]>((key) => [
			key,
			normalizePropertyValue(node.properties[key]!),
		]);
	const properties: Record<string, UIPropertyValue> = Object.fromEntries(entries);

	return {
		id: node.id,
		type: node.type,
		properties,
		...(node.instance === undefined
			? {}
			: { instance: normalizeInstance(node.instance) }),
		...(node.appearance === undefined
			? {}
			: {
					appearance: {
						kind: node.appearance.kind,
						assetId: node.appearance.assetId,
					},
				}),
		children: node.children.map(normalizeNode),
	};
}

function normalizeContract(contract: UIAssetContract): UIAssetContract {
	return {
		...(contract.componentType === undefined
			? {}
			: { componentType: contract.componentType }),
		...(contract.targetType === undefined ? {} : { targetType: contract.targetType }),
		parameters: mapSortedRecord(contract.parameters, normalizePropertyDefinition),
		parts: mapSortedRecord(contract.parts, value => ({
			nodeId: value.nodeId,
			...(value.required === undefined ? {} : { required: value.required }),
			...(value.description === undefined
				? {}
				: { description: value.description }),
		})),
		slots: mapSortedRecord(contract.slots, value => ({
			nodeId: value.nodeId,
			capacity: value.capacity,
			...(value.required === undefined ? {} : { required: value.required }),
			...(value.description === undefined
				? {}
				: { description: value.description }),
		})),
		states: mapSortedRecord(contract.states, normalizeState),
		variants: mapSortedRecord(contract.variants, normalizeVariant),
	};
}

function normalizePropertyDefinition(
	definition: UIPropertyDefinition,
): UIPropertyDefinition {
	return {
		valueType: Array.isArray(definition.valueType)
			? [...definition.valueType]
			: definition.valueType,
		...(definition.format === undefined ? {} : { format: definition.format }),
		...(definition.resourceTypes === undefined
			? {}
			: { resourceTypes: [...definition.resourceTypes] }),
		...(definition.tokenTypes === undefined
			? {}
			: { tokenTypes: [...definition.tokenTypes] }),
		...(definition.enumValues === undefined
			? {}
			: { enumValues: [...definition.enumValues] }),
		...(definition.minimum === undefined ? {} : { minimum: definition.minimum }),
		...(definition.maximum === undefined ? {} : { maximum: definition.maximum }),
		...(definition.integer === undefined ? {} : { integer: definition.integer }),
		...(definition.defaultValue === undefined
			? {}
			: { defaultValue: definition.defaultValue }),
		...(definition.required === undefined ? {} : { required: definition.required }),
		...(definition.description === undefined
			? {}
			: { description: definition.description }),
	};
}

function normalizeState(definition: UIStateDefinition): UIStateDefinition {
	return {
		...(definition.description === undefined
			? {}
			: { description: definition.description }),
		overrides: definition.overrides.map(normalizePropertyOverride),
	};
}

function normalizeVariant(definition: UIVariantDefinition): UIVariantDefinition {
	return {
		...(definition.description === undefined
			? {}
			: { description: definition.description }),
		overrides: definition.overrides.map(normalizePropertyOverride),
	};
}

function normalizePropertyOverride(override: UIPropertyOverride): UIPropertyOverride {
	return {
		targetId: override.targetId,
		property: override.property,
		value: normalizePropertyValue(override.value),
	};
}

function normalizeInstance(instance: UIComponentInstance): UIComponentInstance {
	return {
		source: {
			kind: instance.source.kind,
			assetId: instance.source.assetId,
		},
		parameters: mapSortedRecord(instance.parameters, normalizePropertyValue),
		...(instance.variant === undefined ? {} : { variant: instance.variant }),
		overrides: instance.overrides.map(normalizeInstanceOverride),
		slots: mapSortedRecord(instance.slots, nodes => nodes.map(normalizeNode)),
	};
}

function normalizeInstanceOverride(override: UIInstanceOverride): UIInstanceOverride {
	return {
		part: override.part,
		property: override.property,
		value: normalizePropertyValue(override.value),
	};
}

function normalizePropertyValue(value: UIPropertyValue): UIPropertyValue {
	if (Array.isArray(value)) {
		return value.map(normalizePropertyValue);
	}
	if (typeof value === 'object') {
		const objectValue = value as UIPropertyObject;
		const entries = Object.keys(objectValue)
			.sort()
			.map<[string, UIPropertyValue]>((key) => [
				key,
				normalizePropertyValue(objectValue[key]!),
			]);
		return Object.fromEntries(entries);
	}
	return value;
}

function mapSortedRecord<TValue, TResult>(
	value: Readonly<Record<string, TValue>>,
	map: (value: TValue) => TResult,
): Record<string, TResult> {
	return Object.fromEntries(
		Object.keys(value)
			.sort()
			.map((key) => [key, map(value[key]!)]),
	);
}
