import { validateUIDocument } from '../validation/validateUIDocument.js';
import { applyUIOperationUnchecked } from './applyUIOperation.js';
import { diffUIDocuments } from './diffUIDocuments.js';
import { UIEditError } from './UIEditError.js';
import type { UIOperation } from './UIOperation.js';
import type {
	ApplyUITransactionOptions,
	UIRevisionSnapshot,
	UITransaction,
	UITransactionResult,
} from './UITransaction.js';

/**
 * Applies an ordered transaction atomically against one revision snapshot.
 */
export function applyUITransaction(
	snapshot: UIRevisionSnapshot,
	transaction: UITransaction,
	options: ApplyUITransactionOptions = {},
): UITransactionResult {
	validateTransaction(snapshot, transaction);
	let document = snapshot.document;
	const inverses: UIOperation[] = [];
	for (let index = 0; index < transaction.operations.length; index++) {
		try {
			const result = applyUIOperationUnchecked(document, transaction.operations[index]!);
			document = result.document;
			inverses.unshift(result.inverse);
		} catch (error) {
			if (!(error instanceof UIEditError)) throw error;
			throw new UIEditError(
				error.code,
				`Transaction operation ${index} failed: ${error.message}`,
				`$.operations[${index}]${error.path === '$' ? '' : error.path.slice(1)}`,
				error.diagnostics,
			);
		}
	}

	const diagnostics = [
		...validateUIDocument(document),
		...(options.validate?.(document) ?? []),
	];
	if (diagnostics.length > 0) {
		throw new UIEditError(
			'invalid-edit-result',
			'Transaction produced an invalid UI document.',
			'$',
			diagnostics,
		);
	}

	const revision = snapshot.revision + 1;
	return Object.freeze({
		document,
		revision,
		transaction,
		inverse: {
			id: `${transaction.id}:inverse`,
			expectedRevision: revision,
			summary: `Undo: ${transaction.summary}`,
			operations: inverses,
		},
		changes: diffUIDocuments(snapshot.document, document),
	});
}

function validateTransaction(
	snapshot: UIRevisionSnapshot,
	transaction: UITransaction,
): void {
	if (!Number.isInteger(snapshot.revision) || snapshot.revision < 0) {
		throw new UIEditError(
			'invalid-operation',
			'Snapshot revision must be a non-negative integer.',
			'$.revision',
		);
	}
	if (transaction.expectedRevision !== snapshot.revision) {
		const message =
			`Transaction expected revision ${transaction.expectedRevision}, ` +
			`but the current revision is ${snapshot.revision}.`;
		throw new UIEditError(
			'revision-conflict',
			message,
			'$.expectedRevision',
		);
	}
	if (transaction.id.trim().length === 0) {
		throw new UIEditError(
			'invalid-operation',
			'Transaction id must not be empty.',
			'$.id',
		);
	}
	if (transaction.summary.trim().length === 0) {
		throw new UIEditError(
			'invalid-operation',
			'Transaction summary must not be empty.',
			'$.summary',
		);
	}
	if (transaction.operations.length === 0) {
		throw new UIEditError(
			'transaction-empty',
			'Transaction must contain at least one operation.',
			'$.operations',
		);
	}
}
