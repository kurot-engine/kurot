import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Button, Group, Label } from '@kurot/ui';
import { Stage } from '@kurot/core';
import {
	createUIAppearanceReference,
	createUIDocument,
	createUINode,
	parseUIDocument,
	serializeUIDocument,
	UIAssetRegistry,
} from '@kurot/ui-document';
import { createKurotUI } from '../src/index.js';

const metrics = {
	font: '',
	measureText(text: string): { width: number } {
		return { width: (text.length * Number(/([\d.]+)px/.exec(this.font)?.[1] ?? 30)) / 2 };
	},
};

function amount(root: Group): Label {
	const label = root.getChildAt(0);
	if (!(label instanceof Label)) {
		throw new Error('Expected materialized Label.');
	}
	return label;
}

function source(properties: string): string {
	return `<Skin xmlns="https://kurot.dev/ui/1" class="FitSkin"><Label id="amount" text="ABCDEFGHIJ" width="100" size="30" ${properties}/></Skin>`;
}

describe('Label fitting materialization', () => {
	beforeEach(() => {
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
			metrics as unknown as CanvasRenderingContext2D,
		);
	});
	afterEach(() => vi.restoreAllMocks());

	it('runs native shrinking in preview without changing the semantic document', () => {
		const document = parseUIDocument(source('multiline="false" textFit="shrink" minFontSize="16"'));
		const originalXML = serializeUIDocument(document);
		const result = createKurotUI(document);
		const stage = new Stage();
		stage.addChild(result.root);
		try {
			if (!(result.root instanceof Group)) {
				throw new Error('Expected Skin root Group.');
			}
			result.root.validateNow();
			const label = amount(result.root);
			expect(label.size).toBe(30);
			expect(label.renderedSize).toBeCloseTo(20, 0);
			expect(label.minFontSize).toBe(16);
			expect(label.textFitOverflow).toBe(false);
			expect(serializeUIDocument(document)).toBe(originalXML);
			label.text = 'ABC';
			result.root.validateNow();
			expect(label.renderedSize).toBe(30);
		} finally {
			stage.removeChild(result.root);
			result.dispose();
		}
	});

	it('uses constructor multiline defaults when XML omits the flag', () => {
		const result = createKurotUI(parseUIDocument(source('')));
		try {
			const label = result.instances.get('amount');
			expect(label).toBeInstanceOf(Label);
			if (!(label instanceof Label)) return;
			expect(label.multiline).toBe(true);
			expect(label.textFit).toBe('none');
		} finally {
			result.dispose();
		}
	});

	it('restores authored appearance state sizes instead of capturing the fitted drawing size', () => {
		const authored = parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="FitSkin" states="up,down"><Label id="labelDisplay" text="ABCDEFGHIJ" width="100" size="30" size.down="16" multiline="false" textFit="shrink" minFontSize="12" /></Skin>',
		);
		const appearance = { ...authored, contract: { ...authored.contract, targetType: 'kui.Button' } };
		const originalAppearance = structuredClone(appearance);
		const assets = new UIAssetRegistry();
		assets.registerAsset(appearance);
		const screen = createUIDocument({
			id: 'screen',
			root: createUINode({
				id: 'button',
				type: 'kui.Button',
				properties: { width: 100, height: 40, label: 'ABCDEFGHIJ' },
				appearance: createUIAppearanceReference('FitSkin'),
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
			const label = button.skin.getPart('labelDisplay');
			if (!(label instanceof Label)) {
				throw new Error('Expected native Label part.');
			}

			button.validateNow();
			expect(label.size).toBe(30);
			expect(label.renderedSize).toBeCloseTo(20, 0);
			button.currentState = 'down';
			button.validateNow();
			expect(label.size).toBe(16);
			expect(label.renderedSize).toBe(16);
			button.currentState = 'up';
			button.validateNow();
			expect(label.size).toBe(30);
			expect(label.renderedSize).toBeCloseTo(20, 0);
			expect(appearance).toEqual(originalAppearance);
		} finally {
			stage.removeChild(result.root);
			result.dispose();
		}
	});

	it('rejects fitting policies and minimum sizes outside the shared authoring contract', () => {
		expect(() => createKurotUI(parseUIDocument(source('textFit="stretch"')))).toThrow();
		expect(() => createKurotUI(parseUIDocument(source('minFontSize="0"')))).toThrow();
		expect(() => createKurotUI(parseUIDocument(source('renderedSize="16"')))).toThrow();
		expect(() =>
			createKurotUI(parseUIDocument(source('textFit="shrink"').replace('<Label ', '<EditableText '))),
		).toThrow();
	});
});
