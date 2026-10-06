import { Stage } from '@kurot/core';
import { Button, Label } from '@kurot/ui';
import {
	createUIAppearanceReference,
	createUIDocument,
	createUINode,
	parseUIDocument,
	parseUIStyleSheet,
	resolveUIStyleColors,
	serializeUIDocument,
	UIAssetRegistry,
} from '@kurot/ui-document';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createKurotUI } from '../src/index.js';

const style = parseUIStyleSheet({
	schemaVersion: 1,
	fonts: {
		default: 'primary',
		families: {
			primary: {
				fallback: ['sans-serif'],
				faces: [{ url: 'assets/fonts/Regular.ttf', weight: 400 }],
			},
		},
	},
	colors: { 'normal-text': '#FF9900', 'pressed-text': '#3366FF', 'disabled-text': '#000000' },
});

beforeEach(() => {
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
		font: '',
		measureText: (text: string) => ({ width: text.length * 10 }),
	} as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('document 0.10 stylesheet color materialization', () => {
	it.each(['copy', 'registry'] as const)(
		'restores native appearance state colors through the %s resolution path',
		mode => {
			const authored = parseUIDocument(`
<Skin xmlns="https://kurot.dev/ui/1" class="StyleSkin" states="up,down,disabled">
    <Label id="caption" text="@style:colors:normal-text"
        textColor="@style:colors:normal-text"
        textColor.down="@style:colors:pressed-text"
        textColor.disabled="@style:colors:disabled-text" />
</Skin>`);
			const snapshot = structuredClone(authored);
			const originalXml = serializeUIDocument(authored);
			const assets = new UIAssetRegistry();
			const appearance = mode === 'copy' ? resolveUIStyleColors(authored, style.colors) : authored;
			assets.registerAsset({ ...appearance, contract: { ...appearance.contract, targetType: 'kui.Button' } });
			if (mode === 'registry') {
				for (const [key, value] of Object.entries(style.colors)) {
					assets.registerToken({ key, tokenType: 'color', value });
				}
			}
			const screen = createUIDocument({
				id: 'screen',
				root: createUINode({
					id: 'button',
					type: 'kui.Button',
					appearance: createUIAppearanceReference('StyleSkin'),
				}),
			});
			const result = createKurotUI(screen, { assets });
			const stage = new Stage();
			stage.addChild(result.root);
			try {
				const button = result.root;
				if (!(button instanceof Button) || !button.skin) {
					throw new Error('Expected native Button appearance.');
				}
				const caption = button.skin.getPart('caption');
				if (!(caption instanceof Label)) {
					throw new Error('Expected native caption Label.');
				}

				button.validateNow();
				expect(caption.textColor).toBe(0xff9900);
				button.currentState = 'down';
				button.validateNow();
				expect(caption.textColor).toBe(0x3366ff);
				button.currentState = 'disabled';
				button.validateNow();
				expect(caption.textColor).toBe(0);
				button.currentState = 'up';
				button.validateNow();
				expect(caption.textColor).toBe(0xff9900);
				expect(caption.text).toBe('@style:colors:normal-text');
				expect(authored).toEqual(snapshot);
				expect(serializeUIDocument(authored)).toBe(originalXml);
			} finally {
				stage.removeChild(result.root);
				result.dispose();
			}
		},
	);

	it('rejects missing colors in inactive states before creating a preview', () => {
		const authored = parseUIDocument(`
<Skin xmlns="https://kurot.dev/ui/1" class="MissingStyleSkin" states="disabled">
    <Label id="caption" textColor="#FF9900" textColor.disabled="@style:colors:missing-text" />
</Skin>`);
		expect(() => resolveUIStyleColors(authored, style.colors)).toThrow(
			/\$\.contract\.states\.disabled.*missing-text/,
		);
		expect(serializeUIDocument(authored)).toContain('textColor.disabled="@style:colors:missing-text"');
	});
});
