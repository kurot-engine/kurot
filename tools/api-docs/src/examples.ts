import ts from 'typescript';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { keys, root } from './model.js';

export async function checkExamples(consumer?: string): Promise<number> {
	const files: string[] = [];
	for (const key of keys) {
		const directory = consumer ? path.join(consumer, 'node_modules/@kurot', key) : path.join(root, 'packages', key);
		const manifest = JSON.parse(await readFile(path.join(directory, 'docs/api/examples.json'), 'utf8')) as {
			examples: { file: string }[];
		};
		files.push(...manifest.examples.map(example => path.join(directory, 'docs/api', example.file)));
	}
	const paths: Record<string, string[]> = {};
	for (const key of keys) {
		paths[`@kurot/${key}`] = [consumer ? path.join(consumer, 'node_modules/@kurot', key, 'dist/index.d.ts') : path.join(root, 'packages', key, 'dist/index.d.ts')];
	}
	const program = ts.createProgram(files, {
		target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
		strict: true, noEmit: true, skipLibCheck: false, types: [], lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
		baseUrl: consumer ?? root, paths,
	});
	const diagnostics = ts.getPreEmitDiagnostics(program);
	if (consumer && program.getSourceFiles().some(file => !file.isDeclarationFile && !files.includes(file.fileName))) {
		throw new Error('Consumer verification unexpectedly loaded implementation source.');
	}
	if (diagnostics.length) {
		throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
			getCanonicalFileName: file => file, getCurrentDirectory: () => consumer ?? root, getNewLine: () => '\n',
		}));
	}
	process.stdout.write(`${files.length} API examples compiled with strict TypeScript against ${consumer ? 'packed packages' : 'built declarations'}.\n`);
	return files.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
	await checkExamples();
}
