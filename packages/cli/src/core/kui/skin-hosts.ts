import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import ts from 'typescript';
import type { Dirent } from 'node:fs';
import type { Project } from '../project.js';

/**
 * A project class and the authored skins statically associated with it.
 */
export interface SkinHost {
	readonly source: string;
	readonly className: string;
	readonly module: string;
	readonly skinNames: readonly string[];
	readonly explicitSkinType: boolean;
}

/**
 * Resolves paired classes, literal assignments, generic skin names and conventions.
 * Reads syntax without executing project classes or matching comments as code.
 */
export async function collectSkinHosts(
	project: Project,
	declarationFile: string,
	skinNames: readonly string[],
): Promise<readonly SkinHost[]> {
	const known = new Set(skinNames);
	const hosts = new Map<string, SkinHost>();
	const add = (source: string, className: string, names: readonly string[], explicitSkinType = false): void => {
		if (names.length === 0) {
			return;
		}
		const relative = path.relative(path.dirname(declarationFile), source).replace(/\.tsx?$/, '.js');
		const module = relative.split(path.sep).join('/');
		hosts.set(`${source}:${className}`, {
			source, className,
			module: module.startsWith('.') ? module : `./${module}`,
			skinNames: [...new Set(names)].sort(),
			explicitSkinType,
		});
	};
	for (const component of project.components) {
		if (known.has(component.skinClass)) {
			add(component.source, component.name, [component.skinClass]);
		}
	}
	for (const file of await collectSourceFiles(project.srcDir)) {
		const source = ts.createSourceFile(file, await fs.readFile(file, 'utf8'), ts.ScriptTarget.ES2022, true);
		for (const node of source.statements) {
			if (!ts.isClassDeclaration(node) || !node.name || !isExported(node, source)) {
				continue;
			}
			const className = node.name.text;
			const explicit = assignedSkins(node);
			const generic = (node.heritageClauses ?? []).flatMap(clause => clause.types.flatMap(type =>
				(type.typeArguments ?? []).flatMap(literalSkinNames),
			));
			const paired = hosts.get(`${file}:${className}`)?.skinNames ?? [];
			const candidates = [...paired, ...explicit, ...generic].filter(name => known.has(name));
			if (candidates.length > 0) {
				add(file, className, candidates, generic.some(name => known.has(name)));
			} else if (explicit.length === 0) {
				const conventional = skinNames.filter(name => name.split('.').pop() === `${className}Skin`);
				if (conventional.length === 1) {
					add(file, className, conventional);
				}
			}
		}
	}
	return [...hosts.values()].sort((left, right) =>
		left.module.localeCompare(right.module) || left.className.localeCompare(right.className),
	);
}

function isExported(node: ts.ClassDeclaration, source: ts.SourceFile): boolean {
	const flags = ts.getCombinedModifierFlags(node);
	if (flags & ts.ModifierFlags.Export) {
		return !(flags & ts.ModifierFlags.Default);
	}
	return source.statements.some(statement =>
		ts.isExportDeclaration(statement) && !statement.moduleSpecifier && statement.exportClause &&
		ts.isNamedExports(statement.exportClause) && statement.exportClause.elements.some(element =>
			!element.propertyName && element.name.text === node.name?.text,
		),
	);
}

function assignedSkins(node: ts.ClassDeclaration): string[] {
	const result: string[] = [];
	const visit = (child: ts.Node): void => {
		if ((ts.isClassDeclaration(child) && child !== node) || ts.isFunctionDeclaration(child)) {
			return;
		}
		if (ts.isBinaryExpression(child) && child.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
			ts.isPropertyAccessExpression(child.left) && child.left.expression.kind === ts.SyntaxKind.ThisKeyword &&
			child.left.name.text === 'skinName' && ts.isStringLiteralLike(child.right)) {
			result.push(child.right.text);
		}
		ts.forEachChild(child, visit);
	};
	visit(node);
	return result;
}

async function collectSourceFiles(directory: string): Promise<string[]> {
	const result: string[] = [];
	let entries: Dirent[];
	try {
		entries = await fs.readdir(directory, { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return result;
		}
		throw error;
	}
	for (const entry of entries) {
		const file = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			result.push(...await collectSourceFiles(file));
		} else if (entry.isFile() && /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
			result.push(file);
		}
	}
	return result.sort();
}

function literalSkinNames(node: ts.TypeNode): string[] {
	if (ts.isUnionTypeNode(node)) {
		return node.types.flatMap(literalSkinNames);
	}
	return ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal) ? [node.literal.text] : [];
}
