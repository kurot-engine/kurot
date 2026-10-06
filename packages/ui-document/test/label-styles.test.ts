import { describe, expect, it } from 'vitest';
import {
	findUINode,
	getUILabelStyle,
	parseUIDocument,
	parseUIStyleSheet,
	resolveUILabelStyles,
	resolveUIStyleColors,
	serializeUIDocument,
	UIDocumentHistory,
} from '../src/index.js';

const config = {
	schemaVersion: 1,
	fonts: {
		default: 'primary',
		families: {
			primary: { fallback: ['Arial', 'sans-serif'], faces: [{ url: 'fonts/Regular.ttf', weight: 400 }] },
		},
	},
	colors: { foreground: '#FFA500', black: '#000000', disabled: '#999999' },
	labels: {
		button: {
			fontFamily: '@style:fonts:primary',
			size: 24,
			textColor: '@style:colors:foreground',
			stroke: 2,
			strokeColor: '@style:colors:black',
			bold: true,
			italic: false,
			textAlign: 'center',
			verticalAlign: 'middle',
			lineSpacing: 4,
		},
	},
};

const source =
	'<Skin xmlns="https://kurot.dev/ui/1" class="Test" states="down,disabled"><Group><Label id="label" text="@style:labels:literal" textStyle="@style:labels:button" width="100" size="28" bold="false" size.down="20" textColor.disabled="@style:colors:disabled" /></Group></Skin>';

