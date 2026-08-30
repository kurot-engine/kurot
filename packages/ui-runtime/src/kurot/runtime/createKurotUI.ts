import {
	createKurotUIFoundationRegistry,
	UIAssetRegistry,
	validateUIAssetRegistry,
	validateUIDocument,
} from '@kurot/ui-document';
import type { UIDocument } from '@kurot/ui-document';
import { activateRuntimeContract } from './dynamics/activateRuntimeContract.js';
import { KurotUIRuntimeError } from './KurotUIRuntimeError.js';
import { materializeNode } from './materializeNode.js';
import { createKurotUIResourceAdapters } from './resources/createKurotUIResourceAdapters.js';
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

	const components = options.registry ?? createKurotUIFoundationRegistry();
	const assets = createRuntimeAssetRegistry(document, options.assets);
	const diagnostics = validateUIAssetRegistry(assets, components);
	if (diagnostics.length > 0) {
		throw new KurotUIRuntimeError(
			'invalid-document',
			'UI asset registry failed project validation.',
			'$',
			diagnostics,
		);
	}
	const adapters = options.adapters ?? {};
	validateComponentAdapters(adapters);

	const context: KurotUICreationContext = {
		adapters,
		assets,
		dataControllers: new Map(),
		disposeCallbacks: [],
		instances: new Map(),
		onAction: options.onAction,
		resolveResource: createResourceResolver(options.resourceAdapters),
		stateControllers: new Map(),
		types: new Map(),
	};
	const root = materializeNode(document.root, '$.root', '', context);
	activateRuntimeContract(document, '', context, options.data);
	const data = context.dataControllers.get('');
	if (data === undefined) {
		throw new KurotUIRuntimeError(
			'invalid-document',
			'Root UI data controller was not created.',
			'$',
		);
	}
	let disposed = false;
	return Object.freeze({
		data,
		dataControllers: context.dataControllers,
		dispose(): void {
			if (disposed) {
				return;
			}
			disposed = true;
			for (const dispose of context.disposeCallbacks.splice(0)) {
				dispose();
			}
		},
		root,
		instances: context.instances,
		stateControllers: context.stateControllers,
	});
}

function validateComponentAdapters(
	adapters: Readonly<Record<string, KurotUIComponentAdapter>>,
): void {
	for (const [type, adapter] of Object.entries(adapters)) {
		const hasCapture = adapter.captureProperty !== undefined;
		const hasRestore = adapter.restoreProperty !== undefined;
		if (hasCapture === hasRestore) {
			continue;
		}
		throw new KurotUIRuntimeError(
			'invalid-adapter',
			`Component adapter "${type}" must provide captureProperty and restoreProperty together.`,
			`$.adapters[${JSON.stringify(type)}]`,
		);
	}
}

function createResourceResolver(
	overrides: CreateKurotUIOptions['resourceAdapters'],
): KurotUICreationContext['resolveResource'] {
	const adapters = createKurotUIResourceAdapters(overrides);
	return (reference, definition) => {
		return adapters[reference.resourceType](reference, definition);
	};
}

function createRuntimeAssetRegistry(
	document: UIDocument,
	source?: UIAssetRegistry,
): UIAssetRegistry {
	const registry = new UIAssetRegistry();
	for (const asset of source?.listAssets() ?? []) {
		if (asset.id !== document.id) {
			registry.registerAsset(asset);
		}
	}
	registry.registerAsset(document);
	for (const resource of source?.listResources() ?? []) {
		registry.registerResource(resource);
	}
	for (const token of source?.listTokens() ?? []) {
		registry.registerToken(token);
	}
	return registry;
}
