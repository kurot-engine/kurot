import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ConfigError } from '../errors.js';
import { localName, parseXML } from '../exml/index.js';
import type { Dirent } from 'node:fs';
import type { ComponentConvention, ProjectComponent } from '../project.js';

/**
 * Discovers reusable component source/skin pairs using the configured
 * directory convention.
 */
export async function discoverComponents(
	root: string,
	convention: ComponentConvention | undefined,
): Promise<ProjectComponent[]> {
	if (!convention) return [];

	const [sourceFiles, skinFiles] = await Promise.all([
		collectFiles(convention.sourceDir, file => file.endsWith('.ts') && !file.endsWith('.d.ts')),
		collectFiles(convention.skinDir, file => file.endsWith('Skin.exml')),
	]);
	const sourceByPair = new Map(sourceFiles.map(file => [sourcePairKey(convention.sourceDir, file), file]));
	const skinByPair = new Map(skinFiles.map(file => [skinPairKey(convention.skinDir, file), file]));
	const pairKeys = [...new Set([...sourceByPair.keys(), ...skinByPair.keys()])].sort();
	const components: ProjectComponent[] = [];
	const errors: string[] = [];
	const names = new Map<string, string>();

	for (const pairKey of pairKeys) {
		const source = sourceByPair.get(pairKey);
		const skin = skinByPair.get(pairKey);
		if (!source) {
			if (skin) {
				errors.push(`Component skin '${relative(root, skin)}' has no matching source '${pairKey}.ts'.`);
			}
			continue;
		}
		if (!skin) {
			errors.push(`Component source '${relative(root, source)}' has no matching skin '${pairKey}Skin.exml'.`);
			continue;
		}

		const name = path.basename(source, '.ts');
		if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) {
			errors.push(`Component source '${relative(root, source)}' must use a valid TypeScript class name.`);
			continue;
		}
		const previous = names.get(name);
		if (previous) {
			errors.push(`Component name '${name}' is duplicated by '${previous}' and '${relative(root, source)}'.`);
			continue;
		}
		names.set(name, relative(root, source));

		const sourceText = await fs.readFile(source, 'utf-8');
		if (hasAbstractClassExport(sourceText, name)) {
			errors.push(`Component class '${name}' in '${relative(root, source)}' must not be abstract.`);
			continue;
		}
		if (!hasNamedClassExport(sourceText, name)) {
			errors.push(`Component source '${relative(root, source)}' must export a class named '${name}'.`);
			continue;
		}

		let skinClass: string;
		try {
			const skinRoot = parseXML(await fs.readFile(skin, 'utf-8'));
			if (localName(skinRoot.name) !== 'Skin') {
				errors.push(`Component skin '${relative(root, skin)}' must use an eui:Skin root.`);
				continue;
			}
			skinClass = skinRoot.attributes.find(attribute => attribute.name === 'class')?.value ?? '';
			if (!skinClass) {
				errors.push(`Component skin '${relative(root, skin)}' must declare a class attribute.`);
				continue;
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			errors.push(`Component skin '${relative(root, skin)}' is invalid EXML: ${message}`);
			continue;
		}

		components.push({
			name,
			tag: `${convention.prefix}:${name}`,
			namespace: convention.prefix,
			specifier: convention.specifier,
			source,
			sourceRelative: relative(root, source),
			skin,
			skinRelative: relative(root, skin),
			skinClass,
		});
	}

	if (errors.length > 0) {
		throw new ConfigError(`Invalid reusable components:\n${errors.map(error => `- ${error}`).join('\n')}`);
	}
	return components.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Re-scans a loaded project while preserving the components array identity
 * shared with its generated namespace entry.
 */
export async function refreshProjectComponents(project: {
	readonly root: string;
	readonly componentConvention?: ComponentConvention;
	readonly components: ProjectComponent[];
}): Promise<void> {
	const discovered = await discoverComponents(project.root, project.componentConvention);
	project.components.splice(0, project.components.length, ...discovered);
}

async function collectFiles(directory: string, include: (fileName: string) => boolean): Promise<string[]> {
	const results: string[] = [];
	async function walk(current: string): Promise<void> {
		let entries: Dirent[];
		try {
			entries = await fs.readdir(current, { withFileTypes: true });
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
			throw error;
		}
		for (const entry of entries) {
			const absolute = path.join(current, entry.name);
			if (entry.isDirectory()) {
				await walk(absolute);
			} else if (entry.isFile() && include(entry.name)) {
				results.push(absolute);
			}
		}
	}
	await walk(directory);
	return results.sort();
}

function sourcePairKey(sourceDir: string, file: string): string {
	return toPosix(path.relative(sourceDir, file).slice(0, -'.ts'.length));
}

function skinPairKey(skinDir: string, file: string): string {
	return toPosix(path.relative(skinDir, file).slice(0, -'Skin.exml'.length));
}

function hasNamedClassExport(source: string, name: string): boolean {
	source = stripComments(source);
	const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const direct = new RegExp(`\\bexport\\s+class\\s+${escaped}\\b`);
	if (direct.test(source)) return true;
	const declared = new RegExp(`\\bclass\\s+${escaped}\\b`).test(source);
	const exportList = new RegExp(`\\bexport\\s*\\{[^}]*\\b${escaped}\\b[^}]*\\}`, 's').test(source);
	return declared && exportList;
}

function hasAbstractClassExport(source: string, name: string): boolean {
	const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`\\b(?:export\\s+)?abstract\\s+class\\s+${escaped}\\b`).test(stripComments(source));
}

function stripComments(source: string): string {
	let result = '';
	let quote = '';
	for (let index = 0; index < source.length; index++) {
		const current = source[index];
		const next = source[index + 1];
		if (quote) {
			result += current;
			if (current === '\\') {
				result += next ?? '';
				index++;
			} else if (current === quote) {
				quote = '';
			}
			continue;
		}
		if (current === '"' || current === "'" || current === '`') {
			quote = current;
			result += current;
			continue;
		}
		if (current === '/' && next === '/') {
			while (index < source.length && source[index] !== '\n') {
				index++;
			}
			result += '\n';
			continue;
		}
		if (current === '/' && next === '*') {
			index += 2;
			while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
				index++;
			}
			index++;
			result += ' ';
			continue;
		}
		result += current;
	}
	return result;
}

function relative(root: string, absolute: string): string {
	return toPosix(path.relative(root, absolute));
}

function toPosix(value: string): string {
	return value.split(path.sep).join('/');
}
