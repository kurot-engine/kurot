import type {
	UIAssetContract,
	UIParameterDefinition,
	UIPartDefinition,
	UISlotDefinition,
	UIStateDefinition,
	UIVariantDefinition,
} from '../model/UIAssetContract.js';
import type { UIDocument } from '../model/UIDocument.js';
import type { UIOperation, UIOperationResult } from './UIOperation.js';
import { missingValue, requireName } from './editHelpers.js';

type UIContractOperation = Extract<
	UIOperation,
	{ readonly kind: `${'remove' | 'set'}-contract-${string}` }
>;

/**
 * Applies one contract-entry operation and returns its exact inverse.
 */
export function applyContractOperation(
	document: UIDocument,
	operation: UIContractOperation,
): UIOperationResult {
	switch (operation.kind) {
		case 'set-contract-parameter':
			return setEntry(document, operation.name, 'parameters', operation.definition,
				previous => previous
					? { kind: 'set-contract-parameter', name: operation.name, definition: previous }
					: { kind: 'remove-contract-parameter', name: operation.name });
		case 'remove-contract-parameter':
			return removeEntry<UIParameterDefinition>(document, operation.name, 'parameters', previous => ({
				kind: 'set-contract-parameter', name: operation.name, definition: previous,
			}));
		case 'set-contract-part':
			return setEntry(document, operation.name, 'parts', operation.definition,
				previous => previous
					? { kind: 'set-contract-part', name: operation.name, definition: previous }
					: { kind: 'remove-contract-part', name: operation.name });
		case 'remove-contract-part':
			return removeEntry<UIPartDefinition>(document, operation.name, 'parts', previous => ({
				kind: 'set-contract-part', name: operation.name, definition: previous,
			}));
		case 'set-contract-slot':
			return setEntry(document, operation.name, 'slots', operation.definition,
				previous => previous
					? { kind: 'set-contract-slot', name: operation.name, definition: previous }
					: { kind: 'remove-contract-slot', name: operation.name });
		case 'remove-contract-slot':
			return removeEntry<UISlotDefinition>(document, operation.name, 'slots', previous => ({
				kind: 'set-contract-slot', name: operation.name, definition: previous,
			}));
		case 'set-contract-state':
			return setEntry(document, operation.name, 'states', operation.definition,
				previous => previous
					? { kind: 'set-contract-state', name: operation.name, definition: previous }
					: { kind: 'remove-contract-state', name: operation.name });
		case 'remove-contract-state':
			return removeEntry<UIStateDefinition>(document, operation.name, 'states', previous => ({
				kind: 'set-contract-state', name: operation.name, definition: previous,
			}));
		case 'set-contract-variant':
			return setEntry(document, operation.name, 'variants', operation.definition,
				previous => previous
					? { kind: 'set-contract-variant', name: operation.name, definition: previous }
					: { kind: 'remove-contract-variant', name: operation.name });
		case 'remove-contract-variant':
			return removeEntry<UIVariantDefinition>(document, operation.name, 'variants', previous => ({
				kind: 'set-contract-variant', name: operation.name, definition: previous,
			}));
	}
}

function setEntry<TValue>(
	document: UIDocument,
	nameInput: string,
	key: ContractCollection,
	definition: TValue,
	createInverse: (previous: TValue | undefined) => UIOperation,
): UIOperationResult {
	const name = requireName(nameInput, 'Contract entry name');
	const entries = document.contract[key] as Readonly<Record<string, TValue>>;
	const contract = {
		...document.contract,
		[key]: { ...entries, [name]: definition },
	};
	return {
		document: { ...document, contract },
		inverse: createInverse(entries[name]),
	};
}

function removeEntry<TValue>(
	document: UIDocument,
	name: string,
	key: ContractCollection,
	createInverse: (previous: TValue) => UIOperation,
): UIOperationResult {
	const entries = document.contract[key] as Readonly<Record<string, TValue>>;
	const previous = entries[name];
	if (!previous) throw missingValue('Contract entry', '$.name');
	const nextEntries: Record<string, TValue> = { ...entries };
	delete nextEntries[name];
	return {
		document: {
			...document,
			contract: { ...document.contract, [key]: nextEntries },
		},
		inverse: createInverse(previous),
	};
}

type ContractCollection = keyof Pick<
	UIAssetContract,
	'parameters' | 'parts' | 'slots' | 'states' | 'variants'
>;
