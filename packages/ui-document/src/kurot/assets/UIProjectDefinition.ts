import type { UIPropertyValue } from '../model/UIPropertyValue.js';
import type {
	UIDesignTokenType,
	UIResourceType,
} from '../model/UIReference.js';

/**
 * Project resource identity available to semantic UI assets.
 */
export interface UIResourceDefinition {
	/**
	 * Project-stable key used by resource references.
	 */
	readonly key: string;

	/**
	 * Resource category exposed to authoring validation.
	 */
	readonly resourceType: UIResourceType;
}

/**
 * Project design token available to semantic UI assets.
 */
export interface UIDesignTokenDefinition {
	/**
	 * Project-stable key used by token references.
	 */
	readonly key: string;

	/**
	 * Semantic category used to constrain consumers.
	 */
	readonly tokenType: UIDesignTokenType;

	/**
	 * Serializable canonical token value.
	 */
	readonly value: UIPropertyValue;
}
