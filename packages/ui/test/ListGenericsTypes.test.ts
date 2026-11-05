// @vitest-environment node
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('./fixtures/', import.meta.url));
const imports = `import { ArrayCollection, ComboBox, DataGroup, ItemRenderer, ItemTapEvent, List, TabBar } from '../../src/index.js';
interface ItemData { id: number; }
const list = new List<ItemData | null>();
const collection = new ArrayCollection([{ id: 1 }]);
`;
const invalidCases: Readonly<Record<string, string>> = {
	typedEmpty: 'new ArrayCollection<ItemData>([]).addItem(null);',
	append: 'collection.addItem("wrong");',
	insert: 'collection.addItemAt(null, 0);',
	replace: 'collection.replaceItemAt({ id: "wrong" }, 0);',
	source: 'collection.source = [null];',
	replaceAll: 'collection.replaceAll(["wrong"]);',
	provider: 'list.dataProvider = new ArrayCollection(["wrong"]);',
	selected: 'list.selectedItem = "wrong";',
	nullableRead: 'const value: ItemData = list.selectedItem;',
	missingRead: 'const value: ItemData = collection.getItemAt(99);',
	appendWrongShape: 'collection.addItem({ name: "wrong" });',
	tap: 'list.addEventListener("itemTap", (event: ItemTapEvent<string>) => {});',
	once: 'list.once("itemTap", (event: ItemTapEvent<string>) => {});',
	remove: 'list.removeEventListener("itemTap", (event: ItemTapEvent<string>) => {});',
	unknownDefault: 'const value: ItemData = new List().selectedItem;',
	renderer: 'new ItemRenderer<"test.RowSkin", ItemData>().data = "wrong";',
	rendererFactory: 'list.itemRenderer = class extends ItemRenderer<string, string> {};',
	combo: 'new ComboBox<ItemData>().dataProvider = new ArrayCollection([null]);',
	tab: 'new TabBar<ItemData>().selectedItem = "wrong";',
	group: 'new DataGroup<ItemData>().dataProvider = new ArrayCollection(["wrong"]);',
};

describe('strict list data type contracts', () => {
	it('infers data across public APIs, preserves legacy signatures and rejects every invalid fixture', () => {
		const sources = new Map(
			Object.entries(invalidCases).map(([name, code]) => [
				path.join(directory, `invalid-${name}.ts`),
				imports + code,
			]),
		);
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
		const originalRead = host.readFile.bind(host);
		const originalExists = host.fileExists.bind(host);
		host.readFile = file => sources.get(file) ?? originalRead(file);
		host.fileExists = file => sources.has(file) || originalExists(file);
		const program = ts.createProgram(
			[path.join(directory, 'list-generics.valid.ts'), ...sources.keys()],
			options,
			host,
		);
		expect(program.getSyntacticDiagnostics()).toEqual([]);
		const diagnostics = ts.getPreEmitDiagnostics(program);
		const failures = diagnostics.filter(diagnostic => !diagnostic.file || !sources.has(diagnostic.file.fileName));
		expect(failures.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))).toEqual([]);
		for (const [file] of sources) {
			const errors = diagnostics.filter(diagnostic => diagnostic.file?.fileName === file);
			expect(errors.length, path.basename(file)).toBeGreaterThan(0);
			expect(
				errors.every(
					error => error.category === ts.DiagnosticCategory.Error && (error.start ?? 0) >= imports.length,
				),
				path.basename(file),
			).toBe(true);
		}
	}, 20000);
});
