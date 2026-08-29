import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { BuildError } from '../errors.js';
import { writeFile } from '../../utils/fs.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';
import type { Project } from '../project.js';

const PLACEHOLDERS = {
	importMap: '{{KUROT_IMPORT_MAP}}',
	stageWidth: '{{KUROT_STAGE_WIDTH}}',
	stageHeight: '{{KUROT_STAGE_HEIGHT}}',
	scaleMode: '{{KUROT_SCALE_MODE}}',
	orientation: '{{KUROT_ORIENTATION}}',
	frameRate: '{{KUROT_FRAME_RATE}}',
	entryScript: '{{KUROT_ENTRY_SCRIPT}}',
} as const;

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
	<title>Kurot Game</title>
	<style>
		html, body {
			margin: 0;
			padding: 0;
			width: 100%;
			height: 100%;
			background: #000000;
			overflow: hidden;
		}

		body {
			display: flex;
			align-items: center;
			justify-content: center;
		}

		canvas {
			display: block;
		}
	</style>
	{{KUROT_IMPORT_MAP}}
</head>
<body>
	<canvas id="gameCanvas"
		data-content-width="{{KUROT_STAGE_WIDTH}}"
		data-content-height="{{KUROT_STAGE_HEIGHT}}"
		data-scale-mode="{{KUROT_SCALE_MODE}}"
		data-orientation="{{KUROT_ORIENTATION}}"
		data-frame-rate="{{KUROT_FRAME_RATE}}"></canvas>
	<script type="module" src="{{KUROT_ENTRY_SCRIPT}}"></script>
</body>
</html>
`;

/**
 * Writes `index.html`.
 *
 * Engine packages are wired up through an ES module import map
 * (`@kurot/core` → `./js/kurot.core.js`), so the bundled app and engine
 * chunks resolve bare specifiers in the browser. The entry script bootstraps
 * the engine via the user's own `createPlayer()` call.
 */
export function generateHtml(): BuildPlugin {
	return {
		name: 'generate index.html',
		async apply(ctx: BuildContext): Promise<void> {
			const entryScript = ctx.outputs.entryScript ?? 'main.js';
			const template = await loadTemplate(ctx.project);
			const html = renderHtml(template, ctx.project, entryScript, ctx.outputs.engine);
			await writeFile(path.join(ctx.project.outputDir, 'index.html'), html);
			await copyTemplateAssets(ctx.project);
		},
	};
}

/**
 * Copies files placed beside the project HTML template into the web output.
 *
 * This keeps page-shell assets such as a startup logo separate from game
 * resources. The template itself is skipped because the rendered HTML has
 * already been written to the output directory.
 */
async function copyTemplateAssets(project: Project): Promise<void> {
	if (!project.htmlTemplate) return;

	const templateDirectory = path.dirname(project.htmlTemplate);
	const templateFileName = path.basename(project.htmlTemplate);
	const entries = await fs.readdir(templateDirectory, { withFileTypes: true });

	for (const entry of entries) {
		if (entry.name === templateFileName) continue;

		const source = path.join(templateDirectory, entry.name);
		const destination = path.join(project.outputDir, entry.name);
		await fs.cp(source, destination, { recursive: true });
	}
}

/**
 * Loads the project-owned template or falls back to the built-in page.
 */
async function loadTemplate(project: Project): Promise<string> {
	if (!project.htmlTemplate) return DEFAULT_TEMPLATE;
	return fs.readFile(project.htmlTemplate, 'utf-8');
}

/**
 * Replaces every required Kurot placeholder in the page template.
 */
export function renderHtml(
	template: string,
	project: Project,
	entryScript: string,
	engine: Record<string, string>,
): string {
	const missing = Object.values(PLACEHOLDERS).filter(placeholder => !template.includes(placeholder));
	if (missing.length > 0) {
		const source = project.htmlTemplate ?? 'the built-in HTML template';
		throw new BuildError(`HTML template '${source}' is missing required placeholders: ${missing.join(', ')}`);
	}

	const { stage } = project.config;
	const replacements = new Map<string, string>([
		[PLACEHOLDERS.importMap, Object.keys(engine).length > 0 ? renderImportMap(engine) : ''],
		[PLACEHOLDERS.stageWidth, String(stage.width)],
		[PLACEHOLDERS.stageHeight, String(stage.height)],
		[PLACEHOLDERS.scaleMode, stage.scaleMode],
		[PLACEHOLDERS.orientation, stage.orientation],
		[PLACEHOLDERS.frameRate, String(stage.frameRate)],
		[PLACEHOLDERS.entryScript, entryScript],
	]);

	let html = template;
	for (const [placeholder, value] of replacements) {
		html = html.replaceAll(placeholder, value);
	}
	return html;
}

/**
 * Renders the `<script type="importmap">` tag mapping engine package
 * specifiers to their bundled chunk paths.
 */
function renderImportMap(engine: Record<string, string>): string {
	const imports = Object.entries(engine)
		.map(([pkg, file]) => `\t\t\t"${pkg}": "./${file}"`)
		.join(',\n');
	return `<script type="importmap">\n\t{\n\t\t"imports": {\n${imports}\n\t\t}\n\t}\n\t</script>\n`;
}
