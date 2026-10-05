import { describe, expect, it } from 'vitest';
import {
	createKurotUIFoundationRegistry,
	parseUIDocument,
	serializeUIDocument,
	validateUIDocumentComponents,
} from '../src/index.js';

const registry = createKurotUIFoundationRegistry();

function skin(properties: string, tag = 'Label'): string {
	return `<Skin xmlns="https://kurot.dev/ui/1" class="FitSkin"><${tag} id="amount" ${properties}/></Skin>`;
}

describe('Label text layout authoring contract', () => {
	it('declares correct Label and EditableText defaults without inserting them into XML', () => {
		expect(registry.resolve('kui.Label')?.properties.multiline?.defaultValue).toBe(true);
		expect(registry.resolve('kui.EditableText')?.properties.multiline?.defaultValue).toBe(false);
		expect(registry.resolve('kui.Label')?.properties.textFit?.defaultValue).toBe('none');
		const document = parseUIDocument(skin('text="hello"'));
		expect(document.root.children[0]?.properties).toEqual({ text: 'hello' });
		expect(serializeUIDocument(document)).not.toContain('multiline=');
	});

	it('round-trips fit policy, minimum and state sizes without deriving or rewriting size', () => {
		const document = parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="FitSkin" states="down"><Label text="100.80" width="140" size="24" multiline="false" textFit="shrink" minFontSize="16" size.down="20" /></Skin>',
		);
		expect(validateUIDocumentComponents(document, registry)).toEqual([]);
		expect(document.root.children[0]?.properties).toMatchObject({
			textFit: 'shrink',
			minFontSize: 16,
			size: 24,
			multiline: false,
		});
		expect(parseUIDocument(serializeUIDocument(document))).toEqual(document);
	});

	it.each([
		'textFit="stretch"',
		'minFontSize="0"',
		'minFontSize="-1"',
		'renderedSize="18"',
		'textFitOverflow="false"',
	])('rejects invalid or derived authored property %s', properties => {
		const document = parseUIDocument(skin(properties));
		expect(validateUIDocumentComponents(document, registry).length).toBeGreaterThan(0);
	});

	it('rejects automatic fitting on EditableText', () => {
		const document = parseUIDocument(skin('textFit="shrink"', 'EditableText'));
		expect(validateUIDocumentComponents(document, registry).length).toBeGreaterThan(0);
	});
});
