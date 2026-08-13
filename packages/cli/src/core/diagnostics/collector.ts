import { isStrictDiagnosticCode } from './codes.js';
import type { Diagnostic, DiagnosticPolicy } from './types.js';

/**
 * Collects, normalizes, deduplicates, and orders build diagnostics.
 */
export class DiagnosticCollector {
	// ── Instance fields ───────────────────────────────────────────────

	private readonly _diagnostics = new Map<string, Diagnostic>();

	// ── Constructor ───────────────────────────────────────────────────

	public constructor(private readonly _policy: DiagnosticPolicy) {}

	// ── Public methods ────────────────────────────────────────────────

	/**
	 * Adds a diagnostic after applying the active policy.
	 */
	public report(diagnostic: Diagnostic): void {
		const normalized = this._normalize(diagnostic);
		const key = this._key(normalized);
		if (this._diagnostics.has(key)) return;
		this._diagnostics.set(key, normalized);
	}

	/**
	 * Returns all diagnostics in stable source order.
	 */
	public all(): readonly Diagnostic[] {
		return [...this._diagnostics.values()].sort(compareDiagnostics);
	}

	/**
	 * Returns whether any collected diagnostic is an error.
	 */
	public hasErrors(): boolean {
		return [...this._diagnostics.values()].some(diagnostic => diagnostic.severity === 'error');
	}

	// ── Private methods ───────────────────────────────────────────────

	private _normalize(diagnostic: Diagnostic): Diagnostic {
		if (!this._policy.strict || diagnostic.severity === 'error' || !isStrictDiagnosticCode(diagnostic.code)) {
			return diagnostic;
		}
		return { ...diagnostic, severity: 'error' };
	}

	private _key(diagnostic: Diagnostic): string {
		const location = diagnostic.location;
		return [
			diagnostic.code,
			location?.file ?? '',
			location?.line ?? '',
			location?.column ?? '',
			location?.offset ?? '',
			diagnostic.message,
		].join('\u0000');
	}
}

function compareDiagnostics(a: Diagnostic, b: Diagnostic): number {
	const fileOrder = (a.location?.file ?? '').localeCompare(b.location?.file ?? '');
	if (fileOrder !== 0) return fileOrder;

	const lineOrder = (a.location?.line ?? 0) - (b.location?.line ?? 0);
	if (lineOrder !== 0) return lineOrder;

	const columnOrder = (a.location?.column ?? 0) - (b.location?.column ?? 0);
	if (columnOrder !== 0) return columnOrder;

	return a.code.localeCompare(b.code);
}
