import { afterEach, describe, expect, it } from 'vitest';
import { Stage, TextField } from '@kurot/core';
import { Button, RichLabel } from '@kurot/ui';
import {
	createUIAppearanceReference,
	createUIDocument,
	createUINode,
	parseUIDocument,
	UIAssetRegistry,
} from '@kurot/ui-document';
import { createKurotUI } from '../src/index.js';
import { applyRichLabelProperty } from '../src/kurot/runtime/builtins/applyRichLabelProperties.js';
import { mockTextMeasurement, requireInstance } from './text-component-fixtures.js';

mockTextMeasurement();
afterEach(() => {
	RichLabel.defaultOutlineLayout = 'render-only';
});

function skin(attributes: string) {
	return parseUIDocument(`<Skin xmlns="https://kurot.dev/ui/1" class="Outline" states="down">
	<RichLabel id="rich" size="16" stroke="1" width="80" ${attributes}>
	<textFlow><Span text="ABCDEFGHIJ"/></textFlow></RichLabel></Skin>`);
}

describe('RichLabel outline materialization', () => {
	it('uses the native inner frame and keeps omitted old skins on their construction policy', () => {
		for (const [attributes, policy, x, y] of [
			['', 'render-only', 0, 0],
			['outlineLayout="reserve-space"', 'reserve-space', 4, 3],
		] as const) {
			const result = createKurotUI(skin(attributes));
			const stage = new Stage();
			stage.addChild(result.root);
			try {
				const label = requireInstance(result.instances.get('rich'), RichLabel);
				label.validateNow();
				const field = requireInstance(label.getChildAt(0), TextField);
				expect(label.outlineLayout).toBe(policy);
				expect([field.x, field.y, field.width]).toEqual([x, y, 80 - x * 2]);
				expect(label.textFlow).toEqual([{ text: 'ABCDEFGHIJ' }]);
			} finally {
				stage.removeChildren();
				result.dispose();
			}
		}
	});

	it('does not fill an omitted default and restores the captured value after a native state', () => {
		RichLabel.defaultOutlineLayout = 'reserve-space';
		const authored = skin('outlineLayout.down="render-only"');
		const assets = new UIAssetRegistry();
		assets.registerAsset({ ...authored, contract: { ...authored.contract, targetType: 'kui.Button' } });
		const result = createKurotUI(
			createUIDocument({
				id: 'screen',
				root: createUINode({
					id: 'host',
					type: 'kui.Button',
					appearance: createUIAppearanceReference('Outline'),
				}),
			}),
			{ assets },
		);
		try {
			const host = requireInstance(result.root, Button);
			const nativeSkin = host.skin!;
			const label = requireInstance(nativeSkin.getPart('rich'), RichLabel);
			expect(label.outlineLayout).toBe('reserve-space');
			const state = nativeSkin.states.find(state => state.name === 'down')!;
			for (const override of state.overrides) {
				override.apply(host, nativeSkin);
			}
			expect(label.outlineLayout).toBe('render-only');
			for (const override of state.overrides) {
				override.remove(host, nativeSkin);
			}
			expect(label.outlineLayout).toBe('reserve-space');
			expect(authored.root.children[0]?.properties).not.toHaveProperty('outlineLayout');
		} finally {
			result.dispose();
		}
	});

	it.each(['auto', true, 0, undefined])('rejects invalid resolved policy %j at the exact path', value => {
		expect(() => applyRichLabelProperty(new RichLabel(), 'outlineLayout', value, '$.policy')).toThrowError(
			expect.objectContaining({ code: 'invalid-property', path: '$.policy' }),
		);
	});

	it('fails clearly on an older host instead of adding a nonfunctional field', () => {
		const label = new RichLabel();
		const older = new Proxy(label, {
			has: (target, name) => name !== 'outlineLayout' && Reflect.has(target, name),
		});
		expect(() => applyRichLabelProperty(older, 'outlineLayout', 'reserve-space', '$.policy')).toThrow(/5\.3\.0/);
		expect(Object.hasOwn(label, 'outlineLayout')).toBe(false);
	});

	it('rejects state-only settings on an older host before installing its native skin', () => {
		const descriptor = Object.getOwnPropertyDescriptor(RichLabel.prototype, 'outlineLayout')!;
		Reflect.deleteProperty(RichLabel.prototype, 'outlineLayout');
		try {
			const authored = skin('outlineLayout.down="reserve-space"');
			const assets = new UIAssetRegistry();
			assets.registerAsset({ ...authored, contract: { ...authored.contract, targetType: 'kui.Button' } });
			expect(() =>
				createKurotUI(
					createUIDocument({
						id: 'old',
						root: createUINode({
							id: 'host',
							type: 'kui.Button',
							appearance: createUIAppearanceReference('Outline'),
						}),
					}),
					{ assets },
				),
			).toThrowError(
				expect.objectContaining({
					code: 'invalid-property',
					path: expect.stringContaining('.contract.states.down.overrides[0].value'),
				}),
			);
		} finally {
			Object.defineProperty(RichLabel.prototype, 'outlineLayout', descriptor);
		}
	});
});
