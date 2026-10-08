import type { UIPropertyDefinition } from '../../schema/UIComponentDefinition.js';

const TEXT_LAYOUT_PROPERTIES: Readonly<Record<string, UIPropertyDefinition>> = {
	multiline: { valueType: 'boolean', defaultValue: true },
	lineSpacing: { valueType: 'number', minimum: 0, defaultValue: 0 },
	textAlign: { valueType: 'string', enumValues: ['left', 'center', 'right'], defaultValue: 'left' },
	verticalAlign: { valueType: 'string', enumValues: ['top', 'middle', 'bottom'], defaultValue: 'top' },
};

/**
 * BitmapLabel uses glyph metrics from a configured bitmap-font resource.
 * Vector Label font-size, colors, fitting and presets do not apply.
 */
export const BITMAP_LABEL_PROPERTIES: Readonly<Record<string, UIPropertyDefinition>> = {
	...TEXT_LAYOUT_PROPERTIES,
	text: { valueType: 'string', defaultValue: '' },
	font: {
		valueType: 'resource-reference',
		format: 'resource',
		resourceTypes: ['font'],
		description: 'Registered bitmap-font resource; the resource loader owns its descriptor and page.',
	},
	letterSpacing: { valueType: 'number', defaultValue: 0 },
	smoothing: { valueType: 'boolean', defaultValue: true },
};

/**
 * RichLabel owns a continuous textFlow rather than Label's plain-text API.
 */
export const RICH_LABEL_PROPERTIES: Readonly<Record<string, UIPropertyDefinition>> = {
	...TEXT_LAYOUT_PROPERTIES,
	textFlow: {
		valueType: 'array',
		format: 'text-flow',
		description: 'Ordered literal text/style runs; omission or [] displays no content.',
	},
	wordWrap: {
		valueType: 'boolean',
		defaultValue: true,
		description: 'True uses Unicode line-break opportunities; false uses character wrapping.',
	},
};
