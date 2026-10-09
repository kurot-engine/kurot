import { describe, expect, it } from 'vitest';
import { Button, Group, Image } from '@kurot/ui';
import {
	createUIDocument,
	createUIAssetContract,
	createUINode,
	createUIAppearanceReference,
	parseUIDocument,
	UIAssetRegistry,
} from '@kurot/ui-document';
import { createKurotUI } from '../src/index.js';

function requireGroup(value: unknown): Group {
	if (!(value instanceof Group)) throw new Error('Expected Group.');
	return value;
}

describe('centered flip materialization', () => {
	it('applies native frame flips on Group and Image without changing authored scale', () => {
		const document = parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="FlipSkin"><Group id="group" width="100" height="40" flipX="true"><Image id="image" width="80" height="20" flipY="true" scaleX="-2" /></Group></Skin>',
		);
		const result = createKurotUI(document);
		const group = requireGroup(result.instances.get('group'));
		const image = result.instances.get('image');
		if (!(image instanceof Image)) throw new Error('Expected Image.');
		group.setLayoutBoundsSize(100, 40);
		image.setLayoutBoundsSize(NaN, NaN);
		expect(group.flipX).toBe(true);
		expect(image.flipY).toBe(true);
		expect(image.scaleX).toBe(-2);
		expect(group.localToGlobal(0, 0).x).toBe(100);
		expect(document.root.children[0]?.properties.flipX).toBe(true);
		result.dispose();
	});

	it('switches and restores false-default native appearance state flags', () => {
		const appearance = parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="FlipSkin" states="down"><Group id="graphic" flipY="true" flipY.down="false" flipX.down="true" /></Skin>',
		);
		const assets = new UIAssetRegistry();
		assets.registerAsset({ ...appearance, contract: { ...appearance.contract, targetType: 'kui.Button' } });
		const result = createKurotUI(
			createUIDocument({
				id: 'screen',
				root: createUINode({
					id: 'button',
					type: 'kui.Button',
					appearance: createUIAppearanceReference('FlipSkin'),
				}),
			}),
			{ assets },
		);
		if (!(result.root instanceof Button)) throw new Error('Expected Button.');
		const skin = result.root.skin!;
		const graphic = requireGroup(skin.getPart('graphic'));
		const state = skin.states.find(state => state.name === 'down')!;
		for (const override of state.overrides) {
			override.apply(result.root, skin);
		}
		expect([graphic.flipX, graphic.flipY]).toEqual([true, false]);
		for (const override of state.overrides) {
			override.remove(result.root, skin);
		}
		expect([graphic.flipX, graphic.flipY]).toEqual([false, true]);
		result.dispose();
	});

	it('uses a typed data binding and rejects invalid updates without losing the existing flag', () => {
		const document = createUIDocument({
			id: 'screen',
			contract: createUIAssetContract({
				dataFields: { reflected: { valueType: 'boolean', defaultValue: false } },
				dataBindings: { flip: { source: 'reflected', targetId: 'root', property: 'flipX' } },
			}),
			root: createUINode({ id: 'root', type: 'kui.Group' }),
		});
		const result = createKurotUI(document);
		const group = requireGroup(result.root);
		expect(group.flipX).toBe(false);
		result.data.setValue('reflected', true);
		expect(group.flipX).toBe(true);
		expect(() => result.data.setValue('reflected', 'true')).toThrow();
		expect(group.flipX).toBe(true);
		result.dispose();
	});
});
