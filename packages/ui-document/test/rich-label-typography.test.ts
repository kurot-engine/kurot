import { describe, expect, it } from 'vitest';
import {
	createKurotUIFoundationRegistry,
	matchesUIPropertyDefinition,
	parseUIDocument,
	serializeUIDocument,
	validateUIDocumentComponents,
	createUIDocument,
	createUINode,
} from '../src/index.js';
import type { UIPropertyValue } from '../src/index.js';

const registry = createKurotUIFoundationRegistry();
const properties = registry.resolve('kui.RichLabel')!.properties;

describe('RichLabel component typography', () => {
	it('round-trips component, local and state styles independently without adding omitted defaults', () => {
		const xml = `<Skin xmlns="https://kurot.dev/ui/1" class="RichSkin" states="disabled">
			<RichLabel id="rich" fontFamily="100" size="18" textColor="#FFFFFF" stroke="1" strokeColor="#000000" bold="true" italic="true" size.disabled="24" bold.disabled="false" textColor.disabled="#000000">
				<textFlow><Span text="follows" /><Span text="fixed" size="18" bold="false" textColor="#000000" stroke="0" /></textFlow>
			</RichLabel><RichLabel id="empty" />
		</Skin>`;
		const document = parseUIDocument(xml);
		expect(validateUIDocumentComponents(document, registry)).toEqual([]);
		expect(document.root.children[0]?.properties).toMatchObject({
			fontFamily: '100',
			size: 18,
			textColor: 0xffffff,
			stroke: 1,
			strokeColor: 0,
			bold: true,
			italic: true,
			textFlow: [
				{ text: 'follows' },
				{ text: 'fixed', style: { size: 18, bold: false, textColor: 0, stroke: 0 } },
			],
		});
		expect(document.root.children[1]?.properties).toEqual({});
		expect(document.contract.states.disabled?.overrides).toEqual([
			{ targetId: 'rich', property: 'size', value: 24 },
			{ targetId: 'rich', property: 'bold', value: false },
			{ targetId: 'rich', property: 'textColor', value: 0 },
		]);
		expect(parseUIDocument(serializeUIDocument(document))).toEqual(document);
	});

	it.each(['true', 'false', '100', 'primary'])('preserves literal CSS family %s', fontFamily => {
		const document = parseUIDocument(
			`<Skin xmlns="https://kurot.dev/ui/1" class="RichSkin"><RichLabel fontFamily="${fontFamily}" /></Skin>`,
		);
		expect(document.root.children[0]?.properties.fontFamily).toBe(fontFamily);
		expect(parseUIDocument(serializeUIDocument(document))).toEqual(document);
	});

	it('retains ordinary component color tokens without accepting token objects as Span styles', () => {
		const document = parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="RichSkin"><RichLabel textColor="@style:colors:accent" /></Skin>',
		);
		expect(document.root.children[0]?.properties.textColor).toEqual({
			kind: 'token',
			tokenType: 'color',
			key: 'accent',
		});
		expect(validateUIDocumentComponents(document, registry)).toEqual([]);
		expect(parseUIDocument(serializeUIDocument(document))).toEqual(document);
	});

	it.each([
		['size', -1],
		['size', Infinity],
		['stroke', -1],
		['textColor', -1],
		['textColor', 0x1000000],
		['strokeColor', 1.5],
		['bold', 'true'],
		['italic', 0],
		['fontFamily', { kind: 'resource', resourceType: 'font', key: 'font' }],
	] satisfies readonly (readonly [string, UIPropertyValue])[])('rejects invalid %s', (name, value) => {
		expect(matchesUIPropertyDefinition(value, properties[name]!)).toBe(false);
	});

	it('keeps unrelated Label-only properties out of the RichLabel contract', () => {
		for (const property of ['text', 'textStyle', 'textFit', 'minFontSize', 'baseStyle']) {
			const document = createUIDocument({
				id: 'rich',
				root: createUINode({ id: 'rich', type: 'kui.RichLabel', properties: { [property]: 'unsupported' } }),
			});
			expect(validateUIDocumentComponents(document, registry).map(item => item.code)).toContain(
				'unknown-component-property',
			);
		}
		expect(properties.wordWrap?.defaultValue).toBe(true);
	});
});
