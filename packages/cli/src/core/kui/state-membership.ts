import type { UIPropertyValue } from '@kurot/ui-document';
import type { SkinNode, StateDef } from './ast.js';

/**
 * Resolve the structural directive once; it must never reach a component setter.
 */
export function parseIncludedStates(
	value: UIPropertyValue | undefined, states: ReadonlySet<string>, id: string, visual: boolean,
): readonly string[] | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (!visual) {
		throw new Error(`includeIn on "${id}" requires a visual child of an elementsContent container.`);
	}
	if (typeof value !== 'string') {
		throw new Error(`includeIn on "${id}" requires a comma-separated list of declared states.`);
	}
	const names = value.split(',').map(name => name.trim());
	for (const name of names) {
		if (!states.has(name)) {
			throw new Error(`includeIn on "${id}" references undeclared state "${name}".`);
		}
	}
	return [...new Set(names)];
}

/**
 * Insert in authored order at the child's index among siblings present in this
 * state (not its XML index, which includes siblings absent in this state).
 */
export function addStateChildren(states: StateDef[], children: readonly SkinNode[]): void {
	function visit(nodes: readonly SkinNode[], destination: string, state: StateDef): void {
		let position = 0;
		for (const node of nodes) {
			if (!node.includeIn || node.includeIn.includes(state.name)) {
				if (node.includeIn && node.id) {
					state.overrides.push({ type: 'AddItems', targetId: node.id, destination, position });
				}
				position++;
			}
			if (node.id) {
				visit(node.children, node.id, state);
			}
		}
	}
	for (const state of states) {
		visit(children, '', state);
	}
}
