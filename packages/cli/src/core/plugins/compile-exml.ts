import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { writeFile } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';
import { DIAGNOSTIC_CODES } from '../diagnostics/index.js';
import { buildSkinsModule } from '../exml/skin-module-builder.js';
import { BuildError } from '../errors.js';
import type { Dirent } from 'node:fs';
import type { Diagnostic } from '../diagnostics/index.js';
import type { CompiledSkin, ExmlFile } from '../exml/skin-module-builder.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';
import type { Project } from '../project.js';

/**
 * Theme file, kept compatible with Egret's `default.thm.json` on input:
 * - `skins` values may be skin paths (`resource/skins/X.exml`) or class names.
 * - `autoGenerateExmlsList` toggles auto-scan vs. the explicit `exmls` list.
 * - `exmls` entries may be project-root-relative paths (Egret) or objects.
 */
interface ThemeData {
	/**
	 * Host component names mapped to EXML paths or compiled skin class names.
	 */
	skins?: Record<string, string>;
	/**
	 * Explicit EXML inputs used when automatic discovery is disabled.
	 */
	exmls?: Array<string | { path: string; [key: string]: unknown }>;
	/**
	 * Whether compilation discovers every EXML file below `resource`.
	 */
	autoGenerateExmlsList?: boolean;
	[key: string]: unknown;
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
			ctx.diagnostics.removeByCodes([
				DIAGNOSTIC_CODES.EXML_UNKNOWN_TAG,
				DIAGNOSTIC_CODES.EXML_COMPILE_FAILED,
				DIAGNOSTIC_CODES.EXML_DECLARED_FILE_NOT_FOUND,
				DIAGNOSTIC_CODES.THEME_FILE_NOT_FOUND,
				DIAGNOSTIC_CODES.THEME_INVALID_JSON,
				DIAGNOSTIC_CODES.THEME_SKIN_NOT_FOUND,
			]);

			const theme = await loadTheme(ctx);
			if (!theme) {
				throwIfInputInvalid(ctx);
				return;
			}
			const { files, missingDeclaredPaths } = await resolveExmlFiles(ctx, theme);
			const skins: CompiledSkin[] = files.map(file => ({ file, className: extractClassName(file) }));
			reportMissingThemeSkins(ctx, theme, skins, missingDeclaredPaths);
			throwIfInputInvalid(ctx);
			if (files.length === 0) {
				logger.step('no .exml files found, skipping');
				return;
			}

			const skinsFile = await buildSkinsModule(ctx, skins);
			ctx.outputs.skinsScript = `js/${skinsFile}`;

			const relThemePath = project.config.exml.themeFile;
			const outTheme: ThemeData = { ...theme };
			delete outTheme.exmls;
			delete outTheme.autoGenerateExmlsList;
			outTheme.skins = {
				...componentSkinMappings(project),
				...remapSkins(project, theme.skins ?? {}, skins),
			};
			outTheme.skinsJs = toPosix(path.relative(path.dirname(relThemePath), `js/${skinsFile}`));

			await writeFile(path.join(project.outputDir, relThemePath), JSON.stringify(outTheme, null, '\t'));
			logger.step(`compiled ${skins.length} skin(s) → ${ctx.outputs.skinsScript}`);
		},
	};
}

/**
 * Determines which `.exml` files to compile (honours `autoGenerateExmlsList`).
 */
async function resolveExmlFiles(
	ctx: BuildContext,
	theme: ThemeData,
): Promise<{ files: ExmlFile[]; missingDeclaredPaths: ReadonlySet<string> }> {
	const { project } = ctx;
	const declared = (theme.exmls ?? []).map(e => (typeof e === 'string' ? e : e?.path)).filter(Boolean) as string[];

	if (theme.autoGenerateExmlsList === false && declared.length > 0) {
		const files: ExmlFile[] = [];
		const missingDeclaredPaths = new Set<string>();
		for (const rel of declared) {
			try {
				files.push(await readExmlAt(project.resourceDir, resolveExmlPath(project, rel)));
			} catch {
				missingDeclaredPaths.add(toResourceRelativePath(project, rel));
				reportDiagnostic(ctx, {
					code: DIAGNOSTIC_CODES.EXML_DECLARED_FILE_NOT_FOUND,
					severity: 'warning',
					message: `Theme-declared EXML file was not found: ${rel}`,
					location: { file: project.config.exml!.themeFile },
					suggestions: ['Correct the path or remove it from the theme exmls list.'],
				});
			}
		}
		const included = new Set(files.map(file => path.resolve(file.path)));
		for (const component of project.components) {
			if (included.has(path.resolve(component.skin))) continue;
			files.push(await readExmlAt(project.resourceDir, component.skin));
		}
		files.sort((a, b) => a.relPath.localeCompare(b.relPath));
		return { files, missingDeclaredPaths };
	}
	return { files: await collectExmlFiles(project.resourceDir), missingDeclaredPaths: new Set() };
}

