import { describe, expect, it } from 'vitest';
import {
	createKurotUIFoundationRegistry,
	parseUIDocument,
	serializeUIDocument,
	validateUIDocumentComponents,
} from '../src/index.js';

const BUTTON_TYPES = ['Button', 'ToggleButton', 'RadioButton', 'CheckBox', 'ToggleSwitch'] as const;
const EXTRA_BUTTON_TYPES = ['RadioButton', 'CheckBox', 'ToggleSwitch'] as const;
const LITERAL_LABELS = [
	['10', '10'],
	['10.00', '10.00'],
	['-0', '-0'],
	['1e3', '1e3'],
	['true', 'true'],
	['false', 'false'],
	['@token:string:title', '@token:string:title'],
	['@style:colors:accent', '@style:colors:accent'],
	['@asset:example', '@asset:example'],
	['@resource:image:example', '@resource:image:example'],
	[String.raw`\10.00`, String.raw`\10.00`],
	['', ''],
	['选项 &amp; &quot;10&quot; &lt;20&gt;', '选项 & "10" <20>'],
] as const;

describe.each(BUTTON_TYPES)('%s XML strings', type => {
	it.each(LITERAL_LABELS)('preserves label %j in default and named states', (xml, expected) => {
		const document = parseUIDocument(
			`<Skin xmlns="https://kurot.dev/ui/1" class="ButtonSkin" states="down">
				<${type} id="control" label="${xml}" label.down="${xml}"
					width="120" enabled="false" selected="true" />
			</Skin>`,
		);
		expect(document.root.children[0]?.properties).toEqual({
			label: expected,
			width: 120,
			enabled: false,
			selected: true,
		});
		expect(document.contract.states.down?.overrides).toEqual([
			{ targetId: 'control', property: 'label', value: expected },
		]);

		const serialized = serializeUIDocument(document);
		expect(serialized).toContain(`label="${xml}"`);
		expect(serialized).toContain(`label.down="${xml}"`);
		expect(parseUIDocument(serialized)).toEqual(document);
	});
});

describe('button subclass XML metadata', () => {
	it('validates numeric RadioButton labels with a consumer-supplied component definition', () => {
		const registry = createKurotUIFoundationRegistry();
		registry.register({
			type: 'kui.RadioButton',
			extends: 'kui.ToggleButton',
			children: 'none',
			properties: { groupName: { valueType: 'string' } },
		});
		const labels = ['10', '20', '50', '100'];
		const buttons = labels.map(label =>
			`<RadioButton id="radioRounds${label}" label="${label}" groupName="groupAutoBet" />`,
		);
		const document = parseUIDocument(
			`<Skin xmlns="https://kurot.dev/ui/1" class="AutoBetPanelSkin">${buttons.join('')}</Skin>`,
		);

		expect(validateUIDocumentComponents(document, registry)).toEqual([]);
		expect(document.root.children.map(node => node.properties.label)).toEqual(labels);
		expect(validateUIDocumentComponents(parseUIDocument(serializeUIDocument(document)), registry)).toEqual([]);
	});

	it.each(LITERAL_LABELS)('preserves RadioButton groupName %j in default and named states', (xml, expected) => {
		const document = parseUIDocument(
			`<Skin xmlns="https://kurot.dev/ui/1" class="RadioSkin" states="down">
				<RadioButton id="control" groupName="${xml}" groupName.down="${xml}" />
			</Skin>`,
		);
		expect(document.root.children[0]?.properties.groupName).toBe(expected);
		expect(document.contract.states.down?.overrides).toEqual([
			{ targetId: 'control', property: 'groupName', value: expected },
		]);
		const serialized = serializeUIDocument(document);
		expect(serialized).toContain(`groupName="${xml}"`);
		expect(serialized).toContain(`groupName.down="${xml}"`);
		expect(parseUIDocument(serialized)).toEqual(document);
	});

	it.each(EXTRA_BUTTON_TYPES)('uses inherited resource and string metadata on %s', type => {
		const document = parseUIDocument(
			`<Skin xmlns="https://kurot.dev/ui/1" class="ButtonSkin" states="down">
				<${type} id="control" icon="10" icon.down="false" skinName="10.00" />
			</Skin>`,
		);
		expect(document.root.children[0]?.properties).toEqual({
			icon: { kind: 'resource', resourceType: 'image', key: '10' },
			skinName: '10.00',
		});
		expect(document.contract.states.down?.overrides).toEqual([
			{ targetId: 'control', property: 'icon', value: { kind: 'resource', resourceType: 'image', key: 'false' } },
		]);
		expect(parseUIDocument(serializeUIDocument(document))).toEqual(document);
	});

	it.each(EXTRA_BUTTON_TYPES)('keeps %s available for consumer registration without leaking codec metadata', type => {
		const registry = createKurotUIFoundationRegistry();
		expect(registry.has(`kui.${type}`)).toBe(false);
		registry.register({ type: `kui.${type}`, extends: 'kui.ToggleButton', children: 'none' });
		const document = parseUIDocument(
			`<Skin xmlns="https://kurot.dev/ui/1" class="ButtonSkin"><${type} label="10" /></Skin>`,
		);
		expect(validateUIDocumentComponents(document, registry)).toEqual([]);
		expect(createKurotUIFoundationRegistry().has(`kui.${type}`)).toBe(false);
	});

	it.each(EXTRA_BUTTON_TYPES)('rejects unsupported textFlow metadata on %s', type => {
		expect(() =>
			parseUIDocument(
				`<Skin xmlns="https://kurot.dev/ui/1" class="ButtonSkin"><${type}><textFlow /></${type}></Skin>`,
			),
		).toThrow(`Component "kui.${type}" does not support textFlow.`);
	});

	it('retains scalar inference for unknown components and schema-free collection labels', () => {
		const document = parseUIDocument(
			`<Skin xmlns="https://kurot.dev/ui/1" xmlns:custom="https://kurot.dev/components/custom" class="ButtonSkin">
				<custom:Unknown label="10.00" enabled="false" />
				<List><ArrayCollection><Array><Object label="10.00" selected="false" /></Array></ArrayCollection></List>
			</Skin>`,
		);
		expect(document.root.children[0]?.properties).toEqual({ label: 10, enabled: false });
		expect(document.root.children[1]?.properties.dataProvider).toEqual({
			type: 'kui.ArrayCollection',
			properties: { source: [{ label: 10, selected: false }] },
		});
		expect(parseUIDocument(serializeUIDocument(document))).toEqual(document);
	});
});
