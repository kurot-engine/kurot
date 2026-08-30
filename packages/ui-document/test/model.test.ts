import { describe, expect, it } from 'vitest';
import {
	createUIDocument,
	createUINode,
	findUINode,
	UI_DOCUMENT_FORMAT_VERSION,
	UI_DOCUMENT_KIND,
	visitUINodes,
} from '../src/index.js';

describe('UI document model', () => {
	it('creates an explicit current-format document', () => {
		const properties = { width: 320 };
		const children = [createUINode({ id: 'title', type: 'kui.Label' })];
		const root = createUINode({
			id: 'root',
			type: 'kui.Group',
			properties,
			children,
		});
		const document = createUIDocument({ id: 'main-screen', root });

		expect(document.kind).toBe(UI_DOCUMENT_KIND);
		expect(document.formatVersion).toBe(UI_DOCUMENT_FORMAT_VERSION);
		expect(document.root.properties).not.toBe(properties);
		expect(document.root.children).not.toBe(children);
	});

	it('rejects empty required identifiers', () => {
		expect(() => createUINode({ id: ' ', type: 'kui.Group' })).toThrow(
			'Node id must not be empty.',
		);
		expect(() =>
			createUIDocument({
				id: '',
				root: createUINode({ id: 'root', type: 'kui.Group' }),
			}),
		).toThrow('Document id must not be empty.');
	});

	it('queries nodes in deterministic pre-order', () => {
		const target = createUINode({ id: 'target', type: 'kui.Label' });
		const root = createUINode({
			id: 'root',
			type: 'kui.Group',
			children: [
				createUINode({ id: 'first', type: 'kui.Image', children: [target] }),
				createUINode({ id: 'last', type: 'kui.Button' }),
			],
		});
		const visited: string[] = [];

		visitUINodes(root, (node) => visited.push(node.id));

		expect(visited).toEqual(['root', 'first', 'target', 'last']);
		expect(findUINode(root, 'target')).toBe(target);
		expect(findUINode(root, 'missing')).toBeUndefined();
	});
});
