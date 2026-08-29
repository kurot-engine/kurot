import { UI_DOCUMENT_FORMAT_VERSION } from '../version.js';
import { UI_DOCUMENT_KIND } from '../model/UIDocument.js';
import type { UIDocument } from '../model/UIDocument.js';
import type { UINode } from '../model/UINode.js';
import type { UIPropertyValue } from '../model/UIPropertyValue.js';

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
		root: options.root,
	};
}

function assertNonEmpty(value: string, label: string): void {
	if (value.trim().length === 0) {
		throw new Error(`${label} must not be empty.`);
	}
}
