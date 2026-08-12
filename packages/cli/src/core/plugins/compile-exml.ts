import * as esbuild from 'esbuild';
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ensureDir, writeFile } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';
import { parseToIR, generateCode } from '../exml/index.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';
import type { Project } from '../project.js';

interface ExmlFile {
	/**
	 * Absolute path to the `.exml` file.
	 */
	path: string;
	/**
	 * Path relative to `resource/`, using forward slashes.
	 */
	relPath: string;
	/**
	 * Raw EXML source text.
	 */
	contents: string;
}

/**
 * A resolved skin: its source file plus the class name declared in the EXML.
 */
interface CompiledSkin {
	/**
	 * The source `.exml` file this skin was compiled from.
	 */
	file: ExmlFile;
	/**
	 * The skin's class name, from its `class="..."` attribute.
	 */
	className: string;
}

/**
 * Theme file, kept compatible with Egret's `default.thm.json` on input:
 * - `skins` values may be skin paths (`resource/skins/X.exml`) or class names.
 * - `autoGenerateExmlsList` toggles auto-scan vs. the explicit `exmls` list.
 * - `exmls` entries may be project-root-relative paths (Egret) or objects.
 */
interface ThemeData {
	skins?: Record<string, string>;
	exmls?: Array<string | { path: string; [k: string]: unknown }>;
	autoGenerateExmlsList?: boolean;
	[k: string]: unknown;
}

/**
 * Compiles `.exml` skin files into a single ESM module and rewrites the theme.
 *
 * Each skin becomes a real JS factory (`import { Skin, ... } from '@kurot/ui'`)
 * bundled into `js/default.thm.js` (dev) or `js/default.thm.min_<hash>.js`
 * (release). The module registers each factory on `globalThis` under its class
 * name. The output `default.thm.json` keeps only the `skins` mapping plus a
 * `skinsJs` pointer to that module, which the runtime `Theme` imports.
 *
 * The input theme follows Egret conventions; no `.exml` is shipped.
 */
export function compileExml(): BuildPlugin {
	return {
		name: 'compile EXML',
		async apply(ctx: BuildContext): Promise<void> {
			const { project } = ctx;
			if (!project.config.exml || !project.themeFile) return;

			const theme = await loadTheme(project);
			const files = await resolveExmlFiles(project, theme);
			if (files.length === 0) {
				logger.step('no .exml files found, skipping');
				return;
			}

			const skins: CompiledSkin[] = files.map(file => ({ file, className: extractClassName(file) }));
			const skinsFile = await buildSkinsModule(ctx, skins);
			ctx.outputs.skinsScript = `js/${skinsFile}`;

			const relThemePath = project.config.exml.themeFile;
			const outTheme: ThemeData = { ...theme };
			delete outTheme.exmls;
			delete outTheme.autoGenerateExmlsList;
			outTheme.skins = remapSkins(project, theme.skins ?? {}, skins);
			outTheme.skinsJs = toPosix(path.relative(path.dirname(relThemePath), `js/${skinsFile}`));

			await writeFile(path.join(project.outputDir, relThemePath), JSON.stringify(outTheme, null, '\t'));
			logger.step(`compiled ${skins.length} skin(s) → ${ctx.outputs.skinsScript}`);
		},
	};
}

/**
 * Generates one ESM module per skin in a temp dir, plus an index that imports
 * and registers them, then bundles to `js/default.thm[.min_<hash>].js`.
 *
 * Engine packages and custom namespaces stay external (resolved by the page
 * import map — see `compile-engine.ts` and `compile-custom-namespaces.ts`).
 */
async function buildSkinsModule(ctx: BuildContext, skins: CompiledSkin[]): Promise<string> {
	const { project } = ctx;
	const jsDir = path.join(project.outputDir, 'js');
	await ensureDir(jsDir);

	const customNamespaces = project.customNamespaces.map(ns => ({ prefix: ns.prefix, specifier: ns.specifier }));
	const isRelease = project.mode === 'release';

	const stubDir = await fs.mkdtemp(path.join(os.tmpdir(), 'blakron-skins-'));
	try {
		const indexLines: string[] = [];
		await Promise.all(
			skins.map(async (skin, i) => {
				const code = generateSkinModule(skin, customNamespaces, isRelease);
				await fs.writeFile(path.join(stubDir, `skin${i}.ts`), code);
				const funcName = factoryName(skin.className);
				indexLines.push(
					`import { ${funcName} as s${i} } from './skin${i}.js';\n` +
						`globalThis[${JSON.stringify(skin.className)}] = s${i};`,
				);
			}),
		);
		await fs.writeFile(path.join(stubDir, 'index.ts'), indexLines.join('\n\n') + '\n');

		const engineExternal =
			project.enginePackages.length > 0 ? project.enginePackages : ['@kurot/ui', '@kurot/core'];
		const result = await esbuild.build({
			entryPoints: [path.join(stubDir, 'index.ts')],
			outdir: jsDir,
			entryNames: isRelease ? 'default.thm.min_[hash]' : 'default.thm',
			bundle: true,
			format: 'esm',
			platform: 'browser',
			target: 'es2022',
			minify: isRelease,
			metafile: true,
			logLevel: 'warning',
			external: [...engineExternal, ...project.customNamespaces.map(ns => ns.specifier)],
		});

		const output = Object.keys(result.metafile!.outputs).find(f => f.endsWith('.js'));
		return path.basename(output ?? 'default.thm.js');
	} finally {
		await fs.rm(stubDir, { recursive: true, force: true });
	}
}

