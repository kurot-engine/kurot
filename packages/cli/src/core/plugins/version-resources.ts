import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { BuildError } from '../errors.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';
import { versionCssResources } from './resource-version-css.js';
import { versionHtmlResources } from './resource-version-html.js';
import type { ResourceUrlVersioner } from './resource-version-css.js';

/**
 * Stamp resource requests with the release build number. Generated JavaScript
 * keeps its content-hashed names and original paths; no document base is changed.
 */
export function versionResources(): BuildPlugin {
	return {
		name: 'version release resources',
		async apply(ctx: BuildContext): Promise<void> {
			if (ctx.project.mode !== 'release' || !ctx.project.config.output.versionedAssets) {
				return;
			}
			const files = await listFiles(ctx.project.outputDir);
			const version = path.basename(ctx.project.outputDir);
			const versionUrl = createVersioner(new Set(files), version);
			const updates: Array<{ file: string; contents: string }> = [];
			for (const file of files) {
				if (!/\.(?:html|css)$/i.test(file)) {
					continue;
				}
				const source = await fs.readFile(path.join(ctx.project.outputDir, file), 'utf8');
				const contents = /\.html$/i.test(file)
					? versionHtmlResources(source, file, version, versionUrl)
					: versionCssResources(source, file, versionUrl);
				updates.push({ file, contents });
			}
			// Validate every page before replacing any generated HTML/CSS.
			for (const update of updates) {
				await fs.writeFile(path.join(ctx.project.outputDir, update.file), update.contents);
			}
		},
	};
}

function createVersioner(files: ReadonlySet<string>, version: string): ResourceUrlVersioner {
	return (source, baseFile) => {
		if (!source || source.startsWith('#')) {
			return source;
		}
		let target: URL;
		try {
			target = new URL(source, `https://kurot.invalid/${baseFile}`);
		} catch {
			return source;
		}
		if (target.origin !== 'https://kurot.invalid') {
			return source;
		}
		let file: string;
		try {
			file = decodeURIComponent(target.pathname).slice(1);
		} catch {
			return source;
		}
		if (!files.has(file) || file.startsWith('js/') || /\.html?$/i.test(file)) {
			return source;
		}
		const hash = source.indexOf('#');
		const fragment = hash < 0 ? '' : source.slice(hash);
		const reference = hash < 0 ? source : source.slice(0, hash);
		const query = reference.indexOf('?');
		const pathname = query < 0 ? reference : reference.slice(0, query);
		const parameters = new URLSearchParams(query < 0 ? '' : reference.slice(query + 1));
		parameters.set('v', version);
		return `${pathname}?${parameters}${fragment}`;
	};
}

async function listFiles(root: string, directory = ''): Promise<string[]> {
	const files: string[] = [];
	for (const entry of await fs.readdir(path.join(root, directory), { withFileTypes: true })) {
		const relative = path.posix.join(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...await listFiles(root, relative));
		} else if (entry.isFile()) {
			files.push(relative);
		} else {
			throw new BuildError(`Versioned resources require regular output files: ${relative}`);
		}
	}
	return files;
}
