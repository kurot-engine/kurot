import { describe, expect, it } from 'vitest';
import { Button, Image } from '@kurot/ui';
import {
	createUIDocument,
	createUINode,
	createUIAppearanceReference,
	UIAssetRegistry,
	parseUIDocument,
	parseUIResourceConfigEntries,
	resolveUIResourceDefaults,
} from '@kurot/ui-document';
import { createKurotUI } from '../src/index.js';
import { applyImageProperty } from '../src/kurot/runtime/builtins/applyImageProperties.js';

const resources = parseUIResourceConfigEntries({
	resources: [{ name: 'panel', type: 'image', url: 'panel.png', scale9grid: '2,3,4,5' }],
});

describe('resource default runtime materialization', () => {
	it('applies defaults without editing XML, preserves local rectangles and explicit opt-out', () => {
		const authored = parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="Test"><Image id="inherited" source="panel"/><Image id="local" source="panel" scale9Grid="1,1,2,2"/><Image id="off" source="panel" scale9Grid="false"/></Skin>',
		);
		const assets = new UIAssetRegistry();
		assets.registerResource({ key: 'panel', resourceType: 'image' });
		const result = createKurotUI(resolveUIResourceDefaults(authored, resources), {
			assets,
			resourceAdapters: { image: () => '' },
		});
		const inherited = result.instances.get('inherited');
		const local = result.instances.get('local');
		const off = result.instances.get('off');
		expect(inherited).toBeInstanceOf(Image);
		expect(inherited instanceof Image && inherited.scale9Grid).toMatchObject({ x: 2, y: 3, width: 4, height: 5 });
		expect(local instanceof Image && local.scale9Grid).toMatchObject({ x: 1, y: 1, width: 2, height: 2 });
		expect(off instanceof Image && off.scale9Grid).toBeUndefined();
		expect(authored.root.children[0]?.properties.scale9Grid).toBeUndefined();
		result.dispose();
	});

	it('restores native Skin grids on state exit, including a transition through a texture with no default', () => {
		const authored = parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="Test" states="down,disabled"><Image id="image" source="panel" source.down="other" source.disabled="plain"/></Skin>',
		);
		const entries = [
			...resources,
			{ name: 'other', type: 'image', url: 'other.png', scale9grid: '1,1,8,8' },
			{ name: 'plain', type: 'image', url: 'plain.png' },
		];
		const resolved = resolveUIResourceDefaults(authored, entries);
		const appearance = { ...resolved, contract: { ...resolved.contract, targetType: 'kui.Button' } };
		const assets = new UIAssetRegistry();
		assets.registerAsset(appearance);
		for (const key of ['panel', 'other', 'plain']) {
			assets.registerResource({ key, resourceType: 'image' });
		}
		const screen = createUIDocument({
			id: 'screen',
			root: createUINode({ id: 'button', type: 'kui.Button', appearance: createUIAppearanceReference('Test') }),
		});
		const result = createKurotUI(screen, { assets, resourceAdapters: { image: () => '' } });
		const button = result.root;
		if (!(button instanceof Button) || !button.skin) {
			throw new Error('Expected native button skin.');
		}
		const image = button.skin.getPart('image');
		if (!(image instanceof Image)) {
			throw new Error('Expected native image part.');
		}
		expect(image.scale9Grid).toMatchObject({ x: 2, y: 3, width: 4, height: 5 });
		for (const state of button.skin.states) {
			for (const override of state.overrides) {
				override.apply(button, button.skin);
			}
			if (state.name === 'down') {
				expect(image.scale9Grid).toMatchObject({ x: 1, y: 1, width: 8, height: 8 });
			} else {
				expect(image.scale9Grid).toBeUndefined();
			}
			for (const override of state.overrides) {
				override.remove(button, button.skin);
			}
			expect(image.scale9Grid).toMatchObject({ x: 2, y: 3, width: 4, height: 5 });
		}
		result.dispose();
	});
	it('clears an already assigned runtime rectangle with false', () => {
		const image = new Image();
		applyImageProperty(image, 'scale9Grid', { x: 2, y: 3, width: 4, height: 5 }, '$');
		expect(image.scale9Grid).toBeDefined();
		applyImageProperty(image, 'scale9Grid', false, '$');
		expect(image.scale9Grid).toBeUndefined();
	});
});
