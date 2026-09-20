import { describe, expect, it } from 'vitest';
import {
	createUIAssetContract,
	createUIAssetReference,
	createUIDesignTokenReference,
	createUIResourceReference,
	createUIDocument,
	createUINode,
	parseUIDocument,
	serializeUIDocument,
	UIDocumentParseError,
	UIDocumentValidationError,
} from '../src/index.js';

describe('KUI XML serialization', () => {
	it('uses stable property-key ordering and round-trips documents', () => {
		const document = createUIDocument({
			id: 'main-screen',
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				properties: {
					zIndex: 2,
					layout: { verticalGap: 8, horizontalGap: 4 },
					alpha: 1,
				},
			}),
		});

		const source = serializeUIDocument(document);

		expect(source.indexOf('alpha="1"')).toBeLessThan(source.indexOf('<property name="layout">'));
		expect(source.indexOf('name="horizontalGap"')).toBeLessThan(
			source.indexOf('name="verticalGap"'),
		);
		expect(parseUIDocument(source)).toEqual(document);
	});

	it('round-trips typed values and complete parameter definitions', () => {
		const document = createUIDocument({
			id: 'typed-component',
			assetKind: 'component',
			contract: createUIAssetContract({
				componentType: 'game.TypedComponent',
				parameters: {
					mode: {
						valueType: ['string', 'number'],
						enumValues: ['42', 42],
						defaultValue: '42',
						bindings: [{ targetId: 'root', property: 'mode' }],
					},
				},
			}),
			root: createUINode({
				id: 'root',
				type: 'game.TypedComponent',
				properties: {
					asset: createUIAssetReference('other'),
					image: createUIResourceReference('image', 'ui.logo'),
					list: ['42', 42, true],
					token: createUIDesignTokenReference('color', 'color.primary'),
				},
			}),
		});
		expect(parseUIDocument(serializeUIDocument(document))).toEqual(document);
	});

	it('returns structured diagnostics for invalid XML and schema input', () => {
		expect(() => parseUIDocument('{')).toThrow(UIDocumentParseError);

		try {
			parseUIDocument('{');
		} catch (error) {
			expect(error).toBeInstanceOf(UIDocumentParseError);
			if (!(error instanceof UIDocumentParseError)) throw error;
			expect(error.diagnostics[0]?.code).toBe('invalid-xml');
		}

		expect(() => parseUIDocument('<Other />')).toThrow(UIDocumentParseError);
		expect(() => parseUIDocument('<Screen id="x" version="2"><Group id="root" /></Screen>')).toThrow(
			/KUI XML root must declare xmlns/,
		);
		expect(() => parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" id="x" version="2" target="kui.Button" default="yes"><Group id="root" /></Skin>',
		)).toThrow(/default must be true or false/);
		expect(() => parseUIDocument(
			'<Screen xmlns="https://kurot.dev/ui/1" id="x" version="2" typo="true"><Group id="root" /></Screen>',
		)).toThrow(/Unexpected attribute "typo"/);
		expect(() => parseUIDocument(
			'<Screen xmlns="https://kurot.dev/ui/1" id="x" version="2"><Group id="root" /><contract /></Screen>',
		)).toThrow(/must precede the root component/);
	});

	it('round-trips default skin metadata on the document root', () => {
		const document = createUIDocument({
			id: 'skins.ButtonSkin',
			assetKind: 'appearance',
			contract: createUIAssetContract({ targetType: 'kui.Button', isDefault: true }),
			root: createUINode({ id: 'root', type: 'kui.Group' }),
		});
		const source = serializeUIDocument(document);
		expect(source).toContain('target="kui.Button" default="true"');
		expect(parseUIDocument(source)).toEqual(document);
	});

	it('refuses to silently serialize invalid runtime values', () => {
		const document = createUIDocument({
			id: 'main-screen',
			root: createUINode({ id: 'root', type: 'kui.Group' }),
		});
		const unsafe = {
			...document,
			root: { ...document.root, properties: { width: Number.NaN } },
		};

		expect(() => serializeUIDocument(unsafe)).toThrow(UIDocumentValidationError);
	});
});