/**
 * Generates an ESM skin factory, returning a stub on parse failure.
 */
function generateSkinModule(
	skin: CompiledSkin,
	customNamespaces: readonly { prefix: string; specifier: string }[],
	strict: boolean,
): string {
	try {
		const ir = parseToIR(skin.file.contents, skin.className, customNamespaces);
		if (ir.unresolvedTags.length > 0) {
			const tags = [...new Set(ir.unresolvedTags)].join(', ');
			logger.warn(`${skin.file.relPath}: unresolved tag(s) dropped from skin: ${tags}`);
		}
		return generateCode(ir, { format: 'esm' });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		if (strict) {
			throw new Error(`EXML compile failed for ${skin.file.relPath}: ${message}`, { cause: err });
		}
		logger.warn(`EXML compile failed for ${skin.file.relPath}: ${message}`);
		return `// Failed to compile ${skin.file.relPath}: ${message}\nexport function ${factoryName(skin.className)}() { return {}; }\n`;
	}
}

/**
 * Determines which `.exml` files to compile (honours `autoGenerateExmlsList`).
 */
async function resolveExmlFiles(project: Project, theme: ThemeData): Promise<ExmlFile[]> {
	const declared = (theme.exmls ?? []).map(e => (typeof e === 'string' ? e : e?.path)).filter(Boolean) as string[];

	if (theme.autoGenerateExmlsList === false && declared.length > 0) {
		const files: ExmlFile[] = [];
		for (const rel of declared) {
			try {
				files.push(await readExmlAt(project.resourceDir, resolveExmlPath(project, rel)));
			} catch {
				logger.warn(`declared EXML not found, skipping: ${rel}`);
			}
		}
		return files;
	}
	return collectExmlFiles(project.resourceDir);
}

/**
 * Recursively collects every `.exml` file under `resource/`, sorted by path.
 */
async function collectExmlFiles(resourceDir: string): Promise<ExmlFile[]> {
	const results: ExmlFile[] = [];

	async function walk(dir: string): Promise<void> {
		let entries: import('node:fs').Dirent[];
		try {
			entries = await fs.readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) await walk(full);
			else if (entry.name.endsWith('.exml')) results.push(await readExmlAt(resourceDir, full));
		}
	}

	await walk(resourceDir);
	return results.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

/**
 * Resolves a theme-declared EXML path (project-root- or resource-relative).
 */
function resolveExmlPath(project: Project, declared: string): string {
	const normalized = declared.replace(/^\.\//, '');
	return normalized.startsWith('resource/')
		? path.resolve(project.root, normalized)
		: path.resolve(project.resourceDir, normalized);
}

/**
 * Reads a `.exml` file at an absolute path, computing its `resource/`-relative path.
 */
async function readExmlAt(resourceDir: string, absolute: string): Promise<ExmlFile> {
	return {
		path: absolute,
		relPath: toPosix(path.relative(resourceDir, absolute)),
		contents: await fs.readFile(absolute, 'utf-8'),
	};
}

/**
 * Reads the existing theme file, or returns an empty theme on miss.
 */
async function loadTheme(project: Project): Promise<ThemeData> {
	try {
		return JSON.parse(await fs.readFile(project.themeFile!, 'utf-8')) as ThemeData;
	} catch {
		return { skins: {} };
	}
}

/**
 * Rewrites the `skins` map to class names: Egret path values
 * (`resource/skins/X.exml`) are matched to their compiled skin; values that are
 * already class names pass through.
 */
function remapSkins(project: Project, skins: Record<string, string>, compiled: CompiledSkin[]): Record<string, string> {
	const byRelPath = new Map(compiled.map(s => [s.file.relPath, s.className]));
	const result: Record<string, string> = {};

	for (const [host, value] of Object.entries(skins)) {
		if (/\.exml$/i.test(value) || value.includes('/')) {
			const relPath = toPosix(path.relative(project.resourceDir, resolveExmlPath(project, value)));
			result[host] = byRelPath.get(relPath) ?? value;
		} else {
			result[host] = value;
		}
	}
	return result;
}

/**
 * Reads the `class="..."` attribute, falling back to the file name.
 */
function extractClassName(file: ExmlFile): string {
	const match = file.contents.match(/class="([^"]+)"/);
	return match ? match[1] : path.basename(file.path, '.exml');
}

/**
 * `skins.ButtonSkin` → `createButtonSkin` (matches the EXML codegen).
 */
function factoryName(className: string): string {
	return `create${className.split('.').pop()}`;
}

/**
 * Converts a file system path to forward-slash form (a no-op on POSIX).
 */
function toPosix(p: string): string {
	return p.split(path.sep).join('/');
}
