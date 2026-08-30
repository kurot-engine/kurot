import type { UIDocument } from '../model/UIDocument.js';
import type { UIDiagnostic } from '../validation/UIDiagnostic.js';
import type { UIDocumentChange } from './diffUIDocuments.js';
import type { UIOperation } from './UIOperation.js';

/**
 * Immutable document snapshot paired with its editing revision.
 */
export interface UIRevisionSnapshot {
	/**
	 * Current semantic document.
	 */
	readonly document: UIDocument;

	/**
	 * Monotonically increasing edit revision.
	 */
	readonly revision: number;
}

/**
 * Atomic group of semantic operations expressing one user intent.
 */
export interface UITransaction {
	/**
	 * Caller-supplied stable transaction identity.
	 */
	readonly id: string;

	/**
	 * Revision used when the transaction was authored.
	 */
	readonly expectedRevision: number;

	/**
	 * Human-readable intent shown in review and history UI.
	 */
	readonly summary: string;

	/**
	 * Ordered operations committed atomically.
	 */
	readonly operations: readonly UIOperation[];
}

/**
 * Optional semantic validation performed against the final transaction result.
 */
export type UITransactionValidator = (
	document: UIDocument,
) => readonly UIDiagnostic[];

/**
 * Transaction application customization.
 */
export interface ApplyUITransactionOptions {
	/**
	 * Project-aware validator run after built-in structural validation.
	 */
	readonly validate?: UITransactionValidator;
}

/**
 * Committed transaction result and its complete undo information.
 */
export interface UITransactionResult extends UIRevisionSnapshot {
	/**
	 * Original transaction that was committed.
	 */
	readonly transaction: UITransaction;

	/**
	 * Reverse-ordered transaction that restores the input document.
	 */
	readonly inverse: UITransaction;

	/**
	 * Deterministic semantic differences produced by the commit.
	 */
	readonly changes: readonly UIDocumentChange[];
}
