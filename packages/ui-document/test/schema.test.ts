import { describe, expect, it } from 'vitest';
import {
	createUIDocument,
	createUINode,
	UIComponentRegistry,
	UIComponentResolutionError,
	validateUIDocument,
	validateUIDocumentComponents,
} from '../src/index.js';
import type { UIPropertyValueType } from '../src/index.js';

describe('UIComponentRegistry', () => {
	it('stores definitions independently and lists them by type', () => {
		const registry = new UIComponentRegistry();
		const label: {
			type: string;
			properties: { text: { valueType: UIPropertyValueType } };
		} = {
			type: 'kui.Label',
			properties: {
				text: { valueType: 'string' },
			},
		};

		registry.register(label);
		registry.register({ type: 'kui.Group', children: 'multiple' });
		label.properties.text.valueType = 'number';

		expect(registry.has('kui.Label')).toBe(true);
		expect(registry.get('kui.Label')?.properties?.text?.valueType).toBe('string');
		expect(registry.list().map((definition) => definition.type)).toEqual([
			'kui.Group',
			'kui.Label',
		]);
	});

	it('rejects malformed and duplicate definitions', () => {
		const registry = new UIComponentRegistry();
		registry.register({ type: 'kui.Label' });

		expect(() => registry.register({ type: 'kui.Label' })).toThrow(
			'Component type "kui.Label" is already registered.',
		);
		expect(() => registry.register({ type: ' ' })).toThrow(
			'Component type must be a non-empty string.',
		);
	});

	it('resolves inherited properties and nearest explicit policies', () => {
		const registry = new UIComponentRegistry();
		registry.register({
			type: 'test.Concrete',
			extends: 'test.LayoutElement',
			children: 'none',
			allowUnknownProperties: false,
			properties: {
				alpha: { valueType: 'string', description: 'Derived override.' },
				title: { valueType: 'string' },
			},
		});
		registry.register({
			type: 'test.DisplayObject',
			abstract: true,
			displayName: 'Display Object',
			children: 'multiple',
			allowUnknownProperties: true,
			properties: {
				alpha: { valueType: 'number' },
				visible: { valueType: 'boolean' },
			},
		});
		registry.register({
			type: 'test.LayoutElement',
			extends: 'test.DisplayObject',
			abstract: true,
			properties: {
				left: { valueType: 'number' },
			},
		});

		const resolved = registry.resolve('test.Concrete');

		expect(resolved).toMatchObject({
			type: 'test.Concrete',
			baseTypes: ['test.DisplayObject', 'test.LayoutElement'],
			abstract: false,
			children: 'none',
			allowUnknownProperties: false,
		});
		expect(resolved?.displayName).toBeUndefined();
		expect(Object.hasOwn(resolved ?? {}, 'displayName')).toBe(false);
		expect(Object.hasOwn(resolved ?? {}, 'description')).toBe(false);
		expect(resolved?.properties.alpha).toEqual({
			valueType: 'string',
			description: 'Derived override.',
		});
		expect(Object.keys(resolved?.properties ?? {})).toEqual([
			'alpha',
			'left',
			'title',
			'visible',
		]);
	});

	it('inherits semantic events and merges appearance capabilities', () => {
		const registry = new UIComponentRegistry();
		registry.register({
			type: 'test.Base',
			abstract: true,
			events: ['tap'],
			appearance: {
				parts: { labelDisplay: { type: 'test.Label' } },
				states: ['normal', 'disabled'],
			},
		});
		registry.register({
			type: 'test.Control',
			extends: 'test.Base',
			events: ['change'],
			appearance: {
				parts: { iconDisplay: { type: 'test.Image' } },
				states: ['up', 'down'],
			},
		});

		expect(registry.resolve('test.Control')).toMatchObject({
			events: ['change', 'tap'],
			appearance: {
				parts: {
					iconDisplay: { type: 'test.Image' },
					labelDisplay: { type: 'test.Label' },
				},
				states: ['up', 'down'],
			},
		});
	});

	it('produces the same resolution regardless of registration order', () => {
		const forward = new UIComponentRegistry();
		forward.register({
			type: 'test.Base',
			abstract: true,
			children: 'single',
			allowUnknownProperties: true,
			properties: { enabled: { valueType: 'boolean' } },
		});
		forward.register({ type: 'test.Child', extends: 'test.Base' });

		const reverse = new UIComponentRegistry();
		reverse.register({ type: 'test.Child', extends: 'test.Base' });
		expect(() => reverse.resolve('test.Child')).toThrow(UIComponentResolutionError);
		reverse.register({
			type: 'test.Base',
			abstract: true,
			children: 'single',
			allowUnknownProperties: true,
			properties: { enabled: { valueType: 'boolean' } },
		});

		expect(reverse.resolve('test.Child')).toEqual(forward.resolve('test.Child'));
		expect(reverse.resolve('test.Child')).toMatchObject({
			abstract: false,
			children: 'single',
			allowUnknownProperties: true,
		});
		expect(reverse.resolveAll().map((item) => item.type)).toEqual([
			'test.Base',
			'test.Child',
		]);
	});

	it('detects missing bases and circular inheritance', () => {
		const missing = new UIComponentRegistry();
		missing.register({ type: 'test.Child', extends: 'test.Missing' });

		expect(() => missing.resolve('test.Child')).toThrow(UIComponentResolutionError);
		try {
			missing.resolve('test.Child');
		} catch (error) {
			if (!(error instanceof UIComponentResolutionError)) throw error;
			expect(error.code).toBe('missing-component-base');
			expect(error.chain).toEqual(['test.Child', 'test.Missing']);
		}

		const circular = new UIComponentRegistry();
		circular.register({ type: 'test.A', extends: 'test.B' });
		circular.register({ type: 'test.B', extends: 'test.A' });

		expect(() => circular.resolve('test.A')).toThrow(UIComponentResolutionError);
		try {
			circular.resolve('test.A');
		} catch (error) {
			if (!(error instanceof UIComponentResolutionError)) throw error;
			expect(error.code).toBe('circular-component-inheritance');
			expect(error.chain).toEqual(['test.A', 'test.B', 'test.A']);
		}
	});
});

