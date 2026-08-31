import type { DisplayObject } from '@kurot/core';
import type { UINode } from '@kurot/ui-document';
import { applyRuntimeProperty } from './applyRuntimeProperty.js';
import type { KurotUICreationContext } from './types.js';

/**
 * Applies the node's explicitly authored properties in stable name order.
 */
export function applyNodeProperties(
	target: DisplayObject,
	node: UINode,
	path: string,
	context: KurotUICreationContext,
): void {
	for (const name of Object.keys(node.properties).sort()) {
		applyRuntimeProperty(
			target,
			node.type,
			name,
			node.properties[name],
			`${path}.properties.${name}`,
			context,
		);
	}
}
