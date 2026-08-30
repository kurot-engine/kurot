import type { UIDocument } from '../model/UIDocument.js';
import type { UINode } from '../model/UINode.js';
import type {
	UIPropertyObject,
	UIPropertyValue,
} from '../model/UIPropertyValue.js';

export interface UIAssetDependency {
	/**
	 * Stable identifier of the referenced UI asset.
	 */
	readonly assetId: string;

	/**
	 * Document-local JSON path containing the reference.
	 */
	readonly path: string;
}

/**
 * Visits ordinary and Slot-projected node trees with deterministic paths.
 */
export function visitUINodesWithPath(
	node: UINode,
	path: string,
	visitor: (node: UINode, path: string) => void,
): void {
	visitor(node, path);
	for (let index = 0; index < node.children.length; index++) {
		visitUINodesWithPath(node.children[index]!, `${path}.children[${index}]`, visitor);
	}
	if (!node.instance) return;
	for (const slotName of Object.keys(node.instance.slots).sort()) {
		const children = node.instance.slots[slotName]!;
		for (let index = 0; index < children.length; index++) {
			visitUINodesWithPath(
				children[index]!,
				`${path}.instance.slots.${slotName}[${index}]`,
				visitor,
			);
		}
	}
}

/**
 * Visits every recursive property value stored by one UI asset.
 */
export function visitUIDocumentPropertyValues(
	document: UIDocument,
	visitor: (value: UIPropertyValue, path: string) => void,
): void {
	visitUINodesWithPath(document.root, '$.root', (node, path) => {
		for (const [name, value] of Object.entries(node.properties)) {
			visitUIPropertyValue(value, `${path}.properties.${name}`, visitor);
		}
		if (!node.instance) return;
		for (const [name, value] of Object.entries(node.instance.parameters)) {
			visitUIPropertyValue(value, `${path}.instance.parameters.${name}`, visitor);
		}
		for (let index = 0; index < node.instance.overrides.length; index++) {
			visitUIPropertyValue(
				node.instance.overrides[index]!.value,
				`${path}.instance.overrides[${index}].value`,
				visitor,
			);
		}
	});
	visitModeValues(document, 'states', visitor);
	visitModeValues(document, 'variants', visitor);
}

/**
 * Collects explicit and property-level UI asset dependencies with source paths.
 */
export function collectUIAssetDependencies(
	document: UIDocument,
): readonly UIAssetDependency[] {
	const dependencies: UIAssetDependency[] = [];
	visitUINodesWithPath(document.root, '$.root', (node, path) => {
		if (node.appearance) {
			dependencies.push({
				assetId: node.appearance.assetId,
				path: `${path}.appearance`,
			});
		}
		if (node.instance) {
			dependencies.push({
				assetId: node.instance.source.assetId,
				path: `${path}.instance.source`,
			});
		}
	});
	visitUIDocumentPropertyValues(document, (value, path) => {
		if (!isReference(value, 'asset') || !('assetId' in value)) return;
		if (typeof value.assetId !== 'string') return;
		dependencies.push({ assetId: value.assetId, path });
	});
	return dependencies;
}

/**
 * Narrows a property object by its semantic reference discriminator.
 */
export function isReference(
	value: UIPropertyValue,
	kind: 'asset' | 'resource' | 'token',
): value is UIPropertyObject {
	return (
		typeof value === 'object' &&
		!Array.isArray(value) &&
		'kind' in value &&
		value.kind === kind
	);
}

function visitUIPropertyValue(
	value: UIPropertyValue,
	path: string,
	visitor: (value: UIPropertyValue, path: string) => void,
): void {
	visitor(value, path);
	if (Array.isArray(value)) {
		for (let index = 0; index < value.length; index++) {
			visitUIPropertyValue(value[index]!, `${path}[${index}]`, visitor);
		}
		return;
	}
	if (typeof value !== 'object') return;
	for (const [name, child] of Object.entries(value)) {
		visitUIPropertyValue(child, `${path}.${name}`, visitor);
	}
}

function visitModeValues(
	document: UIDocument,
	key: 'states' | 'variants',
	visitor: (value: UIPropertyValue, path: string) => void,
): void {
	for (const [name, mode] of Object.entries(document.contract[key])) {
		for (let index = 0; index < mode.overrides.length; index++) {
			visitUIPropertyValue(
				mode.overrides[index]!.value,
				`$.contract.${key}.${name}.overrides[${index}].value`,
				visitor,
			);
		}
	}
}
