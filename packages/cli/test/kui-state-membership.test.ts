import { describe, expect, it } from 'vitest';
import { generateCode, parseKUISkin } from '../src/core/kui/index.js';

function wrap(children: string, attributes = ''): string {
	return `<Skin class="MenuSkin" xmlns="https://kurot.dev/ui/1" states="common,spec" ${attributes}>${children}</Skin>`;
}

describe('compiled state children', () => {
	it('uses the active sibling index for each state, including nested anonymous parents', () => {
		const ir = parseKUISkin(wrap(
			'<Group includeIn="spec"/><Group id="both" includeIn="common, spec" visible="false">' +
			'<Group><Label id="first" includeIn="spec"/><Label id="last" includeIn="common, spec"/></Group>' +
			'</Group><Group id="fixed"/>',
		));
		const code = generateCode(ir);
		const [specOnly, both] = ir.children;
		const nested = both.children[0];
		expect(code).toContain('skin.elementsContent = [fixed]');
		expect(code).toContain(`${nested.varName}.elementsContent = []`);
		expect(code).toContain('both.visible = false;');
		expect(code).not.toContain('.includeIn =');
		const positions = ir.states.map(s => s.overrides.filter(o => o.type === 'AddItems')
			.map(o => [o.targetId, o.destination, o.position]));
		expect(positions).toEqual([
			[['both', '', 0], ['last', nested.id, 0]],
			[[specOnly.id, '', 0], ['both', '', 1], ['first', nested.id, 0], ['last', nested.id, 1]],
		]);
		expect(ir.skinParts).not.toContain(nested.id);
	});

	it('accepts conditional text components without treating the directive as typography', () => {
		const code = generateCode(parseKUISkin(wrap('<RichLabel id="message" includeIn="spec"/>')));
		expect(code).toContain('new AddItems("message", "", 0)');
	});

	it.each([
		[wrap('<Group includeIn="missing"/>'), /undeclared state "missing"/],
		[wrap('<Group includeIn="common,"/>'), /undeclared state/],
		[wrap('<Scroller><Group includeIn="spec"/></Scroller>'), /elementsContent/],
		[wrap('', 'includeIn="spec"'), /includeIn/],
		[wrap('<Group includeIn.spec="common"/>'), /structural directive/],
	])('rejects invalid membership: %s', (source, diagnostic) => {
		expect(() => parseKUISkin(String(source))).toThrow(diagnostic);
	});
});
