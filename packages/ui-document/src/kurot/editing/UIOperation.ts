import type {
	UIPartDefinition,
	UIParameterDefinition,
	UISlotDefinition,
	UIStateDefinition,
	UIVariantDefinition,
} from '../model/UIAssetContract.js';
import type {
	UIComponentInstance,
	UIInstanceOverride,
} from '../model/UIComponentInstance.js';
import type { UIAppearanceReference } from '../model/UIReference.js';
import type { UINode } from '../model/UINode.js';
import type { UIPropertyValue } from '../model/UIPropertyValue.js';

/**
 * Ordered child collection receiving an inserted or moved node.
 */
export type UIChildTarget =
	| {
			readonly collection: 'children';
			readonly parentId: string;
	  }
	| {
			readonly collection: 'slot';
			readonly parentId: string;
			readonly slot: string;
	  };

/**
 * Semantic mutation accepted by the headless editing kernel.
 */
export type UIOperation =
	| {
			readonly kind: 'insert-node';
			readonly target: UIChildTarget;
			readonly index: number;
			readonly node: UINode;
	  }
	| { readonly kind: 'remove-node'; readonly nodeId: string }
	| {
			readonly kind: 'move-node';
			readonly nodeId: string;
			readonly target: UIChildTarget;
			readonly index: number;
	  }
	| { readonly kind: 'replace-node-type'; readonly nodeId: string; readonly type: string }
	| {
			readonly kind: 'set-node-property';
			readonly nodeId: string;
			readonly property: string;
			readonly value: UIPropertyValue;
	  }
	| { readonly kind: 'remove-node-property'; readonly nodeId: string; readonly property: string }
	| {
			readonly kind: 'set-node-instance';
			readonly nodeId: string;
			readonly instance: UIComponentInstance;
	  }
	| { readonly kind: 'remove-node-instance'; readonly nodeId: string }
	| {
			readonly kind: 'set-instance-parameter';
			readonly nodeId: string;
			readonly parameter: string;
			readonly value: UIPropertyValue;
	  }
	| {
			readonly kind: 'remove-instance-parameter';
			readonly nodeId: string;
			readonly parameter: string;
	  }
	| { readonly kind: 'set-instance-variant'; readonly nodeId: string; readonly variant: string }
	| { readonly kind: 'remove-instance-variant'; readonly nodeId: string }
	| {
			readonly kind: 'set-instance-override';
			readonly nodeId: string;
			readonly override: UIInstanceOverride;
	  }
	| {
			readonly kind: 'remove-instance-override';
			readonly nodeId: string;
			readonly part: string;
			readonly property: string;
	  }
	| {
			readonly kind: 'set-node-appearance';
			readonly nodeId: string;
			readonly appearance: UIAppearanceReference;
	  }
	| { readonly kind: 'remove-node-appearance'; readonly nodeId: string }
	| {
			readonly kind: 'set-contract-parameter';
			readonly name: string;
			readonly definition: UIParameterDefinition;
	  }
	| { readonly kind: 'remove-contract-parameter'; readonly name: string }
	| {
			readonly kind: 'set-contract-part';
			readonly name: string;
			readonly definition: UIPartDefinition;
	  }
	| { readonly kind: 'remove-contract-part'; readonly name: string }
	| {
			readonly kind: 'set-contract-slot';
			readonly name: string;
			readonly definition: UISlotDefinition;
	  }
	| { readonly kind: 'remove-contract-slot'; readonly name: string }
	| {
			readonly kind: 'set-contract-state';
			readonly name: string;
			readonly definition: UIStateDefinition;
	  }
	| { readonly kind: 'remove-contract-state'; readonly name: string }
	| {
			readonly kind: 'set-contract-variant';
			readonly name: string;
			readonly definition: UIVariantDefinition;
	  }
	| { readonly kind: 'remove-contract-variant'; readonly name: string };

/**
 * Immutable result of applying one semantic operation.
 */
export interface UIOperationResult {
	/**
	 * Updated document snapshot.
	 */
	readonly document: import('../model/UIDocument.js').UIDocument;

	/**
	 * Operation that restores the input snapshot when applied immediately.
	 */
	readonly inverse: UIOperation;
}
