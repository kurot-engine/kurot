import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { loadConfig } from '../core/config.js';
import { OUTPUT_DIRS } from '../core/project.js';
import { logger } from '../utils/logger.js';

export const cleanCommand = new Command('clean').description('Remove build output directories').action(async () => {
	const config = await loadConfig();
	const names = [...new Set([config.output.dir, OUTPUT_DIRS.release])];

	for (const name of names) {
		await fs.rm(path.resolve(name), { recursive: true, force: true });
	}
	logger.success(`Cleaned ${names.map(n => n + '/').join(', ')}`);
});
