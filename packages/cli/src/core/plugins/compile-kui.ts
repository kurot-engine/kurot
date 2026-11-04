import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parseUIDocument } from '@kurot/ui-document';
import { writeFile } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';
import { DIAGNOSTIC_CODES } from '../diagnostics/index.js';
import { buildSkinsModule } from '../kui/skin-module-builder.js';
import { SKIN_PARTS_DECLARATION_PATH } from '../kui/skin-parts-declaration.js';
import { builtinSkinHost } from '../kui/builtin-skin-hosts.js';
import { validatePartDeclarations } from '../kui/skin-part-validation.js';
import { BuildError } from '../errors.js';
import { KUI_THEME_OUTPUT_PATH } from '../project.js';
import type { Dirent } from 'node:fs';
import type { Diagnostic } from '../diagnostics/index.js';
import type { CompiledSkin, KUIFile } from '../kui/skin-module-builder.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';
import type { ProjectComponent } from '../project.js';

interface ParsedSkin {
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

		/**
		 * Compiles authored KUI and writes the generated theme and part declarations.
		 */
		async apply(ctx: BuildContext): Promise<void> {
			const { project } = ctx;

			if (!project.config.ui || !project.uiSourceDir) return;

			ctx.diagnostics.removeByCodes([
				DIAGNOSTIC_CODES.KUI_UNKNOWN_TAG,
				DIAGNOSTIC_CODES.KUI_COMPILE_FAILED,
				DIAGNOSTIC_CODES.KUI_DUPLICATE_DEFAULT,
				DIAGNOSTIC_CODES.KUI_PART_BINDING_INVALID,
			]);

			const files = await collectKUIFiles(project.uiSourceDir, project.resourceDir);
			const parsed = parseSkins(ctx, files);

			throwIfInputInvalid(ctx);

			if (parsed.length === 0) {
				await fs.rm(path.join(project.root, SKIN_PARTS_DECLARATION_PATH), { force: true });
				delete ctx.outputs.skinPartsDeclaration;
				delete ctx.outputs.validateSkinParts;
				logger.step('no KUI Skin files found, skipping');
				return;
			}

			const mappings = createDefaultMappings(ctx, parsed, project.components);

			throwIfInputInvalid(ctx);

			let declaration = '';
			const skinFiles = new Map(parsed.map(item => [item.skin.className, item.skin.file.relPath]));
			const built = await buildSkinsModule(ctx, parsed.map(item => item.skin), async skins => {
				const result = await validatePartDeclarations(project, skins, skinFiles);
				declaration = result.declaration;
				for (const diagnostic of result.diagnostics) {
					reportDiagnostic(ctx, diagnostic);
				}
				throwIfInputInvalid(ctx);
			});

			ctx.outputs.skinsScript = `js/${built.filename}`;
			ctx.outputs.skinPartsDeclaration = SKIN_PARTS_DECLARATION_PATH;
			await writeFile(
				path.join(project.root, SKIN_PARTS_DECLARATION_PATH),
				declaration,
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
			let pending: Promise<{ declaration: string; diagnostics: readonly Diagnostic[] }> | undefined;
			const revalidate = (): Promise<{ declaration: string; diagnostics: readonly Diagnostic[] }> => {
				pending ??= (async () => {
					const result = await validatePartDeclarations(project, built.skins, skinFiles);
					if (ctx.outputs.validateSkinParts !== revalidate) {
						return ctx.outputs.validateSkinParts?.() ?? { declaration: '', diagnostics: [] };
					}
					ctx.diagnostics.removeByCodes([DIAGNOSTIC_CODES.KUI_PART_BINDING_INVALID]);
					for (const diagnostic of result.diagnostics) {
						ctx.diagnostics.report(diagnostic);
					}
					return result;
				})().finally(() => { pending = undefined; });
				return pending;
			};
			ctx.outputs.validateSkinParts = revalidate;
			logger.step(`compiled ${parsed.length} KUI skin(s) → ${ctx.outputs.skinsScript}`);
		},
	};
}

/**
 * Reads Skin identities and reports invalid or duplicate declarations.
 */
function parseSkins(ctx: BuildContext, files: readonly KUIFile[]): ParsedSkin[] {
	const parsed: ParsedSkin[] = [];

	for (const file of files) {
		try {
			const document = parseUIDocument(file.contents);
			parsed.push({
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

/**
 * Builds conventional component-to-Skin mappings and reports conflicts.
 */
function createDefaultMappings(
	ctx: BuildContext,
	skins: readonly ParsedSkin[],
	components: readonly ProjectComponent[],
): Record<string, string> {
	const result: Record<string, string> = {};
	const sources = new Map<string, string>();

	for (const item of skins) {
		const key = defaultComponentName(item.skin.className, components);
		if (!key) {
			continue;
		}
		const previous = sources.get(key);
		if (previous) {
			reportDiagnostic(ctx, {
				code: DIAGNOSTIC_CODES.KUI_DUPLICATE_DEFAULT,
				severity: 'error',
				message: `Default KUI skins for "${key}" are duplicated by ${previous} and ${item.skin.file.relPath}.`,
				location: { file: item.skin.file.relPath },
			});
			continue;
		}
		sources.set(key, item.skin.file.relPath);
		result[key] = item.skin.className;
	}

	return result;
}

/**
 * Resolves a Skin name to a reusable or built-in component.
 */
function defaultComponentName(
	skinClass: string,
	components: readonly ProjectComponent[],
): string | undefined {
	const projectComponent = components.find(component => component.skinClass === skinClass);

	if (projectComponent) {
		return projectComponent.name;
	}

	return builtinSkinHost(skinClass);
}

/**
 * Collects authored KUI files in stable resource-path order.
 */
async function collectKUIFiles(sourceDir: string, resourceDir: string): Promise<KUIFile[]> {
	const results: KUIFile[] = [];

	/**
	 * Traverses KUI source directories while allowing missing roots.
	 */
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

/**
 * Collects a KUI diagnostic and logs it at the corresponding severity.
 */
function reportDiagnostic(ctx: BuildContext, diagnostic: Diagnostic): void {
	ctx.diagnostics.report(diagnostic);

	const location = diagnostic.location ? `${diagnostic.location.file}: ` : '';

	if (diagnostic.severity === 'error') {
		logger.error(`${location}${diagnostic.message}`);
	} else {
		logger.warn(`${location}${diagnostic.message}`);
	}
}

/**
 * Stops compilation when collected input diagnostics contain errors.
 */
function throwIfInputInvalid(ctx: BuildContext): void {
	if (!ctx.diagnostics.hasErrors()) return;
	throw new BuildError('KUI input validation failed.');
}

/**
 * Normalizes resource paths for portable diagnostics and output.
 */
function toPosix(value: string): string {
	return value.split(path.sep).join('/');
}
