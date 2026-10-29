import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { defaultTreeAdapter, parse } from 'parse5';
import { BuildError } from '../errors.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';

/**
 * Gives every relative release URL one content-addressed base, including
 * secondary analyzer requests, fonts and assets owned by the HTML template.
 */
export function versionAssets(): BuildPlugin {
	return {
		name: 'version release assets',
		async apply(ctx: BuildContext): Promise<void> {
			if (ctx.project.mode !== 'release' || !ctx.project.config.output.versionedAssets) {
				return;
			}

			const outputDir = ctx.project.outputDir;
			const htmlPath = path.join(outputDir, 'index.html');
			const html = await fs.readFile(htmlPath, 'utf8');
			const headEnd = validateHtml(html);
			const version = await hashDirectory(outputDir);
			const prefix = `assets/${version}/`;
			const entries = await fs.readdir(outputDir);
			const staging = await fs.mkdtemp(path.join(outputDir, '.version-assets-'));
			try {
				for (const entry of entries) {
					if (entry === 'index.html' || entry === 'manifest.json') {
						continue;
					}
					await fs.rename(path.join(outputDir, entry), path.join(staging, entry));
				}
				await fs.mkdir(path.join(outputDir, 'assets'));
				await fs.rename(staging, path.join(outputDir, prefix));
			} finally {
				await fs.rm(staging, { recursive: true, force: true });
			}

			prefixOutputs(ctx, prefix);
			const manifest = {
				initial: Object.values(ctx.outputs.engine),
				game: [ctx.outputs.skinsScript, ctx.outputs.entryScript].filter(Boolean),
			};
			await fs.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, undefined, '\t') + '\n');
			await fs.writeFile(
				htmlPath,
				`${html.slice(0, headEnd)}\n\t<base href="./${prefix}">${html.slice(headEnd)}`,
			);
		},
	};
}

function validateHtml(html: string): number {
	const document = parse(html, { sourceCodeLocationInfo: true });
	const root = document.childNodes.find(defaultTreeAdapter.isElementNode);
	const head = root?.childNodes.filter(defaultTreeAdapter.isElementNode).find(node => node.tagName === 'head');
	// HTML parsing can imply a head; insertion requires its authored start tag.
	const headEnd = head?.sourceCodeLocation?.startTag?.endOffset;
	if (headEnd === undefined) {
		throw new BuildError('output.versionedAssets requires an HTML template with a <head> element.');
	}

	const elements = root ? [root] : [];
	while (elements.length > 0) {
		const element = elements.pop()!;
		if (element.tagName === 'base') {
			throw new BuildError("output.versionedAssets owns the HTML base URL; remove the template's <base> element.");
		}
		elements.push(...element.childNodes.filter(defaultTreeAdapter.isElementNode));
	}
	return headEnd;
}

async function hashDirectory(root: string): Promise<string> {
	const hash = createHash('sha256');
	const files = await listFiles(root);
	for (const relative of files.sort()) {
		const file = path.join(root, relative);
		const stat = await fs.stat(file);
		hash.update(JSON.stringify([relative, stat.size]) + '\n');
		for await (const chunk of createReadStream(file)) {
			hash.update(chunk);
		}
	}
	return hash.digest('hex').slice(0, 32);
}

async function listFiles(root: string, directory = ''): Promise<string[]> {
	const files: string[] = [];
	for (const entry of await fs.readdir(path.join(root, directory), { withFileTypes: true })) {
		const relative = path.posix.join(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await listFiles(root, relative)));
		} else if (entry.isFile()) {
			files.push(relative);
		} else {
			throw new BuildError(`Versioned assets require regular files or directories: ${relative}`);
		}
	}
	return files;
}

function prefixOutputs(ctx: BuildContext, prefix: string): void {
	if (ctx.outputs.entryScript) {
		ctx.outputs.entryScript = prefix + ctx.outputs.entryScript;
	}
	if (ctx.outputs.skinsScript) {
		ctx.outputs.skinsScript = prefix + ctx.outputs.skinsScript;
	}
	for (const specifier of Object.keys(ctx.outputs.engine)) {
		ctx.outputs.engine[specifier] = prefix + ctx.outputs.engine[specifier];
	}
}
