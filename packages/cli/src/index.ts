#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Command } from 'commander';

import { buildCommand } from './commands/build.js';
import { createCommand } from './commands/create.js';
import { cleanCommand } from './commands/clean.js';
import { devCommand } from './commands/dev.js';
import { logger } from './utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

program.name('kurot').description('Kurot - Egret Next CLI').version(pkg.version);

program.addCommand(buildCommand);
program.addCommand(devCommand);
program.addCommand(createCommand);
program.addCommand(cleanCommand);

try {
	await program.parseAsync();
} catch (error) {
	logger.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
