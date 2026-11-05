import { describe, expect, it } from 'vitest';
import { generateCode, parseKUISkin } from '../src/core/kui/index.js';

describe('RichLabel scalar typography compilation', () => {
	it('uses ordinary scalar assignments and independent state restoration without merging runs', () => {
		const ir = parseKUISkin(`<Skin xmlns="https://kurot.dev/ui/1" class="Typography" states="disabled">
			<RichLabel id="rich" fontFamily="100" size="18" textColor="#FFFFFF" stroke="1" strokeColor="#000000" bold="true" italic="true" size.disabled="24" bold.disabled="false" textColor.disabled="#000000">
				<textFlow><Span text="follows" /><Span text="fixed" size="18" bold="false" textColor="#000000" stroke="0" /></textFlow>
			</RichLabel>
		</Skin>`);
		const script = generateCode(ir);
		expect(ir.skinParts).toEqual(['rich']);
		expect(ir.children[0]?.children).toEqual([]);
		expect(script).toContain('rich.fontFamily = "100";');
		expect(script).toContain('rich.size = 18;');
		expect(script).toContain('rich.textColor = 16777215;');
		expect(script).toContain('rich.stroke = 1;');
		expect(script).toContain('rich.strokeColor = 0;');
		expect(script).toContain('rich.bold = true;');
		expect(script).toContain('rich.italic = true;');
		expect(script).toContain('new SetProperty("rich", "size", 24)');
		expect(script).toContain('new SetProperty("rich", "bold", false)');
		expect(script).toContain('new SetProperty("rich", "textColor", 0)');
		expect(script).toContain('"text":"follows"}');
		expect(script).toContain('"size":18');
		expect(script).not.toContain('baseStyle');
		expect(script).not.toContain('new Span');
	});

	it.each(['true', 'false', '100'])('keeps CSS font family %s literal', fontFamily => {
		const script = generateCode(
			parseKUISkin(
				`<Skin xmlns="https://kurot.dev/ui/1" class="Typography"><RichLabel id="rich" fontFamily="${fontFamily}" /></Skin>`,
			),
		);
		expect(script).toContain(`rich.fontFamily = "${fontFamily}";`);
	});
});
