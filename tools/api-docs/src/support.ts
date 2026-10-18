import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { makeRecursiveVisitor, ReflectionKind } from 'typedoc';
import type { ReferenceType, SomeType } from 'typedoc';
import { root } from './model.js';
import type { PackageModel } from './model.js';
import type { Files, Locations } from './render.js';

export function references(model: PackageModel): ReferenceType[] {
	const result: ReferenceType[] = [];
	for (const value of Object.values(model.project.reflections)) {
		const node = value as typeof value & { type?: SomeType; default?: SomeType; extendedTypes?: SomeType[]; implementedTypes?: SomeType[] };
		for (const type of [node.type, node.default, ...(node.extendedTypes ?? []), ...(node.implementedTypes ?? [])]) {
			type?.visit(makeRecursiveVisitor({ reference: reference => { result.push(reference); } }));
		}
	}
	return result;
}

export async function supportingTypes(models: PackageModel[], paths: Locations): Promise<Map<string, Files>> {
	const result = new Map(models.map(model => [model.key as string, new Map<string, string>()]));
	const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
	const sources = new Map<string, ts.SourceFile>();
	const readSource = async (filename: string): Promise<ts.SourceFile> => {
		const cached = sources.get(filename);
		if (cached) return cached;
		let actual = filename;
		let text: string;
		try { text = await readFile(actual, 'utf8'); }
		catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
			actual = actual.replace(/\/src\/(.*)\.ts$/, '/dist/$1.d.ts');
			text = await readFile(actual, 'utf8');
		}
		const source = ts.createSourceFile(actual, text, ts.ScriptTarget.Latest, true);
		sources.set(filename, source);
		return source;
	};
	const add = async (name: string, pkg: string, filename: string, reader: PackageModel): Promise<void> => {
		const identity = `${pkg}:${name}`;
		if (paths.has(identity)) return;
		const source = await readSource(filename);
		const declaration = source.statements.find(node =>
			(ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) && node.name.text === name);
		if (!declaration) throw new Error(`Cannot document reachable type ${identity} in ${source.fileName}.`);
		const owner = models.find(item => item.name === pkg) ?? reader;
		const file = `supporting/${pkg.slice(7)}-${name}.md`;
		paths.set(identity, `${owner.key}/${file}`);
		const referenced = new Set<string>();
		const visit = (node: ts.Node): void => {
			if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) { referenced.add(node.typeName.text); }
			if (ts.isExpressionWithTypeArguments(node) && ts.isIdentifier(node.expression)) { referenced.add(node.expression.text); }
			ts.forEachChild(node, visit);
		};
		visit(declaration);
		const links: string[] = [];
		for (const dependency of referenced) {
			let dependencyPackage = pkg;
			let dependencyName = dependency;
			let dependencyFile = source.fileName;
			let known = source.statements.some(node => (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) && node.name.text === dependency);
			for (const statement of source.statements) {
				if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
				const bindings = statement.importClause?.namedBindings;
				const imported = bindings && ts.isNamedImports(bindings) ? bindings.elements.find(item => item.name.text === dependency) : undefined;
				if (!imported) continue;
				const specifier = statement.moduleSpecifier.text;
				if (!specifier.startsWith('.') && !specifier.startsWith('@kurot/')) continue;
				dependencyName = imported.propertyName?.text ?? dependency;
				dependencyPackage = specifier.startsWith('@kurot/') ? specifier.split('/').slice(0, 2).join('/') : pkg;
				const resolved = ts.resolveModuleName(specifier, source.fileName, {
					moduleResolution: ts.ModuleResolutionKind.Bundler, baseUrl: root,
					paths: { '@kurot/core': ['packages/core/src/index.ts'] },
				}, ts.sys).resolvedModule;
				if (resolved) { dependencyFile = resolved.resolvedFileName; known = true; }
			}
			const key = `${dependencyPackage}:${dependencyName}`;
			if (!paths.has(key) && known) { await add(dependencyName, dependencyPackage, dependencyFile, reader); }
			const destination = paths.get(key);
			if (destination) {
				const [key, ...parts] = destination.split('/');
				links.push(`[${dependency}](../../../../${key}/docs/api/${parts.join('/')})`);
			}
		}
		result.get(owner.key)?.set(file, [`# ${name}`, '',
			`Supporting declaration from \`${pkg}\`, reachable through the public API.`,
			'This page does not imply that the name is importable from the package root.',
			'Use the owning API parameter/result type or an exported public alias when writing application code.', '',
			'```ts', printer.printNode(ts.EmitHint.Unspecified, declaration, source).trim(), '```', '',
			...(links.length ? [`Related declarations: ${links.join(', ')}.`, ''] : [])].join('\n'));
	};
	for (const model of models) {
		for (const reference of references(model)) {
			if (reference.reflection?.kindOf(ReflectionKind.TypeParameter) || reference.refersToTypeParameter) continue;
			if (!reference.package?.startsWith('@kurot/') || paths.has(`${reference.package}:${reference.name}`)) continue;
			const id = reference.symbolId;
			if (!id?.fileName) throw new Error(`No declaration location for ${reference.package}:${reference.name}.`);
			await add(reference.name, reference.package, id.fileName, model);
		}
	}
	return result;
}
