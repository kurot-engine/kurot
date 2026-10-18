import { mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import type { Files } from './render.js';

export async function listFiles(directory: string, prefix = ''): Promise<string[]> {
	const result: string[] = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const name = path.posix.join(prefix, entry.name);
		if (entry.isDirectory()) { result.push(...await listFiles(path.join(directory, entry.name), name)); }
		else if (entry.isFile()) { result.push(name); }
	}
	return result.sort();
}

export async function writeOrCheck(directory: string, files: Files, check: boolean): Promise<void> {
	if (!check) {
		await rm(directory, { recursive: true, force: true });
		for (const [name, text] of files) {
			const destination = path.join(directory, name);
			await mkdir(path.dirname(destination), { recursive: true });
			await writeFile(destination, text);
		}
		return;
	}
	const actual = await listFiles(directory);
	if (JSON.stringify(actual) !== JSON.stringify([...files.keys()].sort())) throw new Error(`Generated file set differs: ${directory}. Run generate.`);
	for (const [name, text] of files) {
		if (await readFile(path.join(directory, name), 'utf8') !== text) throw new Error(`Stale API document: ${path.join(directory, name)}. Run generate.`);
	}
}

export function checkLinks(files: Map<string, string>): void {
	for (const [file, text] of files) {
		if (!file.endsWith('.md')) continue;
		for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
			const href = match[1];
			if (/^(?:https?:|mailto:|#)/.test(href)) continue;
			const destination = path.posix.normalize(path.posix.join(path.posix.dirname(file), href.split('#')[0]));
			if (destination.includes('/docs/api/') && !files.has(destination)) throw new Error(`Broken API link: ${file} -> ${href}`);
		}
	}
}
