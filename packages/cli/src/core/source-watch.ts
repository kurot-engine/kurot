import * as esbuild from 'esbuild';
import type { BuildContext } from './pipeline.js';

/**
 * Keep one source context for filesystem edits and explicit KUI/component refreshes.
 */
export async function startSourceWatch(ctx: BuildContext, options: esbuild.BuildOptions): Promise<esbuild.BuildResult> {
	let started = 0;
	const context = await esbuild.context({
		...options, write: false,
		plugins: [{
			name: 'kurot-source-watch',
			setup(build): void {
				build.onStart(() => {
					started++;
				});
			},
		}, ...(options.plugins ?? [])],
	});
	ctx.disposers.push(() => context.dispose());
	ctx.outputs.sourceRebuilder = async () => {
		// esbuild can join an in-flight watch build that already read the old
		// namespace. Wait for a build started after this refresh was requested.
		const previous = started;
		try {
			await context.rebuild();
		} catch (error) {
			if (started !== previous) {
				throw error;
			}
		}
		if (started === previous) {
			await context.rebuild();
		}
	};
	const result = await context.rebuild();
	await context.watch();
	return result;
}
