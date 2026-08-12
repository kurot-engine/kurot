import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export async function ensureDir(dir: string): Promise<void> {
	await fs.mkdir(dir, { recursive: true });
}

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

export async function writeFile(filePath: string, content: string): Promise<void> {
	await ensureDir(path.dirname(filePath));
	await fs.writeFile(filePath, content, 'utf-8');
}

export async function exists(filePath: string): Promise<boolean> {
	return fs
		.access(filePath)
		.then(() => true)
		.catch(() => false);
}
