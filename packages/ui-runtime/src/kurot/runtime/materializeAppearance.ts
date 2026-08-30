import type { DisplayObject } from '@kurot/core';
import { Component, SetProperty, Skin, State } from '@kurot/ui';
import type { UIDocument, UINode } from '@kurot/ui-document';
import { applyRuntimeProperty } from './applyRuntimeProperty.js';
import { materializeNode, qualifyNodeId } from './materializeNode.js';
import { assetPath } from './assetPath.js';
import { KurotUIRuntimeError } from './KurotUIRuntimeError.js';
import { resolvePropertyValue } from './resolvePropertyValue.js';
import type { KurotUICreationContext } from './types.js';
import { TransitionSetProperty } from './transitions/TransitionSetProperty.js';

/**
 * Applies one reusable appearance asset as a native Kurot Skin.
 */
export function applyAppearance(
	target: DisplayObject,
	node: UINode,
	hostIdentity: string,
	path: string,
	context: KurotUICreationContext,
): void {
	if (!node.appearance) return;
	if (!(target instanceof Component)) {
		throw new KurotUIRuntimeError(
			'unsupported-appearance',
			`Runtime component "${node.type}" cannot host an appearance asset.`,
			`${path}.appearance`,
		);
	}
	const appearance = requireAppearance(node.appearance.assetId, path, context);
	const scope = `${hostIdentity}@appearance:${appearance.id}`;
	const root = materializeNode(
		appearance.root,
		assetPath(appearance.id, '.root'),
		scope,
		context,
	);
	applyAppearanceVariant(node.appearance.variant, appearance, scope, context);
	const skin = new Skin();
	skin.elementsContent = [root];
	exposeAppearanceNodes(skin, appearance.root, scope, context);
	exposeParts(skin, appearance, scope, context);
	skin.states = createStates(appearance, context);
	target.skinName = skin;
}

function applyAppearanceVariant(
	name: string | undefined,
	appearance: UIDocument,
	scope: string,
	context: KurotUICreationContext,
): void {
	if (name === undefined) return;
	const definition = appearance.contract.variants[name];
	if (!definition) return;
	const path = assetPath(appearance.id, `.contract.variants.${name}`);
	for (let index = 0; index < definition.overrides.length; index++) {
		const override = definition.overrides[index];
		const identity = qualifyNodeId(scope, override.targetId);
		const target = context.instances.get(identity);
		const type = context.types.get(identity);
		if (!target || !type) continue;
		applyRuntimeProperty(
			target,
			type,
			override.property,
			override.value,
			`${path}.overrides[${index}].value`,
			context,
		);
	}
}

function exposeAppearanceNodes(
	skin: Skin,
	node: UINode,
	scope: string,
	context: KurotUICreationContext,
): void {
	const target = context.instances.get(qualifyNodeId(scope, node.id));
	if (target) {
		skin.setPart(node.id, target);
	}
	for (const child of node.children) {
		exposeAppearanceNodes(skin, child, scope, context);
	}
}

function exposeParts(
	skin: Skin,
	appearance: UIDocument,
	scope: string,
	context: KurotUICreationContext,
): void {
	const names = Object.keys(appearance.contract.parts).sort();
	for (const name of names) {
		const part = appearance.contract.parts[name];
		const target = context.instances.get(qualifyNodeId(scope, part.nodeId));
		if (target) {
			skin.setPart(name, target);
		}
	}
	skin.skinParts = names;
}

function createStates(
	appearance: UIDocument,
	context: KurotUICreationContext,
): State[] {
	const basePath = assetPath(appearance.id);
	return Object.keys(appearance.contract.states)
		.sort()
		.map(name => {
			const definition = appearance.contract.states[name];
			const overrides = definition.overrides.map((override, index) => {
				const value = resolvePropertyValue(
					override.value,
					`${basePath}.contract.states.${name}.overrides[${index}].value`,
					context,
				);
				if (override.transition !== undefined) {
					return new TransitionSetProperty(
						override.targetId,
						override.property,
						value,
						override.transition,
					);
				}
				return new SetProperty(
					override.targetId,
					override.property,
					value,
				);
			});
			return new State(name, overrides);
		});
}

function requireAppearance(
	id: string,
	path: string,
	context: KurotUICreationContext,
): UIDocument {
	const appearance = context.assets.getAsset(id);
	if (!appearance || appearance.assetKind !== 'appearance') {
		throw new KurotUIRuntimeError(
			'invalid-document',
			`Appearance asset "${id}" is unavailable.`,
			`${path}.appearance.assetId`,
		);
	}
	return appearance;
}
