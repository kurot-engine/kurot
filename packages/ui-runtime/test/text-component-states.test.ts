import { Button, Group, RichLabel, BitmapLabel } from '@kurot/ui';
import {
	createKurotUIFoundationRegistry,
	createUIAppearanceReference,
	createUIAssetContract,
	createUIAssetReference,
	createUIComponentInstance,
	createUIDocument,
	createUINode,
	createUIResourceReference,
	parseUIDocument,
	UIAssetRegistry,
} from '@kurot/ui-document';
import { describe, expect, it } from 'vitest';
import { createKurotUI } from '../src/index.js';
import { createTestBitmapFont, mockTextMeasurement, requireInstance } from './text-component-fixtures.js';

mockTextMeasurement();

describe('text state and transaction restoration', () => {
	it.each([true, false])(
		'restores native appearance runs after an empty override (base present: %s)',
		basePresent => {
			const base = basePresent ? '<textFlow><Span text="100.80" size="20" /></textFlow>' : '';
			const authored = parseUIDocument(
				`<Skin xmlns="https://kurot.dev/ui/1" class="TextSkin" states="disabled,down"><RichLabel id="notice">${base}<textFlow.disabled /><textFlow.down><Span text="false" italic="true" /></textFlow.down></RichLabel></Skin>`,
			);
			const assets = new UIAssetRegistry();
			assets.registerAsset({ ...authored, contract: { ...authored.contract, targetType: 'kui.Button' } });
			const screen = createUIDocument({
				id: 'screen',
				root: createUINode({
					id: 'button',
					type: 'kui.Button',
					appearance: createUIAppearanceReference('TextSkin'),
				}),
			});
			const result = createKurotUI(screen, { assets });
			const button = requireInstance(result.root, Button);
			const skin = button.skin!;
			const label = requireInstance(skin.getPart('notice'), RichLabel);
			const original = label.textFlow;
			for (const stateName of ['down', 'disabled', 'down']) {
				const state = skin.states.find(item => item.name === stateName)!;
				for (const override of state.overrides) {
					override.apply(button, skin);
				}
				expect(label.textFlow).toEqual(
					stateName === 'disabled' ? [] : [{ text: 'false', style: { italic: true } }],
				);
				for (const override of state.overrides) {
					override.remove(button, skin);
				}
				expect(label.textFlow).toEqual(original);
			}
			result.dispose();
		},
	);

	it('restores initially absent content/font and the previous reusable state after a later adapter failure', () => {
		const registry = createKurotUIFoundationRegistry();
		registry.register({
			type: 'test.Probe',
			extends: 'kui.Group',
			children: 'none',
			properties: { status: { valueType: 'string' } },
		});
		const font = createTestBitmapFont();
		const flow = [{ text: 'Ready', style: { bold: true } }];
		const component = createUIDocument({
			id: 'text-card',
			assetKind: 'component',
			contract: createUIAssetContract({
				componentType: 'kui.Group',
				states: {
					ready: {
						overrides: [
							{ targetId: 'rich', property: 'textFlow', value: flow },
							{
								targetId: 'bitmap',
								property: 'font',
								value: createUIResourceReference('font', 'score_font'),
							},
						],
					},
					failed: {
						overrides: [
							{ targetId: 'rich', property: 'textFlow', value: [] },
							{
								targetId: 'bitmap',
								property: 'font',
								value: createUIResourceReference('font', 'other_font'),
							},
							{ targetId: 'probe', property: 'status', value: 'failed' },
						],
					},
				},
			}),
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				children: [
					createUINode({ id: 'rich', type: 'kui.RichLabel' }),
					createUINode({ id: 'bitmap', type: 'kui.BitmapLabel', properties: { text: 'AA' } }),
					createUINode({ id: 'probe', type: 'test.Probe', properties: { status: 'idle' } }),
				],
			}),
		});
		const screen = createUIDocument({
			id: 'screen',
			root: createUINode({
				id: 'card',
				type: 'kui.Group',
				instance: createUIComponentInstance({ source: createUIAssetReference('text-card') }),
			}),
		});
		const assets = new UIAssetRegistry();
		assets.registerAsset(component);
		assets.registerResource({ key: 'score_font', resourceType: 'font' });
		assets.registerResource({ key: 'other_font', resourceType: 'font' });
		const adapterState = new WeakMap<object, unknown>();
		const result = createKurotUI(screen, {
			assets,
			registry,
			resourceAdapters: { font: reference => (reference.key === 'score_font' ? font : reference.key) },
			adapters: {
				'test.Probe': {
					create: () => new Group(),
					applyProperty: (instance, _name, value) => {
						adapterState.set(instance, value);
						if (value === 'failed') {
							throw new Error('Rejected state');
						}
						return true;
					},
					captureProperty: instance => adapterState.get(instance),
					restoreProperty: (instance, _name, value) => {
						adapterState.set(instance, value);
					},
				},
			},
		});
		const rich = requireInstance(result.instances.get('card/rich'), RichLabel);
		const bitmap = requireInstance(result.instances.get('card/bitmap'), BitmapLabel);
		const probe = requireInstance(result.instances.get('card/probe'), Group);
		const controller = result.stateControllers.get('card')!;
		controller.setState('ready');
		expect(rich.textFlow).toEqual(flow);
		expect(bitmap.font).toBe(font);
		expect(() => controller.setState('failed')).toThrow('Rejected state');
		expect(controller.currentState).toBe('ready');
		expect(rich.textFlow).toEqual(flow);
		expect(bitmap.font).toBe(font);
		expect(adapterState.get(probe)).toBe('idle');
		controller.clearState();
		expect(rich.textFlow).toEqual([]);
		expect(bitmap.font).toBeUndefined();
		result.dispose();
		font.dispose();
	});

	it('updates flow bindings atomically and retains controller/target values after failure', () => {
		const registry = createKurotUIFoundationRegistry();
		registry.register({
			type: 'test.Probe',
			extends: 'kui.Group',
			children: 'none',
			properties: { flow: { valueType: 'array', format: 'text-flow' } },
		});
		const original = [{ text: 'Ready', style: { size: 20 } }];
		const document = createUIDocument({
			id: 'bound-text',
			contract: createUIAssetContract({
				dataFields: { flow: { valueType: 'array', format: 'text-flow' } },
				dataBindings: {
					a: { source: 'flow', targetId: 'rich', property: 'textFlow' },
					b: { source: 'flow', targetId: 'probe', property: 'flow' },
				},
			}),
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				children: [
					createUINode({ id: 'rich', type: 'kui.RichLabel' }),
					createUINode({ id: 'probe', type: 'test.Probe' }),
				],
			}),
		});
		const result = createKurotUI(document, {
			registry,
			data: { flow: original },
			adapters: {
				'test.Probe': {
					create: () => new Group(),
					applyProperty: (_instance, _name, value) => {
						if (Array.isArray(value) && value[0]?.text === 'failed') {
							throw new Error('Rejected binding');
						}
						return true;
					},
					captureProperty: () => undefined,
					restoreProperty: () => {},
				},
			},
		});
		const rich = requireInstance(result.instances.get('rich'), RichLabel);
		expect(rich.textFlow).toEqual(original);
		result.data.setValue('flow', []);
		expect(rich.textFlow).toEqual([]);
		result.data.setValue('flow', original);
		expect(() => result.data.setValue('flow', [{ text: 'failed', style: { italic: true } }])).toThrow(
			'Rejected binding',
		);
		expect(rich.textFlow).toEqual(original);
		expect(result.data.getValue('flow')).toEqual(original);
		expect(() => result.data.setValue('flow', [{ text: 'bad', style: { size: -1 } }])).toThrow();
		expect(rich.textFlow).toEqual(original);
		result.dispose();
	});
});
