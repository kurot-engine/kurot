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

interface StatePropertyOverride {
	readonly stateName: string;
	readonly targetId: string;
	readonly propName: string;
	readonly value: PropertyValue;
}

interface TemplatePart {
	readonly type: 'literal' | 'binding';
	readonly value: string;
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
		this.line(`// Generated from ${this._ir.className || 'Skin'}.exml`);
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

		const hasBindings = this.hasBindingsInTree(this._ir.children);
		if (hasBindings) {
			if (!moduleImports.has('@kurot/ui')) {
				moduleImports.set('@kurot/ui', new Set());
			}
			moduleImports.get('@kurot/ui')!.add('Binding');
		}

		// Egret encodes Rectangle-valued properties such as scale9Grid as a
		// comma-separated EXML attribute (for example "1,3,8,8").
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
			for (const state of this._ir.states) {
				for (const override of state.overrides) {
					uiImports.add(override.type);
				}
			}
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
			if (!prop.state) {
				this.emitPropertyAssignment('skin', prop.name, prop.value);
			}
		}

		this.emitNodeDeclarations(this._ir.children);

		const defaultChildren = this._ir.children.filter(n => n.includeIn.length === 0 && n.excludeFrom.length === 0);
		if (defaultChildren.length > 0) {
			const childVars = defaultChildren.map(n => n.varName).join(', ');
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

			const defaultPropChildren = node.children.filter(c => c.includeIn.length === 0 && c.excludeFrom.length === 0);
			if (defaultPropChildren.length > 0) {
				const info = lookupComponent(node.className);
				const defaultProp = info?.defaultProperty ?? 'elementsContent';
				const isArray = info?.isArray !== false;
				const childVars = defaultPropChildren.map(c => c.varName).join(', ');
				if (isArray) {
					this.line(`${node.varName}.${defaultProp} = [${childVars}];`);
				} else {
					this.line(`${node.varName}.${defaultProp} = ${defaultPropChildren[0].varName};`);
				}
			}
		}
	}

	private emitNodeCreation(node: SkinNode): void {
		this.line(`const ${node.varName} = new ${node.className}();`);
		if (node.id) {
			this.line(`skin.${node.id} = ${node.varName};`);
		} else {
			// Anonymous state targets still need a stable key for `skin.getPart()`.
			const hasStateProps = node.properties.some(p => p.state);
			if (hasStateProps) {
				this.line(`skin.${node.varName} = ${node.varName};`);
			}
		}
	}

	private emitNodeProperties(node: SkinNode): void {
		for (const prop of node.properties) {
			if (prop.state) {
				continue;
			}
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

		if (value.type === 'binding') {
			this.emitBinding(target, prop, value.expression);
			return;
		}

		this.line(`${target}.${prop} = ${this.propertyValueToJS(prop, value)};`);
	}

	private emitBinding(target: string, prop: string, expression: string): void {
		// Inner braces distinguish template bindings from simple property chains.
		if (expression.includes('{')) {
			const parts = parseBindingTemplate(expression);
			if (parts.some(p => p.type === 'binding')) {
				const templates: string[] = [];
				const chainIndex: number[] = [];
				for (let i = 0; i < parts.length; i++) {
					if (parts[i].type === 'literal') {
						templates.push(`"${escapeJS(parts[i].value)}"`);
					} else {
						templates.push(`"${parts[i].value}"`);
						chainIndex.push(i);
					}
				}
				this.line(
					`Binding.bindProperties(this, [${templates.join(', ')}], [${chainIndex.join(', ')}], ${target}, "${prop}");`,
				);
			}
		} else {
			this.line(
				`Binding.bindProperty(this, ["${expression.split('.').join('", "')}"], ${target}, "${prop}");`,
			);
		}
	}

	private emitNodePropertyChildren(node: SkinNode): void {
		for (const pc of node.propertyChildren) {
			for (const child of pc.nodes) {
				if (typeof child === 'string') {
					this.line(`${node.varName}.${pc.propertyName} = ${JSON.stringify(child)};`);
				} else {
					this.emitNodeCreation(child);
					this.emitNodeProperties(child);
					this.line(`${node.varName}.${pc.propertyName} = ${child.varName};`);
				}
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
		// Explicit state entries and dotted property attributes share one override list.
		const allOverrides = [...state.overrides];

		const nodeOverrides = this.collectStatePropertyOverrides(this._ir.children);
		for (const prop of this._ir.properties) {
			if (prop.state) {
				nodeOverrides.push({
					stateName: prop.state,
					targetId: '',
					propName: prop.name,
					value: prop.value,
				});
			}
		}
		for (const { stateName, targetId, propName, value } of nodeOverrides) {
			const matches = stateName === state.name || state.stateGroups.includes(stateName);
			if (matches) {
				allOverrides.push({ type: 'SetProperty', targetId, name: propName, value });
			}
		}

		if (allOverrides.length === 0) {
			return `new State("${state.name}")`;
		}

		const overrides = allOverrides.map(o => this.generateOverrideExpr(o)).join(', ');
		return `new State("${state.name}", [${overrides}])`;
	}

	private generateOverrideExpr(override: StateOverride): string {
		switch (override.type) {
			case 'AddItems':
				return `new AddItems("${override.targetId}", "${override.destinationId}", ${override.position}, "${override.propertyName}")`;
			case 'SetProperty':
				return `new SetProperty("${override.targetId}", "${override.name}", ${this.propertyValueToJS(override.name, override.value)})`;
			default:
				return '/* unknown override */';
		}
	}

	private collectStatePropertyOverrides(
		nodes: readonly SkinNode[],
	): StatePropertyOverride[] {
		const result: StatePropertyOverride[] = [];
		for (const node of nodes) {
			for (const prop of node.properties) {
				if (prop.state) {
					result.push({
						stateName: prop.state,
						targetId: node.id ?? node.varName,
						propName: prop.name,
						value: prop.value,
					});
				}
			}
			result.push(...this.collectStatePropertyOverrides(node.children));
		}
		return result;
	}

	private valueToJS(value: PropertyValue): string {
		switch (value.type) {
			case 'literal':
				return literalToJS(value);
			case 'percent':
				return String(value.value);
			case 'binding':
				return `/* binding: ${value.expression} */`;
			case 'ref':
				return value.varName;
			default:
				return 'undefined';
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
		const base = parts[parts.length - 1];
		return `create${base}`;
	}

	private hasBindingsInTree(nodes: readonly SkinNode[]): boolean {
		for (const node of nodes) {
			for (const prop of node.properties) {
				if (prop.value.type === 'binding') return true;
			}
			if (this.hasBindingsInTree(node.children)) return true;
		}
		return false;
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

function escapeJS(s: string): string {
	return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

/**
 * Parse a binding template expression.
 * e.g. "Hello {name}!" → [{literal: "Hello "}, {binding: "name"}, {literal: "!"}]
 * e.g. "{data.label}" → [{binding: "data.label"}]
 */
function parseBindingTemplate(expr: string): TemplatePart[] {
	const parts: TemplatePart[] = [];
	let i = 0;
	let current = '';

	while (i < expr.length) {
		if (expr[i] === '{') {
			if (current) {
				parts.push({ type: 'literal', value: current });
				current = '';
			}
			let depth = 1;
			let j = i + 1;
			while (j < expr.length && depth > 0) {
				if (expr[j] === '{') {
					depth++;
				}
				if (expr[j] === '}') {
					depth--;
				}
				j++;
			}
			parts.push({ type: 'binding', value: expr.slice(i + 1, j - 1) });
			i = j;
		} else {
			current += expr[i];
			i++;
		}
	}
	if (current) {
		parts.push({ type: 'literal', value: current });
	}

	return parts;
}
