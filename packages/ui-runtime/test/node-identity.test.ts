import { Button, Group } from '@kurot/ui';
import { createUIAppearanceReference, createUIAssetContract, createUIAssetReference, createUIComponentInstance, createUIDocument, createUISkinRoot, createUINode, UIAssetRegistry } from '@kurot/ui-document';
import { expect, it } from 'vitest';
import { createKurotUI, qualifyAppearanceScope, qualifyNodeId } from '../src/index.js';

it('keeps literal IDs distinct from component paths, escape sequences and appearance scopes', () => {
	const child = (id: string) => createUINode({ id, type: 'kui.Group' });
	const card = createUIDocument({
		id: 'card', assetKind: 'component', contract: createUIAssetContract({ componentType: 'game.Card' }),
		root: createUINode({ id: 'root', type: 'kui.Group', children: [child('label')] }),
	});
	const assets = new UIAssetRegistry();
	assets.registerAsset(card);
	const appearance = createUIDocument({
		id: 'hud/card', assetKind: 'appearance', contract: createUIAssetContract({ targetType: 'kui.Button' }),
		root: createUISkinRoot({ children: [child('face')] }),
	});
	assets.registerAsset(appearance);
	const screen = createUIDocument({
		id: 'screen', root: createUINode({ id: 'root', type: 'kui.Group', children: [
			createUINode({ id: 'play', type: 'game.Card', instance: createUIComponentInstance({ source: createUIAssetReference('card') }) }),
			child('play/label'), child('play%2Flabel'), child('play@appearance:skin'),
			createUINode({ id: 'button', type: 'kui.Button', appearance: createUIAppearanceReference('hud/card') }),
			child('button@appearance:hud/card/face'),
		] }),
	});
	const result = createKurotUI(screen, { assets });
	const root = result.root as Group;
	expect(result.instances.get('play/label')).toBe((root.getChildAt(0) as Group).getChildAt(0));
	expect(result.instances.get('play%2Flabel')).toBe(root.getChildAt(1));
	expect(result.instances.get('play%252Flabel')).toBe(root.getChildAt(2));
	expect(result.instances.get('play%40appearance:skin')).toBe(root.getChildAt(3));
	const button = root.getChildAt(4) as Button;
	const skinNode = result.instances.get(qualifyNodeId(qualifyAppearanceScope('button', 'hud/card'), 'face'));
	expect(skinNode).toBe(button.skin?.getPart('face'));
	expect(skinNode).toBeInstanceOf(Group);
	expect(result.instances.get(qualifyNodeId('', 'button@appearance:hud/card/face'))).toBe(root.getChildAt(5));
	result.dispose();
});
