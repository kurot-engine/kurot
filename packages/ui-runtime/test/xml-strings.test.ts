import { Button, Label } from '@kurot/ui';
import {
	createUIAppearanceReference,
	createUIDocument,
	createUINode,
	parseUIDocument,
	UIAssetRegistry,
} from '@kurot/ui-document';
import { describe, expect, it } from 'vitest';
import { createKurotUI } from '../src/index.js';

describe('document 0.8 literal XML strings', () => {
	it.each(['100.80', '0.50', 'true', 'false', '@token:string:title', String.raw`\folder`])(
		'materializes exact Label text %j without type conversion',
		value => {
			const document = parseUIDocument(
				`<Skin xmlns="https://kurot.dev/ui/1" class="Test"><Label id="amount" text="${value}" size="48" /></Skin>`,
			);
			const result = createKurotUI(document);
			try {
				const label = result.instances.get('amount');
				if (!(label instanceof Label)) {
					throw new Error('Expected native Label.');
				}

				expect(label.text).toBe(value);
				expect(label.size).toBe(48);
			} finally {
				result.dispose();
			}
		},
	);

	it('applies literal native appearance state text and restores the exact decimal string', () => {
		const authored = parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="AmountSkin" states="down"><Label id="amount" text="100.80" text.down="false" /></Skin>',
		);
		const assets = new UIAssetRegistry();
		assets.registerAsset({ ...authored, contract: { ...authored.contract, targetType: 'kui.Button' } });
		const screen = createUIDocument({
			id: 'screen',
			root: createUINode({
				id: 'button',
				type: 'kui.Button',
				appearance: createUIAppearanceReference('AmountSkin'),
			}),
		});
		const result = createKurotUI(screen, { assets });
		try {
			const button = result.root;
			if (!(button instanceof Button) || !button.skin) {
				throw new Error('Expected native Button appearance.');
			}
			const label = button.skin.getPart('amount');
			const state = button.skin.states.find(item => item.name === 'down');
			if (!(label instanceof Label) || !state) {
				throw new Error('Expected native Label and down state.');
			}

			expect(label.text).toBe('100.80');
			for (const override of state.overrides) {
				override.apply(button, button.skin);
			}
			expect(label.text).toBe('false');
			for (const override of state.overrides) {
				override.remove(button, button.skin);
			}
			expect(label.text).toBe('100.80');
		} finally {
			result.dispose();
		}
	});
});