describe('component-aware validation', () => {
	it('reports unknown types, property errors, and child-policy violations', () => {
		const registry = new UIComponentRegistry();
		registry.register({
			type: 'kui.Group',
			children: 'multiple',
			allowUnknownProperties: true,
		});
		registry.register({
			type: 'kui.Label',
			children: 'none',
			properties: {
				text: { valueType: 'string', required: true },
			},
		});
		const document = createUIDocument({
			id: 'main-screen',
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				properties: { layoutUnderReview: true },
				children: [
					createUINode({
						id: 'title',
						type: 'kui.Label',
						properties: { text: 42, typo: 'value' },
						children: [createUINode({ id: 'icon', type: 'kui.Image' })],
					}),
				],
			}),
		});

		expect(validateUIDocument(document)).toEqual([]);
		expect(
			validateUIDocumentComponents(document, registry).map((item) => item.code),
		).toEqual([
			'invalid-component-property',
			'unknown-component-property',
			'invalid-component-children',
			'unknown-component-type',
		]);
	});

	it('supports intentionally incomplete component definitions', () => {
		const registry = new UIComponentRegistry();
		registry.register({
			type: 'game.ProfileCard',
			allowUnknownProperties: true,
		});
		const document = createUIDocument({
			id: 'profile',
			root: createUINode({
				id: 'root',
				type: 'game.ProfileCard',
				properties: { title: 'Player', level: 10 },
				children: [createUINode({ id: 'content', type: 'game.ProfileCard' })],
			}),
		});

		expect(validateUIDocumentComponents(document, registry)).toEqual([]);
	});

	it('reports missing required properties', () => {
		const registry = new UIComponentRegistry();
		registry.register({
			type: 'kui.Image',
			properties: {
				source: { valueType: 'string', required: true },
			},
		});
		const document = createUIDocument({
			id: 'image',
			root: createUINode({ id: 'root', type: 'kui.Image' }),
		});

		expect(validateUIDocumentComponents(document, registry)[0]).toMatchObject({
			code: 'missing-component-property',
			path: '$.root.properties.source',
		});
	});

	it('uses inherited properties and rejects abstract node types', () => {
		const registry = new UIComponentRegistry();
		registry.register({
			type: 'test.AbstractBase',
			abstract: true,
			properties: {
				name: { valueType: 'string', required: true },
			},
		});
		registry.register({ type: 'test.Concrete', extends: 'test.AbstractBase' });

		const concrete = createUIDocument({
			id: 'concrete',
			root: createUINode({ id: 'root', type: 'test.Concrete' }),
		});
		expect(validateUIDocumentComponents(concrete, registry)[0]?.code).toBe(
			'missing-component-property',
		);

		const abstract = createUIDocument({
			id: 'abstract',
			root: createUINode({
				id: 'root',
				type: 'test.AbstractBase',
				properties: { name: 'base' },
			}),
		});
		expect(validateUIDocumentComponents(abstract, registry)[0]?.code).toBe(
			'abstract-component-type',
		);
	});

	it('converts inheritance resolution failures into document diagnostics', () => {
		const registry = new UIComponentRegistry();
		registry.register({ type: 'test.Child', extends: 'test.Missing' });
		const document = createUIDocument({
			id: 'broken',
			root: createUINode({ id: 'root', type: 'test.Child' }),
		});

		expect(validateUIDocumentComponents(document, registry)[0]).toMatchObject({
			code: 'missing-component-base',
			path: '$.root.type',
		});
	});
});
