import { Command } from 'commander';
import { scaffoldProject, TEMPLATES } from '../core/template.js';
import { logger } from '../utils/logger.js';
import type { TemplateName } from '../core/template.js';

/**
 * Commander definition for scaffolding a project template.
 */
export const createCommand = new Command('create')
	.description('Create a new Kurot project')
	.argument('<name>', 'Project name')
	.option('--template <template>', `Project template: ${TEMPLATES.join(' | ')}`, 'game')
	.action(async (name: string, options: { template: string }) => {
		if (!TEMPLATES.includes(options.template as TemplateName)) {
			logger.error(`Unknown template "${options.template}". Available: ${TEMPLATES.join(', ')}`);
			process.exit(1);
		}

		logger.info(`Creating project "${name}" from template "${options.template}"...`);
		try {
			await scaffoldProject(name, options.template as TemplateName);
		} catch (err) {
			logger.error(err instanceof Error ? err.message : String(err));
			process.exit(1);
		}

		logger.success(`Project created at ./${name}`);
		logger.info(`Next steps:\n  cd ${name}\n  pnpm install\n  pnpm dev`);
	});
