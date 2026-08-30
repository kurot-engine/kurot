import type { DisplayObject } from '@kurot/core';
import { Group } from '@kurot/ui';
import {
	createKurotUIFoundationRegistry,
	validateUIDocument,
	validateUIDocumentComponents,
} from '@kurot/ui-document';
import type { UIDocument, UINode } from '@kurot/ui-document';
import { applyComponentProperty } from './builtins/applyComponentProperties.js';
import { applyDisplayProperty } from './builtins/applyDisplayProperties.js';
import { getBuiltInFactory } from './builtins/componentFactories.js';
import { KurotUIRuntimeError } from './KurotUIRuntimeError.js';
import type {
	CreateKurotUIOptions,
	KurotUIComponentAdapter,
	KurotUICreationContext,
	KurotUICreationResult,
} from './types.js';

/**
 * Validates and materializes a semantic UI document into Kurot display objects.
 */
export function createKurotUI(
	document: UIDocument,
	options: CreateKurotUIOptions = {},
): KurotUICreationResult {
	const documentDiagnostics = validateUIDocument(document);
	if (documentDiagnostics.length > 0) {
		throw new KurotUIRuntimeError(
			'invalid-document',
			'UIDocument failed structural validation.',
			'$',
			documentDiagnostics,
		);
	}

	const registry = options.registry ?? createKurotUIFoundationRegistry();
	const componentDiagnostics = validateUIDocumentComponents(document, registry);
	if (componentDiagnostics.length > 0) {
		throw new KurotUIRuntimeError(
			'invalid-document',
			'UIDocument failed component validation.',
			'$',
			componentDiagnostics,
		);
	}

	const context: KurotUICreationContext = {
		adapters: options.adapters ?? {},
		instances: new Map(),
	};
	const root = createNode(document.root, '$.root', context);
	return Object.freeze({ root, instances: context.instances });
}

function createNode(
	node: UINode,
	path: string,
	context: KurotUICreationContext,
): DisplayObject {
	const adapter = context.adapters[node.type];
	const instance = createInstance(node, path, adapter);
	context.instances.set(node.id, instance);

	for (const name of Object.keys(node.properties).sort()) {
		const value = node.properties[name];
		const propertyPath = `${path}.properties.${name}`;
		const handled =
			applyDisplayProperty(instance, name, value, propertyPath) ||
			applyComponentProperty(instance, name, value, propertyPath) ||
			adapter?.applyProperty?.(instance, name, value, propertyPath) === true;
		if (!handled) {
			throw new KurotUIRuntimeError(
				'invalid-property',
				`Runtime property "${name}" is not supported by ${node.type}.`,
				propertyPath,
			);
		}
	}

	for (let index = 0; index < node.children.length; index++) {
		const childPath = `${path}.children[${index}]`;
		const child = createNode(node.children[index], childPath, context);
		appendChild(instance, child, node.type, childPath, adapter);
	}
	return instance;
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

function appendChild(
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
