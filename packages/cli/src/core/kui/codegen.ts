/**
 * Code generator — converts SkinIR into JavaScript source code.
 *
 * Generates ESM-compatible factory functions that create and configure
 * Skin instances with all components, states, and bindings.
 */

import type {
	SkinIR,
	SkinNode,
	PropertyValue,
	StateDef,
	StateOverride,
	LiteralValue,
} from './ast.js';
import { lookupComponent } from './registry.js';

// ── Public API ───────────────────────────────────────────────────────

export interface CodeGenOptions {
	/**
	 * Output format. Only ESM factory modules are supported.
	 */
	readonly format?: 'esm';
}

/**
 * Generates JavaScript source code from a skin intermediate representation.
 *
 * @param ir - Skin intermediate representation.
 * @param options - Code generation options.
 * @returns Generated JavaScript source.
 */
export function generateCode(ir: SkinIR, _options?: CodeGenOptions): string {
	return new CodeGenerator(ir).generate();
}

// ── Code generator ───────────────────────────────────────────────────

class CodeGenerator {
	// ── Instance fields ───────────────────────────────────────────────

	private readonly _ir: SkinIR;
	private readonly _lines: string[] = [];
	private _indent = 0;

	// ── Constructor ───────────────────────────────────────────────────

	public constructor(ir: SkinIR) {
		this._ir = ir;
	}

	// ── Public methods ────────────────────────────────────────────────

	public generate(): string {
		this.emitHeader();
		this.emitImports();
		this.emitFunction();
		return this._lines.join('\n') + '\n';
	}

	// ── Private methods ───────────────────────────────────────────────

	private emitHeader(): void {
		this.line(`// Generated from ${this._ir.className || 'Skin'}.kui.xml`);
		this.line('// @generated — do not edit manually');
		this.line('');
	}

	private emitImports(): void {
		const moduleImports = new Map<string, Set<string>>();
		for (const [className, modulePath] of this._ir.imports) {
			if (!moduleImports.has(modulePath)) {
				moduleImports.set(modulePath, new Set());
			}
			moduleImports.get(modulePath)!.add(className);
		}

		// KUI keeps rectangle-valued properties such as scale9Grid in the compact
		// comma-separated form used by the runtime compiler.
		if (this.hasPropertyInTree('scale9Grid')) {
			if (!moduleImports.has('@kurot/core')) {
				moduleImports.set('@kurot/core', new Set());
			}
			moduleImports.get('@kurot/core')!.add('Rectangle');
		}

		if (this._ir.states.length > 0) {
			if (!moduleImports.has('@kurot/ui')) {
				moduleImports.set('@kurot/ui', new Set());
			}
			const uiImports = moduleImports.get('@kurot/ui')!;
			uiImports.add('State');
			uiImports.add('SetProperty');
			uiImports.add('SetProperty');
		}

		for (const [modulePath, classes] of moduleImports) {
			const names = [...classes].sort().join(', ');
			this.line(`import { ${names} } from "${modulePath}";`);
		}
		this.line('');
	}

	private emitFunction(): void {
		const funcName = this.factoryName(this._ir.className);
		this.line(`export function ${funcName}() {`);
		this._indent++;

		this.line('const skin = new Skin();');

		if (this._ir.skinParts.length > 0) {
			this.line(`skin.skinParts = ${JSON.stringify(this._ir.skinParts)};`);
		}

		if (this._ir.width !== undefined) {
			this.line(`skin.width = ${this._ir.width};`);
		}
		if (this._ir.height !== undefined) {
			this.line(`skin.height = ${this._ir.height};`);
		}
		for (const prop of this._ir.properties) {
			this.emitPropertyAssignment('skin', prop.name, prop.value);
		}

		this.emitNodeDeclarations(this._ir.children);

		if (this._ir.children.length > 0) {
			const childVars = this._ir.children.map(n => n.varName).join(', ');
			this.line(`skin.elementsContent = [${childVars}];`);
		}

		for (const decl of this._ir.declarations) {
			this.emitNodeCreation(decl);
			this.emitNodeProperties(decl);
		}

		this.emitStates();

		this.line('return skin;');
		this._indent--;
		this.line('}');
	}

