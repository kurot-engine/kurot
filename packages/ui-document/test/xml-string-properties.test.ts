import { describe, expect, it } from 'vitest';
import { parseUIDocument, serializeUIDocument } from '../src/index.js';
import { decodeXMLValue, encodeXMLValue } from '../src/kurot/serialization/xml/xml-values.js';

describe('schema-defined XML strings', () => {
	it.each(['100.80', '0.5', 'true', 'false', '@token:string:title', '@asset:example', String.raw`\folder\file`, ''])(
		'preserves literal text %j without type escaping',
		value => {
			const definition = { valueType: 'string' } as const;
			expect(encodeXMLValue(value, definition)).toBe(value);
			expect(decodeXMLValue(value, definition)).toBe(value);
		},
	);

	it('reads and writes numeric-looking and boolean-looking component text and state text as strings', () => {
		const source =
			'<Skin xmlns="https://kurot.dev/ui/1" class="Test" states="down"><Label id="label" text="100.80" text.down="false" size="48" /><Button id="button" label="true" enabled="false" /><TextInput text="0.5" /></Skin>';
		const document = parseUIDocument(source);
		expect(document.root.children[0]?.properties).toMatchObject({ text: '100.80', size: 48 });
		expect(document.root.children[1]?.properties).toMatchObject({ label: 'true', enabled: false });
		expect(document.root.children[2]?.properties.text).toBe('0.5');
		expect(document.contract.states.down?.overrides[0]?.value).toBe('false');
		const serialized = serializeUIDocument(document);
		expect(serialized).toContain('text="100.80"');
		expect(serialized).toContain('text.down="false"');
		expect(serialized).toContain('label="true"');
		expect(parseUIDocument(serialized)).toEqual(document);
	});

	it('keeps XML entity escaping while preserving literal backslashes and reference-looking text', () => {
		const source = String.raw`<Skin xmlns="https://kurot.dev/ui/1" class="Test"><Label text="\100.80 &amp; &quot;quote&quot; &lt;tag&gt; @token:string:title" /></Skin>`;
		const document = parseUIDocument(source);
		expect(document.root.children[0]?.properties.text).toBe(
			String.raw`\100.80 & "quote" <tag> @token:string:title`,
		);
		expect(parseUIDocument(serializeUIDocument(document))).toEqual(document);
	});

	it('retains scalar inference and explicit string escapes for schema-free collection data', () => {
		expect(decodeXMLValue('100.80')).toBe(100.8);
		expect(decodeXMLValue('false')).toBe(false);
		expect(encodeXMLValue('100.80')).toBe(String.raw`\100.80`);
		expect(decodeXMLValue(String.raw`\100.80`)).toBe('100.80');
		expect(encodeXMLValue(100.8, { valueType: 'string' })).toBeUndefined();
	});
});
