import { describe, expect, it } from 'vitest';
import {
	createUIDocument,
	createUINode,
	UIComponentRegistry,
	validateUIDocumentComponents,
} from '../src/index.js';

describe('component property schema', () => {
	it('normalizes union types and enum metadata into immutable definitions', () => {
		const valueType = ['number', 'string'] as const;
		const enumValues = ['left', 'center', 'right'] as const;
		const registry = new UIComponentRegistry();
		registry.register({
			type: 'test.Component',
			properties: {
				align: { valueType: 'string', enumValues, defaultValue: 'left' },
				offset: { valueType },
			},
		});

		const definition = registry.get('test.Component');
		expect(definition?.properties?.offset?.valueType).toEqual(['number', 'string']);
		expect(definition?.properties?.align?.enumValues).toEqual(enumValues);
		expect(Object.isFrozen(definition?.properties?.offset?.valueType)).toBe(true);
		expect(Object.isFrozen(definition?.properties?.align?.enumValues)).toBe(true);
	});

	it('validates union, enum, range, and integer constraints', () => {
		const registry = new UIComponentRegistry();
		registry.register({
			type: 'test.Component',
			properties: {
				align: { valueType: 'string', enumValues: ['left', 'right'] },
				alpha: { valueType: 'number', minimum: 0, maximum: 1 },
				count: { valueType: 'number', integer: true },
				offset: { valueType: ['number', 'string'] },
			},
		});

		const valid = createUIDocument({
			id: 'valid',
			root: createUINode({
				id: 'root',
				type: 'test.Component',
				properties: { align: 'left', alpha: 0.5, count: 2, offset: '10%' },
			}),
		});
		expect(validateUIDocumentComponents(valid, registry)).toEqual([]);

		const invalid = createUIDocument({
			id: 'invalid',
			root: createUINode({
				id: 'root',
				type: 'test.Component',
				properties: { align: 'center', alpha: 2, count: 1.5, offset: false },
			}),
		});
		expect(
			validateUIDocumentComponents(invalid, registry).map(item => item.path),
		).toEqual([
			'$.root.properties.align',
			'$.root.properties.alpha',
			'$.root.properties.count',
			'$.root.properties.offset',
		]);
	});

	it('rejects contradictory property metadata during registration', () => {
		const registry = new UIComponentRegistry();

		expect(() =>
			registry.register({
				type: 'test.EmptyUnion',
				properties: { value: { valueType: [] } },
			}),
		).toThrow('must accept at least one value type');
		expect(() =>
			registry.register({
				type: 'test.InvalidRange',
				properties: {
					value: { valueType: 'number', minimum: 10, maximum: 1 },
				},
			}),
		).toThrow('minimum cannot exceed its maximum');
		expect(() =>
			registry.register({
				type: 'test.InvalidDefault',
				properties: {
					value: { valueType: 'number', maximum: 1, defaultValue: 2 },
				},
			}),
		).toThrow('default value does not satisfy its schema');
		expect(() =>
			registry.register({
				type: 'test.InvalidInteger',
				properties: { value: { valueType: 'string', integer: true } },
			}),
		).toThrow('integer flag requires a numeric value type');
		expect(() =>
			registry.register({
				type: 'test.DuplicateEnum',
				properties: {
					value: { valueType: 'string', enumValues: ['same', 'same'] },
				},
			}),
		).toThrow('contains duplicate enum values');
	});
});
