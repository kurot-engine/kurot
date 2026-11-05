import { describe, expect, it } from 'vitest';
import { Button, Group, RichLabel } from '@kurot/ui';
import {
	createKurotUIFoundationRegistry,
	createUIAppearanceReference,
	createUIAssetContract,
	createUIDocument,
	createUINode,
	parseUIDocument,
	UIAssetRegistry,
} from '@kurot/ui-document';
import { createKurotUI } from '../src/index.js';
import { applyRichLabelProperty } from '../src/kurot/runtime/builtins/applyRichLabelProperties.js';
import { mockTextMeasurement, requireInstance } from './text-component-fixtures.js';

mockTextMeasurement();

describe('RichLabel typography materialization', () => {
	it('resolves a component color token to explicit black without materializing it in raw runs', () => {
		const assets = new UIAssetRegistry();
		assets.registerToken({ key: 'ink', tokenType: 'color', value: 0 });
		const document = parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="Token"><RichLabel id="rich" textColor="@style:colors:ink"><textFlow><Span text="follows" /></textFlow></RichLabel></Skin>',
		);
		const result = createKurotUI(document, { assets });
		const label = requireInstance(result.instances.get('rich'), RichLabel);
		expect(label.textColor).toBe(0);
		expect(label.textFlow).toEqual([{ text: 'follows' }]);
		result.dispose();
	});

	it('materializes all seven defaults, retains local style intent and remeasures changed content', () => {
		const document = parseUIDocument(`<Skin xmlns="https://kurot.dev/ui/1" class="Typography">
			<RichLabel id="rich" fontFamily="100" size="18" textColor="#FFFFFF" stroke="1" strokeColor="#123456" bold="true" italic="true">
				<textFlow><Span text="follows" /><Span text="fixed" size="18" bold="false" textColor="#000000" stroke="0" /></textFlow>
			</RichLabel>
		</Skin>`);
		const result = createKurotUI(document);
		const label = requireInstance(result.instances.get('rich'), RichLabel);
		expect([
			label.fontFamily,
			label.size,
			label.textColor,
			label.stroke,
			label.strokeColor,
			label.bold,
			label.italic,
		]).toEqual(['100', 18, 0xffffff, 1, 0x123456, true, true]);
		const flow = label.textFlow;
		expect(label.textHeight).toBe(18);
		label.size = 24;
		expect(label.textHeight).toBe(24);
		expect(label.textFlow).toEqual(flow);
		label.textFlow = [];
		label.textFlow = [{ text: 'replacement' }];
		expect(label.textHeight).toBe(24);
		result.dispose();
	});

	it('restores each appearance-state scalar without restoring or baking the changed textFlow', () => {
		const authored = parseUIDocument(`<Skin xmlns="https://kurot.dev/ui/1" class="Typography" states="disabled">
			<RichLabel id="rich" size="18" stroke="1" bold="true" size.disabled="24" bold.disabled="false" stroke.disabled="0" textColor.disabled="#000000">
				<textFlow><Span text="initial" /></textFlow>
			</RichLabel>
		</Skin>`);
		const assets = new UIAssetRegistry();
		assets.registerAsset({ ...authored, contract: { ...authored.contract, targetType: 'kui.Button' } });
		const document = createUIDocument({
			id: 'screen',
			root: createUINode({
				id: 'button',
				type: 'kui.Button',
				appearance: createUIAppearanceReference('Typography'),
			}),
		});
		const result = createKurotUI(document, { assets });
		const host = requireInstance(result.root, Button);
		const skin = host.skin!;
		const label = requireInstance(skin.getPart('rich'), RichLabel);
		const originalColor = label.textColor;
		const state = skin.states.find(item => item.name === 'disabled')!;
		for (const override of state.overrides) {
			override.apply(host, skin);
		}
		expect([label.size, label.bold, label.stroke, label.textColor]).toEqual([24, false, 0, 0]);
		label.textFlow = [{ text: 'updated' }, { text: 'fixed', style: { size: 18, bold: false } }];
		for (const override of state.overrides) {
			override.remove(host, skin);
		}
		expect([label.size, label.bold, label.stroke, label.textColor]).toEqual([18, true, 1, originalColor]);
		expect(label.textFlow).toEqual([{ text: 'updated' }, { text: 'fixed', style: { size: 18, bold: false } }]);
		result.dispose();
	});

	it('rolls back typography bindings and measurements after a later adapter rejects an update', () => {
		const registry = createKurotUIFoundationRegistry();
		registry.register({
			type: 'test.Probe',
			extends: 'kui.Group',
			children: 'none',
			properties: { size: { valueType: 'number', minimum: 0 } },
		});
		const document = createUIDocument({
			id: 'bound-typography',
			contract: createUIAssetContract({
				dataFields: { size: { valueType: 'number', minimum: 0 } },
				dataBindings: {
					a: { source: 'size', targetId: 'rich', property: 'size' },
					b: { source: 'size', targetId: 'probe', property: 'size' },
				},
			}),
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				children: [
					createUINode({
						id: 'rich',
						type: 'kui.RichLabel',
						properties: { textFlow: [{ text: 'follows' }] },
					}),
					createUINode({ id: 'probe', type: 'test.Probe' }),
				],
			}),
		});
		const values = new WeakMap<object, unknown>();
		const result = createKurotUI(document, {
			registry,
			data: { size: 18 },
			adapters: {
				'test.Probe': {
					create: () => new Group(),
					applyProperty: (instance, _name, value) => {
						values.set(instance, value);
						if (value === 32) {
							throw new Error('Rejected typography binding');
						}
						return true;
					},
					captureProperty: instance => values.get(instance),
					restoreProperty: (instance, _name, value) => {
						values.set(instance, value);
					},
				},
			},
		});
		const label = requireInstance(result.instances.get('rich'), RichLabel);
		expect(label.textHeight).toBe(18);
		result.data.setValue('size', 24);
		expect(label.textHeight).toBe(24);
		expect(() => result.data.setValue('size', 32)).toThrow('Rejected typography binding');
		expect([result.data.getValue('size'), label.size, label.textHeight]).toEqual([24, 24, 24]);
		expect(label.textFlow).toEqual([{ text: 'follows' }]);
		expect(() => result.data.setValue('size', -1)).toThrow();
		expect(label.size).toBe(24);
		result.dispose();
	});

	it.each([
		['fontFamily', 100],
		['bold', 'true'],
		['italic', 1],
		['size', -1],
		['size', Infinity],
		['stroke', -1],
		['textColor', -1],
		['textColor', 0x1000000],
		['strokeColor', 1.5],
	] as const)('reports the exact path for invalid resolved %s', (name, value) => {
		expect(() => applyRichLabelProperty(new RichLabel(), name, value, '$.rich.' + name)).toThrowError(
			expect.objectContaining({ code: 'invalid-property', path: '$.rich.' + name }),
		);
	});
});
