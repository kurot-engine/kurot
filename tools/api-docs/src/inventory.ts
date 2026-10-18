import ts from 'typescript';
import path from 'node:path';
import { root, publicName } from './model.js';
import type { PackageModel } from './model.js';

export interface ExpectedExport {
	name: string;
	members: string[];
}

function visible(symbol: ts.Symbol): boolean {
	if (!publicName(symbol.name)) return false;
	if (symbol.getJsDocTags().some(tag => ['internal', 'hidden', 'private'].includes(tag.name))) return false;
	return !(symbol.declarations ?? []).some(declaration =>
		(ts.getCombinedModifierFlags(declaration) & ts.ModifierFlags.Private) !== 0);
}

export function inventory(model: PackageModel): ExpectedExport[] {
	const configFile = ts.readConfigFile(path.join(model.directory, 'tsconfig.json'), ts.sys.readFile);
	if (configFile.error) throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
	const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, model.directory);
	const program = ts.createProgram(config.fileNames, {
		...config.options, noEmit: true, rootDir: root, baseUrl: root,
		paths: { '@kurot/core': ['packages/core/src/index.ts'] },
	});
	const checker = program.getTypeChecker();
	const entry = program.getSourceFile(path.join(model.directory, 'src/index.ts'));
	const module = entry ? checker.getSymbolAtLocation(entry) : undefined;
	if (!module) throw new Error(`No export module for ${model.name}.`);
	const resolve = (symbol: ts.Symbol): ts.Symbol => symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
	return checker.getExportsOfModule(module).flatMap(exported => {
		const symbol = resolve(exported);
		if (!visible(symbol) || !publicName(exported.name)) return [];
		const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
		const members = new Set<string>();
		const add = (values: readonly ts.Symbol[], prefix = ''): void => {
			for (const member of values) {
				if (visible(member)) { members.add(prefix + member.name); }
			}
		};
		if (symbol.flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Interface)) {
			add(checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(symbol)));
			if (declaration && symbol.flags & ts.SymbolFlags.Class) {
				add(checker.getPropertiesOfType(checker.getTypeOfSymbolAtLocation(symbol, declaration)), 'static ');
			}
		} else if (symbol.flags & ts.SymbolFlags.NamespaceModule) {
			add(checker.getExportsOfModule(symbol));
		} else if (declaration && !(symbol.flags & (ts.SymbolFlags.Function | ts.SymbolFlags.TypeAlias))) {
			const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
			if (type.flags & ts.TypeFlags.Object) { add(checker.getPropertiesOfType(type)); }
			if (symbol.flags & ts.SymbolFlags.Enum) { add(checker.getExportsOfModule(symbol)); }
		}
		return [{ name: exported.name, members: [...members].sort() }];
	}).sort((a, b) => a.name.localeCompare(b.name, 'en'));
}
