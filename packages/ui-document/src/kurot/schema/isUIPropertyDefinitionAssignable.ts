import type {
	UIPropertyDefinition,
} from './UIComponentDefinition.js';
import { toValueTypes } from './UIComponentDefinition.js';
import { matchesUIPropertyDefinition } from './matchesUIPropertyDefinition.js';

/**
 * Reports whether every value accepted by a source schema is safe for a target schema.
 */
export function isUIPropertyDefinitionAssignable(
	source: UIPropertyDefinition,
	target: UIPropertyDefinition,
): boolean {
	const targetTypes = new Set(toValueTypes(target.valueType));
	if (
		!toValueTypes(source.valueType).every(type =>
			targetTypes.has(type) || targetTypes.has('value'),
		)
	) {
		return false;
	}
	if (!referenceTypesAreAssignable(source.resourceTypes, target.resourceTypes)) {
		return false;
	}
	if (!referenceTypesAreAssignable(source.tokenTypes, target.tokenTypes)) {
		return false;
	}
	if (source.enumValues !== undefined) {
		return source.enumValues.every(value =>
			matchesUIPropertyDefinition(value, target),
		);
	}
	if (target.enumValues !== undefined) {
		return false;
	}
	return numericDomainIsAssignable(source, target);
}
function numericDomainIsAssignable(
	source: UIPropertyDefinition,
	target: UIPropertyDefinition,
): boolean {
	if (!toValueTypes(source.valueType).includes('number')) {
		return true;
	}
	if (target.minimum !== undefined) {
		if (source.minimum === undefined || source.minimum < target.minimum) {
			return false;
		}
	}
	if (target.maximum !== undefined) {
		if (source.maximum === undefined || source.maximum > target.maximum) {
			return false;
		}
	}
	return !target.integer || source.integer === true;
}

function referenceTypesAreAssignable<TType extends string>(
	source: readonly TType[] | undefined,
	target: readonly TType[] | undefined,
): boolean {
	if (target === undefined) {
		return true;
	}
	if (source === undefined) {
		return false;
	}
	return source.every(type => target.includes(type));
}
