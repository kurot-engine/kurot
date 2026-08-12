/**
 * Tests for the EXML parser pipeline.
 *
 * Run with: pnpm test
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseXML, filterElements, getTextContent } from '../src/core/exml/xml-parser.js';
import {
	lookupComponent,
	resolveModule,
	localName,
	isPropertyNode,
	parsePropertyNode,
	getDefaultProperty,
} from '../src/core/exml/registry.js';
import { parseEXML } from '../src/core/exml/exml-parser.js';
import { generateCode } from '../src/core/exml/codegen.js';
import { compileEXML } from '../src/core/exml/index.js';

const testDir = path.dirname(fileURLToPath(import.meta.url));

// ── XML Parser ───────────────────────────────────────────────────────

describe('parseXML', () => {
	it('parses a simple element', () => {
		const el = parseXML('<eui:Skin class="TestSkin"/>');
		expect(el.name).toBe('eui:Skin');
		expect(el.attributes[0]).toEqual({ name: 'class', value: 'TestSkin' });
	});

	it('parses nested elements', () => {
		const el = parseXML('<eui:Skin><eui:Button label="OK"/></eui:Skin>');
		expect(el.name).toBe('eui:Skin');
		const children = filterElements(el.children);
		expect(children).toHaveLength(1);
		expect(children[0].name).toBe('eui:Button');
		expect(children[0].attributes[0]).toEqual({ name: 'label', value: 'OK' });
	});

	it('parses text content', () => {
		const el = parseXML('<eui:Label>Hello World</eui:Label>');
		expect(getTextContent(el.children)).toBe('Hello World');
	});

	it('handles CDATA sections', () => {
		const el = parseXML('<root><![CDATA[<script>alert("hi")</script>]]></root>');
		expect(getTextContent(el.children)).toBe('<script>alert("hi")</script>');
	});

	it('skips comments', () => {
		const el = parseXML('<root><!-- a comment --><child/></root>');
		const children = filterElements(el.children);
		expect(children).toHaveLength(1);
	});

	it('handles multiple attributes', () => {
		const el = parseXML('<eui:Button id="btn1" label="Click" width="100" height="50"/>');
		expect(el.attributes).toHaveLength(4);
		const attrMap = Object.fromEntries(el.attributes.map(a => [a.name, a.value]));
		expect(attrMap).toEqual({
			id: 'btn1',
			label: 'Click',
			width: '100',
			height: '50',
		});
	});

	it('rejects a mismatched closing tag', () => {
		expect(() => parseXML('<eui:Skin><eui:Button/></eui:Broken>')).toThrow(
			'expected closing tag </eui:Skin>',
		);
	});

	it('rejects a missing closing tag', () => {
		expect(() => parseXML('<eui:Skin><eui:Button/>')).toThrow('missing closing tag </eui:Skin>');
	});
});

describe('game template skins', () => {
	it('compiles every default EXML skin without unresolved tags', async () => {
		const skinsDir = path.resolve(testDir, '../templates/game/resource/skins');
		const files = (await fs.readdir(skinsDir)).filter(file => file.endsWith('.exml'));

		expect(files).toHaveLength(21);
		for (const file of files) {
			const source = await fs.readFile(path.join(skinsDir, file), 'utf-8');
			const ir = parseEXML(source, `skins.${path.basename(file, '.exml')}`);
			expect(ir.unresolvedTags, file).toEqual([]);
			expect(() => generateCode(ir), file).not.toThrow();
		}
	});
});

// ── Registry ─────────────────────────────────────────────────────────

describe('Component Registry', () => {
	it('looks up Button component', () => {
		const info = lookupComponent('eui:Button');
		expect(info).not.toBeNull();
		expect(info!.module).toBe('@kurot/ui');
	});

	it('looks up Skin with default property', () => {
		const dp = getDefaultProperty('eui:Skin');
		expect(dp).toBe('elementsContent');
	});

	it('resolves module from namespace prefix', () => {
		expect(resolveModule('eui:Button')).toBe('@kurot/ui');
		expect(resolveModule('egret:Sprite')).toBe('@kurot/core');
	});

	it('extracts local names', () => {
		expect(localName('eui:Button')).toBe('Button');
		expect(localName('Button')).toBe('Button');
	});

	it('detects property nodes', () => {
		expect(isPropertyNode('eui:Button.label')).toBe(true);
		expect(isPropertyNode('eui:Button')).toBe(false);
	});

	it('parses property node names', () => {
		const parsed = parsePropertyNode('eui:Button.label');
		expect(parsed).toEqual({ owner: 'Button', property: 'label' });
	});
});

// ── Full pipeline ────────────────────────────────────────────────────

const SIMPLE_EXML = `<?xml version="1.0" encoding="utf-8"?>
<eui:Skin class="skins.SimpleSkin" width="400" height="300" xmlns:eui="http://ns.egret.com/eui">
	<eui:Button id="btn" label="Click Me" x="10" y="20"/>
	<eui:Label id="title" text="Hello"/>
</eui:Skin>`;

describe('EXML Parser (full pipeline)', () => {
	it('parses a simple skin', () => {
		const ir = parseEXML(SIMPLE_EXML, 'skins.SimpleSkin');
		expect(ir.className).toBe('skins.SimpleSkin');
		expect(ir.children).toHaveLength(2);
		expect(ir.skinParts).toContain('btn');
		expect(ir.skinParts).toContain('title');
	});

	it('collects imports', () => {
		const ir = parseEXML(SIMPLE_EXML, 'skins.SimpleSkin');
		expect(ir.imports.has('Skin')).toBe(true);
		expect(ir.imports.has('Button')).toBe(true);
		expect(ir.imports.has('Label')).toBe(true);
		expect(ir.imports.get('Button')).toBe('@kurot/ui');
	});
});

describe('Code Generator', () => {
	it('generates valid JS for a simple skin', () => {
		const code = compileEXML(SIMPLE_EXML, 'skins.SimpleSkin');
		expect(code).toContain('import {');
		expect(code).toContain('from "@kurot/ui"');
		expect(code).toContain('export function createSimpleSkin()');
		expect(code).toContain('new Skin()');
		expect(code).toContain('new Button()');
		expect(code).toContain('btn.label = "Click Me"');
		expect(code).toContain('skin.btn = btn');
	});

	it('generates elementsContent assignment', () => {
		const code = compileEXML(SIMPLE_EXML, 'skins.SimpleSkin');
		expect(code).toContain('skin.elementsContent = [btn, title]');
	});

	it('compiles scale9Grid attributes to Rectangle values', () => {
		const code = compileEXML(
			`<eui:Skin class="skins.Scale9Skin" xmlns:eui="http://ns.egret.com/eui">
				<eui:Image scale9Grid="1,3,8,8" source="button_up_png"/>
			</eui:Skin>`,
			'skins.Scale9Skin',
		);

		expect(code).toContain('import { Rectangle } from "@kurot/core"');
		expect(code).toContain('scale9Grid = new Rectangle(1, 3, 8, 8)');
	});

	it('compiles nested lowercase property nodes', () => {
		const code = compileEXML(
			`<eui:Skin class="skins.LayoutSkin" xmlns:eui="http://ns.egret.com/eui">
				<eui:Group>
					<eui:layout><eui:HorizontalLayout verticalAlign="middle"/></eui:layout>
				</eui:Group>
			</eui:Skin>`,
			'skins.LayoutSkin',
		);

		expect(code).toContain('new HorizontalLayout()');
		expect(code).toContain('_group1.layout = _horizontalLayout2');
	});
});

// ── States ───────────────────────────────────────────────────────────

const STATE_EXML = `<?xml version="1.0" encoding="utf-8"?>
<eui:Skin class="skins.StateSkin" xmlns:eui="http://ns.egret.com/eui">
	<eui:states>
		<eui:State name="up"/>
		<eui:State name="down"/>
		<eui:State name="disabled"/>
	</eui:states>
	<eui:Button id="btn" label="Up" label.down="Down" label.disabled="Off"/>
</eui:Skin>`;

describe('States', () => {
	it('parses root state shorthand and skin constraints', () => {
		const exml = `<eui:Skin class="skins.RootSkin" states="up,disabled" minWidth="100" minHeight="50" alpha.disabled="0.5" xmlns:eui="http://ns.egret.com/eui"/>`;
		const ir = parseEXML(exml, 'skins.RootSkin');
		const code = compileEXML(exml, 'skins.RootSkin');

		expect(ir.states.map(state => state.name)).toEqual(['up', 'disabled']);
		expect(ir.properties).toEqual([
			{ name: 'minWidth', state: '', value: { type: 'literal', value: 100 } },
			{ name: 'minHeight', state: '', value: { type: 'literal', value: 50 } },
			{ name: 'alpha', state: 'disabled', value: { type: 'literal', value: 0.5 } },
		]);
		expect(code).toContain('skin.minWidth = 100');
		expect(code).toContain('skin.minHeight = 50');
		expect(code).toContain('new SetProperty("", "alpha", 0.5)');
	});

	it('parses state definitions', () => {
		const ir = parseEXML(STATE_EXML, 'skins.StateSkin');
		expect(ir.states).toHaveLength(3);
		expect(ir.states[0].name).toBe('up');
		expect(ir.states[1].name).toBe('down');
		expect(ir.states[2].name).toBe('disabled');
	});

	it('handles state-specific properties', () => {
		const ir = parseEXML(STATE_EXML, 'skins.StateSkin');
		const btn = ir.children[0];
		const stateProps = btn.properties.filter(p => p.state);
		expect(stateProps).toHaveLength(2);
		expect(stateProps.find(p => p.state === 'down')?.value).toEqual({ type: 'literal', value: 'Down' });
	});

	it('generates AddItems for includeIn and excludeFrom', () => {
		const exml = `<eui:Skin class="skins.VisibilitySkin" states="up,down,disabled" xmlns:eui="http://ns.egret.com/eui">
			<eui:Label id="included" includeIn="up,down"/>
			<eui:Label id="excluded" excludeFrom="disabled"/>
		</eui:Skin>`;
		const code = compileEXML(exml, 'skins.VisibilitySkin');

		expect(code).not.toContain('skin.elementsContent = [included');
		expect(code).toContain('new AddItems("included", "", -1, "elementsContent")');
		expect(code).toContain('new AddItems("excluded", "", -1, "elementsContent")');
	});
});

// ── Percent values ───────────────────────────────────────────────────

const PERCENT_EXML = `<?xml version="1.0" encoding="utf-8"?>
<eui:Skin class="skins.PercentSkin" xmlns:eui="http://ns.egret.com/eui">
	<eui:Group width="100%" height="50%"/>
</eui:Skin>`;

describe('Percent values', () => {
	it('parses percent values', () => {
		const ir = parseEXML(PERCENT_EXML, 'skins.PercentSkin');
		const group = ir.children[0];
		const widthProp = group.properties.find(p => p.name === 'width');
		expect(widthProp?.value).toEqual({ type: 'percent', value: 100 });
	});

	it('generates percentWidth/percentHeight in code', () => {
		const code = compileEXML(PERCENT_EXML, 'skins.PercentSkin');
		expect(code).toContain('percentWidth = 100');
		expect(code).toContain('percentHeight = 50');
	});
});

// ── Bindings ─────────────────────────────────────────────────────────

const BINDING_EXML = `<?xml version="1.0" encoding="utf-8"?>
<eui:Skin class="skins.BindSkin" xmlns:eui="http://ns.egret.com/eui">
	<eui:Label id="lbl" text="{data.name}"/>
</eui:Skin>`;

describe('Bindings', () => {
	it('parses binding expressions', () => {
		const ir = parseEXML(BINDING_EXML, 'skins.BindSkin');
		const lbl = ir.children[0];
		const textProp = lbl.properties.find(p => p.name === 'text');
		expect(textProp?.value).toEqual({ type: 'binding', expression: 'data.name' });
	});

	it('generates binding code', () => {
		const code = compileEXML(BINDING_EXML, 'skins.BindSkin');
		expect(code).toContain('Binding');
	});
});

// ── Custom namespaces ────────────────────────────────────────────────

const CUSTOM_NS_EXML = `<?xml version="1.0" encoding="utf-8"?>
<eui:Skin class="game.ui.AdventurePosIRSkin" width="90" height="120" xmlns:eui="http://ns.egret.com/eui" xmlns:game="game.*">
	<eui:Group width="90" height="120">
		<game:HeroNarrowIR id="heroIR" skinName="game.widget.HeroNarrowIRSkin"/>
		<eui:Label id="lblHp" text="100%"/>
	</eui:Group>
</eui:Skin>`;

const CUSTOM_NAMESPACES = [{ prefix: 'game', specifier: '#ns/game' }];

describe('Custom namespaces', () => {
	it('resolves a prefixed tag to the configured namespace specifier', () => {
		const info = lookupComponent('game:HeroNarrowIR', CUSTOM_NAMESPACES);
		expect(info).toEqual({ module: '#ns/game' });
	});

	it('drops an unresolved custom-namespace tag without a matching config entry', () => {
		const ir = parseEXML(CUSTOM_NS_EXML, 'game.ui.AdventurePosIRSkin');
		const group = ir.children[0];
		// Only <eui:Label> resolves; <game:HeroNarrowIR> is unknown without config.
		expect(group.children).toHaveLength(1);
		expect(group.children[0].className).toBe('Label');
		expect(ir.unresolvedTags).toContain('game:HeroNarrowIR');
	});

	it('resolves and imports a custom-namespace tag when the namespace is configured', () => {
		const ir = parseEXML(CUSTOM_NS_EXML, 'game.ui.AdventurePosIRSkin', CUSTOM_NAMESPACES);
		const group = ir.children[0];
		expect(group.children).toHaveLength(2);
		expect(ir.unresolvedTags).toHaveLength(0);
		expect(ir.imports.get('HeroNarrowIR')).toBe('#ns/game');
	});

	it('generates an import from the namespace specifier', () => {
		const code = compileEXML(CUSTOM_NS_EXML, 'game.ui.AdventurePosIRSkin', { customNamespaces: CUSTOM_NAMESPACES });
		expect(code).toContain('from "#ns/game"');
		expect(code).toContain('new HeroNarrowIR()');
	});
});
