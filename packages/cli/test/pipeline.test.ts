import { describe, expect, it, vi } from 'vitest';
import { DIAGNOSTIC_CODES } from '../src/core/diagnostics/index.js';
import { createContext, runPipeline } from '../src/core/pipeline.js';
import type { BuildContext, BuildPlugin } from '../src/core/pipeline.js';
import type { Project } from '../src/core/project.js';

describe('build pipeline diagnostics', () => {
	it('creates a non-strict diagnostic collector by default', () => {
		const ctx = createContext(createProject());

		expect(ctx.strict).toBe(false);
		expect(ctx.diagnostics.all()).toEqual([]);
	});

	it('passes strict policy to the diagnostic collector', () => {
		const ctx = createContext(createProject(), { strict: true });
		ctx.diagnostics.report({
			code: DIAGNOSTIC_CODES.EXML_UNKNOWN_TAG,
			severity: 'warning',
			message: 'Unknown tag.',
		});

		expect(ctx.strict).toBe(true);
		expect(ctx.diagnostics.all()[0]?.severity).toBe('error');
	});

	it('uses strict policy by default for release builds', () => {
		const ctx = createContext({ ...createProject(), mode: 'release' });

		expect(ctx.strict).toBe(true);
	});

	it('continues after a plugin reports warnings', async () => {
		const ctx = createContext(createProject());
		const secondApply = vi.fn(async (): Promise<void> => undefined);
		const plugins = [
			createPlugin('warning', async context => {
				context.diagnostics.report({
					code: DIAGNOSTIC_CODES.EXML_UNKNOWN_TAG,
					severity: 'warning',
					message: 'Unknown tag.',
				});
			}),
			createPlugin('second', secondApply),
		];

		await runPipeline(ctx, plugins);

		expect(secondApply).toHaveBeenCalledOnce();
	});

	it('stops before the next plugin after an error diagnostic', async () => {
		const ctx = createContext(createProject());
		const secondApply = vi.fn(async (): Promise<void> => undefined);
		const plugins = [
			createPlugin('invalid EXML', async context => {
				context.diagnostics.report({
					code: DIAGNOSTIC_CODES.EXML_COMPILE_FAILED,
					severity: 'error',
					message: 'Compilation failed.',
				});
			}),
			createPlugin('second', secondApply),
		];

		await expect(runPipeline(ctx, plugins)).rejects.toThrow(
			"Build stopped after 'invalid EXML' with 1 error diagnostic(s).",
		);
		expect(secondApply).not.toHaveBeenCalled();
	});

	it('stops when strict policy promotes a warning', async () => {
		const ctx = createContext(createProject(), { strict: true });
		const secondApply = vi.fn(async (): Promise<void> => undefined);
		const plugins = [
			createPlugin('strict EXML', async context => {
				context.diagnostics.report({
					code: DIAGNOSTIC_CODES.EXML_UNKNOWN_TAG,
					severity: 'warning',
					message: 'Unknown tag.',
				});
			}),
			createPlugin('second', secondApply),
		];

		await expect(runPipeline(ctx, plugins)).rejects.toThrow(
			"Build stopped after 'strict EXML' with 1 error diagnostic(s).",
		);
		expect(secondApply).not.toHaveBeenCalled();
	});

	it('collects multiple diagnostics before stopping', async () => {
		const ctx = createContext(createProject());
		const plugin = createPlugin('validation', async context => {
			context.diagnostics.report({
				code: DIAGNOSTIC_CODES.EXML_COMPILE_FAILED,
				severity: 'error',
				message: 'First error.',
			});
			context.diagnostics.report({
				code: DIAGNOSTIC_CODES.THEME_INVALID_JSON,
				severity: 'error',
				message: 'Second error.',
			});
		});

		await expect(runPipeline(ctx, [plugin])).rejects.toThrow('with 2 error diagnostic(s).');
		expect(ctx.diagnostics.all()).toHaveLength(2);
	});
});

function createPlugin(name: string, apply: (ctx: BuildContext) => Promise<void>): BuildPlugin {
	return { name, apply };
}

function createProject(): Project {
	return {
		root: '/project',
		mode: 'development',
		config: {
			target: 'html5',
			entry: 'src/Main.ts',
			output: { dir: 'bin-debug' },
			stage: {
				width: 640,
				height: 1136,
				scaleMode: 'showAll',
				orientation: 'auto',
				frameRate: 60,
			},
		},
		entry: '/project/src/Main.ts',
		srcDir: '/project/src',
		outputDir: '/project/bin-debug',
		resourceDir: '/project/resource',
		enginePackages: [],
		customNamespaces: [],
		components: [],
	};
}
