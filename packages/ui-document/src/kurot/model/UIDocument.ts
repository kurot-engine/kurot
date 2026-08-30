import type { UIAssetContract } from './UIAssetContract.js';
import type { UIAssetKind } from './UIAssetKind.js';
import type { UINode } from './UINode.js';

/**
 * Discriminator written into every Kurot UI document.
 */
export const UI_DOCUMENT_KIND = 'kurot-ui-document';

/**
 * Root serializable unit consumed by UI editing tools and adapters.
 */
export interface UIDocument {
	/**
	 * Stable discriminator used to reject unrelated JSON documents.
	 */
	readonly kind: typeof UI_DOCUMENT_KIND;

	/**
	 * Semantic format version, independent of the npm package version.
	 */
	readonly formatVersion: number;

	/**
	 * Stable document identifier assigned by the owning project.
	 */
	readonly id: string;

	/**
	 * Authoring purpose that determines cross-document behavior.
	 */
	readonly assetKind: UIAssetKind;

	/**
	 * Public parameters, parts, slots, states, and variants exposed by the asset.
	 */
	readonly contract: UIAssetContract;

	/**
	 * Root component instance of the document.
	 */
	readonly root: UINode;
}
