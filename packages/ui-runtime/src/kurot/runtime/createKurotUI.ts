import {
	createKurotUIFoundationRegistry,
	UIAssetRegistry,
	validateUIAssetRegistry,
	validateUIDocument,
} from '@kurot/ui-document';
import type { UIDocument } from '@kurot/ui-document';
import { KurotUIRuntimeError } from './KurotUIRuntimeError.js';
import { materializeNode } from './materializeNode.js';
import type {
	CreateKurotUIOptions,
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

	const context: KurotUICreationContext = {
		adapters: options.adapters ?? {},
		assets,
		instances: new Map(),
		resolveResource: options.resolveResource ?? (reference => reference.key),
		stateControllers: new Map(),
		types: new Map(),
	};
	const root = materializeNode(document.root, '$.root', '', context);
	return Object.freeze({
		root,
		instances: context.instances,
		stateControllers: context.stateControllers,
	});
}

function createRuntimeAssetRegistry(
	document: UIDocument,
	source?: UIAssetRegistry,
): UIAssetRegistry {
	const registry = new UIAssetRegistry();
	for (const asset of source?.listAssets() ?? []) {
		if (asset.id !== document.id) registry.registerAsset(asset);
	}
	registry.registerAsset(document);
	for (const resource of source?.listResources() ?? []) {
		registry.registerResource(resource);
	}
	for (const token of source?.listTokens() ?? []) registry.registerToken(token);
	return registry;
}
