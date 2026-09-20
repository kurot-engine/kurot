import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parseUIDocument } from '@kurot/ui-document';
import { writeFile } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';
import { DIAGNOSTIC_CODES } from '../diagnostics/index.js';
import { buildSkinsModule } from '../kui/skin-module-builder.js';
import { generateSkinPartsDeclaration, SKIN_PARTS_DECLARATION_PATH } from '../kui/skin-parts-declaration.js';
import { BuildError } from '../errors.js';
import { KUI_THEME_OUTPUT_PATH } from '../project.js';
import type { UIDocument } from '@kurot/ui-document';
import type { Dirent } from 'node:fs';
import type { Diagnostic } from '../diagnostics/index.js';
import type { CompiledSkin, KUIFile } from '../kui/skin-module-builder.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';

interface ParsedSkin {
	readonly document: UIDocument;
	readonly skin: CompiledSkin;
}

interface GeneratedTheme {
	readonly skins: Readonly<Record<string, string>>;
	readonly skinsJs: string;
}

/**
 * Compiles canonical KUI Skin documents and generates the runtime theme map.
 */
export function compileKUI(): BuildPlugin {
	return {
		name: 'compile KUI',
		async apply(ctx: BuildContext): Promise<void> {
			const { project } = ctx;
			if (!project.config.ui || !project.uiSourceDir) return;

			ctx.diagnostics.removeByCodes([
				DIAGNOSTIC_CODES.KUI_UNKNOWN_TAG,
				DIAGNOSTIC_CODES.KUI_COMPILE_FAILED,
				DIAGNOSTIC_CODES.KUI_DUPLICATE_DEFAULT,
			]);

			const files = await collectKUIFiles(project.uiSourceDir, project.resourceDir);
			const parsed = parseSkins(ctx, files);
			throwIfInputInvalid(ctx);
			if (parsed.length === 0) {
				await fs.rm(path.join(project.root, SKIN_PARTS_DECLARATION_PATH), { force: true });
				delete ctx.outputs.skinPartsDeclaration;
				logger.step('no KUI Skin files found, skipping');
				return;
			}

			const mappings = createDefaultMappings(ctx, parsed);
			throwIfInputInvalid(ctx);
			const built = await buildSkinsModule(ctx, parsed.map(item => item.skin));
			ctx.outputs.skinsScript = `js/${built.filename}`;
			ctx.outputs.skinPartsDeclaration = SKIN_PARTS_DECLARATION_PATH;
			await writeFile(
				path.join(project.root, SKIN_PARTS_DECLARATION_PATH),
				await generateSkinPartsDeclaration(project, built.skins),
			);

			const relativeScript = toPosix(path.relative(
				path.dirname(KUI_THEME_OUTPUT_PATH),
				`js/${built.filename}`,
			));
			const theme: GeneratedTheme = { skins: mappings, skinsJs: relativeScript };
			await writeFile(
				path.join(project.outputDir, KUI_THEME_OUTPUT_PATH),
				JSON.stringify(theme, undefined, '\t'),
			);
			logger.step(`compiled ${parsed.length} KUI skin(s) → ${ctx.outputs.skinsScript}`);
		},
	};
}

function parseSkins(ctx: BuildContext, files: readonly KUIFile[]): ParsedSkin[] {
	const parsed: ParsedSkin[] = [];
	for (const file of files) {
		try {
			const document = parseUIDocument(file.contents);
			if (document.assetKind !== 'appearance') continue;
			parsed.push({
				document,
				skin: { file, className: document.id },
			});
		} catch (error) {
			reportDiagnostic(ctx, {
				code: DIAGNOSTIC_CODES.KUI_COMPILE_FAILED,
				severity: 'error',
				message: `KUI parse failed: ${error instanceof Error ? error.message : String(error)}`,
				location: { file: file.relPath },
			});
		}
	}
	return parsed;
}

function createDefaultMappings(ctx: BuildContext, skins: readonly ParsedSkin[]): Record<string, string> {
	const result: Record<string, string> = {};
	const sources = new Map<string, string>();
	for (const item of skins) {
		if (item.document.contract.isDefault !== true) continue;
		const target = item.document.contract.targetType;
		if (!target) continue;
		const key = target.split('.').pop() ?? target;
		const previous = sources.get(key);
		if (previous) {
			reportDiagnostic(ctx, {
				code: DIAGNOSTIC_CODES.KUI_DUPLICATE_DEFAULT,
				severity: 'error',
				message: `Default KUI skins for "${target}" are duplicated by ${previous} and ${item.skin.file.relPath}.`,
				location: { file: item.skin.file.relPath },
			});
			continue;
		}
		sources.set(key, item.skin.file.relPath);
		result[key] = item.skin.className;
	}
	return result;
}

async function collectKUIFiles(sourceDir: string, resourceDir: string): Promise<KUIFile[]> {
	const results: KUIFile[] = [];
	async function walk(directory: string): Promise<void> {
		let entries: Dirent[];
		try {
			entries = await fs.readdir(directory, { withFileTypes: true });
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
			throw error;
		}
		for (const entry of entries) {
			const absolute = path.join(directory, entry.name);
			if (entry.isDirectory()) {
				await walk(absolute);
			} else if (entry.isFile() && entry.name.endsWith('.kui.xml')) {
				results.push({
					path: absolute,
					relPath: toPosix(path.relative(resourceDir, absolute)),
					contents: await fs.readFile(absolute, 'utf8'),
				});
			}
		}
	}
	await walk(sourceDir);
	return results.sort((left, right) => left.relPath.localeCompare(right.relPath));
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
	throw new BuildError('KUI input validation failed.');
}

function toPosix(value: string): string {
	return value.split(path.sep).join('/');
}