/**
 * Recursively collects every `.exml` file under `resource/`, sorted by path.
 */
async function collectExmlFiles(resourceDir: string): Promise<ExmlFile[]> {
	const results: ExmlFile[] = [];

	async function walk(dir: string): Promise<void> {
		let entries: Dirent[];
		try {
			entries = await fs.readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				await walk(full);
			} else if (entry.name.endsWith('.exml')) {
				results.push(await readExmlAt(resourceDir, full));
			}
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
 * Reads and parses the configured theme file.
 */
async function loadTheme(ctx: BuildContext): Promise<ThemeData | undefined> {
	const { project } = ctx;
	let source: string;
	try {
		source = await fs.readFile(project.themeFile!, 'utf-8');
	} catch {
		reportDiagnostic(ctx, {
			code: DIAGNOSTIC_CODES.THEME_FILE_NOT_FOUND,
			severity: 'warning',
			message: `Theme file could not be read: ${project.config.exml!.themeFile}`,
			location: { file: project.config.exml!.themeFile },
			suggestions: ['Create the theme file or correct exml.themeFile in kurot.config.ts.'],
		});
		return undefined;
	}

	try {
		return JSON.parse(source) as ThemeData;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		reportDiagnostic(ctx, {
			code: DIAGNOSTIC_CODES.THEME_INVALID_JSON,
			severity: 'error',
			message: `Theme file is not valid JSON: ${message}`,
			location: { file: project.config.exml!.themeFile },
			suggestions: ['Correct the JSON syntax in the theme file.'],
		});
		return undefined;
	}
}

function reportMissingThemeSkins(
	ctx: BuildContext,
	theme: ThemeData,
	compiled: readonly CompiledSkin[],
	missingDeclaredPaths: ReadonlySet<string>,
): void {
	const { project } = ctx;
	const compiledPaths = new Set(compiled.map(skin => skin.file.relPath));
	for (const value of Object.values(theme.skins ?? {})) {
		if (!isSkinPath(value)) continue;
		const relPath = toResourceRelativePath(project, value);
		if (compiledPaths.has(relPath) || missingDeclaredPaths.has(relPath)) continue;
		reportDiagnostic(ctx, {
			code: DIAGNOSTIC_CODES.THEME_SKIN_NOT_FOUND,
			severity: 'warning',
			message: `Theme skin was not compiled: ${value}`,
			location: { file: project.config.exml!.themeFile },
			suggestions: ['Correct the skin path or add the EXML file to the compilation list.'],
		});
	}
}

function toResourceRelativePath(project: Project, value: string): string {
	return toPosix(path.relative(project.resourceDir, resolveExmlPath(project, value)));
}

function reportDiagnostic(ctx: BuildContext, diagnostic: Diagnostic): void {
	ctx.diagnostics.report(diagnostic);
	const location = diagnostic.location ? `${diagnostic.location.file}: ` : '';
	if (diagnostic.severity === 'error') {
		logger.error(`${location}${diagnostic.message}`);
	} else {
		logger.warn(`${location}${diagnostic.message}`);
	}
}

function throwIfInputInvalid(ctx: BuildContext): void {
	if (!ctx.diagnostics.hasErrors()) return;
	throw new BuildError('EXML input validation failed.');
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
		if (isSkinPath(value)) {
			const relPath = toPosix(path.relative(project.resourceDir, resolveExmlPath(project, value)));
			result[host] = byRelPath.get(relPath) ?? value;
		} else {
			result[host] = value;
		}
	}
	return result;
}

function componentSkinMappings(project: Project): Record<string, string> {
	return Object.fromEntries(project.components.map(component => [component.name, component.skinClass]));
}

function isSkinPath(value: string): boolean {
	return /\.exml$/i.test(value) || value.includes('/');
}

/**
 * Reads the `class="..."` attribute, falling back to the file name.
 */
function extractClassName(file: ExmlFile): string {
	const match = file.contents.match(/class="([^"]+)"/);
	return match ? match[1] : path.basename(file.path, '.exml');
}

/**
 * Converts a file system path to forward-slash form (a no-op on POSIX).
 */
function toPosix(p: string): string {
	return p.split(path.sep).join('/');
}
