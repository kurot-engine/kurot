import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Dirent } from 'node:fs';
import { KUI_THEME_OUTPUT_PATH } from './project.js';
import type { Project } from './project.js';

/**
 * Tracks source-owned assets only; generated themes and compiler outputs are never removed.
 * All changed bytes are staged before publication. Individual renames are atomic,
 * but a group of files is not an atomic transaction for concurrent HTTP readers.
 */
export async function createResourceAssetSync(project: Project): Promise<() => Promise<void>> {
	const destination = path.join(project.outputDir, 'resource');

	/**
	 * Excludes authored KUI and generated themes from runtime asset ownership.
	 */
	const accepts = (name: string): boolean => !project.config.ui ||
		(name !== path.basename(KUI_THEME_OUTPUT_PATH) && !name.endsWith('.kui.xml'));

	let previous = new Map<string, string>();

	for (const file of await collectFiles(project.resourceDir, accepts)) {
		previous.set(file, fingerprint(await fs.readFile(path.join(project.resourceDir, file))));
	}

	return async (): Promise<void> => {
		// Retry a bounded number of times when an editor renames files during a scan.
		for (let attempt = 0; ; attempt++) {
			try {
				await synchronize();
				return;
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || attempt >= 2) throw error;
				await new Promise<void>(resolve => setTimeout(resolve, 50));
			}
		}
	};

	/**
	 * Stages changed assets and reconciles removed source-owned files.
	 */
	async function synchronize(): Promise<void> {
		const staging = await fs.mkdtemp(path.join(project.outputDir, '.kurot-assets-'));
		const next = new Map<string, string>();
		const changed: string[] = [];

		try {
			for (const file of await collectFiles(project.resourceDir, accepts)) {
				const bytes = await fs.readFile(path.join(project.resourceDir, file));
				const hash = fingerprint(bytes);

				next.set(file, hash);

				if (previous.get(file) === hash) continue;

				const stagedFile = path.join(staging, file);

				await fs.mkdir(path.dirname(stagedFile), { recursive: true });
				await fs.writeFile(stagedFile, bytes);
				changed.push(file);
			}

			const removed = [...previous.keys()].filter(file => !next.has(file));

			// Remove source-owned obsolete files first to allow file/directory replacements.
			for (const file of removed) {
				await fs.rm(path.join(destination, file), { force: true });
				await removeEmptyParents(path.dirname(path.join(destination, file)), destination);
			}

			for (const file of changed) {
				const target = path.join(destination, file);

				await fs.mkdir(path.dirname(target), { recursive: true });
				await fs.rename(path.join(staging, file), target);
			}

			previous = next;
		} finally {
			await fs.rm(staging, { recursive: true, force: true });
		}
	}
}

/**
 * Collects accepted runtime files in stable relative-path order.
 */
async function collectFiles(directory: string, accepts: (name: string) => boolean, relative = ''): Promise<string[]> {
	let entries: Dirent[];

	try {
		entries = await fs.readdir(path.join(directory, relative), { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT' && relative === '') return [];
		throw error;
	}

	const files: string[] = [];

	for (const entry of entries) {
		const file = path.join(relative, entry.name);
		if (entry.isDirectory()) {
			files.push(...await collectFiles(directory, accepts, file));
		} else if (accepts(entry.name)) {
			files.push(file);
		}
	}

	return files.sort();
}

/**
 * Removes empty output parents without deleting the resource root.
 */
async function removeEmptyParents(directory: string, root: string): Promise<void> {
	while (directory !== root) {
		try {
			await fs.rmdir(directory);
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			if (code === 'ENOTEMPTY' || code === 'EEXIST') return;
			if (code !== 'ENOENT') throw error;
		}
		directory = path.dirname(directory);
	}
}

/**
 * Hashes asset contents to avoid rewriting unchanged output files.
 */
function fingerprint(bytes: Uint8Array): string {
	return createHash('sha256').update(bytes).digest('hex');
}
