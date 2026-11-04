import type { SkinIR } from './ast.js';
import type { Project } from '../project.js';

/**
 * A source declaration or Skin whose host-field contract is invalid.
 */
export interface SkinPartFieldIssue {
	readonly skinName: string;
	readonly message: string;
	readonly file?: string;
	readonly line?: number;
	readonly column?: number;
}

/**
 * Validates authored part fields against installed SDK types and compiled skins.
 */
export async function validateSkinPartFields(
	project: Project,
	skins: readonly SkinIR[],
	declaration: string,
): Promise<readonly SkinPartFieldIssue[]> {
	const { checker, hosts } = await createSkinPartProgram(project, skins, declaration);
	const issues: SkinPartFieldIssue[] = [];
	for (const host of hosts) {
		const declared = host.host.getProperties().filter(isDeclaredField);
		const report = (name: string, message: string, symbol?: ts.Symbol): void => {
			const node = symbol?.getDeclarations()?.[0];
			const source = node?.getSourceFile();
			const position = source && node ? source.getLineAndCharacterOfPosition(node.getStart()) : undefined;
			issues.push({
				skinName: host.skinName,
				message: `Skin part "${name}" ${message} (${host.className}, ${host.skinName}).`,
				...(host.source && source && position ? {
					file: path.relative(project.root, source.fileName),
					line: position.line + 1, column: position.character + 1,
				} : {}),
			});
		};
		if (!host.host.getProperty('getSkinPartValidator') &&
			(declared.length > 0 || (!host.source && !(host.host.flags & ts.TypeFlags.Any)))) {
			report(declared[0]?.name ?? host.parts.getProperties()[0]?.name ?? host.className,
				'requires @kurot/ui >= 4.0.0 for direct fields', declared[0]);
			continue;
		}
		if ((host.host.flags | host.parts.flags) & ts.TypeFlags.Any) {
			if (declared.length > 0) {
				report(declared[0].name, 'types could not be resolved from the installed SDK', declared[0]);
			}
			continue;
		}
		for (const field of declared) {
			const type = propertyType(checker, host.host, field.name);
			if (!host.parts.getProperty(field.name) && type && !allowsUndefined(type) &&
				!inheritedNonPart(host.host, field.name)) {
				report(field.name, 'is missing from the authored skin', field);
			}
		}
		for (const part of host.parts.getProperties()) {
			const member = host.host.getProperty(part.name);
			if (!member) {
				continue;
			}
			const native = nativePart(host.host, part.name);
			if (!native && (inheritedNonPart(host.host, part.name) || !isDeclaredField(member))) {
				const nodes = member.getDeclarations() ?? [];
				const field = nodes.some(node => ts.isPropertyDeclaration(node));
				report(part.name, field
					? 'conflicts with an emitted or initialized field; use declare'
					: 'conflicts with a host method or accessor', member);
				continue;
			}
			const expected = propertyType(checker, host.parts, part.name);
			const actual = propertyType(checker, host.host, part.name);
			if (expected && actual && !checker.isTypeAssignableTo(expected, actual)) {
				report(part.name, `type ${checker.typeToString(expected)} is not assignable to ${checker.typeToString(actual)}`, member);
				continue;
			}
			const nativeType = native ? nativePartType(checker, host.host, part.name) : undefined;
			if (expected && nativeType && !checker.isTypeAssignableTo(expected, nativeType)) {
				report(part.name, `type ${checker.typeToString(expected)} is not assignable to native slot ${checker.typeToString(nativeType)}`, member);
			}
		}
	}
	return issues;
}
import * as path from 'node:path';
import ts from 'typescript';
import { createSkinPartProgram } from './skin-part-program.js';

function isDeclaredField(symbol: ts.Symbol): boolean {
	return (symbol.getDeclarations() ?? []).some(node => ts.isPropertyDeclaration(node) &&
		(ts.getModifiers(node) ?? []).some(modifier => modifier.kind === ts.SyntaxKind.DeclareKeyword),
	);
}

function allowsUndefined(type: ts.Type): boolean {
	return !!(type.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Any | ts.TypeFlags.Unknown)) ||
		(type.isUnion() && type.types.some(allowsUndefined));
}

function nativePart(type: ts.Type, name: string): boolean {
	const property = type.getProperty(name);
	if ((property?.getDeclarations() ?? []).some(node => ts.getJSDocTags(node).some(tag => tag.tagName.text === 'skinPart'))) {
		return true;
	}
	return baseTypes(type).some(base => nativePart(base, name));
}

function inheritedNonPart(type: ts.Type, name: string): boolean {
	return baseTypes(type).some(base => {
		const property = base.getProperty(name);
		return !!property && !isDeclaredField(property) && !nativePart(base, name);
	});
}

function nativePartType(checker: ts.TypeChecker, type: ts.Type, name: string): ts.Type | undefined {
	const property = type.getProperty(name);
	if ((property?.getDeclarations() ?? []).some(node => ts.getJSDocTags(node).some(tag => tag.tagName.text === 'skinPart'))) {
		return propertyType(checker, type, name);
	}
	for (const base of baseTypes(type)) {
		const result = nativePartType(checker, base, name);
		if (result) {
			return result;
		}
	}
	return undefined;
}

function baseTypes(type: ts.Type): readonly ts.BaseType[] {
	return type.isClassOrInterface() ? type.getBaseTypes() ?? [] : [];
}

function propertyType(checker: ts.TypeChecker, type: ts.Type, name: string): ts.Type | undefined {
	const symbol = type.getProperty(name);
	const declaration = symbol?.valueDeclaration ?? symbol?.getDeclarations()?.[0];
	return symbol && declaration ? checker.getTypeOfSymbolAtLocation(symbol, declaration) : undefined;
}
