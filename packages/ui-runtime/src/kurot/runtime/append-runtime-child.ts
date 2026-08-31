import type { DisplayObject } from '@kurot/core';
import { Group } from '@kurot/ui';
import { KurotUIRuntimeError } from './KurotUIRuntimeError.js';
import type { KurotUIComponentAdapter } from './types.js';

/**
 * Attaches a materialized child through a built-in or project adapter contract.
 */
export function appendRuntimeChild(
	parent: DisplayObject,
	child: DisplayObject,
	parentType: string,
	path: string,
	adapter?: KurotUIComponentAdapter,
): void {
	if (adapter?.appendChild) {
		adapter.appendChild(parent, child, path);
		return;
	}
	if (parent instanceof Group) {
		parent.addChild(child);
		return;
	}
	throw new KurotUIRuntimeError(
		'unsupported-children',
		`Runtime component "${parentType}" cannot attach document children.`,
		path,
	);
}
