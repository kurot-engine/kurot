import type { UIDocument } from '../model/UIDocument.js';
import { validateUIDocument } from '../validation/validateUIDocument.js';
import { applyUITransaction } from './applyUITransaction.js';
import { UIEditError } from './UIEditError.js';
import type {
	ApplyUITransactionOptions,
	UIRevisionSnapshot,
	UITransaction,
	UITransactionResult,
} from './UITransaction.js';

interface UIHistoryEntry {
	readonly forward: UITransaction;
	readonly inverse: UITransaction;
}

/**
 * In-memory monotonic document history used by editors and Agent workflows.
 */
export class UIDocumentHistory {
	private _snapshot: UIRevisionSnapshot;
	private readonly _options: ApplyUITransactionOptions;
	private readonly _undoEntries: UIHistoryEntry[] = [];
	private readonly _redoEntries: UIHistoryEntry[] = [];

	public constructor(
		document: UIDocument,
		options: ApplyUITransactionOptions = {},
		initialRevision = 0,
	) {
		const diagnostics = validateUIDocument(document);
		if (diagnostics.length > 0) {
			throw new UIEditError(
				'invalid-edit-result',
				'History requires a valid initial UI document.',
				'$',
				diagnostics,
			);
		}
		if (!Number.isInteger(initialRevision) || initialRevision < 0) {
			throw new UIEditError(
				'invalid-operation',
				'Initial revision must be a non-negative integer.',
				'$.revision',
			);
		}
		this._snapshot = { document, revision: initialRevision };
		this._options = options;
	}

	/**
	 * Current immutable document snapshot and monotonic revision.
	 */
	public get snapshot(): UIRevisionSnapshot {
		return this._snapshot;
	}

	/**
	 * Whether a committed user transaction can be undone.
	 */
	public get canUndo(): boolean {
		return this._undoEntries.length > 0;
	}

	/**
	 * Whether the most recently undone transaction can be replayed.
	 */
	public get canRedo(): boolean {
		return this._redoEntries.length > 0;
	}

	/**
	 * Commits one user or Agent transaction and clears the redo branch.
	 */
	public commit(transaction: UITransaction): UITransactionResult {
		const result = applyUITransaction(this._snapshot, transaction, this._options);
		this._snapshot = result;
		this._undoEntries.push({ forward: transaction, inverse: result.inverse });
		this._redoEntries.length = 0;
		return result;
	}

	/**
	 * Applies the inverse of the latest committed transaction as a new revision.
	 */
	public undo(): UITransactionResult | undefined {
		const entry = this._undoEntries.at(-1);
		if (!entry) return undefined;
		const transaction: UITransaction = {
			...entry.inverse,
			id: `undo:${entry.forward.id}:${this._snapshot.revision}`,
			expectedRevision: this._snapshot.revision,
		};
		const result = applyUITransaction(this._snapshot, transaction, this._options);
		this._undoEntries.pop();
		this._redoEntries.push(entry);
		this._snapshot = result;
		return result;
	}

	/**
	 * Replays the latest undone transaction as a new revision.
	 */
	public redo(): UITransactionResult | undefined {
		const entry = this._redoEntries.at(-1);
		if (!entry) return undefined;
		const transaction: UITransaction = {
			...entry.forward,
			id: `redo:${entry.forward.id}:${this._snapshot.revision}`,
			expectedRevision: this._snapshot.revision,
		};
		const result = applyUITransaction(this._snapshot, transaction, this._options);
		this._redoEntries.pop();
		this._undoEntries.push({ forward: entry.forward, inverse: result.inverse });
		this._snapshot = result;
		return result;
	}

	/**
	 * Drops undo and redo entries without changing the current document.
	 */
	public clear(): void {
		this._undoEntries.length = 0;
		this._redoEntries.length = 0;
	}
}
