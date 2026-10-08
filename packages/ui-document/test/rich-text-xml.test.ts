import { describe, expect, it } from 'vitest';
import {
	createKurotUIFoundationRegistry,
	parseUIDocument,
	serializeUIDocument,
	UIDocumentHistory,
	validateUIDocumentComponents,
} from '../src/index.js';

const registry = createKurotUIFoundationRegistry();

function skin(contents: string, states = ''): string {
	return `<Skin xmlns="https://kurot.dev/ui/1" class="TextSkin" states="${states}">${contents}</Skin>`;
}

describe('RichLabel XML', () => {
	it('round-trips styled runs as data without creating display children or synthetic IDs', () => {
		const source = skin(`<RichLabel width="200">
			<textFlow>
				<Span text="100.80" />
				<Span text=" false &amp; &quot;quoted&quot; &lt;tag&gt; " bold="true" italic="false"
					fontFamily="false" size="18" stroke="2" textColor="#AABBCC" strokeColor="0x000000" />
				<Span text="\\n" />
			</textFlow>
		</RichLabel><Image />`);
		const document = parseUIDocument(source);
		const rich = document.root.children[0]!;
		expect(rich.properties.textFlow).toEqual([
			{ text: '100.80' },
			{
				text: ' false & "quoted" <tag> ',
				style: {
					bold: true,
					italic: false,
					fontFamily: 'false',
					size: 18,
					stroke: 2,
					textColor: 0xaabbcc,
					strokeColor: 0,
				},
			},
			{ text: '\\n' },
		]);
		expect(rich.children).toEqual([]);
		expect(document.root.children[1]?.id).toBe('__kui_node_0_1');
		expect(validateUIDocumentComponents(document, registry)).toEqual([]);
		const serialized = serializeUIDocument(document);
		expect(serialized).toContain('strokeColor="#000000"');
		expect(serialized).not.toContain('__kui_node');
		expect(parseUIDocument(serialized)).toEqual(document);
		expect(serializeUIDocument(parseUIDocument(serialized))).toBe(serialized);
	});

	it('retains hard breaks, CRLF, tabs, leading/trailing spaces and literal backslashes', () => {
		const document = parseUIDocument(
			skin(
				'<RichLabel id="rich"><textFlow><Span text="  first&#13;&#10;\tsecond&#10;&#10;\\third  " /></textFlow></RichLabel>',
			),
		);
		const serialized = serializeUIDocument(document);
		expect(serialized).toContain('first&#13;&#10;&#9;second&#10;&#10;\\third');
		expect(parseUIDocument(serialized).root.children[0]?.properties.textFlow).toEqual([
			{ text: '  first\r\n\tsecond\n\n\\third  ' },
		]);
	});

	it('preserves omitted content and explicit empty content independently', () => {
		const omitted = parseUIDocument(skin('<RichLabel />'));
		const empty = parseUIDocument(skin('<RichLabel><textFlow /></RichLabel>'));
		expect(omitted.root.children[0]?.properties).toEqual({});
		expect(empty.root.children[0]?.properties.textFlow).toEqual([]);
		expect(serializeUIDocument(omitted)).not.toContain('textFlow');
		expect(parseUIDocument(serializeUIDocument(empty))).toEqual(empty);
	});

	it('retains ordered state flows including an explicit cleared state', () => {
		const document = parseUIDocument(
			skin(
				`<RichLabel id="rich" alpha.down="0.5">
			<textFlow><Span text="normal" /></textFlow>
			<textFlow.down><Span text="pressed" textColor="#123456" /></textFlow.down>
			<textFlow.disabled />
		</RichLabel>`,
				'down,disabled',
			),
		);
		expect(document.contract.states.down?.overrides).toEqual([
			{ targetId: 'rich', property: 'alpha', value: 0.5 },
			{ targetId: 'rich', property: 'textFlow', value: [{ text: 'pressed', style: { textColor: 0x123456 } }] },
		]);
		expect(document.contract.states.disabled?.overrides).toEqual([
			{ targetId: 'rich', property: 'textFlow', value: [] },
		]);
		expect(parseUIDocument(serializeUIDocument(document))).toEqual(document);
	});

	it('undoes and redoes one complete flow edit, leaving the base and other states intact', () => {
		const document = parseUIDocument(
			skin(
				'<RichLabel id="rich"><textFlow><Span text="base" /></textFlow><textFlow.down><Span text="down" /></textFlow.down></RichLabel>',
				'down',
			),
		);
		const history = new UIDocumentHistory(document);
		history.commit({
			id: 'edit-rich-state',
			expectedRevision: 0,
			summary: 'Edit rich text',
			operations: [
				{
					kind: 'set-contract-state',
					name: 'down',
					definition: {
						overrides: [
							{
								targetId: 'rich',
								property: 'textFlow',
								value: [{ text: 'changed', style: { bold: true } }],
							},
						],
					},
				},
			],
		});
		const changed = history.snapshot.document;
		expect(changed.root.children[0]?.properties.textFlow).toEqual([{ text: 'base' }]);
		expect(parseUIDocument(serializeUIDocument(changed))).toEqual(changed);
		expect(history.undo()?.document).toEqual(document);
		expect(history.redo()?.document).toEqual(changed);
	});

	it('allows project subclasses to round-trip before the project registry validates their base', () => {
		const document = parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" xmlns:custom="https://kurot.dev/components/custom" class="TextSkin"><custom:Notice><textFlow><Span text="hello" /></textFlow></custom:Notice></Skin>',
		);
		registry.register({ type: 'custom.Notice', extends: 'kui.RichLabel' });
		expect(validateUIDocumentComponents(document, registry)).toEqual([]);
		expect(parseUIDocument(serializeUIDocument(document))).toEqual(document);
	});

	it.each([
		'<textFlow text="bad" />',
		'<textFlow><Span /></textFlow>',
		'<textFlow><Span text="x" size="-1" /></textFlow>',
		'<textFlow><Span text="x" bold="yes" /></textFlow>',
		'<textFlow><Span text="x" textColor="#FFFFFFF" /></textFlow>',
		'<textFlow><Span text="x" textColor="@style:colors:accent" /></textFlow>',
		'<textFlow><Span text="x" href="https://example.com" /></textFlow>',
		'<textFlow><Span text="x" underline="true" /></textFlow>',
		'<textFlow><Span text="x"><Span text="nested" /></Span></textFlow>',
		'<textFlow><Label text="x" /></textFlow>',
		'<textFlow><Span text="x">raw text</Span></textFlow>',
		'<textFlow /><textFlow />',
		'<textFlow.down /><textFlow.down />',
		'<textFlow.unknown />',
	])('rejects unsupported or ambiguous flow metadata: %s', contents => {
		expect(() => parseUIDocument(skin(`<RichLabel>${contents}</RichLabel>`, 'down'))).toThrow();
	});

	it.each(['textFlow="[]"', 'textFlow.down="[]"'])('rejects scalar flow attributes: %s', attributes => {
		expect(() => parseUIDocument(skin(`<RichLabel ${attributes} />`, 'down'))).toThrow('property element');
	});

	it.each(['Label', 'BitmapLabel', 'Group', 'Skin'])('rejects rich-text metadata on %s', tag => {
		const source = tag === 'Skin' ? skin('<textFlow />') : skin(`<${tag}><textFlow /></${tag}>`);
		expect(() => parseUIDocument(source)).toThrow('does not support textFlow');
	});
});
