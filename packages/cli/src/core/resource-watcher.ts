import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Watches only the resource subtree. A shallow parent watcher reconnects when
 * the root is created or replaced without recursively watching node_modules.
 */
export function watchResourceDirectory(directory: string, onChange: (file: string | undefined) => void): () => void {
	let watcher: fs.FSWatcher | undefined;
	let identity: string | undefined;

	/**
	 * Reattaches the recursive watcher when the resource root identity changes.
	 */
	const reconnect = (): boolean => {
		let next: string | undefined;

		try {
			const stat = fs.statSync(directory);
			if (stat.isDirectory()) {
				next = `${stat.dev}:${stat.ino}`;
			}
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
		}

		if (next === identity) return false;

		watcher?.close();
		watcher = undefined;
		identity = next;

		if (next !== undefined) {
			watcher = fs.watch(directory, { recursive: true }, (_event, filename) => onChange(filename ?? undefined));
		}

		return true;
	};

	const parent = fs.watch(path.dirname(directory), (_event, filename) => {
		if (filename && filename !== path.basename(directory)) return;
		if (reconnect()) {
			onChange(undefined);
		}
	});

	try {
		reconnect();
	} catch (error) {
		parent.close();
		throw error;
	}

	return (): void => {
		parent.close();
		watcher?.close();
	};
}
