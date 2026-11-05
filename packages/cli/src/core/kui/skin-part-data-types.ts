import ts from 'typescript';

interface NativeDataType {
	readonly constructor: ts.Type;
	readonly arguments: readonly ts.Type[];
	readonly dataIndex: number;
}

const dataParameters = new Map([
	['DataGroup', 0],
	['ListBase', 0],
	['List', 0],
	['TabBar', 0],
	['ComboBox', 0],
	['ItemRenderer', 1],
]);

/**
 * XML identifies a native widget, not its business item type. Only the unknown
 * data argument of an actual SDK constructor may follow a declared field's type.
 * Constructor assignability still checks the widget/inheritance contract; other
 * type arguments, including ItemRenderer's Skin, retain their original checks.
 */
export function isSkinPartAssignable(
	checker: ts.TypeChecker,
	uiExports: ts.Type | undefined,
	source: ts.Type,
	target: ts.Type,
): boolean {
	if (checker.isTypeAssignableTo(source, target)) {
		return true;
	}
	if (!uiExports) {
		return false;
	}
	if (target.isUnion()) {
		return target.types.some(member => isSkinPartAssignable(checker, uiExports, source, member));
	}
	const expected = nativeDataType(checker, uiExports, source);
	const actual = nativeDataType(checker, uiExports, target);
	if (!expected || !actual || expected.dataIndex !== actual.dataIndex) {
		return false;
	}
	const data = expected.arguments[expected.dataIndex];
	if (!data || !(data.flags & ts.TypeFlags.Unknown)) {
		return false;
	}
	for (let index = 0; index < expected.arguments.length; index++) {
		if (index === expected.dataIndex) {
			continue;
		}
		const other = actual.arguments[index];
		if (!other || !checker.isTypeAssignableTo(expected.arguments[index], other)) {
			return false;
		}
	}
	return checker.isTypeAssignableTo(expected.constructor, actual.constructor);
}

function nativeDataType(checker: ts.TypeChecker, ui: ts.Type, type: ts.Type): NativeDataType | undefined {
	if (!(type.flags & ts.TypeFlags.Object) || !((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference)) {
		return undefined;
	}
	const reference = type as ts.TypeReference;
	for (const [name, dataIndex] of dataParameters) {
		const symbol = ui.getProperty(name);
		const declaration = symbol?.valueDeclaration ?? symbol?.getDeclarations()?.[0];
		if (!symbol || !declaration) {
			continue;
		}
		const constructor = checker.getTypeOfSymbolAtLocation(symbol, declaration);
		const signature = constructor.getConstructSignatures()[0];
		const instance = signature?.getReturnType();
		// Symbol identity comes from this program's installed SDK export, never
		// a short class name, import-path pattern or a project's structural copy.
		if (
			instance?.getSymbol() !== reference.getSymbol() ||
			reference.target.typeParameters?.length !== dataIndex + 1
		) {
			continue;
		}
		return { constructor, arguments: checker.getTypeArguments(reference), dataIndex };
	}
	return undefined;
}
