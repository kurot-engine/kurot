import { describe, expect, it } from 'vitest';
import {
	createKurotUIFoundationRegistry,
	createUIDocument,
	createUINode,
	isUIPropertyDefinitionAssignable,
	isUITextFlow,
	matchesUIPropertyDefinition,
	parseUIDocument,
	serializeUIDocument,
	UIAssetRegistry,
	validateUIAssetRegistry,
	validateUIDocumentComponents,
} from '../src/index.js';
import type { UIPropertyValue, UITextFlow } from '../src/index.js';

const components = createKurotUIFoundationRegistry();
const flowProperty = components.resolve('kui.RichLabel')!.properties.textFlow!;

describe('BitmapLabel and RichLabel catalog', () => {
	it.each(['kui.BitmapLabel', 'kui.RichLabel'])('keeps %s independent of Label', type => {
		const definition = components.resolve(type)!;
		expect(definition.baseTypes).not.toContain('kui.Label');
		expect(definition.children).toBe('none');
		for (const property of ['textStyle', 'textFit', 'minFontSize', 'size', 'fontFamily', 'textColor']) {
			expect(definition.properties[property]).toBeUndefined();
		}
		expect(definition.properties.multiline?.defaultValue).toBe(true);
		expect(definition.properties.textAlign?.enumValues).toEqual(['left', 'center', 'right']);
	});

	it('uses a typed font resource and literal BitmapLabel text in default and named states', () => {
		const document = parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="ScoreSkin" states="down"><BitmapLabel text="100.80" font="score_font" text.down="false" font.down="alternate_font" /></Skin>',
		);
		expect(document.root.children[0]?.properties).toEqual({
			text: '100.80',
			font: { kind: 'resource', resourceType: 'font', key: 'score_font' },
		});
		expect(document.contract.states.down?.overrides[0]?.value).toBe('false');
		expect(document.contract.states.down?.overrides[1]?.value).toEqual({
			kind: 'resource',
			resourceType: 'font',
			key: 'alternate_font',
		});
		const assets = new UIAssetRegistry();
		assets.registerAsset(document);
		assets.registerResource({ key: 'score_font', resourceType: 'font' });
		assets.registerResource({ key: 'alternate_font', resourceType: 'font' });
		expect(validateUIAssetRegistry(assets, components)).toEqual([]);
		expect(parseUIDocument(serializeUIDocument(document))).toEqual(document);
	});

	it('reports a missing bitmap font rather than treating it as a CSS font family', () => {
		const document = parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="ScoreSkin"><BitmapLabel font="missing_font" /></Skin>',
		);
		const assets = new UIAssetRegistry();
		assets.registerAsset(document);
		expect(validateUIAssetRegistry(assets, components).map(item => item.code)).toContain('unknown-resource');
	});

	it.each(['true', 'false', '100.80'])('preserves scalar-looking bitmap font resource key %s', key => {
		const document = parseUIDocument(
			`<Skin xmlns="https://kurot.dev/ui/1" class="ScoreSkin"><BitmapLabel font="${key}" /></Skin>`,
		);
		expect(document.root.children[0]?.properties.font).toEqual({ kind: 'resource', resourceType: 'font', key });
		expect(parseUIDocument(serializeUIDocument(document))).toEqual(document);
	});

	it('accepts a readonly flow as a serializable property and rejects malformed state content', () => {
		const flow: UITextFlow = [{ text: 'Title', style: { bold: true, size: 24 } }];
		const value: UIPropertyValue = flow;
		expect(matchesUIPropertyDefinition(value, flowProperty)).toBe(true);
		const document = parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="TextSkin" states="down"><RichLabel id="rich" /></Skin>',
		);
		const assets = new UIAssetRegistry();
		assets.registerAsset({
			...document,
			contract: {
				...document.contract,
				states: {
					down: { overrides: [{ targetId: 'rich', property: 'textFlow', value: [{ text: 123 }] }] },
				},
			},
		});
		expect(validateUIAssetRegistry(assets, components).length).toBeGreaterThan(0);
	});

	it.each([
		{},
		'plain text',
		123,
		new Array(1),
		[{ text: 1 }],
		[{ text: 'x', extra: true }],
		[{ text: 'x', style: undefined }],
		[{ text: 'x', style: new Date() }],
		[{ text: 'x', style: { size: Infinity } }],
		[{ text: 'x', style: { size: -1 } }],
		[{ text: 'x', style: { stroke: -1 } }],
		[{ text: 'x', style: { textColor: 0x1000000 } }],
		[{ text: 'x', style: { strokeColor: 1.5 } }],
		[{ text: 'x', style: { bold: 'true' } }],
		[{ text: 'x', style: { href: 'link' } }],
		[{ text: 'x', style: { underline: true } }],
	])('rejects a malformed flow: %j', value => {
		expect(isUITextFlow(value)).toBe(false);
	});

	it('accepts empty content, explicit false style fields, zero values and literal font names', () => {
		expect(isUITextFlow([])).toBe(true);
		expect(
			isUITextFlow([
				{ text: '', style: {} },
				{
					text: 'false',
					style: { bold: false, italic: false, size: 0, stroke: 0, textColor: 0, fontFamily: '100' },
				},
			]),
		).toBe(true);
	});

	it('does not bind an arbitrary array schema to a constrained rich-text property', () => {
		expect(isUIPropertyDefinitionAssignable({ valueType: 'array' }, flowProperty)).toBe(false);
		expect(isUIPropertyDefinitionAssignable(flowProperty, { valueType: 'array' })).toBe(true);
		expect(isUIPropertyDefinitionAssignable(flowProperty, flowProperty)).toBe(true);
		expect(() =>
			components.register({
				type: 'custom.Invalid',
				properties: { flow: { valueType: 'object', format: 'text-flow' } },
			}),
		).toThrow('array value type');
	});

	it.each(['text', 'textColor', 'textStyle', 'bold', 'italic', 'size', 'fontFamily', 'textFit'])(
		'rejects whole-component RichLabel property %s',
		property => {
			const document = createUIDocument({
				id: 'rich',
				root: createUINode({ id: 'rich', type: 'kui.RichLabel', properties: { [property]: 'unsupported' } }),
			});
			expect(validateUIDocumentComponents(document, components)[0]?.code).toBe('unknown-component-property');
		},
	);
});
