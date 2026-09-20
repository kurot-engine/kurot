/**
 * One-based source coordinates for a UTF-16 offset.
 */
export interface SourcePosition {
	readonly line: number;
	readonly column: number;
	readonly offset: number;
}

/**
 * Maps source offsets to one-based lines and UTF-16 code-unit columns.
 */
export class SourceLocator {
	// ── Instance fields ───────────────────────────────────────────────

	private readonly _lineStarts: readonly number[];
	private readonly _sourceLength: number;

	// ── Constructor ───────────────────────────────────────────────────

	public constructor(source: string) {
		this._sourceLength = source.length;
		const lineStarts = [0];
		for (let i = 0; i < source.length; i++) {
			if (source.charCodeAt(i) === 10) {
				lineStarts.push(i + 1);
			}
		}
		this._lineStarts = lineStarts;
	}

	// ── Public methods ────────────────────────────────────────────────

	/**
	 * Returns the one-based line and column for a source offset.
	 */
	public locate(offset: number): SourcePosition {
		if (!Number.isInteger(offset) || offset < 0 || offset > this._sourceLength) {
			throw new RangeError(`Source offset must be an integer from 0 to ${this._sourceLength}, got ${offset}`);
		}

		let low = 0;
		let high = this._lineStarts.length - 1;
		while (low <= high) {
			const middle = Math.floor((low + high) / 2);
			if (this._lineStarts[middle] <= offset) {
				low = middle + 1;
			} else {
				high = middle - 1;
			}
		}

		const lineIndex = Math.max(0, high);
		return {
			line: lineIndex + 1,
			column: offset - this._lineStarts[lineIndex] + 1,
			offset,
		};
	}
}

/**
 * Creates a reusable locator for a source string.
 */
export function createSourceLocator(source: string): SourceLocator {
	return new SourceLocator(source);
}
