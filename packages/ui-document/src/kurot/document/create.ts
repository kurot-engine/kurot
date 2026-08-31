import { UI_DOCUMENT_FORMAT_VERSION } from '../version.js';
import { UI_DOCUMENT_KIND } from '../model/UIDocument.js';
import type { UIAssetContract } from '../model/UIAssetContract.js';
import type { UIAssetKind } from '../model/UIAssetKind.js';
import type { UIComponentInstance } from '../model/UIComponentInstance.js';
import type { UIDocument } from '../model/UIDocument.js';
import type { UIAppearanceReference } from '../model/UIReference.js';
import type { UINode } from '../model/UINode.js';
import type { UIPropertyValue } from '../model/UIPropertyValue.js';
import { createUIAssetContract } from './create-asset-contract.js';
import { createUIComponentInstance } from './create-component-instance.js';
import { assertNonEmpty } from '../shared/strings.js';

/**
 * Input accepted by createUINode.
 */
export interface CreateUINodeOptions {
	/**
	 * Stable identifier, unique within the eventual document.
	 */
	readonly id: string;

	/**
	 * Component type key resolved outside this package.
	 */
	readonly type: string;

	/**
	 * Initial explicit properties. The top-level record is copied.
	 */
	readonly properties?: Readonly<Record<string, UIPropertyValue>>;

	/**
	 * Optional reusable component source and instance-local differences.
	 */
	readonly instance?: UIComponentInstance;

	/**
	 * Optional appearance asset applied to this runtime component.
	 */
	readonly appearance?: UIAppearanceReference;

	/**
	 * Initial ordered children. The array is copied.
	 */
	readonly children?: readonly UINode[];
}

/**
 * Input accepted by createUIDocument.
 */
export interface CreateUIDocumentOptions {
	/**
	 * Stable document identifier assigned by the owning project.
	 */
	readonly id: string;

	/**
	 * Authoring purpose. Defaults to screen for simple documents.
	 */
	readonly assetKind?: UIAssetKind;

	/**
	 * Public contract exposed by the asset.
	 */
	readonly contract?: UIAssetContract;

	/**
	 * Root component instance.
	 */
	readonly root: UINode;
}

/**
 * Creates a node with explicit empty property and child collections.
 */
export function createUINode(options: CreateUINodeOptions): UINode {
	assertNonEmpty(options.id, 'Node id');
	assertNonEmpty(options.type, 'Node type');

	return {
		id: options.id,
		type: options.type,
		properties: { ...options.properties },
		...(options.instance === undefined
			? {}
			: { instance: createUIComponentInstance(options.instance) }),
		...(options.appearance === undefined
			? {}
			: { appearance: { ...options.appearance } }),
		children: [...(options.children ?? [])],
	};
}

/**
 * Creates a document using the latest semantic format version.
 */
export function createUIDocument(options: CreateUIDocumentOptions): UIDocument {
	assertNonEmpty(options.id, 'Document id');

	return {
		kind: UI_DOCUMENT_KIND,
		formatVersion: UI_DOCUMENT_FORMAT_VERSION,
		id: options.id,
		assetKind: options.assetKind ?? 'screen',
		contract: createUIAssetContract(options.contract),
		root: options.root,
	};
}
