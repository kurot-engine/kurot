import type { UIComponentDefinition } from '../schema/UIComponentDefinition.js';
import { UIComponentRegistry } from '../schema/UIComponentRegistry.js';
import {
	COMPONENT_PROPERTIES,
	DISPLAY_OBJECT_PROPERTIES,
	UI_COMPONENT_PROPERTIES,
} from './properties/foundation-properties.js';
import {
	BUTTON_PROPERTIES,
	EDITABLE_TEXT_PROPERTIES,
	GROUP_PROPERTIES,
	IMAGE_PROPERTIES,
	LABEL_PROPERTIES,
	PROGRESS_BAR_PROPERTIES,
	RECT_PROPERTIES,
	TEXT_INPUT_PROPERTIES,
	TOGGLE_BUTTON_PROPERTIES,
} from './properties/basic-component-properties.js';

const DEFINITIONS: readonly UIComponentDefinition[] = [
	{
		type: 'kurot.DisplayObject',
		abstract: true,
		displayName: 'Display Object',
		description: 'Shared semantic base for visual objects in Kurot UI documents.',
		events: ['tap'],
		properties: DISPLAY_OBJECT_PROPERTIES,
		allowUnknownProperties: false,
	},
	{
		type: 'kui.UIComponent',
		extends: 'kurot.DisplayObject',
		abstract: true,
		displayName: 'UI Component',
		description: 'Shared semantic base for objects participating in Kurot UI layout.',
		properties: UI_COMPONENT_PROPERTIES,
	},
	{
		type: 'kui.Component',
		extends: 'kui.UIComponent',
		abstract: true,
		displayName: 'Component',
		description: 'Semantic base for skinnable Kurot UI controls.',
		appearance: {
			states: ['disabled'],
		},
		properties: COMPONENT_PROPERTIES,
	},
	{
		type: 'kui.Group',
		extends: 'kui.UIComponent',
		displayName: 'Group',
		description: 'Layout-aware container for ordered visual children.',
		children: 'multiple',
		properties: GROUP_PROPERTIES,
	},
	{
		type: 'kui.Label',
		extends: 'kui.Component',
		displayName: 'Label',
		description: 'Non-interactive text display component.',
		children: 'none',
		properties: LABEL_PROPERTIES,
	},
	{
		type: 'kui.EditableText',
		extends: 'kui.Label',
		displayName: 'Editable Text',
		description: 'Low-level editable text display used primarily as a TextInput appearance part.',
		children: 'none',
		events: ['change'],
		properties: EDITABLE_TEXT_PROPERTIES,
	},
	{
		type: 'kui.Image',
		extends: 'kui.Component',
		displayName: 'Image',
		description: 'Bitmap display component backed by a texture or asset source.',
		children: 'none',
		properties: IMAGE_PROPERTIES,
	},
	{
		type: 'kui.Rect',
		extends: 'kui.Component',
		displayName: 'Rect',
		description: 'Rectangular vector shape with fill and stroke support.',
		children: 'none',
		properties: RECT_PROPERTIES,
	},
	{
		type: 'kui.Button',
		extends: 'kui.Component',
		displayName: 'Button',
		description: 'Interactive skinnable button with label, icon, and view states.',
		children: 'none',
		appearance: {
			parts: {
				iconDisplay: { type: 'kui.Image' },
				labelDisplay: { type: 'kui.Label' },
			},
			states: [
				'disabled',
				'disabledAndSelected',
				'down',
				'downAndSelected',
				'up',
				'upAndSelected',
			],
		},
		events: ['change'],
		properties: BUTTON_PROPERTIES,
	},
	{
		type: 'kui.ToggleButton',
		extends: 'kui.Button',
		displayName: 'Toggle Button',
		description: 'Button whose activation toggles a persistent selected state.',
		children: 'none',
		properties: TOGGLE_BUTTON_PROPERTIES,
	},
	{
		type: 'kui.ProgressBar',
		extends: 'kui.Component',
		displayName: 'Progress Bar',
		description: 'Skinnable visual indicator for a bounded numeric value.',
		children: 'none',
		appearance: {
			parts: {
				labelDisplay: { type: 'kui.Label' },
				thumb: { required: true, type: 'kui.Component' },
			},
			states: ['disabled'],
		},
		events: ['change'],
		properties: PROGRESS_BAR_PROPERTIES,
	},
	{
		type: 'kui.TextInput',
		extends: 'kui.Component',
		displayName: 'Text Input',
		description: 'Skinnable single-line text entry control with prompt support.',
		children: 'none',
		appearance: {
			parts: {
				promptDisplay: { type: 'kui.Label' },
				textDisplay: { required: true, type: 'kui.EditableText' },
			},
			states: [
				'disabled',
				'disabledWithPrompt',
				'normal',
				'normalWithPrompt',
			],
		},
		events: ['change'],
		properties: TEXT_INPUT_PROPERTIES,
	},
];

/**
 * Registers the audited foundation subset of the Kurot UI component catalog.
 */
export function registerKurotUIFoundation(registry: UIComponentRegistry): void {
	for (const definition of DEFINITIONS) {
		if (registry.has(definition.type)) {
			throw new Error(`Component type "${definition.type}" is already registered.`);
		}
	}
	for (const definition of DEFINITIONS) {
		registry.register(definition);
	}
}

/**
 * Creates an isolated registry containing the audited Kurot UI foundation subset.
 */
export function createKurotUIFoundationRegistry(): UIComponentRegistry {
	const registry = new UIComponentRegistry();
	registerKurotUIFoundation(registry);
	return registry;
}
