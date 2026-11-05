import ts from 'typescript';

const dataOnlyTypes = new Set([
	'ICollection',
	'ICollectionEvents',
	'ArrayCollection',
	'ArrayCollectionEvents',
	'DataGroup',
	'ListBase',
	'List',
	'TabBar',
	'ComboBox',
	'IItemRenderer',
	'ItemTapEvent',
	'CollectionEvent',
	'GroupEvents',
]);

/**
 * Retains existing project Skin arguments while excluding SDK item-data types.
 * Resolve named/namespace imports explicitly so a project's identically named
 * class does not acquire the SDK's generic-parameter meaning by accident.
 */
export function heritageSkinNames(type: ts.ExpressionWithTypeArguments, source: ts.SourceFile): string[] {
	const native = uiImportName(type.expression, source);
	if (native && dataOnlyTypes.has(native)) {
		return [];
	}
	const arguments_ = native === 'ItemRenderer' ? type.typeArguments?.slice(0, 1) : type.typeArguments;
	return (arguments_ ?? []).flatMap(literalSkinNames);
}

function uiImportName(expression: ts.Expression, source: ts.SourceFile): string | undefined {
	for (const statement of source.statements) {
		if (
			!ts.isImportDeclaration(statement) ||
			!ts.isStringLiteral(statement.moduleSpecifier) ||
			statement.moduleSpecifier.text !== '@kurot/ui'
		) {
			continue;
		}
		const bindings = statement.importClause?.namedBindings;
		if (!bindings) {
			continue;
		}
		if (ts.isNamedImports(bindings) && ts.isIdentifier(expression)) {
			const entry = bindings.elements.find(item => item.name.text === expression.text);
			if (entry) {
				return entry.propertyName?.text ?? entry.name.text;
			}
		}
		if (
			ts.isNamespaceImport(bindings) &&
			ts.isPropertyAccessExpression(expression) &&
			ts.isIdentifier(expression.expression) &&
			expression.expression.text === bindings.name.text
		) {
			return expression.name.text;
		}
	}
	return undefined;
}

function literalSkinNames(node: ts.TypeNode): string[] {
	if (ts.isUnionTypeNode(node)) {
		return node.types.flatMap(literalSkinNames);
	}
	return ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal) ? [node.literal.text] : [];
}
