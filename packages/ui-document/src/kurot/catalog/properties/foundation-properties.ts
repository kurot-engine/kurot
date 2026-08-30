import type { UIPropertyDefinition } from '../../schema/UIComponentDefinition.js';

/**
 * Serializable authoring properties inherited by every Kurot display node.
 */
export const DISPLAY_OBJECT_PROPERTIES: Readonly<Record<string, UIPropertyDefinition>> = {
	alpha: {
		valueType: 'number',
		minimum: 0,
		maximum: 1,
		defaultValue: 1,
		description: 'Opacity applied to this node and its descendants.',
	},
	anchorOffsetX: {
		valueType: 'number',
		defaultValue: 0,
		description: 'Horizontal transform origin offset in local pixels.',
	},
	anchorOffsetY: {
		valueType: 'number',
		defaultValue: 0,
		description: 'Vertical transform origin offset in local pixels.',
	},
	blendMode: {
		valueType: 'string',
		enumValues: [
			'source-over',
			'lighter',
			'destination-out',
			'multiply',
			'screen',
			'lighten',
			'darken',
			'difference',
			'overlay',
			'hard-light',
			'soft-light',
			'color-dodge',
			'color-burn',
			'exclusion',
			'hue',
			'saturation',
			'color',
			'luminosity',
		],
		defaultValue: 'source-over',
		description: 'Compositing mode used when rendering this node.',
	},
	cacheAsBitmap: {
		valueType: 'boolean',
		defaultValue: false,
		description: 'Whether to cache this display subtree as a reusable texture.',
	},
	height: {
		valueType: 'number',
		minimum: 0,
		description: 'Explicit height in pixels; omit it to use measured height.',
	},
	name: {
		valueType: 'string',
		defaultValue: '',
		description: 'Optional runtime name used for display-tree lookup and diagnostics.',
	},
	rotation: {
		valueType: 'number',
		defaultValue: 0,
		description: 'Clockwise rotation in degrees.',
	},
	scaleX: {
		valueType: 'number',
		defaultValue: 1,
		description: 'Horizontal scale relative to the local transform origin.',
	},
	scaleY: {
		valueType: 'number',
		defaultValue: 1,
		description: 'Vertical scale relative to the local transform origin.',
	},
	skewX: {
		valueType: 'number',
		defaultValue: 0,
		description: 'Horizontal skew in degrees.',
	},
	skewY: {
		valueType: 'number',
		defaultValue: 0,
		description: 'Vertical skew in degrees.',
	},
	sortableChildren: {
		valueType: 'boolean',
		defaultValue: false,
		description: 'Whether descendants are ordered by zIndex before rendering.',
	},
	tint: {
		valueType: 'number',
		format: 'color',
		minimum: 0,
		maximum: 0xffffff,
		integer: true,
		defaultValue: 0xffffff,
		description: 'Multiplicative RGB tint encoded as a 24-bit integer.',
	},
	touchEnabled: {
		valueType: 'boolean',
		defaultValue: false,
		description: 'Whether this node can be the target of pointer events.',
	},
	visible: {
		valueType: 'boolean',
		defaultValue: true,
		description: 'Whether this node participates in rendering and hit testing.',
	},
	width: {
		valueType: 'number',
		minimum: 0,
		description: 'Explicit width in pixels; omit it to use measured width.',
	},
	x: {
		valueType: 'number',
		defaultValue: 0,
		description: 'Horizontal position in the parent coordinate space.',
	},
	y: {
		valueType: 'number',
		defaultValue: 0,
		description: 'Vertical position in the parent coordinate space.',
	},
	zIndex: {
		valueType: 'number',
		defaultValue: 0,
		description: 'Relative render order when the parent enables sortable children.',
	},
};

/**
 * Layout and container properties inherited by every Kurot UI component.
 */
export const UI_COMPONENT_PROPERTIES: Readonly<Record<string, UIPropertyDefinition>> = {
	bottom: anchorConstraint('Distance from the parent bottom edge.'),
	horizontalCenter: anchorConstraint('Offset from the parent horizontal center.'),
	includeInLayout: {
		valueType: 'boolean',
		defaultValue: true,
		description: 'Whether the parent layout measures and positions this node.',
	},
	isRenderGroup: {
		valueType: 'boolean',
		defaultValue: false,
		description: 'Whether this container owns an independent render instruction set.',
	},
	left: anchorConstraint('Distance from the parent left edge.'),
	maxHeight: sizeConstraint('Maximum layout height.', 100000),
	maxWidth: sizeConstraint('Maximum layout width.', 100000),
	minHeight: sizeConstraint('Minimum layout height.', 0),
	minWidth: sizeConstraint('Minimum layout width.', 0),
	percentHeight: percentageConstraint('Height as a percentage of the parent height.'),
	percentWidth: percentageConstraint('Width as a percentage of the parent width.'),
	right: anchorConstraint('Distance from the parent right edge.'),
	top: anchorConstraint('Distance from the parent top edge.'),
	touchChildren: {
		valueType: 'boolean',
		defaultValue: true,
		description: 'Whether descendants can be pointer-event targets.',
	},
	touchEnabled: {
		valueType: 'boolean',
		defaultValue: true,
		description: 'Whether this UI component can be a pointer-event target.',
	},
	verticalCenter: anchorConstraint('Offset from the parent vertical center.'),
};

/**
 * Authoring properties inherited by skinnable Kurot controls.
 */
export const COMPONENT_PROPERTIES: Readonly<Record<string, UIPropertyDefinition>> = {
	currentState: {
		valueType: 'string',
		defaultValue: '',
		description: 'Explicit skin view state; an empty string uses the computed state.',
	},
	enabled: {
		valueType: 'boolean',
		defaultValue: true,
		description: 'Whether the control accepts interaction and uses enabled states.',
	},
	hostComponentKey: {
		valueType: 'string',
		description: 'Theme lookup key; omit it to use the runtime class name.',
	},
	skinName: {
		valueType: 'string',
		format: 'skin',
		description: 'Serializable skin identifier resolved by the runtime or adapter.',
	},
};

function anchorConstraint(description: string): UIPropertyDefinition {
	return {
		valueType: ['number', 'string'],
		description: `${description} Strings may use percentage syntax such as "50%".`,
	};
}

function percentageConstraint(description: string): UIPropertyDefinition {
	return {
		valueType: 'number',
		minimum: 0,
		maximum: 100,
		description,
	};
}

function sizeConstraint(description: string, defaultValue: number): UIPropertyDefinition {
	return {
		valueType: 'number',
		minimum: 0,
		defaultValue,
		description,
	};
}
