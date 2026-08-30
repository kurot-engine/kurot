import { describe, expect, it } from 'vitest';
import {
	createKurotUIFoundationRegistry,
	createUIResourceReference,
	createUIDocument,
	createUINode,
	registerKurotUIFoundation,
	UIComponentRegistry,
	validateUIDocumentComponents,
} from '../src/index.js';

describe('Kurot UI foundation catalog', () => {
	it('registers the audited component subset in deterministic order', () => {
		const registry = createKurotUIFoundationRegistry();

		expect(registry.list().map((definition) => definition.type)).toEqual([
			'kui.Button',
			'kui.Component',
			'kui.EditableText',
			'kui.Group',
			'kui.Image',
			'kui.Label',
			'kui.ProgressBar',
			'kui.Rect',
			'kui.TextInput',
			'kui.ToggleButton',
			'kui.UIComponent',
			'kurot.DisplayObject',
		]);
		expect(registry.has('eui.Label')).toBe(false);
	});

	it('resolves audited properties through the semantic inheritance chain', () => {
		const registry = createKurotUIFoundationRegistry();
		const label = registry.resolve('kui.Label');
		const editableText = registry.resolve('kui.EditableText');
		const group = registry.resolve('kui.Group');
		const button = registry.resolve('kui.Button');
		const toggleButton = registry.resolve('kui.ToggleButton');
		const progressBar = registry.resolve('kui.ProgressBar');
		const textInput = registry.resolve('kui.TextInput');

		expect(label).toMatchObject({
			baseTypes: ['kurot.DisplayObject', 'kui.UIComponent', 'kui.Component'],
			abstract: false,
			children: 'none',
			allowUnknownProperties: false,
		});
		expect(group).toMatchObject({
			baseTypes: ['kurot.DisplayObject', 'kui.UIComponent'],
			children: 'multiple',
		});
		expect(editableText).toMatchObject({
			baseTypes: [
				'kurot.DisplayObject',
				'kui.UIComponent',
				'kui.Component',
				'kui.Label',
			],
			children: 'none',
		});
		expect(editableText?.properties.text?.defaultValue).toBe('');
		expect(editableText?.properties.promptColor?.defaultValue).toBe(0x999999);
		expect(button?.children).toBe('none');
		expect(toggleButton).toMatchObject({
			baseTypes: [
				'kurot.DisplayObject',
				'kui.UIComponent',
				'kui.Component',
				'kui.Button',
			],
			children: 'none',
		});
		expect(toggleButton?.properties.toggle?.defaultValue).toBe(true);
		expect(progressBar).toMatchObject({
			baseTypes: ['kurot.DisplayObject', 'kui.UIComponent', 'kui.Component'],
			children: 'none',
		});
		expect(textInput).toMatchObject({
			baseTypes: ['kurot.DisplayObject', 'kui.UIComponent', 'kui.Component'],
			children: 'none',
		});
		expect(textInput?.properties.fontFamily).toBeUndefined();
		expect(label?.properties.text).toMatchObject({
			valueType: 'string',
			defaultValue: '',
		});
		expect(label?.properties.left?.valueType).toEqual([
			'number',
			'string',
			'token-reference',
		]);
	});

	it('validates a document using the audited basic properties', () => {
		const registry = createKurotUIFoundationRegistry();
		const document = createUIDocument({
			id: 'main-screen',
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				properties: {
					layout: { type: 'kui.BasicLayout', properties: {} },
					width: 1280,
					height: 720,
				},
				children: [
					createUINode({
						id: 'title',
						type: 'kui.Label',
						properties: { text: 'Kurot' },
					}),
					createUINode({
						id: 'background',
						type: 'kui.Image',
						properties: {
							source: createUIResourceReference('image', 'background_png'),
						},
					}),
					createUINode({
						id: 'player-name',
						type: 'kui.TextInput',
						properties: {
							inputType: 'text',
							maxChars: 20,
							prompt: 'Player name',
							restrict: 'A-Za-z0-9_',
							text: 'Kurot',
						},
					}),
					createUINode({
						id: 'overlay',
						type: 'kui.Rect',
						properties: { fillColor: 0x000000 },
					}),
					createUINode({
						id: 'start',
						type: 'kui.Button',
						properties: { label: 'Start' },
					}),
					createUINode({
						id: 'sound-toggle',
						type: 'kui.ToggleButton',
						properties: { label: 'Sound', selected: true },
					}),
					createUINode({
						id: 'loading-progress',
						type: 'kui.ProgressBar',
						properties: {
							direction: 'rtl',
							maximum: 200,
							minimum: 100,
							slideDuration: 0,
							value: 150,
						},
					}),
				],
			}),
		});

		expect(validateUIDocumentComponents(document, registry)).toEqual([]);
	});

	it('validates editable text appearance-part properties', () => {
		const registry = createKurotUIFoundationRegistry();
		const document = createUIDocument({
			id: 'text-input-appearance',
			root: createUINode({
				id: 'text-display',
				type: 'kui.EditableText',
				properties: {
					inputType: 'text',
					prompt: 'Appearance-only prompt',
					promptColor: 0x999999,
				},
			}),
		});

		expect(validateUIDocumentComponents(document, registry)).toEqual([]);
	});

	it('declares the exact direct property surface for each basic component', () => {
		const registry = createKurotUIFoundationRegistry();

		expect(Object.keys(registry.get('kui.Group')?.properties ?? {}).sort()).toEqual([
			'layout',
			'scrollEnabled',
			'scrollH',
			'scrollV',
			'touchThrough',
		]);
		expect(Object.keys(registry.get('kui.Label')?.properties ?? {}).sort()).toEqual([
			'bold',
			'displayAsPassword',
			'fontFamily',
			'italic',
			'lineSpacing',
			'maxChars',
			'multiline',
			'size',
			'stroke',
			'strokeColor',
			'text',
			'textAlign',
			'textColor',
			'verticalAlign',
			'wordWrap',
		]);
		expect(
			Object.keys(registry.get('kui.EditableText')?.properties ?? {}).sort(),
		).toEqual(['inputType', 'prompt', 'promptColor', 'restrict']);
		expect(Object.keys(registry.get('kui.Image')?.properties ?? {}).sort()).toEqual([
			'fillMode',
			'scale9Grid',
			'smoothing',
			'source',
		]);
		expect(Object.keys(registry.get('kui.Rect')?.properties ?? {}).sort()).toEqual([
			'ellipseHeight',
			'ellipseWidth',
			'fillAlpha',
			'fillColor',
			'strokeAlpha',
			'strokeColor',
			'strokeWeight',
		]);
		expect(Object.keys(registry.get('kui.Button')?.properties ?? {}).sort()).toEqual([
			'icon',
			'label',
			'selected',
			'toggle',
		]);
		expect(
			Object.keys(registry.get('kui.ToggleButton')?.properties ?? {}).sort(),
		).toEqual(['toggle']);
		expect(
			Object.keys(registry.get('kui.ProgressBar')?.properties ?? {}).sort(),
		).toEqual(['direction', 'maximum', 'minimum', 'slideDuration', 'value']);
		expect(
			Object.keys(registry.get('kui.TextInput')?.properties ?? {}).sort(),
		).toEqual([
			'displayAsPassword',
			'inputType',
			'maxChars',
			'prompt',
			'restrict',
			'text',
			'textColor',
		]);
	});

	it('rejects invalid basic component values and unknown properties', () => {
		const registry = createKurotUIFoundationRegistry();
		const document = createUIDocument({
			id: 'invalid-properties',
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				children: [
					createUINode({
						id: 'label',
						type: 'kui.Label',
						properties: { textAlign: 'diagonal', alpha: 2, typo: true },
					}),
					createUINode({
						id: 'image',
						type: 'kui.Image',
						properties: { scale9Grid: '0,0,20,20' },
					}),
					createUINode({
						id: 'rect',
						type: 'kui.Rect',
						properties: { fillColor: 0x1000000 },
					}),
					createUINode({
						id: 'button',
						type: 'kui.Button',
						properties: { icon: { textureId: 'start' } },
					}),
					createUINode({
						id: 'toggle',
						type: 'kui.ToggleButton',
						properties: { selected: 'yes' },
					}),
					createUINode({
						id: 'progress',
						type: 'kui.ProgressBar',
						properties: { direction: 'clockwise', slideDuration: -1 },
					}),
					createUINode({
						id: 'text-input',
						type: 'kui.TextInput',
						properties: {
							fontFamily: 'Arial',
							inputType: 'email',
							maxChars: 1.5,
						},
					}),
				],
			}),
		});

		expect(
			validateUIDocumentComponents(document, registry).map(item => item.path),
		).toEqual([
			'$.root.children[0].properties.textAlign',
			'$.root.children[0].properties.alpha',
			'$.root.children[0].properties.typo',
			'$.root.children[1].properties.scale9Grid',
			'$.root.children[2].properties.fillColor',
			'$.root.children[3].properties.icon',
			'$.root.children[4].properties.selected',
			'$.root.children[5].properties.direction',
			'$.root.children[5].properties.slideDuration',
			'$.root.children[6].properties.fontFamily',
			'$.root.children[6].properties.inputType',
			'$.root.children[6].properties.maxChars',
		]);
	});

	it('rejects invalid editable text appearance-part values', () => {
		const registry = createKurotUIFoundationRegistry();
		const document = createUIDocument({
			id: 'invalid-editable-text',
			root: createUINode({
				id: 'text-display',
				type: 'kui.EditableText',
				properties: { inputType: 'tel', promptColor: -1 },
			}),
		});

		expect(
			validateUIDocumentComponents(document, registry).map(item => item.path),
		).toEqual(['$.root.properties.inputType', '$.root.properties.promptColor']);
	});

	it('rejects abstract catalog bases as document nodes', () => {
		const registry = createKurotUIFoundationRegistry();
		const document = createUIDocument({
			id: 'invalid',
			root: createUINode({ id: 'root', type: 'kui.Component' }),
		});

		expect(validateUIDocumentComponents(document, registry)[0]?.code).toBe(
			'abstract-component-type',
		);
	});

	it('checks all collisions before mutating a target registry', () => {
		const registry = new UIComponentRegistry();
		registry.register({ type: 'kui.Button' });

		expect(() => registerKurotUIFoundation(registry)).toThrow(
			'Component type "kui.Button" is already registered.',
		);
		expect(registry.has('kurot.DisplayObject')).toBe(false);
	});
});
