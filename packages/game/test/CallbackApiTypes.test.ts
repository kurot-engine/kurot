// @vitest-environment node
import { expect, it } from 'vitest';
import ts from 'typescript';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('./', import.meta.url));
const imports =
	"import { Tween } from '../src/index.js';\nconst target = { x: 0 };\nconst callback = (...args: unknown[]): void => {};\n";
const valid =
	'Tween.get(target, { onChange: tween => {}, onLoopComplete: tween => {} }).call(callback, [1, false]).call(callback);';
const invalid: Readonly<Record<string, string>> = {
	callReceiver: 'Tween.get(target).call(callback, {}, [1]);',
	callObject: 'Tween.get(target).call(callback, {});',
	changeReceiver: 'Tween.get(target, { onChangeObj: target });',
	loopReceiver: 'Tween.get(target, { onLoopCompleteObj: target });',
};

it('accepts callback-owned APIs and rejects removed arguments and members in strict mode', () => {
	const good = path.join(directory, 'callback-api-valid.ts');
	const bad = new Map(
		Object.entries(invalid).map(([name, code]) => [
			path.join(directory, `callback-api-invalid-${name}.ts`),
			imports + code,
		]),
	);
	const sources = new Map([[good, imports + valid], ...bad]);
	const options: ts.CompilerOptions = {
		strict: true,
		noEmit: true,
		skipLibCheck: false,
		target: ts.ScriptTarget.ES2022,
		module: ts.ModuleKind.ESNext,
		moduleResolution: ts.ModuleResolutionKind.Bundler,
		lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
		types: [],
	};
	const host = ts.createCompilerHost(options);
	const read = host.readFile.bind(host);
	const exists = host.fileExists.bind(host);
	host.readFile = file => sources.get(file) ?? read(file);
	host.fileExists = file => sources.has(file) || exists(file);
	const program = ts.createProgram([...sources.keys()], options, host);
	expect(program.getSyntacticDiagnostics()).toEqual([]);
	const diagnostics = ts.getPreEmitDiagnostics(program);
	const unexpected = diagnostics.filter(item => !item.file || !bad.has(item.file.fileName));
	expect(unexpected.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n'))).toEqual([]);
	for (const file of bad.keys()) {
		const errors = diagnostics.filter(item => item.file?.fileName === file);
		expect(errors.length, path.basename(file)).toBeGreaterThan(0);
		expect(
			errors.every(item => (item.start ?? 0) >= imports.length),
			path.basename(file),
		).toBe(true);
	}
}, 20000);
