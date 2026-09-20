import { describe, expect, it } from 'vitest';
import {
	createUIAssetContract,
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
			id: 'skins.MainSkin',
			assetKind: 'appearance',
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				properties: {
					zIndex: 2,
					layout: {
						type: 'kui.HorizontalLayout',
						properties: { verticalGap: 8, horizontalGap: 4 },
					},
					alpha: 1,
				},
			}),
		});

		const source = serializeUIDocument(document);

		expect(source).toContain(
			'<layout>\n            <HorizontalLayout horizontalGap="4" verticalGap="8" />\n        </layout>',
		);
		expect(parseUIDocument(source)).toEqual(document);
	});

	it('serializes catalog color properties as readable hexadecimal values', () => {
		const document = createUIDocument({
			id: 'skins.ColorSkin',
			assetKind: 'appearance',
			contract: createUIAssetContract({
				states: {
					down: {
						overrides: [{ targetId: 'background', property: 'fillColor', value: 0x244474 }],
					},
				},
			}),
			root: createUINode({
				id: 'background',
				type: 'kui.Rect',
				properties: {
					alpha: 1,
					fillColor: 0x121d30,
					strokeColor: 0x73a9ff,
				},
			}),
		});

		const source = serializeUIDocument(document);
		expect(source).toContain('fillColor="#121D30"');
		expect(source).toContain('fillColor.down="#244474"');
		expect(source).toContain('strokeColor="#73A9FF"');
		expect(source).toContain('alpha="1"');
		expect(parseUIDocument(source)).toEqual(document);
		expect(parseUIDocument(source.replace('#121D30', '0x121d30'))).toEqual(document);
	});

	it('writes catalog resource properties as plain resource keys', () => {
		const document = createUIDocument({
			id: 'skins.ImageSkin',
			assetKind: 'appearance',
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				children: [createUINode({
					id: 'imageDisplay',
					type: 'kui.Image',
					properties: { source: createUIResourceReference('image', 'roundthumb_png') },
				})],
			}),
		});

		const source = serializeUIDocument(document);
		expect(source).toContain('source="roundthumb_png"');
		expect(source).not.toContain('@resource:image:');
		expect(parseUIDocument(source)).toEqual(document);
	});

	it('returns structured diagnostics for invalid XML and schema input', () => {
		expect(() => parseUIDocument('{')).toThrow(UIDocumentParseError);

		try {
			parseUIDocument('{');
		} catch (error) {
			expect(error).toBeInstanceOf(UIDocumentParseError);
			if (!(error instanceof UIDocumentParseError)) {
				throw error;
			}
			expect(error.diagnostics[0]?.code).toBe('invalid-xml');
		}

		expect(() => parseUIDocument('<Other />')).toThrow(UIDocumentParseError);
		expect(() => parseUIDocument('<Skin class="x"><Group id="root" /></Skin>')).toThrow(
			/KUI XML root must declare xmlns/,
		);
		expect(() => parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="x" target="kui.Button"><Group id="root" /></Skin>',
		)).toThrow(/Unexpected attribute "target"/);
		expect(() => parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="x"><contract /><Group id="root" /></Skin>',
		)).toThrow(/Unexpected <contract> inside <Skin>/);
		expect(() => parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="x" states="down"><Group id="root" alpha.unknown="0.5" /></Skin>',
		)).toThrow(/undeclared state/);
		expect(() => parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="x" states="down.alt"><Group id="root" /></Skin>',
		)).toThrow(/not valid in a property.state attribute/);
		expect(() => parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="x"><Group id="root" appearance="other" /></Skin>',
		)).toThrow(/does not support appearance/);
		expect(() => parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="x"><Group id="root"><properties /></Group></Skin>',
		)).toThrow(/not Skin XML syntax/);
		expect(() => parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="x"><Image id="root" source="@resource:image:old" /></Skin>',
		)).toThrow(/direct component values/);
		expect(() => parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="x"><Group id="__kui_node_0" /></Skin>',
		)).toThrow(/reserved internal prefix/);
	});

	it('writes state overrides on their target nodes', () => {
		const document = createUIDocument({
			id: 'skins.ButtonSkin',
			assetKind: 'appearance',
			contract: createUIAssetContract({
				states: {
					down: {
						overrides: [{ targetId: 'background', property: 'alpha', value: 0.8 }],
					},
				},
			}),
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				children: [createUINode({ id: 'background', type: 'kui.Rect' })],
			}),
		});

		const source = serializeUIDocument(document);
		expect(source).toContain('states="down"');
		expect(source).toContain('alpha.down="0.8"');
		expect(source).not.toContain('<state');
		expect(source).not.toContain('<set');
		expect(parseUIDocument(source)).toEqual(document);
	});

	it('does not require authored ids for internal state targets', () => {
		const source = `<?xml version="1.0" encoding="utf-8"?>
<Skin xmlns="https://kurot.dev/ui/1" class="skins.ButtonSkin" states="up,down,disabled">
    <Group id="root">
        <Image source="up.png" source.down="down.png" alpha.disabled="0.5" />
        <Label id="labelDisplay" />
    </Group>
</Skin>
`;

		const document = parseUIDocument(source);
		const image = document.root.children[0];
		expect(image?.id).toMatch(/^__kui_node_/);
		expect(document.contract.states.down?.overrides[0]).toMatchObject({
			targetId: image?.id,
			property: 'source',
			value: createUIResourceReference('image', 'down.png'),
		});
		expect(serializeUIDocument(document)).toBe(source);
	});

	it('keeps programmatic appearance associations outside Skin XML', () => {
		const document = createUIDocument({
			id: 'skins.ButtonSkin',
			assetKind: 'appearance',
			contract: createUIAssetContract({ targetType: 'kui.Button' }),
			root: createUINode({ id: 'root', type: 'kui.Group' }),
		});

		expect(() => serializeUIDocument(document)).toThrow(/does not serialize runtime target metadata/);
	});

	it('keeps semantic composition and structured properties outside Skin XML', () => {
		const document = createUIDocument({
			id: 'skins.CustomSkin',
			assetKind: 'appearance',
			root: createUINode({
				id: 'root',
				type: 'game.Custom',
				properties: { options: ['a', 'b'] },
			}),
		});

		expect(() => serializeUIDocument(document)).toThrow(/must be a scalar value/);
	});

	it('writes only the Skin class on the document root', () => {
		const document = createUIDocument({
			id: 'skins.ButtonSkin',
			assetKind: 'appearance',
			root: createUINode({ id: 'root', type: 'kui.Group' }),
		});
		const source = serializeUIDocument(document);
		const skinTag = source.split('\n')[1];
		expect(skinTag).toBe('<Skin xmlns="https://kurot.dev/ui/1" class="skins.ButtonSkin">');
		expect(parseUIDocument(source)).toEqual(document);
	});

	it('refuses to silently serialize invalid runtime values', () => {
		const document = createUIDocument({
			id: 'skins.MainSkin',
			assetKind: 'appearance',
			root: createUINode({ id: 'root', type: 'kui.Group' }),
		});
		const unsafe = {
			...document,
			root: { ...document.root, properties: { width: Number.NaN } },
		};

		expect(() => serializeUIDocument(unsafe)).toThrow(UIDocumentValidationError);
	});
});
