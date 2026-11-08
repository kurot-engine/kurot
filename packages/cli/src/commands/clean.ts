import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import { resolveOutputPath } from '../core/output-path.js';
import { loadConfig } from '../core/config.js';
import { OUTPUT_DIRS } from '../core/project.js';
import { logger } from '../utils/logger.js';

/**
 * Commander definition for removing development and release outputs.
 */
export const cleanCommand = new Command('clean').description('Remove build output directories').action(async () => {
	const config = await loadConfig();
	const names = [...new Set([config.output.dir, OUTPUT_DIRS.release])];

	const outputs = await Promise.all(names.map(name => resolveOutputPath(process.cwd(), name, config)));
	for (const output of outputs) {
		await fs.rm(output, { recursive: true, force: true });
	}

	logger.success(`Cleaned ${names.map(n => n + '/').join(', ')}`);
});
