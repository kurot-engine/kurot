import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { parseUIStyleSheet } from '@kurot/ui-document';
import type { DevEvent } from '../src/core/diagnostics/index.js';
import { compileKUI, parseToIR } from '../src/core/kui/index.js';
import { availablePort, createCliProject, startCli, stopCli, waitForJsonLine } from './cli-process-helpers.js';

const roots: string[] = [];
const style = {
	schemaVersion: 1,
	fonts: {
		default: 'primary',
		families: {
			primary: { fallback: ['Arial'], faces: [{ url: 'fonts/Regular.ttf', weight: 400 }] },
		},
	},
	colors: { foreground: '#123456', disabled: '#999999' },
	labels: {
		body: {
			fontFamily: '@style:fonts:primary',
			size: 24,
			textColor: '@style:colors:foreground',
			stroke: 2,
			strokeColor: '#000000',
			bold: true,
		},
	},
};
const xml =
	'<Skin xmlns="https://kurot.dev/ui/1" class="Test" states="disabled"><Label id="label" text="literal" textStyle="@style:labels:body" size="28" size.disabled="20" textColor.disabled="@style:colors:disabled" /></Skin>';

afterEach(async () => {
	await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});

it('compiles presets into native properties without emitting directives or changing local/state precedence', () => {
	const sheet = parseUIStyleSheet(style);
	const script = compileKUI(xml, undefined, { styleSheet: sheet });
	expect(script).toContain('label.size = 28');
	expect(script).toContain('label.stroke = 2');
	expect(script).toContain('label.strokeColor = 0');
	expect(script).toContain('label.fontFamily = "\\\"kurot-primary\\\", \\\"Arial\\\""');
	expect(script).toContain('label.textColor = 1193046');
	expect(script).toContain('new SetProperty("label", "size", 20)');
	expect(script).toContain('new SetProperty("label", "textColor", 10066329)');
	expect(script).not.toContain('textStyle');
	expect(script).not.toContain('@style:');
	expect(parseToIR(xml, undefined, [], [], undefined, sheet).states).toHaveLength(1);
	expect(() => compileKUI(xml)).toThrow('Unknown Label style: body');
	expect(() =>
		compileKUI(xml.replace('size.disabled="20"', 'textStyle.disabled="@style:labels:body"'), undefined, {
			styleSheet: sheet,
		}),
	).toThrow('Default-state-only');
});

it('watches shared preset changes across all skins and retains and recovers the last good bundle after invalid edits', async () => {
	const root = await createCliProject(xml);
	roots.push(root);
	await fs.writeFile(
		path.join(root, 'resource/skins/Other.kui.xml'),
		'<Skin xmlns="https://kurot.dev/ui/1" class="Other"><Label id="other" textStyle="@style:labels:body" /></Skin>',
	);
	const stylePath = path.join(root, 'resource/config/style.json');
	await fs.mkdir(path.dirname(stylePath), { recursive: true });
	const config = structuredClone(style);
	await fs.writeFile(stylePath, JSON.stringify(config));
	const child = startCli(root, ['dev', '--port', String(await availablePort()), '--diagnostics', 'jsonl']);
	try {
		await waitForJsonLine<DevEvent>(child, event => event.type === 'server-ready');
		const output = path.join(root, 'bin-debug/js/default.thm.js');
		let script = await fs.readFile(output, 'utf8');
		expect(script).toContain('other.size = 24');
		expect(script).toContain('label.size = 28');
		const failed = waitForJsonLine<DevEvent>(child, event => event.type === 'build-complete' && !event.success);
		await fs.writeFile(stylePath, JSON.stringify({ ...config, labels: { body: { size: -1 } } }));
		await failed;
		expect(await fs.readFile(output, 'utf8')).toBe(script);
		config.labels.body.size = 32;
		config.colors.foreground = '#000000';
		const updated = waitForJsonLine<DevEvent>(child, event => event.type === 'build-complete' && event.success);
		await fs.writeFile(stylePath, JSON.stringify(config));
		await updated;
		script = await fs.readFile(output, 'utf8');
		expect(script).toContain('other.size = 32');
		expect(script).toContain('label.size = 28');
		expect(script).toContain('other.textColor = 0');
		expect(script).toContain('label.textColor = 0');
		expect(await fs.readFile(path.join(root, 'resource/skins/TestSkin.kui.xml'), 'utf8')).toBe(xml);
	} finally {
		await stopCli(child);
	}
});
