/**
 * Code generator — converts SkinIR into JavaScript source code.
 *
 * Generates ESM-compatible factory functions that create and configure
 * Skin instances with all components, states, and bindings.
 */

import type {
	SkinIR,
	SkinNode,
	PropertyAssignment,
	PropertyValue,
	PropertyChild,
	StateDef,
	StateOverride,
	StateAddItems,
	StateSetProperty,
	LiteralValue,
	PercentValue,
	BindingValue,
} from './ast.js';
import { getDefaultProperty, lookupComponent } from './registry.js';

// ── Public API ───────────────────────────────────────────────────────

export interface CodeGenOptions {
	/**
	 * Output format. Only `'esm'` is supported (import/export statements for
	 * use as ES modules). Retained as an option for forward compatibility.
	 */
	format?: 'esm';
}

/**
 * Generate JavaScript source code from a SkinIR.
 *
 * @param ir - The skin intermediate representation
 * @param options - Code generation options
 * @returns Generated JS source string
 */
export function generateCode(ir: SkinIR, _options?: CodeGenOptions): string {
	return new CodeGen(ir).generate();
}

// ── Code generator ───────────────────────────────────────────────────

class CodeGen {
	private readonly ir: SkinIR;
	private readonly lines: string[] = [];
	private indent = 0;

	constructor(ir: SkinIR) {
		this.ir = ir;
	}

	generate(): string {
		this.emitHeader();
		this.emitImports();
		this.emitFunction();
		return this.lines.join('\n') + '\n';
	}

	// ── Header comment ────────────────────────────────────────────────

	private emitHeader(): void {
		this.line(`// Generated from ${this.ir.className || 'Skin'}.exml`);
		this.line('// @generated — do not edit manually');
		this.line('');
	}

	// ── Imports ───────────────────────────────────────────────────────

