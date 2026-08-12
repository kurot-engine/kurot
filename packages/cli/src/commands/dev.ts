import { Command } from 'commander';
import { loadProject } from '../core/project.js';
import { startDevServer } from '../core/dev-server.js';
import { logger } from '../utils/logger.js';

export const devCommand = new Command('dev')
	.description('Start a development server with rebuild on change')
	.option('-p, --port <port>', 'Port to listen on', '3000')
	.option('--sourcemap', 'Generate sourcemaps', false)
	.action(async (options: { port: string; sourcemap: boolean }) => {
		const port = Number.parseInt(options.port, 10);
		if (!Number.isInteger(port) || port < 1 || port > 65535) {
			logger.error(`Invalid port: ${options.port}`);
			process.exit(1);
		}

		try {
			const project = await loadProject('development');
			logger.info(`Starting dev server on port ${port}...`);
			await startDevServer(project, { port, sourcemap: options.sourcemap });
		} catch (err) {
			logger.error(`Dev server failed: ${err instanceof Error ? err.message : String(err)}`);
			process.exit(1);
		}
	});
