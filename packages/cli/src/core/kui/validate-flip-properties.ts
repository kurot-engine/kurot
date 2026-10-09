import type { UIDocument, UINode } from '@kurot/ui-document';

/**
 * Centered flips are boolean display-node properties, including named states.
 * The synthetic Skin root and descriptor objects are not display objects.
 */
export function validateFlipProperties(document: UIDocument): void {
	function check(name: string, value: unknown, path: string): void {
		if ((name === 'flipX' || name === 'flipY') && typeof value !== 'boolean') {
			throw new Error(`Invalid centered flip "${path}": expected a boolean.`);
		}
	}

	function visit(node: UINode): void {
		for (const [name, value] of Object.entries(node.properties)) {
			check(name, value, `${node.id}.${name}`);
		}
		for (const child of node.children) {
			visit(child);
		}
	}

	visit(document.root);
	if ('flipX' in document.root.properties || 'flipY' in document.root.properties) {
		throw new Error('Centered flips belong to display nodes, not the Skin root.');
	}
	for (const definition of Object.values(document.contract.states)) {
		for (const override of definition.overrides) {
			if (
				override.targetId === document.root.id &&
				(override.property === 'flipX' || override.property === 'flipY')
			) {
				throw new Error('Centered flips belong to display nodes, not the Skin root.');
			}
			check(override.property, override.value, `${override.targetId}.${override.property}`);
		}
	}
}
