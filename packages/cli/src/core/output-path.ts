import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ProjectConfig } from './config.js';
import { ConfigError } from './errors.js';

function contains(parent: string, target: string): boolean {
	const relative = path.relative(parent, target);
	return !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep);
}

/**
 * Build and clean both remove entire output trees. Check all existing path
 * components, including symlinks above an output directory that does not yet exist.
 */
export async function resolveOutputPath(root: string, name: string, config: ProjectConfig): Promise<string> {
	if (typeof name !== 'string' || !name.trim() || path.isAbsolute(name)) {
		throw new ConfigError('Expected an output directory relative to the project root.');
	}
	const target = path.resolve(root, name);
	if (target === root || !contains(root, target)) {
		throw new ConfigError(`Output must be strictly inside the project: ${name}`);
	}
	const inputs = [
		'src', 'resource', 'template', 'node_modules', '.git', '.kurot', 'kurot.config.ts', 'kurot.config.js',
		'package.json', 'pnpm-lock.yaml', config.entry, config.html?.template, config.ui?.sourceDir,
		...Object.values(config.ui?.namespaces ?? {}),
	];
	for (const input of inputs) {
		if (input === undefined) {
			continue;
		}
		const source = path.resolve(root, input);
		if (contains(target, source) || contains(source, target)) {
			throw new ConfigError(`Output directory overlaps project input "${input}": ${name}`);
		}
	}
	let current = root;
	for (const part of path.relative(root, target).split(path.sep)) {
		current = path.join(current, part);
		let stat;
		try {
			stat = await fs.lstat(current);
		} catch (error) {
			if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
				break;
			}
			throw error;
		}
		if (!stat.isDirectory() || stat.isSymbolicLink()) {
			throw new ConfigError(`Output path must contain only real directories: ${current}`);
		}
	}
	return target;
}
