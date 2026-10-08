import { describe, expect, it } from 'vitest';
import { generateCode, parseKUISkin } from '../src/core/kui/index.js';

function compile(body: string): string {
	return generateCode(
		parseKUISkin(`<Skin xmlns="https://kurot.dev/ui/1" class="TextSkin" states="disabled">${body}</Skin>`),
	);
}

describe('native text component compilation', () => {
	it('compiles bitmap fonts and literal text without vector Label fields', () => {
		const script = compile(
			'<BitmapLabel id="score" font="true" text="100%" text.disabled="false" letterSpacing="-1" lineSpacing="2" smoothing="false" multiline="false" textAlign="right" verticalAlign="middle" />',
		);
		expect(script).toContain('new BitmapLabel()');
		expect(script).toContain('score.font = "true";');
		expect(script).toContain('score.text = "100%";');
		expect(script).toContain('score.letterSpacing = -1;');
		expect(script).toContain('score.smoothing = false;');
		expect(script).toContain('new SetProperty("score", "text", "false")');
	});

	it('emits owned flow literals and explicit empty state overrides without extra display children', () => {
		const ir = parseKUISkin(`<Skin xmlns="https://kurot.dev/ui/1" class="RichSkin" states="disabled">
			<RichLabel id="notice" width="100%" maxWidth="240" lineSpacing="2" wordWrap="true">
				<textFlow><Span text="100.80 " size="20" /><Span text="&#10;false" bold="true" textColor="#FFCC00" stroke="1" strokeColor="#000000" /></textFlow>
				<textFlow.disabled />
			</RichLabel><Rect id="background" />
		</Skin>`);
		const script = generateCode(ir);
		expect(ir.unresolvedTags).toEqual([]);
		expect(ir.skinParts).toEqual(['notice', 'background']);
		expect(ir.children[0]?.children).toEqual([]);
		expect(script).toContain('new RichLabel()');
		expect(script).toContain('notice.percentWidth = 100;');
		expect(script).toContain('"text":"100.80 "');
		expect(script).toContain('"text":"\\nfalse"');
		expect(script).toContain('"textColor":16763904');
		expect(script).toContain('new SetProperty("notice", "textFlow", [])');
		expect(script).not.toContain('new Span');
	});

	it('keeps percentage-looking text literal for ordinary Label and Button too', () => {
		const script = compile('<Label id="text" text="100%" /><Button id="button" label="50%" />');
		expect(script).toContain('text.text = "100%";');
		expect(script).toContain('button.label = "50%";');
	});

	it('accepts empty content and state-only flows', () => {
		const script = compile(
			'<RichLabel id="notice"><textFlow.disabled><Span text="Disabled" /></textFlow.disabled></RichLabel>',
		);
		expect(script).not.toContain('notice.textFlow =');
		expect(script).toContain('new SetProperty("notice", "textFlow", [{"text":"Disabled"}])');
	});

	it.each([
		'<RichLabel text="wrong" />',
		'<RichLabel size="20" />',
		'<RichLabel textFit="shrink" />',
		'<RichLabel fontFamily="primary" />',
		'<RichLabel textColor.disabled="#FFFFFF" />',
		'<RichLabel wordWrap="invalid" />',
		'<RichLabel lineSpacing="-1" />',
		'<RichLabel textAlign="justify" />',
		'<BitmapLabel size="20" />',
		'<BitmapLabel smoothing="invalid" />',
		'<BitmapLabel lineSpacing="-1" />',
		'<BitmapLabel font="@resource:image:page" />',
		'<RichLabel><Label /></RichLabel>',
		'<RichLabel><textFlow><Span text="text" size="-1" /></textFlow></RichLabel>',
	])('rejects unsupported or malformed native text input %s', body => {
		expect(() => compile(body)).toThrow();
	});
});