describe('Label style presets', () => {
	it('validates and freezes styles, resolving font roles and black without inserting absent sections', () => {
		const style = parseUIStyleSheet(config);
		expect(style.labels.button).toEqual({
			fontFamily: '"kurot-primary", "Arial", sans-serif',
			size: 24,
			textColor: 0xffa500,
			stroke: 2,
			strokeColor: 0,
			bold: true,
			italic: false,
			textAlign: 'center',
			verticalAlign: 'middle',
			lineSpacing: 4,
		});
		expect(Object.isFrozen(style.labels)).toBe(true);
		expect(Object.isFrozen(style.labels.button)).toBe(true);
		const { labels: _labels, ...fontsAndColors } = config;
		expect(parseUIStyleSheet(fontsAndColors).labels).toEqual({});
		expect(getUILabelStyle(style, undefined)).toEqual({});
		expect(getUILabelStyle(style, '')).toEqual({});
	});

	it.each([
		{ size: -1 },
		{ size: '24' },
		{ size: Infinity },
		{ bold: 'true' },
		{ textColor: '#fff' },
		{ textColor: 123 },
		{ textColor: '@style:colors:missing' },
		{ stroke: -1 },
		{ strokeColor: '@style:colors:missing' },
		{ fontFamily: '' },
		{ fontFamily: '@style:fonts:missing' },
		{ fontFamily: '@style:labels:button' },
		{ textAlign: 'invalid' },
		{ verticalAlign: 'invalid' },
		{ lineSpacing: [] },
		{ text: 'content' },
		{ width: 100 },
		{ textFit: 'shrink' },
		{ extends: 'body' },
	])('rejects invalid or non-visual preset properties %j with a configuration location', preset => {
		expect(() => parseUIStyleSheet({ ...config, labels: { button: preset } })).toThrow('style.labels.button');
	});

	it('expands a disposable copy with local and state precedence while preserving XML and literal text', () => {
		const document = parseUIDocument(source);
		const before = serializeUIDocument(document);
		const style = parseUIStyleSheet(config);
		const resolved = resolveUIStyleColors(resolveUILabelStyles(document, style), style.colors);
		expect(findUINode(resolved.root, 'label')?.properties).toMatchObject({
			size: 28,
			width: 100,
			bold: false,
			stroke: 2,
			textColor: 0xffa500,
			fontFamily: '"kurot-primary", "Arial", sans-serif',
			text: '@style:labels:literal',
		});
		expect(findUINode(resolved.root, 'label')?.properties.textStyle).toBeUndefined();
		expect(resolved.contract.states.down?.overrides[0]?.value).toBe(20);
		expect(resolved.contract.states.disabled?.overrides[0]?.value).toBe(0x999999);
		expect(serializeUIDocument(document)).toBe(before);
		expect(before).toContain('textStyle="@style:labels:button"');
		expect(findUINode(document.root, 'label')?.properties.stroke).toBeUndefined();
	});

	it('keeps style selection and removal as ordinary undoable properties', () => {
		const document = parseUIDocument(source);
		const history = new UIDocumentHistory(document);
		history.commit({
			id: 'restore-preset',
			summary: 'Restore preset size',
			expectedRevision: 0,
			operations: [{ kind: 'remove-node-property', nodeId: 'label', property: 'size' }],
		});
		expect(
			findUINode(resolveUILabelStyles(history.snapshot.document, parseUIStyleSheet(config)).root, 'label')
				?.properties.size,
		).toBe(24);
		history.undo();
		expect(findUINode(history.snapshot.document.root, 'label')?.properties.size).toBe(28);
		history.redo();
		expect(findUINode(history.snapshot.document.root, 'label')?.properties.textStyle).toBe('@style:labels:button');
	});

	it('rejects missing/malformed references and presets on other component types', () => {
		expect(() => resolveUILabelStyles(parseUIDocument(source))).toThrow('label.textStyle');
		for (const reference of [
			'button',
			'@style:colors:foreground',
			'@style:labels:Missing',
			'@style:labels:constructor',
		]) {
			expect(() => getUILabelStyle(parseUIStyleSheet(config), reference)).toThrow();
		}
		expect(() =>
			resolveUILabelStyles(
				parseUIDocument(source.replace('<Label ', '<EditableText ')),
				parseUIStyleSheet(config),
			),
		).toThrow('supported only on Label');
		expect(() =>
			resolveUILabelStyles(
				parseUIDocument(source.replace('size.down="20"', 'textStyle.down="@style:labels:button"')),
				parseUIStyleSheet(config),
			),
		).toThrow('Default-state-only');
	});

	it('rejects dynamic preset selection instead of passing an authoring directive to a native Label', () => {
		const document = parseUIDocument(source);
		const style = parseUIStyleSheet(config);
		expect(() =>
			resolveUILabelStyles(
				{
					...document,
					contract: {
						...document.contract,
						parameters: {
							preset: { valueType: 'string', bindings: [{ targetId: 'label', property: 'textStyle' }] },
						},
					},
				},
				style,
			),
		).toThrow('parameter or data binding');
		expect(() =>
			resolveUILabelStyles(
				{
					...document,
					contract: {
						...document.contract,
						dataBindings: {
							preset: { source: 'preset', targetId: 'label', property: 'textStyle' },
						},
					},
				},
				style,
			),
		).toThrow('parameter or data binding');
		expect(() =>
			resolveUILabelStyles(
				{
					...document,
					root: {
						...document.root,
						instance: {
							source: { kind: 'asset', assetId: 'Other' },
							parameters: {},
							slots: {},
							overrides: [{ part: 'label', property: 'textStyle', value: '@style:labels:button' }],
						},
					},
				},
				style,
			),
		).toThrow('instance textStyle overrides');
	});

	it('expands projected slot Labels while preserving reusable instance metadata', () => {
		const document = parseUIDocument(source);
		const projected = findUINode(document.root, 'label')!;
		const instance = {
			source: { kind: 'asset' as const, assetId: 'Other' },
			parameters: {},
			overrides: [],
			slots: { content: [projected] },
		};
		const authored = { ...document, root: { ...document.root, children: [], instance } };
		const expanded = resolveUILabelStyles(authored, parseUIStyleSheet(config));
		expect(expanded.root.instance?.slots.content?.[0]?.properties.stroke).toBe(2);
		expect(expanded.root.instance?.source).toBe(instance.source);
		expect(instance.slots.content[0]?.properties.stroke).toBeUndefined();
	});
});
