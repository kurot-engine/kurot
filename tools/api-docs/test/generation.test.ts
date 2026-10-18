import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Application, DeclarationReflection, ReflectionKind } from 'typedoc';
import { children, publicName } from '../src/model.js';
import type { PackageModel } from '../src/model.js';
import { locations, renderPackage } from '../src/render.js';
import { catalog } from '../src/catalog.js';
import { checkLinks, writeOrCheck } from '../src/files.js';
import { newCommentGaps } from '../src/policy.js';
import { addExamples } from '../src/samples.js';
import { supportingTypes } from '../src/support.js';

const directory = await mkdtemp(path.join(os.tmpdir(), 'kurot-api-test-'));
await mkdir(path.join(directory, 'src'));
await writeFile(path.join(directory, 'package.json'), '{"name":"@kurot/core","type":"module"}');
await writeFile(path.join(directory, 'tsconfig.json'), '{"compilerOptions":{"strict":true,"target":"ES2022","skipLibCheck":true},"include":["src/index.ts"]}');
await writeFile(path.join(directory, 'src/index.ts'), `
export class Base { inherited(): void {} }
export class Widget extends Base {
 private hidden = 0; _internal = 0; $hook(): void {}
 static create(): Widget { return new Widget(); }
 protected extend(): void {}
 get value(): number { return 0; } set value(next: number) {}
 overload(value: string): string;
 overload(value: number): number;
 overload(value: string | number): string | number { return value; }
}
export { Widget as Alias };
export const modes = { low: 'low', high: 'high' } as const;
export type Mode = typeof modes[keyof typeof modes];
export const singleton = new Widget();
export interface Dictionary { [key: string]: number }
interface Child { size: number }
interface Outer { child: Child }
export function consume(value: Outer): void {}
/**
 * A complete example.
 * @example
 * \`\`\`ts
 * const value: number = 3;
 * console.log(value);
 * \`\`\`
 */
export function example(): void {}
`);
const app = await Application.bootstrap({ entryPoints: [path.join(directory, 'src/index.ts')], tsconfig: path.join(directory, 'tsconfig.json'),
	excludePrivate: true, excludeInternal: true, disableSources: true, readme: 'none', logLevel: 'Error' });
const project = await app.convert();
assert.ok(project);
for (const value of Object.values(project.reflections)) {
	if (value instanceof DeclarationReflection && value.kind !== ReflectionKind.TypeLiteral && !publicName(value.name)) { project.removeReflection(value); }
}
const model: PackageModel = { key: 'core', name: '@kurot/core', version: '1.0.0', directory, app, project };
const paths = locations([model]);

test('covers aliases, singleton methods, anonymous object members, inheritance and overloads', () => {
	const files = renderPackage(model, paths);
	assert.deepEqual(catalog(model, files).missing, []);
	const widget = project.children?.find(value => value.name === 'Widget');
	assert.ok(widget);
	assert.ok(children(widget).some(value => value.name === 'extend' && value.flags.isProtected));
	assert.equal(children(widget).some(value => ['hidden', '_internal', '$hook'].includes(value.name)), false);
	assert.match(files.get('Widget-class/overload-method.md') ?? '', /overload\(value: string\): string;[\s\S]*overload\(value: number\): number;/);
	assert.match(files.get('Widget-class/value-accessor.md') ?? '', /get value\(\): number;[\s\S]*set value\(next: number\);/);
	assert.match(files.get('Dictionary-interface.md') ?? '', /\[key: string\]: number/);
	assert.match(files.get('Widget-class/constructor-constructor.md') ?? '', /constructor\(\);/);
});

test('detects a dropped member page independently of its symbol index', () => {
	const files = renderPackage(model, paths);
	files.delete('Widget-class/overload-method.md');
	assert.ok(catalog(model, files).missing.includes('file:Widget-class/overload-method.md'));
});

test('rejects stale generated contents and unexpected leftover files', async () => {
	const destination = path.join(directory, 'generated');
	const files = new Map([['index.md', '# API\n']]);
	await writeOrCheck(destination, files, false);
	await writeOrCheck(destination, files, true);
	await writeFile(path.join(destination, 'index.md'), '# stale\n');
	await assert.rejects(writeOrCheck(destination, files, true), /Stale/);
	await writeOrCheck(destination, files, false);
	await writeFile(path.join(destination, 'leftover.md'), 'old');
	await assert.rejects(writeOrCheck(destination, files, true), /file set differs/);
});

test('rejects broken API links and newly undocumented APIs', () => {
	assert.throws(() => checkLinks(new Map([['packages/core/docs/api/index.md', '[missing](absent.md)']])), /Broken API link/);
	assert.deepEqual(newCommentGaps(['old', 'new'], ['old']), ['new']);
});

test('extracts actual JSDoc code fences without fabricating ambient variables', () => {
	const files = renderPackage(model, paths);
	assert.equal(addExamples(model, files), 1);
	const manifest = JSON.parse(files.get('examples.json') ?? '{}') as { examples: { file: string }[] };
	assert.equal(files.get(manifest.examples[0].file), 'const value: number = 3;\nconsole.log(value);\n\nexport {};\n');
});

test('documents reachable helpers transitively without adding public exports', async () => {
	const extras = await supportingTypes([model], paths);
	assert.match(extras.get('core')?.get('supporting/core-Outer.md') ?? '', /interface Outer/);
	assert.match(extras.get('core')?.get('supporting/core-Child.md') ?? '', /size: number/);
	assert.equal(project.children?.some(value => value.name === 'Outer'), false);
});
