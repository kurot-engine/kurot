import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { copyDir, writeFile, exists } from '../utils/fs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '../../templates');
const CLI_PKG = path.resolve(__dirname, '../../package.json');

export const TEMPLATES = ['game', 'empty'] as const;
export type TemplateName = (typeof TEMPLATES)[number];

/**
 * Scaffolds a new project by copying `templates/<template>/` into `./<name>/`,
 * then writing a fresh `package.json`:
 *
 * - `name` is set to the project name.
 * - `@kurot/cli` is pinned to the version of the CLI doing the scaffolding,
 *   so a project always uses the CLI that created it (never a stale template pin).
 * - `@kurot/*` engine packages are set to `latest`.
 */
export async function scaffoldProject(name: string, template: TemplateName): Promise<void> {
	const templateDir = path.join(TEMPLATES_DIR, template);
	const destDir = path.resolve(name);

	if (!(await exists(templateDir))) {
		throw new Error(`Template "${template}" not found at ${templateDir}`);
	}
	if (await exists(destDir)) {
		throw new Error(`Directory "${name}" already exists`);
	}

	await copyDir(templateDir, destDir);

	const pkgPath = path.join(destDir, 'package.json');
	if (await exists(pkgPath)) {
		const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8')) as PackageJson;
		pkg.name = path.basename(destDir);
		const cliVersion = await readCliVersion();
		await pinKurotDeps(pkg.dependencies, cliVersion);
		await pinKurotDeps(pkg.devDependencies, cliVersion);
		await writeFile(pkgPath, JSON.stringify(pkg, null, '\t') + '\n');
	}
}

interface PackageJson {
	name?: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	[k: string]: unknown;
}

/**
 * Rewrites `@kurot/*` ranges: the CLI to its own version, and each engine
 * package to the concrete latest version (`^x.y.z`) resolved from the registry.
 */
async function pinKurotDeps(deps: Record<string, string> | undefined, cliVersion: string): Promise<void> {
	if (!deps) return;
	await Promise.all(
		Object.keys(deps).map(async dep => {
			if (dep === '@kurot/cli') deps[dep] = `^${cliVersion}`;
			else if (dep.startsWith('@kurot/')) deps[dep] = await resolveLatest(dep);
		}),
	);
}

/**
 * Resolves a package's latest published version to a caret range (`^x.y.z`).
 * Falls back to the `latest` dist-tag when the registry is unreachable or the
 * package is unpublished, deferring resolution to install time.
 */
async function resolveLatest(pkg: string): Promise<string> {
	try {
		const url = `https://registry.npmjs.org/${pkg.replace('/', '%2F')}/latest`;
		const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
		if (res.ok) {
			const data = (await res.json()) as { version?: string };
			if (data.version) return `^${data.version}`;
		}
	} catch {
		// Offline / unpublished — fall back below.
	}
	return 'latest';
}

/**
 * Reads this CLI's own version from its package.json.
 */
async function readCliVersion(): Promise<string> {
	const pkg = JSON.parse(await fs.readFile(CLI_PKG, 'utf-8')) as { version: string };
	return pkg.version;
}
