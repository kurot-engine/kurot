import type { UIDocument } from '../model/UIDocument.js';
import type { UIPropertyValue } from '../model/UIPropertyValue.js';
import { isUIDesignTokenReference } from '../model/UIReference.js';
import { getUIStyleColor } from './UIStyleSheet.js';

/**
 * Resolves color tokens in a disposable compilation/preview copy, including states and variants.
 * Authored XML, IDs, child order, and history retain their references. Other token categories stay unresolved.
 */
export function resolveUIStyleColors(document: UIDocument, colors: Readonly<Record<string, number>>): UIDocument {
	function visit(value: UIPropertyValue, path: string): UIPropertyValue {
		if (isUIDesignTokenReference(value) && value.tokenType === 'color') {
			try {
				return getUIStyleColor(colors, value.key);
			} catch (cause) {
				throw new Error(`${path}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
			}
		}
		if (Array.isArray(value)) {
			return value.map((item, index) => visit(item, `${path}[${index}]`));
		}
		if (typeof value === 'object') {
			return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item, `${path}.${key}`)]));
		}
		return value;
	}

	// UIDocument is a validated plain data tree. Resolving references never changes its structural shape.
	return visit(document as unknown as UIPropertyValue, '$') as unknown as UIDocument;
}
