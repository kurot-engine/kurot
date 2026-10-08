import { createKurotUIFoundationRegistry, matchesUIPropertyDefinition } from '@kurot/ui-document';
import type { UIDocument, UINode, UIPropertyValue } from '@kurot/ui-document';

const TEXT_COMPONENTS = new Set(['kui.BitmapLabel', 'kui.RichLabel']);

/**
 * Keeps new text components within their native contract without imposing the
 * incomplete foundation catalog on existing CLI-only controls or project classes.
 */
export function validateTextComponents(document: UIDocument): void {
	const registry = createKurotUIFoundationRegistry();
	const nodes = new Map<string, UINode>();

	const visit = (node: UINode): void => {
		nodes.set(node.id, node);
		if (TEXT_COMPONENTS.has(node.type)) {
			if (node.children.length > 0) {
				throw new Error(`${node.type} "${node.id}" cannot contain display children.`);
			}
			for (const [name, value] of Object.entries(node.properties)) {
				validateProperty(node, name, value);
			}
		}
		for (const child of node.children) {
			visit(child);
		}
	};

	const validateProperty = (node: UINode, name: string, value: UIPropertyValue): void => {
		const property = registry.resolve(node.type)?.properties[name];
		if (!property || !matchesUIPropertyDefinition(value, property)) {
			throw new Error(`Invalid ${node.type} property "${node.id}.${name}".`);
		}
	};

	visit(document.root);
	for (const definition of Object.values(document.contract.states)) {
		for (const override of definition.overrides) {
			const node = nodes.get(override.targetId);
			if (node && TEXT_COMPONENTS.has(node.type)) {
				validateProperty(node, override.property, override.value);
			}
		}
	}
}
