import type { UIAssetContract, UIPropertyValue } from '@kurot/ui-document';
import { matchesUIPropertyDefinition } from '@kurot/ui-document';
import { applyRuntimeProperty } from '../applyRuntimeProperty.js';
import { KurotUIRuntimeError } from '../KurotUIRuntimeError.js';
import { qualifyNodeId } from '../materializeNode.js';
import type {
	KurotUICreationContext,
	KurotUIDataController,
} from '../types.js';

/**
 * Creates one validated controller for an asset's bounded external data.
 */
export function createDataController(
	contract: UIAssetContract,
	assetId: string,
	scope: string,
	context: KurotUICreationContext,
	initialValues: Readonly<Record<string, UIPropertyValue>> = {},
): KurotUIDataController {
	const definitions = contract.dataFields ?? {};
	const fields = Object.keys(definitions).sort();
	const values = new Map<string, UIPropertyValue>();
	assertKnownInitialValues(initialValues, definitions, assetId);

	const controller: KurotUIDataController = {
		fields: Object.freeze(fields),
		getValue(name: string): UIPropertyValue | undefined {
			return values.get(name);
		},
		setValue(name: string, value: UIPropertyValue): void {
			const definition = definitions[name];
			if (definition === undefined) {
				throw invalidData(`Data field "${name}" is not declared.`, assetId, name);
			}
			if (!matchesUIPropertyDefinition(value, definition)) {
				throw invalidData(`Data field "${name}" does not satisfy its Schema.`, assetId, name);
			}
			values.set(name, value);
			applyBindings(contract, name, value, scope, context);
		},
	};

	for (const name of fields) {
		const definition = definitions[name]!;
		const value = Object.hasOwn(initialValues, name)
			? initialValues[name]
			: definition.defaultValue;
		if (value !== undefined) {
			controller.setValue(name, value);
		}
	}
	return controller;
}

function applyBindings(
	contract: UIAssetContract,
	source: string,
	value: UIPropertyValue,
	scope: string,
	context: KurotUICreationContext,
): void {
	const bindings = contract.dataBindings ?? {};
	for (const name of Object.keys(bindings).sort()) {
		const binding = bindings[name]!;
		if (binding.source !== source) {
			continue;
		}
		const identity = qualifyNodeId(scope, binding.targetId);
		const target = context.instances.get(identity);
		const type = context.types.get(identity);
		if (target === undefined || type === undefined) {
			continue;
		}
		applyRuntimeProperty(
			target,
			type,
			binding.property,
			value,
			`$.contract.dataBindings.${name}`,
			context,
		);
	}
}

function assertKnownInitialValues(
	values: Readonly<Record<string, UIPropertyValue>>,
	definitions: UIAssetContract['dataFields'],
	assetId: string,
): void {
	for (const name of Object.keys(values)) {
		if (definitions?.[name] !== undefined) {
			continue;
		}
		throw invalidData(`Initial data field "${name}" is not declared.`, assetId, name);
	}
}

function invalidData(
	message: string,
	assetId: string,
	name: string,
): KurotUIRuntimeError {
	return new KurotUIRuntimeError(
		'invalid-data',
		message,
		`$.assets[${JSON.stringify(assetId)}].contract.dataFields.${name}`,
	);
}
