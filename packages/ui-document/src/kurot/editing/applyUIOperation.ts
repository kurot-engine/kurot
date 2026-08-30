import type { UIDocument } from '../model/UIDocument.js';
import { validateUIDocument } from '../validation/validateUIDocument.js';
import { applyContractOperation } from './applyContractOperation.js';
import { applyInstanceOperation } from './applyInstanceOperation.js';
import { applyNodeOperation } from './applyNodeOperation.js';
import { UIEditError } from './UIEditError.js';
import type { UIOperation, UIOperationResult } from './UIOperation.js';

/**
 * Applies one semantic operation and rejects an invalid resulting document.
 */
export function applyUIOperation(
	document: UIDocument,
	operation: UIOperation,
): UIOperationResult {
	const result = applyUIOperationUnchecked(document, operation);
	const diagnostics = validateUIDocument(result.document);
	if (diagnostics.length > 0) {
		throw new UIEditError(
			'invalid-edit-result',
			'Operation produced an invalid UI document.',
			'$',
			diagnostics,
		);
	}
	return result;
}

/**
 * Applies one operation without final validation so transactions may be atomic.
 */
export function applyUIOperationUnchecked(
	document: UIDocument,
	operation: UIOperation,
): UIOperationResult {
	switch (operation.kind) {
		case 'set-contract-parameter':
		case 'remove-contract-parameter':
		case 'set-contract-part':
		case 'remove-contract-part':
		case 'set-contract-slot':
		case 'remove-contract-slot':
		case 'set-contract-state':
		case 'remove-contract-state':
		case 'set-contract-variant':
		case 'remove-contract-variant':
			return applyContractOperation(document, operation);
		case 'set-node-instance':
		case 'remove-node-instance':
		case 'set-instance-parameter':
		case 'remove-instance-parameter':
		case 'set-instance-variant':
		case 'remove-instance-variant':
		case 'set-instance-override':
		case 'remove-instance-override':
			return applyInstanceOperation(document, operation);
		default:
			return applyNodeOperation(document, operation);
	}
}
