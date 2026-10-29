import * as fs from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { loadConfig } from './config.js';
import type { ProjectConfig } from './config.js';
import { DIAGNOSTIC_CODES } from './diagnostics/codes.js';
import type { DevEvent } from './diagnostics/index.js';
import type { BuildContext } from './pipeline.js';
import { writeStageHtml } from './plugins/generate-html.js';
import { logger } from '../utils/logger.js';

/**
 * Watch the parent directory so atomic editor saves do not detach the watcher.
 * Only stage defaults can change without rebuilding the project's paths/watchers.
 */
export function watchStageConfiguration(
	ctx: BuildContext,
	enqueue: (action: () => Promise<void>) => void,
	onEvent?: (event: DevEvent) => void,
): void {
	let active = ctx.project.config;
	let debounce: ReturnType<typeof setTimeout> | undefined;
	const watcher = fs.watch(ctx.project.root, (_event, filename) => {
		if (filename !== null && filename !== 'kurot.config.ts' && filename !== 'kurot.config.js') {
			return;
		}
		clearTimeout(debounce);
		debounce = setTimeout(() => enqueue(refresh), 100);
	});
	watcher.on('error', error => {
		logger.error(`Configuration watcher failed: ${error.message}. Restart kurot dev.`);
	});
	ctx.disposers.push(() => {
		clearTimeout(debounce);
		watcher.close();
	});

	async function refresh(): Promise<void> {
		const startedAt = Date.now();
		onEvent?.({ type: 'build-start', reason: 'config-change' });
		let restartRequired = false;
		try {
			const next = await loadConfig({ root: ctx.project.root, fresh: true });
			if (!isDeepStrictEqual(structure(active), structure(next))) {
				restartRequired = true;
				throw new Error('Build configuration outside stage changed. Restart kurot dev to apply it.');
			}
			if (!isDeepStrictEqual(active.stage, next.stage)) {
				await writeStageHtml(ctx, next.stage);
			}
			active = next;
			logger.success('Stage configuration updated. Refresh the browser to apply it.');
			onEvent?.({ type: 'build-complete', success: true, durationMs: Date.now() - startedAt });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			logger.error(`Configuration update failed: ${message}`);
			onEvent?.({
				type: 'diagnostic',
				diagnostic: {
					code: restartRequired ? DIAGNOSTIC_CODES.CONFIG_RESTART_REQUIRED : DIAGNOSTIC_CODES.CONFIG_RELOAD_FAILED,
					severity: 'error',
					message,
				},
			});
			onEvent?.({ type: 'build-complete', success: false, durationMs: Date.now() - startedAt });
		}
	}
}

function structure({ stage: _stage, ...config }: ProjectConfig): Omit<ProjectConfig, 'stage'> {
	return config;
}
