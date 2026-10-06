import { describe, expect, it } from 'vitest';
import { parseUIDocument, serializeUIDocument } from '../src/index.js';
import { decodeXMLValue, encodeXMLValue } from '../src/kurot/serialization/xml/xml-values.js';

describe('stylesheet XML references', () => {
	it('round-trips default and state colors without expanding authored references', () => {
		const source =
			'<Skin xmlns="https://kurot.dev/ui/1" class="Test" states="disabled"><Label id="label" textColor="@style:colors:primary" strokeColor="@style:colors:outline" textColor.disabled="@style:colors:disabled-text" /></Skin>';
		const document = parseUIDocument(source);
		expect(document.root.children[0]?.properties).toEqual({
			textColor: { kind: 'token', tokenType: 'color', key: 'primary' },
			strokeColor: { kind: 'token', tokenType: 'color', key: 'outline' },
		});
		expect(document.contract.states.disabled?.overrides).toEqual([
			{
				targetId: 'label',
				property: 'textColor',
				value: { kind: 'token', tokenType: 'color', key: 'disabled-text' },
			},
		]);
		const serialized = serializeUIDocument(document);
		expect(serialized).toContain('textColor="@style:colors:primary"');
		expect(serialized).toContain('strokeColor="@style:colors:outline"');
		expect(serialized).toContain('textColor.disabled="@style:colors:disabled-text"');
		expect(serialized).not.toContain('@token:');
		expect(parseUIDocument(serialized)).toEqual(document);
	});

	it.each(['@style:colors:primary', '@style:fonts:primary', '@token:color:primary'])(
		'keeps reference-looking Label text and state text literal: %s',
		value => {
			const source = `<Skin xmlns="https://kurot.dev/ui/1" class="Test" states="disabled"><Label id="label" text="${value}" text.disabled="${value}" /></Skin>`;
			const document = parseUIDocument(source);
			expect(document.root.children[0]?.properties.text).toBe(value);
			expect(document.contract.states.disabled?.overrides[0]?.value).toBe(value);
			const serialized = serializeUIDocument(document);
			expect(serialized).toContain(`text="${value}"`);
			expect(serialized).toContain(`text.disabled="${value}"`);
			expect(parseUIDocument(serialized)).toEqual(document);
		},
	);

	it('escapes reference-looking strings in schema-free collection fields', () => {
		const value = '@style:colors:primary';
		expect(encodeXMLValue(value)).toBe(`\\${value}`);
		expect(decodeXMLValue(`\\${value}`)).toBe(value);
		const source = `<Skin xmlns="https://kurot.dev/ui/1" class="Test"><List><ArrayCollection><Array><Object label="\\${value}" /></Array></ArrayCollection></List></Skin>`;
		const document = parseUIDocument(source);
		expect(document.root.children[0]?.properties.dataProvider).toMatchObject({
			properties: { source: [{ label: value }] },
		});
		expect(parseUIDocument(serializeUIDocument(document))).toEqual(document);
	});

	it.each(['@style:', '@style:colors', '@style:colors:', '@style:colors: ', '@style:fonts:primary'])(
		'rejects incomplete references and unsupported sections: %s',
		value => {
			expect(() =>
				parseUIDocument(
					`<Skin xmlns="https://kurot.dev/ui/1" class="Test"><Label textColor="${value}" /></Skin>`,
				),
			).toThrow('Style references use @style:colors:<key>');
		},
	);

	it('rejects the previous color prefix with an actionable message', () => {
		expect(() =>
			parseUIDocument(
				'<Skin xmlns="https://kurot.dev/ui/1" class="Test"><Label textColor="@token:color:primary" /></Skin>',
			),
		).toThrow('Color references use @style:colors:<key>');
	});

	it('retains other semantic token categories without inventing stylesheet sections', () => {
		const reference = { kind: 'token', tokenType: 'spacing', key: 'panel-gap' } as const;
		expect(decodeXMLValue('@token:spacing:panel-gap')).toEqual(reference);
		expect(encodeXMLValue(reference)).toBe('@token:spacing:panel-gap');
	});
});
