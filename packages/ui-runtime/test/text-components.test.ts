import { resource } from '@kurot/core';
import { BitmapLabel, Label, RichLabel } from '@kurot/ui';
import {
	createUIDocument,
	createUINode,
	createUIResourceReference,
	parseUIDocument,
	UIAssetRegistry,
} from '@kurot/ui-document';
import { describe, expect, it, vi } from 'vitest';
import { createKurotUI } from '../src/index.js';
import { applyBitmapLabelProperty } from '../src/kurot/runtime/builtins/applyBitmapLabelProperties.js';
import { applyRichLabelProperty } from '../src/kurot/runtime/builtins/applyRichLabelProperties.js';
import { createTestBitmapFont, mockTextMeasurement, requireInstance } from './text-component-fixtures.js';

mockTextMeasurement();

describe('native text materialization', () => {
	it('creates an independent RichLabel with literal runs and native layout defaults', () => {
		const document =
			parseUIDocument(`<Skin xmlns="https://kurot.dev/ui/1" class="RichSkin"><RichLabel id="notice" width="70" lineSpacing="2" textAlign="center" verticalAlign="middle">
			<textFlow><Span text="Balance: " size="20" /><Span text="100.80&#10;true" bold="true" textColor="#FFCC00" strokeColor="#000000" stroke="1" /></textFlow>
		</RichLabel></Skin>`);
		const result = createKurotUI(document);
		const label = requireInstance(result.instances.get('notice'), RichLabel);
		expect(label).not.toBeInstanceOf(Label);
		expect(label.multiline).toBe(true);
		expect(label.wordWrap).toBe(true);
		expect(label.textAlign).toBe('center');
		expect(label.verticalAlign).toBe('middle');
		expect(label.textFlow).toEqual([
			{ text: 'Balance: ', style: { size: 20 } },
			{ text: '100.80\ntrue', style: { bold: true, textColor: 0xffcc00, strokeColor: 0, stroke: 1 } },
		]);
		expect(label.textHeight).toBeGreaterThan(30);
		expect(result.instances.size).toBe(2);
		const copy = label.textFlow;
		copy[0]!.text = 'changed';
		copy[0]!.style!.size = 99;
		expect(label.textFlow[0]).toEqual({ text: 'Balance: ', style: { size: 20 } });
		expect(document.root.children[0]?.properties.textFlow).toEqual(label.textFlow);
		result.dispose();
	});

	it('measures wrapping after width changes and respects explicit single-line mode', () => {
		const result = createKurotUI(
			parseUIDocument(
				'<Skin xmlns="https://kurot.dev/ui/1" class="Measure"><RichLabel id="text" width="40"><textFlow><Span text="AB CD" size="20" /></textFlow></RichLabel></Skin>',
			),
		);
		const label = requireInstance(result.instances.get('text'), RichLabel);
		expect(label.textHeight).toBe(40);
		label.width = 100;
		expect(label.textHeight).toBe(20);
		label.width = 40;
		label.multiline = false;
		expect(label.textHeight).toBe(20);
		expect(label.textWidth).toBe(50);
		result.dispose();
	});

	it('passes font keys unchanged to Core and measures cached bitmap glyphs', () => {
		const font = createTestBitmapFont();
		const get = vi.spyOn(resource, 'get').mockReturnValue(font);
		const assets = new UIAssetRegistry();
		assets.registerResource({ key: 'true', resourceType: 'font' });
		const result = createKurotUI(
			parseUIDocument(
				'<Skin xmlns="https://kurot.dev/ui/1" class="Bitmap"><BitmapLabel id="score" font="true" text="AA" width="10" lineSpacing="2" smoothing="false" /></Skin>',
			),
			{ assets },
		);
		const label = requireInstance(result.instances.get('score'), BitmapLabel);
		expect(label.font).toBe('true');
		label.commitProperties();
		expect(get).toHaveBeenCalledWith('true');
		expect(label.textHeight).toBe(26);
		expect(label.smoothing).toBe(false);
		result.dispose();
		expect(font.getTexture('A')).toBeDefined();
		get.mockRestore();
		font.dispose();
	});

	it('accepts a caller-owned native font through the font resource adapter', () => {
		const font = createTestBitmapFont();
		const assets = new UIAssetRegistry();
		assets.registerResource({ key: 'score_font', resourceType: 'font' });
		const result = createKurotUI(
			parseUIDocument(
				'<Skin xmlns="https://kurot.dev/ui/1" class="Bitmap"><BitmapLabel id="score" font="score_font" text="AA" letterSpacing="-1" textAlign="right" verticalAlign="bottom" /></Skin>',
			),
			{
				assets,
				resourceAdapters: { font: () => font },
			},
		);
		const label = requireInstance(result.instances.get('score'), BitmapLabel);
		expect(label.font).toBe(font);
		expect(label.textWidth).toBe(19);
		expect(label.textHeight).toBe(12);
		result.dispose();
		expect(font.getTexture('A')).toBeDefined();
		font.dispose();
	});

	it('rejects a wrong resolved font at the exact property path', () => {
		const assets = new UIAssetRegistry();
		assets.registerResource({ key: 'score_font', resourceType: 'font' });
		expect(() =>
			createKurotUI(
				parseUIDocument(
					'<Skin xmlns="https://kurot.dev/ui/1" class="Bitmap"><BitmapLabel font="score_font" /></Skin>',
				),
				{
					assets,
					resourceAdapters: { font: () => ({ page: 'font.png' }) },
				},
			),
		).toThrowError(
			expect.objectContaining({ code: 'invalid-property', path: '$.root.children[0].properties.font' }),
		);
	});

	it.each([
		'<RichLabel text="wrong" />',
		'<RichLabel textColor="#FFFFFF" />',
		'<RichLabel textFit="shrink" />',
		'<RichLabel size.disabled="20" />',
		'<BitmapLabel size="20" />',
	])('rejects properties from incompatible text contracts %s', body => {
		expect(() =>
			createKurotUI(
				parseUIDocument(
					`<Skin xmlns="https://kurot.dev/ui/1" class="Invalid" states="disabled">${body}</Skin>`,
				),
			),
		).toThrowError(expect.objectContaining({ code: 'invalid-document' }));
	});

	it('rejects a semantic image reference as a bitmap font before materialization', () => {
		const assets = new UIAssetRegistry();
		assets.registerResource({ key: 'page', resourceType: 'image' });
		const document = createUIDocument({
			id: 'invalid-font',
			root: createUINode({
				id: 'score',
				type: 'kui.BitmapLabel',
				properties: { font: createUIResourceReference('image', 'page') },
			}),
		});
		expect(() => createKurotUI(document, { assets })).toThrowError(
			expect.objectContaining({ code: 'invalid-document' }),
		);
	});

	it.each([
		['textFlow', [{ text: 'invalid', style: { size: -1 } }]],
		['textFlow', [{ text: 'invalid', style: { href: 'link' } }]],
		['wordWrap', 'true'],
		['multiline', 1],
		['lineSpacing', -1],
		['textAlign', 'justify'],
		['verticalAlign', 'baseline'],
	] as const)('rejects malformed resolved rich property %s', (name, value) => {
		expect(() => applyRichLabelProperty(new RichLabel(), name, value, '$.value')).toThrowError(
			expect.objectContaining({ code: 'invalid-property', path: '$.value' }),
		);
	});

	it.each([
		['font', undefined],
		['font', {}],
		['text', 100.8],
		['letterSpacing', Infinity],
		['smoothing', 'false'],
	] as const)('rejects malformed resolved bitmap property %s', (name, value) => {
		expect(() => applyBitmapLabelProperty(new BitmapLabel(), name, value, '$.value')).toThrowError(
			expect.objectContaining({ code: 'invalid-property', path: '$.value' }),
		);
	});
});