	private emitImports(): void {
		// Group imports by module
		const moduleImports = new Map<string, Set<string>>();
		for (const [className, modulePath] of this.ir.imports) {
			if (!moduleImports.has(modulePath)) {
				moduleImports.set(modulePath, new Set());
			}
			moduleImports.get(modulePath)!.add(className);
		}

		// Also ensure we import Binding if there are any bindings
		let hasBindings = this.hasBindingsInTree(this.ir.children);
		if (hasBindings) {
			if (!moduleImports.has('@blakron/ui')) {
				moduleImports.set('@blakron/ui', new Set());
			}
			moduleImports.get('@blakron/ui')!.add('Binding');
		}

		// Egret encodes Rectangle-valued properties such as scale9Grid as a
		// comma-separated EXML attribute (for example "1,3,8,8").
		if (this.hasPropertyInTree('scale9Grid')) {
			if (!moduleImports.has('@blakron/core')) {
				moduleImports.set('@blakron/core', new Set());
			}
			moduleImports.get('@blakron/core')!.add('Rectangle');
		}

		// Ensure State, AddItems, SetProperty are imported if we have states
		if (this.ir.states.length > 0) {
			if (!moduleImports.has('@blakron/ui')) {
				moduleImports.set('@blakron/ui', new Set());
			}
			const uiImports = moduleImports.get('@blakron/ui')!;
			uiImports.add('State');
			uiImports.add('SetProperty'); // always needed for node state-specific props
			for (const state of this.ir.states) {
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

	// ── Factory function ──────────────────────────────────────────────

	private emitFunction(): void {
		const funcName = this.factoryName(this.ir.className);
		this.line(`export function ${funcName}() {`);
		this.indent++;

		// Create skin instance
		this.line('const skin = new Skin();');

		// Set skin parts
		if (this.ir.skinParts.length > 0) {
			this.line(`skin.skinParts = ${JSON.stringify(this.ir.skinParts)};`);
		}

		// Set skin dimensions
		if (this.ir.width != null) {
			this.line(`skin.width = ${this.ir.width};`);
		}
		if (this.ir.height != null) {
			this.line(`skin.height = ${this.ir.height};`);
		}
		for (const prop of this.ir.properties) {
			if (!prop.state) this.emitPropertyAssignment('skin', prop.name, prop.value);
		}

		// Create and configure all nodes
		this.emitNodeDeclarations(this.ir.children, 'skin');

		// Set elementsContent on skin
		const defaultChildren = this.ir.children.filter(n => n.includeIn.length === 0 && n.excludeFrom.length === 0);
		if (defaultChildren.length > 0) {
			const childVars = defaultChildren.map(n => n.varName).join(', ');
			this.line(`skin.elementsContent = [${childVars}];`);
		}

		// Emit declarations (non-visual)
		for (const decl of this.ir.declarations) {
			this.emitNodeCreation(decl);
			this.emitNodeProperties(decl);
		}

		// Emit states
		this.emitStates();

		this.line('return skin;');
		this.indent--;
		this.line('}');
	}

	// ── Node declarations ─────────────────────────────────────────────

	private emitNodeDeclarations(nodes: readonly SkinNode[], parentVar: string): void {
		for (const node of nodes) {
			this.emitNodeCreation(node);
			this.emitNodeProperties(node);
			this.emitNodePropertyChildren(node);

			// Recurse into children
			this.emitNodeDeclarations(node.children, node.varName);

			// Assign children to default property
			const defaultPropChildren = node.children.filter(c => c.includeIn.length === 0 && c.excludeFrom.length === 0);
			if (defaultPropChildren.length > 0) {
				const info = lookupComponent(node.className);
				const defaultProp = info?.defaultProperty ?? 'elementsContent';
				const isArray = info?.isArray !== false;
				const childVars = defaultPropChildren.map(c => c.varName).join(', ');
				if (isArray) {
					this.line(`${node.varName}.${defaultProp} = [${childVars}];`);
				} else {
					// Single-value property: assign first child directly
					this.line(`${node.varName}.${defaultProp} = ${defaultPropChildren[0].varName};`);
				}
			}
		}
	}

	private emitNodeCreation(node: SkinNode): void {
		this.line(`const ${node.varName} = new ${node.className}();`);
		// If node has an id, set it on the skin (skin part)
		if (node.id) {
			this.line(`skin.${node.id} = ${node.varName};`);
		} else {
			// If node has state-specific properties, register it on skin by varName
			// so SetProperty can resolve it via skin.getPart(varName)
			const hasStateProps = node.properties.some(p => p.state);
			if (hasStateProps) {
				this.line(`skin.${node.varName} = ${node.varName};`);
			}
		}
	}

	// ── Properties ────────────────────────────────────────────────────

	private emitNodeProperties(node: SkinNode): void {
		for (const prop of node.properties) {
			if (prop.state) {
				// State-specific property → handled via SetProperty override
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

		// Handle bindings
		if (value.type === 'binding') {
			this.emitBinding(target, prop, value.expression);
			return;
		}

		this.line(`${target}.${prop} = ${this.propertyValueToJS(prop, value)};`);
	}

	private emitBinding(target: string, prop: string, expression: string): void {
		// The expression is already stripped of outer braces by parseValue().
		// Check whether it contains inner braces (template binding like "Hello {name}!").
		if (expression.includes('{')) {
			// Template binding: Binding.bindProperties
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
			// Simple binding: Binding.bindProperty(host, ['chain'], target, 'prop')
			this.line(
				`Binding.bindProperty(this, ["${expression.split('.').join('", "')}"], ${target}, "${prop}");`,
			);
		}
	}

	// ── Property children ─────────────────────────────────────────────

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

	// ── States ────────────────────────────────────────────────────────

	private emitStates(): void {
		if (this.ir.states.length === 0) return;

		const stateLines: string[] = [];
		for (const state of this.ir.states) {
			stateLines.push(this.generateStateExpr(state));
		}

		this.line(`skin.states = [${stateLines.join(', ')}];`);
	}

	private generateStateExpr(state: StateDef): string {
		// Collect overrides: explicit overrides from State element + state-specific props from nodes
		const allOverrides = [...state.overrides];

		// Add SetProperty overrides from node properties with this state name or matching stateGroup
		const nodeOverrides = this.collectStatePropertyOverrides(this.ir.children);
		for (const prop of this.ir.properties) {
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
			// Match by state name or by stateGroup membership
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
			case 'AddItems': {
				const o = override as StateAddItems;
				return `new AddItems("${o.targetId}", "${o.destinationId}", ${o.position}, "${o.propertyName}")`;
			}
			case 'SetProperty': {
				const o = override as StateSetProperty;
				return `new SetProperty("${o.targetId}", "${o.name}", ${this.propertyValueToJS(o.name, o.value)})`;
			}
			default:
				return '/* unknown override */';
		}
	}

	private collectStatePropertyOverrides(
		nodes: readonly SkinNode[],
	): { stateName: string; targetId: string; propName: string; value: PropertyValue }[] {
		const result: { stateName: string; targetId: string; propName: string; value: PropertyValue }[] = [];
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

	// ── Value helpers ─────────────────────────────────────────────────

	private valueToJS(value: PropertyValue): string {
		switch (value.type) {
			case 'literal':
				return literalToJS(value as LiteralValue);
			case 'percent':
				return String((value as PercentValue).value);
			case 'binding':
				return `/* binding: ${(value as BindingValue).expression} */`;
			case 'ref':
				return (value as { varName: string }).varName;
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

	// ── Utilities ─────────────────────────────────────────────────────

	private line(text: string): void {
		if (text === '') {
			this.lines.push('');
		} else {
			this.lines.push('\t'.repeat(this.indent) + text);
		}
	}

	private factoryName(className: string): string {
		if (!className) return 'createSkin';
		// Convert "skins.MySkin" → "createMySkin"
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
		if (this.ir.properties.some(prop => prop.name === propertyName)) return true;
		const visit = (nodes: readonly SkinNode[]): boolean => {
			for (const node of nodes) {
				if (node.properties.some(prop => prop.name === propertyName)) return true;
				if (visit(node.children)) return true;
			}
			return false;
		};
		return visit(this.ir.children) || visit(this.ir.declarations);
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

interface TemplatePart {
	type: 'literal' | 'binding';
	value: string;
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
			// Find matching }
			let depth = 1;
			let j = i + 1;
			while (j < expr.length && depth > 0) {
				if (expr[j] === '{') depth++;
				if (expr[j] === '}') depth--;
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
