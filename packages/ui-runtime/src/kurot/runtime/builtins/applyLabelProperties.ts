import { Label } from '@kurot/ui';
import { requireBoolean, requireNumber, requireString } from './valueGuards.js';

/**
 * Applies one property owned by Label and inherited by its subclasses.
 */
export function applyLabelProperty(
	target: Label,
	name: string,
	value: unknown,
	path: string,
): boolean {
	switch (name) {
		case 'bold':
			target.bold = requireBoolean(value, path);
			return true;
		case 'displayAsPassword':
			target.displayAsPassword = requireBoolean(value, path);
			return true;
		case 'fontFamily':
			target.fontFamily = requireString(value, path);
			return true;
		case 'italic':
			target.italic = requireBoolean(value, path);
			return true;
		case 'lineSpacing':
			target.lineSpacing = requireNumber(value, path);
			return true;
		case 'maxChars':
			target.maxChars = requireNumber(value, path);
			return true;
		case 'multiline':
			target.multiline = requireBoolean(value, path);
			return true;
		case 'size':
			target.size = requireNumber(value, path);
			return true;
		case 'stroke':
			target.stroke = requireNumber(value, path);
			return true;
		case 'strokeColor':
			target.strokeColor = requireNumber(value, path);
			return true;
		case 'text':
			target.text = requireString(value, path);
			return true;
		case 'textAlign':
			target.textAlign = requireString(value, path);
			return true;
		case 'textColor':
			target.textColor = requireNumber(value, path);
			return true;
		case 'verticalAlign':
			target.verticalAlign = requireString(value, path);
			return true;
		case 'wordWrap':
			target.wordWrap = requireBoolean(value, path);
			return true;
		default:
			return false;
	}
}
