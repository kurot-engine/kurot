import type { UIDocument } from '../model/UIDocument.js';
import type { UINode } from '../model/UINode.js';
import type { UIPropertyOverride } from '../model/UIAssetContract.js';
import type { UIPropertyValue } from '../model/UIPropertyValue.js';
import { isUIResourceReference } from '../model/UIReference.js';
import { getUIResourceNineSlice, parseUINineSliceGrid } from './UIResourceConfig.js';
import type { UIResourceConfigEntry, UINineSliceGrid } from './UIResourceConfig.js';

/**
 * Resolves resource defaults into a disposable compilation/preview copy, never into authored XML or history.
 * Source-state overrides receive paired grids so state exit restores the original grid, including ordinary images.
 */
export function resolveUIResourceDefaults(
	document: UIDocument,
	resources: readonly UIResourceConfigEntry[],
): UIDocument {
	const images = new Map<string, UINode>();
	const grids = new Map<string, UINineSliceGrid | undefined>();
	function resourceGrid(key: string): UINineSliceGrid | undefined {
		if (!grids.has(key)) {
			grids.set(key, getUIResourceNineSlice(resources, key));
		}
		return grids.get(key);
	}
	function visit(node: UINode): UINode {
		const children = node.children.map(visit);
		if (node.type !== 'kui.Image') {
			return { ...node, children };
		}
		images.set(node.id, node);
		const local = node.properties.scale9Grid;
		const grid =
			typeof local === 'string'
				? parseUINineSliceGrid(local)
				: (local ?? resourceGrid(sourceKey(node.properties.source)));
		return {
			...node,
			children,
			properties: grid !== undefined ? { ...node.properties, scale9Grid: grid } : node.properties,
		};
	}
	const root = visit(document.root);
	function resolveOverrides(overrides: readonly UIPropertyOverride[]): readonly UIPropertyOverride[] {
		const result = overrides.map(override =>
			override.property === 'scale9Grid' && typeof override.value === 'string'
				? { ...override, value: parseUINineSliceGrid(override.value) }
				: override,
		);
		for (const override of overrides) {
			const image = images.get(override.targetId);
			if (
				override.property !== 'source' ||
				!image ||
				image.properties.scale9Grid !== undefined ||
				overrides.some(item => item.targetId === image.id && item.property === 'scale9Grid')
			) {
				continue;
			}
			const grid = resourceGrid(sourceKey(override.value));
			result.push({ targetId: image.id, property: 'scale9Grid', value: grid ?? false });
		}
		return result;
	}
	return {
		...document,
		root,
		contract: {
			...document.contract,
			states: Object.fromEntries(
				Object.entries(document.contract.states).map(([name, state]) => [
					name,
					{ ...state, overrides: resolveOverrides(state.overrides) },
				]),
			),
			variants: Object.fromEntries(
				Object.entries(document.contract.variants).map(([name, variant]) => [
					name,
					{ ...variant, overrides: resolveOverrides(variant.overrides) },
				]),
			),
		},
	};
}

function sourceKey(value: UIPropertyValue | undefined): string {
	return isUIResourceReference(value) ? value.key : typeof value === 'string' ? value : '';
}
