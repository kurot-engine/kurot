import { describe, expect, it } from 'vitest';
import {
	createUIDocument,
	createUINode,
	isUIDocument,
	validateUIDocument,
} from '../src/index.js';

describe('UI document validation', () => {
	it('accepts a valid semantic document', () => {
		const document = createUIDocument({
			id: 'main-screen',
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				properties: { visible: true, size: { width: 320, height: 180 } },
			}),
		});

		expect(validateUIDocument(document)).toEqual([]);
		expect(isUIDocument(document)).toBe(true);
	});

	it('reports duplicate node identifiers with exact paths', () => {
		const document = createUIDocument({
			id: 'main-screen',
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				children: [
					createUINode({ id: 'item', type: 'kui.Label' }),
					createUINode({ id: 'item', type: 'kui.Image' }),
				],
			}),
		});

		expect(validateUIDocument(document)).toContainEqual({
			code: 'duplicate-node-id',
			severity: 'error',
			path: '$.root.children[1].id',
			message: 'Node id "item" is already used at $.root.children[0].id.',
		});
	});

	it('rejects unknown schema fields and unsafe property values', () => {
		const input = {
			kind: 'kurot-ui-document',
			formatVersion: 2,
			id: 'main-screen',
			assetKind: 'screen',
			contract: {
				parameters: {},
				parts: {},
				slots: {},
				states: {},
				variants: {},
			},
			extra: true,
			root: {
				id: 'root',
				type: 'kui.Group',
				properties: { width: Number.NaN, createdAt: new Date() },
				children: [],
			},
		};
		const diagnostics = validateUIDocument(input);

		expect(diagnostics.map((item) => item.code)).toEqual([
			'unexpected-property',
			'invalid-property-value',
			'invalid-property-value',
		]);
		expect(isUIDocument(input)).toBe(false);
	});
});
