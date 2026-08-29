import { DIAGNOSTIC_CODES } from '../diagnostics/index.js';
import { createSourceLocator } from './source-location.js';
import { suggestComponentTag } from './registry.js';
import type { Diagnostic } from '../diagnostics/index.js';
import type { UnresolvedTag } from './ast.js';
import type { NamespaceModule } from './registry.js';

/**
 * Creates source-located diagnostics for unresolved EXML component tags.
 */
export function createUnresolvedTagDiagnostics(
	file: string,
	source: string,
	tags: readonly UnresolvedTag[],
	customNamespaces: readonly NamespaceModule[] = [],
): readonly Diagnostic[] {
	const locator = createSourceLocator(source);
	return tags.map(tag => {
		const position = locator.locate(tag.range.start);
		const suggestion = suggestComponentTag(tag.name, customNamespaces);
		return {
			code: DIAGNOSTIC_CODES.EXML_UNKNOWN_TAG,
			severity: 'warning',
			message: `Unknown EXML tag "${tag.name}" was dropped from the generated skin.`,
			location: {
				file,
				line: position.line,
				column: position.column,
				offset: position.offset,
			},
			...(suggestion ? { suggestions: [`Did you mean "${suggestion}"?`] } : {}),
		};
	});
}
