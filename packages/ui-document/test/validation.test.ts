import { describe, expect, it } from 'vitest';
import {
	createUIAssetContract,
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

	it('rejects appearance identifiers that collide with native Skin members', () => {
		const document = createUIDocument({
			id: 'invalid-appearance',
			assetKind: 'appearance',
			contract: createUIAssetContract({
				targetType: 'kui.Button',
				parts: {
					states: { nodeId: 'setPart' },
				},
			}),
			root: createUINode({ id: 'setPart', type: 'kui.Group' }),
		});

		expect(validateUIDocument(document)).toEqual(expect.arrayContaining([
			{
				code: 'reserved-skin-part-name',
				severity: 'error',
				path: '$.root.id',
				message: 'Skin part name "setPart" conflicts with a reserved runtime member.',
			},
			{
				code: 'reserved-skin-part-name',
				severity: 'error',
				path: '$.contract.parts.states',
				message: 'Skin part name "states" conflicts with a reserved runtime member.',
			},
		]));
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

	it('validates the complete appearance reference shape', () => {
		const document = createUIDocument({
			id: 'main-screen',
			root: createUINode({ id: 'root', type: 'kui.Button' }),
		});
		const input = {
			...document,
			root: {
				...document.root,
				appearance: {
					kind: 'asset',
					assetId: 'primary-button-appearance',
					variant: ' ',
					extra: true,
				},
			},
		};
		const diagnostics = validateUIDocument(input);

		expect(diagnostics).toContainEqual({
			code: 'unexpected-property',
			severity: 'error',
			path: '$.root.appearance.extra',
			message: 'Property "extra" is not part of the current document format.',
		});
		expect(diagnostics).toContainEqual({
			code: 'invalid-value',
			severity: 'error',
			path: '$.root.appearance.variant',
			message: 'Appearance variant must be a non-empty string.',
		});
	});

	it('does not accept an appearance selection as a generic property reference', () => {
		const document = createUIDocument({
			id: 'main-screen',
			root: createUINode({ id: 'root', type: 'kui.Button' }),
		});
		const input = {
			...document,
			root: {
				...document.root,
				properties: {
					appearance: {
						kind: 'asset',
						assetId: 'primary-button-appearance',
						variant: 'compact',
					},
				},
			},
		};

		expect(validateUIDocument(input)).toContainEqual({
			code: 'unexpected-property',
			severity: 'error',
			path: '$.root.properties.appearance.variant',
			message: 'Property "variant" is not part of the current document format.',
		});
	});
});
