import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Creates a directory and any missing parent directories.
 */
export async function ensureDir(dir: string): Promise<void> {
	await fs.mkdir(dir, { recursive: true });
}

/**
 * Recursively copies a directory.
 *
 * The optional filter receives each file's base name; directories are always
 * traversed so matching descendants remain discoverable.
 */
export async function copyDir(src: string, dest: string, filter?: (name: string) => boolean): Promise<void> {
	await ensureDir(dest);
	const entries = await fs.readdir(src, { withFileTypes: true });
	for (const entry of entries) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);
		if (entry.isDirectory()) {
			await copyDir(srcPath, destPath, filter);
		} else if (!filter || filter(entry.name)) {
			await fs.copyFile(srcPath, destPath);
		}
	}
}

/**
 * Writes a UTF-8 file after creating its parent directory.
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
	await ensureDir(path.dirname(filePath));
	await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Tests whether a filesystem path is accessible without propagating access errors.
 */
export async function exists(filePath: string): Promise<boolean> {
	return fs
		.access(filePath)
		.then(() => true)
		.catch(() => false);
}
