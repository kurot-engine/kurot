import { describe, expect, it } from 'vitest';
import { generateCode, parseKUISkin } from '../src/core/kui/index.js';

function compile(attributes: string): string {
	return generateCode(
		parseKUISkin(
			`<Skin xmlns="https://kurot.dev/ui/1" class="Outline" states="compact"><RichLabel id="rich" ${attributes}/></Skin>`,
		),
	);
}

describe('RichLabel outline layout compilation', () => {
	it('emits an explicit component assignment and independent native state override', () => {
		const code = compile('outlineLayout="reserve-space" outlineLayout.compact="render-only"');
		expect(code).toContain('rich.outlineLayout = "reserve-space";');
		expect(code).toContain('new SetProperty("rich", "outlineLayout", "render-only")');
	});

	it('preserves omission and state-only settings instead of enabling old skins', () => {
		expect(compile('')).not.toContain('outlineLayout');
		const code = compile('outlineLayout.compact="reserve-space"');
		expect(code).not.toContain('rich.outlineLayout =');
		expect(code).toContain('new SetProperty("rich", "outlineLayout", "reserve-space")');
	});

	it.each(['outlineLayout="auto"', 'outlineLayout="true"', 'outlineLayout.compact="wrong"'])(
		'rejects invalid authored policy %s',
		attributes => {
			expect(() => compile(attributes)).toThrow(/outlineLayout/);
		},
	);
});
