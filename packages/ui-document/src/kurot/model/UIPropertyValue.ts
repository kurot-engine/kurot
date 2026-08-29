/**
 * Scalar value accepted by a UI property.
 */
export type UIPropertyPrimitive = boolean | number | string;

/**
 * String-keyed structured value accepted by a UI property.
 */
export interface UIPropertyObject {
	readonly [key: string]: UIPropertyValue;
}

/**
 * Serializable value stored in a node property.
 * Undefined, null, functions, and non-finite numbers are not valid values.
 */
export type UIPropertyValue =
	| UIPropertyPrimitive
	| readonly UIPropertyValue[]
	| UIPropertyObject;
