import type { UIPropertyDefinition } from '../../schema/UIComponentDefinition.js';

/**
 * Authoring properties declared directly by Group.
 */
export const GROUP_PROPERTIES: Readonly<Record<string, UIPropertyDefinition>> = {
	layout: {
		valueType: 'object',
		format: 'layout',
		description: 'Serializable layout descriptor; omission uses BasicLayout at runtime.',
	},
	scrollEnabled: {
		valueType: 'boolean',
		defaultValue: false,
		description: 'Whether the group clips and offsets content using its scroll position.',
	},
	scrollH: {
		valueType: 'number',
		defaultValue: 0,
		description: 'Horizontal content scroll offset in pixels.',
	},
	scrollV: {
		valueType: 'number',
		defaultValue: 0,
		description: 'Vertical content scroll offset in pixels.',
	},
	touchThrough: {
		valueType: 'boolean',
		defaultValue: false,
		description: 'Whether empty group regions allow hit testing to continue behind the group.',
	},
};

/**
 * Authoring properties declared directly by Label.
 */
export const LABEL_PROPERTIES: Readonly<Record<string, UIPropertyDefinition>> = {
	bold: booleanProperty(false, 'Whether the text uses a bold font weight.'),
	displayAsPassword: booleanProperty(false, 'Whether text is rendered as password glyphs.'),
	fontFamily: {
		valueType: 'string',
		defaultValue: 'Arial',
		description: 'CSS font-family name used to render the label.',
	},
	italic: booleanProperty(false, 'Whether the text uses an italic font style.'),
	lineSpacing: {
		valueType: 'number',
		defaultValue: 0,
		description: 'Additional spacing in pixels between text lines.',
	},
	maxChars: {
		valueType: 'number',
		minimum: 0,
		integer: true,
		defaultValue: 0,
		description: 'Maximum character count; zero means no limit.',
	},
	multiline: booleanProperty(false, 'Whether the label permits multiple rendered lines.'),
	size: {
		valueType: 'number',
		minimum: 0,
		defaultValue: 30,
		description: 'Font size in pixels.',
	},
	stroke: {
		valueType: 'number',
		minimum: 0,
		defaultValue: 0,
		description: 'Text outline thickness in pixels.',
	},
	strokeColor: colorProperty(0x000000, 'Text outline RGB color.'),
	text: {
		valueType: 'string',
		defaultValue: '',
		description: 'Plain text displayed by the label; newline characters create hard line breaks.',
	},
	textAlign: {
		valueType: 'string',
		enumValues: ['left', 'right', 'center', 'justify', 'contentJustify'],
		defaultValue: 'left',
		description: 'Horizontal alignment within the label bounds.',
	},
	textColor: colorProperty(0xffffff, 'Text fill RGB color.'),
	verticalAlign: {
		valueType: 'string',
		enumValues: ['top', 'bottom', 'middle', 'justify', 'contentJustify'],
		defaultValue: 'top',
		description: 'Vertical alignment within the label bounds.',
	},
	wordWrap: booleanProperty(false, 'Whether text wraps at the available width.'),
};

/**
 * Authoring properties declared directly by Image.
 */
export const IMAGE_PROPERTIES: Readonly<Record<string, UIPropertyDefinition>> = {
	fillMode: {
		valueType: 'string',
		enumValues: ['scale', 'repeat', 'clip'],
		defaultValue: 'scale',
		description: 'How the source bitmap fills the assigned image bounds.',
	},
	scale9Grid: {
		valueType: 'object',
		format: 'rectangle',
		description: 'Nine-slice center rectangle with x, y, width, and height numbers.',
	},
	smoothing: booleanProperty(true, 'Whether scaled bitmap sampling uses interpolation.'),
	source: {
		valueType: 'resource-reference',
		format: 'resource',
		resourceTypes: ['image', 'sprite-frame'],
		description: 'Typed image or sprite-frame resource resolved by the project.',
	},
};

/**
 * Authoring properties declared directly by Rect.
 */
export const RECT_PROPERTIES: Readonly<Record<string, UIPropertyDefinition>> = {
	ellipseHeight: numberProperty(0, 0, 'Vertical corner ellipse diameter.'),
	ellipseWidth: numberProperty(0, 0, 'Horizontal corner ellipse diameter.'),
	fillAlpha: alphaProperty(1, 'Fill opacity.'),
	fillColor: colorProperty(0x000000, 'Fill RGB color.'),
	strokeAlpha: alphaProperty(1, 'Stroke opacity.'),
	strokeColor: colorProperty(0x444444, 'Stroke RGB color.'),
	strokeWeight: numberProperty(0, 0, 'Stroke thickness in pixels.'),
};

/**
 * Authoring properties declared directly by Button.
 */
export const BUTTON_PROPERTIES: Readonly<Record<string, UIPropertyDefinition>> = {
	icon: {
		valueType: 'resource-reference',
		format: 'resource',
		resourceTypes: ['image', 'sprite-frame'],
		description: 'Typed image or sprite-frame resource passed to the icon part.',
	},
	label: {
		valueType: 'string',
		defaultValue: '',
		description: 'Text passed to the skin label part.',
	},
	selected: booleanProperty(false, 'Whether the button uses its selected view state.'),
	toggle: booleanProperty(false, 'Whether activation automatically toggles selected.'),
};

/**
 * Authoring properties declared directly by ToggleButton.
 */
export const TOGGLE_BUTTON_PROPERTIES: Readonly<Record<string, UIPropertyDefinition>> = {
	toggle: booleanProperty(true, 'Whether activation automatically toggles selected.'),
};

const RANGE_VALUE_PROPERTIES: Readonly<Record<string, UIPropertyDefinition>> = {
	maximum: {
		valueType: 'number',
		defaultValue: 100,
		description: 'Upper endpoint used to calculate the displayed progress ratio.',
	},
	minimum: {
		valueType: 'number',
		defaultValue: 0,
		description: 'Lower endpoint used to calculate the displayed progress ratio.',
	},
	value: {
		valueType: 'number',
		defaultValue: 0,
		description: 'Current progress value, clamped to the authored range at runtime.',
	},
};

/**
 * Authoring properties declared directly by ProgressBar.
 */
export const PROGRESS_BAR_PROPERTIES: Readonly<Record<string, UIPropertyDefinition>> = {
	...RANGE_VALUE_PROPERTIES,
	direction: {
		valueType: 'string',
		enumValues: ['ltr', 'rtl', 'ttb', 'btt'],
		defaultValue: 'ltr',
		description: 'Direction in which the progress fill grows.',
	},
	slideDuration: {
		valueType: 'number',
		minimum: 0,
		defaultValue: 500,
		description: 'Duration in milliseconds used to animate value changes; zero is immediate.',
	},
};

function alphaProperty(defaultValue: number, description: string): UIPropertyDefinition {
	return {
		valueType: 'number',
		minimum: 0,
		maximum: 1,
		defaultValue,
		description,
	};
}

function booleanProperty(defaultValue: boolean, description: string): UIPropertyDefinition {
	return { valueType: 'boolean', defaultValue, description };
}

function colorProperty(defaultValue: number, description: string): UIPropertyDefinition {
	return {
		valueType: ['number', 'token-reference'],
		tokenTypes: ['color'],
		format: 'color',
		minimum: 0,
		maximum: 0xffffff,
		integer: true,
		defaultValue,
		description,
	};
}

function numberProperty(
	defaultValue: number,
	minimum: number,
	description: string,
): UIPropertyDefinition {
	return { valueType: 'number', minimum, defaultValue, description };
}
