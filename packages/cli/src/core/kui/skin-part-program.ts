import * as path from 'node:path';
import ts from 'typescript';
import { collectSkinHosts } from './skin-hosts.js';
import { builtinSkinHost } from './builtin-skin-hosts.js';
import type { Project } from '../project.js';
import type { SkinIR } from './ast.js';

/**
 * Installed host and authored part types resolved through one compiler program.
 */
export interface SkinPartHostTypes {
	readonly className: string;
	readonly skinName: string;
	readonly source?: string;
	readonly host: ts.Type;
	readonly parts: ts.Type;
}

/**
 * Resolves actual SDK/project types without writing stale generated declarations.
 */
export async function createSkinPartProgram(
	project: Project,
	skins: readonly SkinIR[],
	declaration: string,
): Promise<{ checker: ts.TypeChecker; hosts: readonly SkinPartHostTypes[]; uiExports?: ts.Type }> {
	const file = path.join(project.root, '.kurot/skin-parts.d.ts');
	const discovered = await collectSkinHosts(project, file, skins.map(skin => skin.className));
	const candidates = discovered.flatMap(host => host.skinNames.map(skinName => ({
		className: host.className, source: host.source, skinName, module: host.module,
	})));
	for (const skin of skins) {
		const className = builtinSkinHost(skin.className);
		if (className) {
			candidates.push({ className, source: '', skinName: skin.className, module: '@kurot/ui' });
		}
	}
	if (candidates.length === 0) {
		return { checker: ts.createProgram([], { noLib: true }).getTypeChecker(), hosts: [] };
	}
	const aliases = candidates.flatMap((host, index) => [
		`type __KurotHost${index} = import(${JSON.stringify(host.module)}).${host.className};`,
		`type __KurotParts${index} = import("@kurot/ui").SkinPartsOf<${JSON.stringify(host.skinName)}>;`,
	]);
	const source = `${declaration}\n${aliases.join('\n')}\ntype __KurotUIExports = typeof import("@kurot/ui");\n`;
	const options = projectOptions(project.root);
	const compilerHost = ts.createCompilerHost(options);
	const original = compilerHost.getSourceFile.bind(compilerHost);
	compilerHost.getSourceFile = (name, language, onError, shouldCreateNewSourceFile) =>
		path.resolve(name) === file
			? ts.createSourceFile(file, source, options.target ?? ts.ScriptTarget.ES2022, true)
			: original(name, language, onError, shouldCreateNewSourceFile);
	const program = ts.createProgram([file], options, compilerHost);
	const checker = program.getTypeChecker();
	const generated = program.getSourceFile(file);
	if (!generated) {
		throw new Error('Cannot analyze generated skin part declarations.');
	}
	const types = new Map<string, ts.Type>();
	for (const statement of generated.statements) {
		if (ts.isTypeAliasDeclaration(statement)) {
			types.set(statement.name.text, checker.getTypeFromTypeNode(statement.type));
		}
	}
	const hosts: SkinPartHostTypes[] = [];
	for (const [index, candidate] of candidates.entries()) {
		const host = types.get(`__KurotHost${index}`);
		const parts = types.get(`__KurotParts${index}`);
		if (host && parts) {
			hosts.push({ ...candidate, source: candidate.source || undefined, host, parts });
		}
	}
	return { checker, hosts, uiExports: types.get('__KurotUIExports') };
}

function projectOptions(root: string): ts.CompilerOptions {
	const defaults: ts.CompilerOptions = {
		target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
		moduleResolution: ts.ModuleResolutionKind.Bundler,
		strict: true, noEmit: true, skipLibCheck: true, types: [],
	};
	const file = path.join(root, 'tsconfig.json');
	if (!ts.sys.fileExists(file)) {
		return defaults;
	}
	const input = ts.readConfigFile(file, ts.sys.readFile);
	if (input.error) {
		throw new Error(ts.flattenDiagnosticMessageText(input.error.messageText, '\n'));
	}
	const parsed = ts.parseJsonConfigFileContent(input.config, ts.sys, root);
	const error = parsed.errors.find(diagnostic => diagnostic.code !== 18003);
	if (error) {
		throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
	}
	return { ...defaults, ...parsed.options, noEmit: true };
}
