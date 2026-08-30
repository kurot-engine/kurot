import { createKurotUIFoundationRegistry } from '../catalog/kurot-ui-foundation.js';
import type { UIDocument } from '../model/UIDocument.js';
import type { UIComponentRegistry } from '../schema/UIComponentRegistry.js';
import { validateUIDocumentComponents } from '../schema/validateUIDocumentComponents.js';
import type { UIDiagnostic } from '../validation/UIDiagnostic.js';
import { addUIDiagnostic } from '../validation/validationHelpers.js';
import type { UIAssetRegistry } from './UIAssetRegistry.js';
import { collectUIAssetDependencies } from './assetTraversal.js';
import { validateUIAssetInstances } from './validateUIAssetInstances.js';
import { validateUIAssetOverrides } from './validateUIAssetOverrides.js';
import { validateUIProjectReferences } from './validateUIProjectReferences.js';

/**
 * Validates project-wide identity, references, contracts, and dependency cycles.
 */
export function validateUIAssetRegistry(
	registry: UIAssetRegistry,
	components: UIComponentRegistry = createKurotUIFoundationRegistry(),
): UIDiagnostic[] {
	const diagnostics: UIDiagnostic[] = [];
	const componentTypes = new Map<string, string>();
	for (const document of registry.listAssets()) {
		validateComponentIdentity(document, componentTypes, diagnostics);
		appendAssetDiagnostics(
			document,
			validateUIDocumentComponents(document, components),
			diagnostics,
		);
		appendAssetDiagnostics(
			document,
			validateUIAssetInstances(document, registry, components),
			diagnostics,
		);
		appendAssetDiagnostics(
			document,
			validateUIAssetOverrides(document, components),
			diagnostics,
		);
		appendAssetDiagnostics(
			document,
			validateUIProjectReferences(document, registry),
			diagnostics,
		);
	}
	validateDependencyCycles(registry, diagnostics);
	return diagnostics;
}

function validateComponentIdentity(
	document: UIDocument,
	componentTypes: Map<string, string>,
	diagnostics: UIDiagnostic[],
): void {
	const type = document.contract.componentType;
	if (document.assetKind !== 'component' || type === undefined) return;
	const existing = componentTypes.get(type);
	if (!existing) {
		componentTypes.set(type, document.id);
		return;
	}
	addUIDiagnostic(
		diagnostics,
		'duplicate-component-type',
		`${assetPath(document.id)}.contract.componentType`,
		`Component type "${type}" is already published by UI asset "${existing}".`,
	);
}

function appendAssetDiagnostics(
	document: UIDocument,
	items: readonly UIDiagnostic[],
	diagnostics: UIDiagnostic[],
): void {
	const prefix = assetPath(document.id);
	for (const item of items) {
		diagnostics.push({
			...item,
			path: `${prefix}${item.path.slice(1)}`,
		});
	}
}

function validateDependencyCycles(
	registry: UIAssetRegistry,
	diagnostics: UIDiagnostic[],
): void {
	const visited = new Set<string>();
	const active = new Set<string>();
	const reported = new Set<string>();
	for (const document of registry.listAssets()) {
		visitDependencies(document, registry, visited, active, reported, diagnostics, []);
	}
}

function visitDependencies(
	document: UIDocument,
	registry: UIAssetRegistry,
	visited: Set<string>,
	active: Set<string>,
	reported: Set<string>,
	diagnostics: UIDiagnostic[],
	chain: readonly string[],
): void {
	if (visited.has(document.id)) return;
	active.add(document.id);
	const nextChain = [...chain, document.id];
	for (const dependency of collectUIAssetDependencies(document)) {
		const target = registry.getAsset(dependency.assetId);
		if (!target) continue;
		if (active.has(target.id)) {
			const cycleStart = nextChain.indexOf(target.id);
			const cycle = [...nextChain.slice(cycleStart), target.id];
			const identity = cycle.join(' -> ');
			if (reported.has(identity)) continue;
			reported.add(identity);
			addUIDiagnostic(
				diagnostics,
				'circular-ui-asset-dependency',
				`${assetPath(document.id)}${dependency.path.slice(1)}`,
				`Circular UI asset dependency detected: ${identity}.`,
			);
			continue;
		}
		visitDependencies(target, registry, visited, active, reported, diagnostics, nextChain);
	}
	active.delete(document.id);
	visited.add(document.id);
}

function assetPath(id: string): string {
	return `$.assets[${JSON.stringify(id)}]`;
}
