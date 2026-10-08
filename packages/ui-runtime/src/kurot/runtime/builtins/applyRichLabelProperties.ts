import type { RichLabel } from '@kurot/ui';
import { isUITextFlow } from '@kurot/ui-document';
import { applyTextLayoutProperty } from './applyTextLayoutProperties.js';
import { invalidRuntimeValue, requireBoolean } from './valueGuards.js';

/**
 * Applies the shared textFlow contract; the native setter owns its run copies.
 */
export function applyRichLabelProperty(target: RichLabel, name: string, value: unknown, path: string): boolean {
	if (applyTextLayoutProperty(target, name, value, path)) {
		return true;
	}
	switch (name) {
		case 'textFlow':
			if (!isUITextFlow(value)) {
				throw invalidRuntimeValue('a valid textFlow array', path);
			}
			target.textFlow = value;
			return true;
		case 'wordWrap':
			target.wordWrap = requireBoolean(value, path);
			return true;
		default:
			return false;
	}
}
