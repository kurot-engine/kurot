import * as fs from 'node:fs/promises';
import type { BuildPlugin } from '../pipeline.js';

// Removes artifacts from previous builds before writing the new output.
export function cleanOutput(): BuildPlugin {
	return {
		name: 'clean output',
		async apply(ctx): Promise<void> {
			await fs.rm(ctx.project.outputDir, { recursive: true, force: true });
		},
	};
}
