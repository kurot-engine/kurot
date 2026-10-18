import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, lstat, mkdir, readFile, readdir, readlink, stat, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Plan } from './types.js';

export function sha256(bytes: string | Uint8Array): string {
	return createHash('sha256').update(bytes).digest('hex');
}

async function files(directory: string, prefix = '', includeGenerated = false): Promise<string[]> {
	const result: string[] = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		if (!includeGenerated && ['node_modules', '.git', 'dist', 'bin-debug', 'bin-release', 'test-results', 'docs-internal'].includes(entry.name)) continue;
		const relative = path.join(prefix, entry.name);
		if (entry.isDirectory()) result.push(...await files(path.join(directory, entry.name), relative, includeGenerated));
		else if (entry.isFile() || (includeGenerated && entry.isSymbolicLink())) result.push(relative);
	}
	return result;
}

function isContext(file: string): boolean {
	return /\.(md|ts|json|html|yaml|xml|kui)$/.test(file) && (
		['AGENTS.md', 'README.md'].includes(file) || file.startsWith('docs/') ||
		/^packages\/[^/]+\/(README\.md|docs\/|templates\/)/.test(file) || file.startsWith('examples/')
	);
}

export async function snapshotContexts(repo: string, output: string, plan: Plan): Promise<object> {
	const baseline = execFileSync('git', ['rev-parse', plan.baselineRevision], { cwd: repo, encoding: 'utf8' }).trim();
	const oldFiles = execFileSync('git', ['ls-tree', '-r', '--name-only', baseline], { cwd: repo, encoding: 'utf8' })
		.trim().split('\n').filter(isContext);
	const newFiles = ['AGENTS.md', 'README.md'];
	for (const prefix of ['docs', 'packages', 'examples']) {
		newFiles.push(...(await files(path.join(repo, prefix), prefix)).filter(isContext));
	}
	const manifest: Record<string, Record<string, string>> = {};
	for (const [arm, names] of [['old', oldFiles], ['new', newFiles]] as const) {
		const hashes: Record<string, string> = {};
		for (const name of names.sort()) {
			const body = arm === 'old' ? execFileSync('git', ['show', `${baseline}:${name}`], { cwd: repo }) : await readFile(path.join(repo, name));
			const destination = path.join(output, 'contexts', arm, name);
			await mkdir(path.dirname(destination), { recursive: true });
			await writeFile(destination, body);
			hashes[name] = sha256(body);
		}
		manifest[arm] = hashes;
	}
	await writeFile(path.join(output, 'contexts.json'), JSON.stringify(manifest, undefined, 2));
	return { baseline, contextManifestSha256: sha256(JSON.stringify(manifest)) };
}

export async function fingerprint(directory: string, includeGenerated = false): Promise<Record<string, string>> {
	const hashes: Record<string, string> = {};
	for (const name of (await files(directory, '', includeGenerated)).sort()) {
		const file = path.join(directory, name);
		hashes[name] = sha256((await lstat(file)).isSymbolicLink() ? `symlink:${await readlink(file)}` : await readFile(file));
	}
	return hashes;
}

export async function prepareSdk(repo: string, output: string, plan: Plan): Promise<{
	versions: Readonly<Record<string, string>>; filesSha256: string; lockSha256: string;
}> {
	const source = path.join(repo, 'examples/star-catcher');
	const nodeModules = path.join(output, 'sdk/node_modules');
	await cp(path.join(source, 'node_modules'), nodeModules, { recursive: true, verbatimSymlinks: true });
	for (const [name, version] of Object.entries(plan.sdk)) {
		const pkg = JSON.parse(await readFile(path.join(nodeModules, name, 'package.json'), 'utf8')) as { version: string };
		if (pkg.version !== version) throw new Error(`${name}: expected ${version}, found ${pkg.version}.`);
	}
	const hashes = await fingerprint(nodeModules, true);
	await writeFile(path.join(output, 'sdk-files.json'), JSON.stringify(hashes, undefined, 2));
	return {
		versions: plan.sdk, filesSha256: sha256(JSON.stringify(hashes)),
		lockSha256: sha256(await readFile(path.join(source, 'pnpm-lock.yaml'))),
	};
}

export async function prepareTrial(output: string, arm: 'old' | 'new', id: string): Promise<string> {
	const directory = path.join(output, 'trials', id);
	await cp(path.join(output, 'contexts', arm), directory, { recursive: true });
	await symlink(path.join(output, 'sdk/node_modules'), path.join(directory, 'node_modules'), 'dir');
	await mkdir(path.join(directory, 'src'));
	await mkdir(path.join(directory, 'template/web'), { recursive: true });
	await writeFile(path.join(directory, 'src/Main.ts'), 'export {};\n');
	await writeFile(path.join(directory, 'package.json'), JSON.stringify({
		name: 'coin-lanes-eval', private: true, type: 'module',
		scripts: { typecheck: 'tsc --noEmit', build: 'node --import tsx node_modules/@kurot/cli/dist/index.js build' },
		dependencies: { '@kurot/core': '2.5.4' },
		devDependencies: { '@kurot/cli': '3.3.1', typescript: '5.9.3', tsx: '4.21.0' },
	}, undefined, 2));
	await writeFile(path.join(directory, 'tsconfig.json'), JSON.stringify({
		compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', lib: ['ES2022', 'DOM'], strict: true, skipLibCheck: true, noEmit: true },
		include: ['src', 'kurot.config.ts'],
	}, undefined, 2));
	await writeFile(path.join(directory, 'kurot.config.ts'), [
		"export const target = 'html5';", "export const entry = 'src/Main.ts';",
		"export const output = { dir: 'bin-debug' };", "export const html = { template: 'template/web/index.html' };",
		"export const stage = { width: 640, height: 800, scaleMode: 'showAll', frameRate: 60 };", '',
	].join('\n'));
	await writeFile(path.join(directory, 'template/web/index.html'), `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="data:,"><title>Coin Lanes</title>{{KUROT_IMPORT_MAP}}</head>
<body><div style="width:min(100%,480px);aspect-ratio:4/5"><canvas id="gameCanvas"
data-content-width="{{KUROT_STAGE_WIDTH}}" data-content-height="{{KUROT_STAGE_HEIGHT}}"
data-scale-mode="{{KUROT_SCALE_MODE}}" data-orientation="{{KUROT_ORIENTATION}}"
data-frame-rate="{{KUROT_FRAME_RATE}}"></canvas></div>
<script type="module" src="./{{KUROT_ENTRY_SCRIPT}}"></script></body></html>\n`);
	return directory;
}

export async function assertProtected(
	directory: string, expected: Record<string, string>, writable = ['src/', 'template/web/'],
): Promise<void> {
	for (const [name, hash] of Object.entries(expected)) {
		if (writable.some(prefix => name.startsWith(prefix))) continue;
		if (sha256(await readFile(path.join(directory, name))) !== hash) throw new Error(`Protected file changed: ${name}`);
	}
	for (const name of await files(directory)) {
		if (writable.some(prefix => name.startsWith(prefix)) || name.startsWith('.kurot/')) continue;
		if (!(name in expected)) throw new Error(`Unexpected file: ${name}`);
	}
	if (!(await stat(path.join(directory, 'src/Main.ts'))).isFile()) throw new Error('Missing entry.');
}
