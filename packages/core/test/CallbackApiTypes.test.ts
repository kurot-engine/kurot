// @vitest-environment node
import { expect, it } from 'vitest';
import ts from 'typescript';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('./', import.meta.url));
const imports =
	"import { ticker, Texture, RenderTexture } from '../src/index.js';\nconst callback = (now: number): boolean => now > 0;\n";
const valid = `ticker.startTick(callback); ticker.stopTick(callback);
new RenderTexture().getPixel32(0, 0);
const textureHit: boolean = new Texture().hitTestAlpha(0, 0);
const captureHit: boolean = new RenderTexture().hitTestAlpha(0, 0);`;
const invalid: Readonly<Record<string, string>> = {
	startReceiver: 'ticker.startTick(callback, {});',
	stopReceiver: 'ticker.stopTick(callback, {});',
	texturePixels: 'new Texture().getPixels(0, 0);',
	textureExport: 'new Texture().toDataURL("image/png");',
	texturePixel: 'new Texture().getPixel32(0, 0);',
	alphaCoordinates: 'new Texture().hitTestAlpha("0", 0);',
	alphaResult: 'const rgba: number[] = new Texture().hitTestAlpha(0, 0);',
	capturePixels: 'new RenderTexture().getPixels(0, 0);',
	captureExport: 'new RenderTexture().toDataURL("image/png");',
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
