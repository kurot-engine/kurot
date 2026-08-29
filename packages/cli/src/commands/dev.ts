import { Command } from 'commander';
import { loadProject } from '../core/project.js';
import { startDevServer } from '../core/dev-server.js';
import { ConfigError } from '../core/errors.js';
import { parseDevDiagnosticsFormat, writeMachineOutput } from '../core/diagnostics/index.js';
import { logger, setLoggerEnabled } from '../utils/logger.js';

interface DevOptions {
	readonly port: string;
	readonly sourcemap: boolean;
	readonly strict: boolean;
	readonly diagnostics: string;
}

/**
 * Commander definition for the development server and file watchers.
 */
export const devCommand = new Command('dev')
	.description('Start a development server with rebuild on change')
	.option('-p, --port <port>', 'Port to listen on', '3000')
	.option('--sourcemap', 'Generate sourcemaps', false)
	.option('--strict', 'Treat supported warnings as build errors', false)
	.option('--diagnostics <format>', 'Diagnostic output: human or jsonl', 'human')
	.action(async (options: DevOptions) => {
		const format = parseDevDiagnosticsFormat(options.diagnostics);
		const machine = format === 'jsonl';
		setLoggerEnabled(!machine);
		const port = Number.parseInt(options.port, 10);
		if (!Number.isInteger(port) || port < 1 || port > 65535) {
			setLoggerEnabled(true);
			throw new ConfigError(`Invalid port: ${options.port}`);
		}

		try {
			const project = await loadProject('development');
			logger.info(`Starting dev server on port ${port}...`);
			await startDevServer(project, {
				port,
				sourcemap: options.sourcemap,
				strict: options.strict,
				onEvent: machine ? writeMachineOutput : undefined,
			});
		} catch (err) {
			logger.error(`Dev server failed: ${err instanceof Error ? err.message : String(err)}`);
			process.exitCode = 1;
			if (machine) {
				setLoggerEnabled(true);
			}
		}
	});
