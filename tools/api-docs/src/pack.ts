import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, realpath, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { keys, root } from './model.js';
import { listFiles } from './files.js';
import { checkExamples } from './examples.js';

const output = await mkdtemp(path.join(os.tmpdir(), 'kurot-api-pack-'));
const consumer = path.join(output, 'consumer');
await mkdir(path.join(consumer, 'node_modules/@kurot'), { recursive: true });
await writeFile(path.join(consumer, 'package.json'), '{"private":true,"type":"module"}\n');
const results: { package: string; version: string; documentedFiles: number }[] = [];
for (const key of keys) {
	const directory = path.join(root, 'packages', key);
	const packed = JSON.parse(execFileSync('npm', ['pack', '--offline', '--cache', path.join(output, 'npm-cache'), '--json', '--ignore-scripts', '--pack-destination', output], {
		cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
	})) as { filename: string; files: { path: string }[] }[];
	const entry = packed[0];
	if (!entry) throw new Error(`No archive for ${key}.`);
	const paths = new Set(entry.files.map(file => file.path));
	for (const file of await listFiles(path.join(directory, 'docs/api'))) {
		if (!paths.has(`docs/api/${file}`)) throw new Error(`${key} package omits API file ${file}.`);
	}
	if (!paths.has('dist/index.d.ts') || [...paths].some(file => file.startsWith('src/'))) {
		throw new Error(`${key} must distribute declarations and API docs without engine source.`);
	}
	const target = path.join(consumer, 'node_modules/@kurot', key);
	await mkdir(target);
	execFileSync('tar', ['-xzf', path.join(output, entry.filename), '-C', target, '--strip-components=1']);
	const pkg = JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8')) as { version: string };
	const index = JSON.parse(await readFile(path.join(target, 'docs/api/api-index.json'), 'utf8')) as {
		version: string; symbols: { file: string; members: { file: string }[] }[];
	};
	if (pkg.version !== index.version) throw new Error(`${key} API version differs from the packed SDK.`);
	for (const symbol of index.symbols) {
		for (const file of [symbol.file, ...symbol.members.map(member => member.file)]) {
			await readFile(path.join(target, 'docs/api', file));
		}
	}
	results.push({ package: `@kurot/${key}`, version: pkg.version, documentedFiles: [...paths].filter(file => file.startsWith('docs/api/')).length });
}
const core = JSON.parse(await readFile(path.join(root, 'packages/core/package.json'), 'utf8')) as { dependencies: Record<string, string> };
for (const name of Object.keys(core.dependencies)) {
	const destination = path.join(consumer, 'node_modules', name);
	await mkdir(path.dirname(destination), { recursive: true });
	await symlink(await realpath(path.join(root, 'packages/core/node_modules', name)), destination, 'dir');
}
const examples = await checkExamples(consumer);
await writeFile(path.join(output, 'verification.json'), JSON.stringify({ results, examples }, undefined, 2) + '\n');
process.stdout.write(`${JSON.stringify(results)}\nSource-free package verification: ${output}\n`);
