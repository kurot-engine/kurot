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
			'kui.Group',
			'kui.Image',
			'kui.Label',
			'kui.Rect',
			'kui.UIComponent',
			'kurot.DisplayObject',
		]);
		expect(registry.has('eui.Label')).toBe(false);
	});

	it('resolves audited properties through the semantic inheritance chain', () => {
		const registry = createKurotUIFoundationRegistry();
		const label = registry.resolve('kui.Label');
		const group = registry.resolve('kui.Group');
		const button = registry.resolve('kui.Button');

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
		expect(button?.children).toBe('none');
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
						id: 'overlay',
						type: 'kui.Rect',
						properties: { fillColor: 0x000000 },
					}),
					createUINode({
						id: 'start',
						type: 'kui.Button',
						properties: { label: 'Start' },
					}),
				],
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
		]);
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