	private emitNodeDeclarations(nodes: readonly SkinNode[]): void {
		for (const node of nodes) {
			this.emitNodeCreation(node);
			this.emitNodeProperties(node);
			this.emitNodePropertyChildren(node);

			this.emitNodeDeclarations(node.children);

			if (node.children.length > 0) {
				const info = lookupComponent(node.className);
				const defaultProp = info?.defaultProperty ?? 'elementsContent';
				const isArray = info?.isArray !== false;
				const childVars = node.children.map(c => c.varName).join(', ');
				if (isArray) {
					this.line(`${node.varName}.${defaultProp} = [${childVars}];`);
				} else {
					this.line(`${node.varName}.${defaultProp} = ${node.children[0].varName};`);
				}
			}
		}
	}

	private emitNodeCreation(node: SkinNode): void {
		this.line(`const ${node.varName} = new ${node.className}();`);
		if (node.id) {
			this.line(`skin.${node.id} = ${node.varName};`);
		}
	}

	private emitNodeProperties(node: SkinNode): void {
		for (const prop of node.properties) {
			this.emitPropertyAssignment(node.varName, prop.name, prop.value);
		}
	}

	private emitPropertyAssignment(target: string, prop: string, value: PropertyValue): void {
		// Handle percent width/height specially
		if (value.type === 'percent') {
			if (prop === 'width') {
				this.line(`${target}.percentWidth = ${value.value};`);
				return;
			}
			if (prop === 'height') {
				this.line(`${target}.percentHeight = ${value.value};`);
				return;
			}
		}

		this.line(`${target}.${prop} = ${this.propertyValueToJS(prop, value)};`);
	}

	private emitNodePropertyChildren(node: SkinNode): void {
		for (const pc of node.propertyChildren) {
			for (const child of pc.nodes) {
				this.emitNodeCreation(child);
				this.emitNodeProperties(child);
				this.line(`${node.varName}.${pc.propertyName} = ${child.varName};`);
			}
		}
	}

	private emitStates(): void {
		if (this._ir.states.length === 0) return;

		const stateLines: string[] = [];
		for (const state of this._ir.states) {
			stateLines.push(this.generateStateExpr(state));
		}

		this.line(`skin.states = [${stateLines.join(', ')}];`);
	}

	private generateStateExpr(state: StateDef): string {
		if (state.overrides.length === 0) {
			return `new State("${state.name}")`;
		}

		const overrides = state.overrides.map(o => this.generateOverrideExpr(o)).join(', ');
		return `new State("${state.name}", [${overrides}])`;
	}

	private generateOverrideExpr(override: StateOverride): string {
		return `new SetProperty("${override.targetId}", "${override.name}", ${this.propertyValueToJS(override.name, override.value)})`;
	}

	private valueToJS(value: PropertyValue): string {
		switch (value.type) {
			case 'literal':
				return literalToJS(value);
			case 'percent':
				return String(value.value);
		}
	}

	private propertyValueToJS(prop: string, value: PropertyValue): string {
		if (prop === 'scale9Grid' && value.type === 'literal' && typeof value.value === 'string') {
			const parts = value.value.split(',').map(part => Number(part.trim()));
			if (parts.length === 4 && parts.every(Number.isFinite)) {
				return `new Rectangle(${parts.join(', ')})`;
			}
		}
		return this.valueToJS(value);
	}

	private line(text: string): void {
		if (text === '') {
			this._lines.push('');
		} else {
			this._lines.push('\t'.repeat(this._indent) + text);
		}
	}

	private factoryName(className: string): string {
		if (!className) return 'createSkin';
		const parts = className.split('.');
		const base = (parts[parts.length - 1] ?? 'Skin').replace(/[^A-Za-z0-9_$]/g, '_');
		return `create${base}`;
	}

	private hasPropertyInTree(propertyName: string): boolean {
		if (this._ir.properties.some(prop => prop.name === propertyName)) return true;
		const visit = (nodes: readonly SkinNode[]): boolean => {
			for (const node of nodes) {
				if (node.properties.some(prop => prop.name === propertyName)) return true;
				if (visit(node.children)) return true;
			}
			return false;
		};
		return visit(this._ir.children) || visit(this._ir.declarations);
	}
}

// ── Utility functions ────────────────────────────────────────────────

function literalToJS(value: LiteralValue): string {
	if (value.value === null) return 'null';
	if (typeof value.value === 'boolean') return value.value ? 'true' : 'false';
	if (typeof value.value === 'number') return String(value.value);
	return JSON.stringify(value.value);
}
