import type { DisplayObject } from '@kurot/core';
import { Component, SetProperty, Skin, State } from '@kurot/ui';
import { isSyntheticNodeId } from '@kurot/ui-document';
import type { UIDocument, UINode } from '@kurot/ui-document';
import { applyRuntimeProperty } from './applyRuntimeProperty.js';
import { materializeNode } from './materializeNode.js';
import { qualifyNodeId } from './node-identity.js';
import { assetPath } from './assetPath.js';
import { KurotUIRuntimeError } from './KurotUIRuntimeError.js';
import { resolvePropertyValue } from './resolvePropertyValue.js';
import type { KurotUICreationContext } from './types.js';
import { TransitionSetProperty } from './transitions/TransitionSetProperty.js';

const SKIN_SIZE_PROPERTIES = ['width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight'] as const;
const SKIN_SIZE_PROPERTY_NAMES = new Set<string>(SKIN_SIZE_PROPERTIES);

type SkinSizeProperty = (typeof SKIN_SIZE_PROPERTIES)[number];

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
	const elements = appearance.root.children.map((child, index) =>
		materializeNode(child, assetPath(appearance.id, `.root.children[${index}]`), scope, context),
	);
	const skin = new Skin();
	const partNames = new Set<string>();
	applySkinProperties(skin, appearance.root.properties, appearance.id, context);
	applyAppearanceVariant(node.appearance.variant, appearance, scope, skin, context);
	skin.elementsContent = elements;
	exposeAppearanceNodes(skin, appearance.root, scope, context, partNames);
	exposeParts(skin, appearance, scope, context, partNames);
	skin.skinParts = [...partNames].sort();
	skin.states = createStates(appearance, context);
	target.skinName = skin;
}

function applySkinProperties(
	skin: Skin,
	properties: UINode['properties'],
	appearanceId: string,
	context: KurotUICreationContext,
): void {
	for (const name of SKIN_SIZE_PROPERTIES) {
		const value = properties[name];
		if (value === undefined) {
			continue;
		}
		const path = assetPath(appearanceId, `.root.properties.${name}`);
		applySkinProperty(skin, name, value, path, context);
	}
}

function applySkinProperty(
	skin: Skin,
	name: SkinSizeProperty,
	value: UINode['properties'][string],
	path: string,
	context: KurotUICreationContext,
): void {
	const resolved = resolvePropertyValue(value, path, context);
	if (typeof resolved !== 'number') {
		throw new KurotUIRuntimeError('invalid-property', `Skin property "${name}" requires a number.`, path);
	}
	skin[name] = resolved;
}

function isSkinSizeProperty(name: string): name is SkinSizeProperty {
	return SKIN_SIZE_PROPERTY_NAMES.has(name);
}

function applyAppearanceVariant(
	name: string | undefined,
	appearance: UIDocument,
	scope: string,
	skin: Skin,
	context: KurotUICreationContext,
): void {
	if (name === undefined) return;
	const definition = appearance.contract.variants[name];
	if (!definition) return;
	const path = assetPath(appearance.id, `.contract.variants.${name}`);
	for (let index = 0; index < definition.overrides.length; index++) {
		const override = definition.overrides[index];
		const valuePath = `${path}.overrides[${index}].value`;
		if (override.targetId === appearance.root.id && isSkinSizeProperty(override.property)) {
			applySkinProperty(skin, override.property, override.value, valuePath, context);
			continue;
		}
		const identity = qualifyNodeId(scope, override.targetId);
		const target = context.instances.get(identity);
		const type = context.types.get(identity);
		if (!target || !type) continue;
		applyRuntimeProperty(
			target,
			type,
			override.property,
			override.value,
			valuePath,
			context,
		);
	}
}

function exposeAppearanceNodes(
	skin: Skin,
	node: UINode,
	scope: string,
	context: KurotUICreationContext,
	partNames: Set<string>,
): void {
	const target = context.instances.get(qualifyNodeId(scope, node.id));
	if (target && !isSyntheticNodeId(node.id)) {
		skin.setPart(node.id, target);
		partNames.add(node.id);
	}
	for (const child of node.children) {
		exposeAppearanceNodes(skin, child, scope, context, partNames);
	}
}

function exposeParts(
	skin: Skin,
	appearance: UIDocument,
	scope: string,
	context: KurotUICreationContext,
	partNames: Set<string>,
): void {
	const names = Object.keys(appearance.contract.parts).sort();
	for (const name of names) {
		const part = appearance.contract.parts[name];
		const target = context.instances.get(qualifyNodeId(scope, part.nodeId));
		if (target) {
			skin.setPart(name, target);
			partNames.add(name);
		}
	}
}

function createStates(appearance: UIDocument, context: KurotUICreationContext): State[] {
	const basePath = assetPath(appearance.id);
	return Object.keys(appearance.contract.states)
		.sort()
		.map(name => {
			const definition = appearance.contract.states[name];
			const overrides = definition.overrides.map((override, index) => {
				const targetId = override.targetId === appearance.root.id ? '' : override.targetId;
				const value = resolvePropertyValue(
					override.value,
					`${basePath}.contract.states.${name}.overrides[${index}].value`,
					context,
				);
				if (override.transition !== undefined) {
					return new TransitionSetProperty(targetId, override.property, value, override.transition);
				}
				return new SetProperty(targetId, override.property, value);
			});
			return new State(name, overrides);
		});
}

function requireAppearance(id: string, path: string, context: KurotUICreationContext): UIDocument {
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
