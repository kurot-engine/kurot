import type { DisplayObject } from '@kurot/core';
import type {
	UIAssetContract,
	UIComponentInstance,
	UIDocument,
	UINode,
} from '@kurot/ui-document';
import { applyRuntimeProperty } from './applyRuntimeProperty.js';
import { applyAppearance } from './materializeAppearance.js';
import {
	appendRuntimeChild,
	applyNodeProperties,
	materializeNode,
	qualifyNodeId,
} from './materializeNode.js';
import { KurotUIRuntimeError } from './KurotUIRuntimeError.js';
import { createReusableComponentStateController } from './states/createReusableComponentStateController.js';
import type { KurotUICreationContext } from './types.js';

/**
 * Materializes one reusable component reference and its instance-local changes.
 */
export function materializeComponentInstance(
	node: UINode,
	path: string,
	parentScope: string,
	context: KurotUICreationContext,
): DisplayObject {
	const specification = requireInstance(node);
	const source = requireComponentAsset(specification, path, context);
	const identity = qualifyNodeId(parentScope, node.id);
	const sourcePath = `$.assets[${JSON.stringify(source.id)}].root`;
	const root = materializeNode(source.root, sourcePath, identity, context);
	context.instances.set(identity, root);
	context.types.set(identity, node.type);

	applyVariant(specification, source.contract, identity, path, context);
	applyParameters(specification, source.contract, identity, path, context);
	applyOverrides(specification, source.contract, identity, path, context);
	projectSlots(
		specification,
		source,
		identity,
		parentScope,
		path,
		context,
	);
	applyNodeProperties(root, node, path, context);
	if (node.appearance) {
		applyAppearance(root, node, identity, path, context);
	}
	if (Object.keys(source.contract.states).length > 0) {
		context.stateControllers.set(
			identity,
			createReusableComponentStateController(
				source.contract,
				identity,
				`$.assets[${JSON.stringify(source.id)}].contract`,
				context,
			),
		);
	}
	return root;
}

function applyVariant(
	instance: UIComponentInstance,
	contract: UIAssetContract,
	scope: string,
	path: string,
	context: KurotUICreationContext,
): void {
	if (!instance.variant) return;
	const variant = contract.variants[instance.variant];
	if (!variant) return;
	for (let index = 0; index < variant.overrides.length; index++) {
		const override = variant.overrides[index];
		applyScopedProperty(
			scope,
			override.targetId,
			override.property,
			override.value,
			`${path}.instance.variant`,
			context,
		);
	}
}

function applyParameters(
	instance: UIComponentInstance,
	contract: UIAssetContract,
	scope: string,
	path: string,
	context: KurotUICreationContext,
): void {
	for (const name of Object.keys(contract.parameters).sort()) {
		const definition = contract.parameters[name];
		const value = instance.parameters[name] ?? definition.defaultValue;
		if (value === undefined) continue;
		for (const binding of definition.bindings ?? []) {
			applyScopedProperty(
				scope,
				binding.targetId,
				binding.property,
				value,
				`${path}.instance.parameters.${name}`,
				context,
			);
		}
	}
}

function applyOverrides(
	instance: UIComponentInstance,
	contract: UIAssetContract,
	scope: string,
	path: string,
	context: KurotUICreationContext,
): void {
	for (let index = 0; index < instance.overrides.length; index++) {
		const override = instance.overrides[index];
		const part = contract.parts[override.part];
		if (!part) continue;
		applyScopedProperty(
			scope,
			part.nodeId,
			override.property,
			override.value,
			`${path}.instance.overrides[${index}].value`,
			context,
		);
	}
}

function projectSlots(
	instance: UIComponentInstance,
	source: UIDocument,
	componentScope: string,
	parentScope: string,
	path: string,
	context: KurotUICreationContext,
): void {
	for (const name of Object.keys(instance.slots).sort()) {
		const slot = source.contract.slots[name];
		if (!slot) continue;
		const target = context.instances.get(qualifyNodeId(componentScope, slot.nodeId));
		const targetNode = findNode(source.root, slot.nodeId);
		if (!target || !targetNode) continue;
		const adapter = context.adapters[targetNode.type];
		const nodes = instance.slots[name];
		for (let index = 0; index < nodes.length; index++) {
			const childPath = `${path}.instance.slots.${name}[${index}]`;
			const child = materializeNode(nodes[index], childPath, parentScope, context);
			appendRuntimeChild(target, child, targetNode.type, childPath, adapter);
		}
	}
}

function applyScopedProperty(
	scope: string,
	targetId: string,
	property: string,
	value: Parameters<typeof applyRuntimeProperty>[3],
	path: string,
	context: KurotUICreationContext,
): void {
	const target = context.instances.get(qualifyNodeId(scope, targetId));
	if (!target) return;
	const type = context.types.get(qualifyNodeId(scope, targetId));
	if (!type) return;
	applyRuntimeProperty(target, type, property, value, path, context);
}

function requireComponentAsset(
	instance: UIComponentInstance,
	path: string,
	context: KurotUICreationContext,
): UIDocument {
	const source = context.assets.getAsset(instance.source.assetId);
	if (!source || source.assetKind !== 'component') {
		throw new KurotUIRuntimeError(
			'invalid-document',
			`Reusable component asset "${instance.source.assetId}" is unavailable.`,
			`${path}.instance.source.assetId`,
		);
	}
	return source;
}

function requireInstance(node: UINode): UIComponentInstance {
	if (node.instance) return node.instance;
	throw new Error('Expected reusable component instance.');
}

function findNode(root: UINode, id: string): UINode | undefined {
	if (root.id === id) return root;
	for (const child of root.children) {
		const match = findNode(child, id);
		if (match) return match;
	}
	return undefined;
}
