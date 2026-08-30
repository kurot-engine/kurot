import type { DisplayObject } from '@kurot/core';
import { Group } from '@kurot/ui';
import type { UINode } from '@kurot/ui-document';
import { applyRuntimeProperty } from './applyRuntimeProperty.js';
import { applyAppearance } from './materializeAppearance.js';
import { materializeComponentInstance } from './materializeComponentInstance.js';
import { getBuiltInFactory } from './builtins/componentFactories.js';
import { KurotUIRuntimeError } from './KurotUIRuntimeError.js';
import type {
	KurotUIComponentAdapter,
	KurotUICreationContext,
} from './types.js';

/**
 * Materializes one semantic node, including nested reusable instances.
 */
export function materializeNode(
	node: UINode,
	path: string,
	scope: string,
	context: KurotUICreationContext,
): DisplayObject {
	if (node.instance) {
		return materializeComponentInstance(node, path, scope, context);
	}
	const identity = qualifyNodeId(scope, node.id);
	const adapter = context.adapters[node.type];
	const instance = createInstance(node, path, adapter);
	registerInstance(identity, instance, node.type, path, context);
	applyNodeProperties(instance, node, path, context);

	for (let index = 0; index < node.children.length; index++) {
		const childPath = `${path}.children[${index}]`;
		const child = materializeNode(node.children[index], childPath, scope, context);
		appendRuntimeChild(instance, child, node.type, childPath, adapter);
	}
	if (node.appearance) {
		applyAppearance(instance, node, identity, path, context);
	}
	return instance;
}

/**
 * Returns a collision-free runtime identity for a node inside a component scope.
 */
export function qualifyNodeId(scope: string, nodeId: string): string {
	return scope ? `${scope}/${nodeId}` : nodeId;
}

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

function createInstance(
	node: UINode,
	path: string,
	adapter?: KurotUIComponentAdapter,
): DisplayObject {
	const factory = adapter?.create ?? getBuiltInFactory(node.type);
	if (!factory) {
		throw new KurotUIRuntimeError(
			'unsupported-component',
			`No runtime adapter is registered for component type "${node.type}".`,
			`${path}.type`,
		);
	}
	try {
		return factory();
	} catch (error) {
		const detail = error instanceof Error ? ` ${error.message}` : '';
		throw new KurotUIRuntimeError(
			'component-construction-failed',
			`Failed to construct component type "${node.type}".${detail}`,
			`${path}.type`,
		);
	}
}

function registerInstance(
	identity: string,
	instance: DisplayObject,
	type: string,
	path: string,
	context: KurotUICreationContext,
): void {
	if (context.instances.has(identity)) {
		throw new KurotUIRuntimeError(
			'invalid-document',
			`Runtime node identity "${identity}" is duplicated.`,
			`${path}.id`,
		);
	}
	context.instances.set(identity, instance);
	context.types.set(identity, type);
}
