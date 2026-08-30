import {
	applyUIOperation,
	createUIAssetContract,
	createUIDocument,
	createUINode,
	parseUIDocument,
	serializeUIDocument,
	UIAssetRegistry,
	validateUIAssetRegistry,
} from '../src/index.js';
import { describe, expect, it } from 'vitest';

describe('Phase 3 visual semantics', () => {
	it('round-trips bounded data, actions, and state transitions', () => {
		const document = createUIDocument({
			id: 'crash-screen',
			contract: createUIAssetContract({
				dataFields: {
					multiplierText: { valueType: 'string', required: true },
				},
				dataBindings: {
					multiplier: {
						source: 'multiplierText',
						targetId: 'multiplier',
						property: 'text',
					},
				},
				actions: {
					betRequested: { sourceId: 'primary-action', trigger: 'tap' },
				},
				states: {
					running: {
						overrides: [
							{
								targetId: 'multiplier',
								property: 'alpha',
								value: 1,
								transition: {
									duration: 180,
									easing: 'ease-out',
								},
							},
						],
					},
				},
			}),
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				children: [
					createUINode({ id: 'multiplier', type: 'kui.Label' }),
					createUINode({ id: 'primary-action', type: 'kui.Button' }),
				],
			}),
		});
		const assets = new UIAssetRegistry();
		assets.registerAsset(document);

		expect(validateUIAssetRegistry(assets)).toEqual([]);
		expect(parseUIDocument(serializeUIDocument(document))).toEqual(document);
	});

	it('edits action contracts with an exact inverse', () => {
		const document = createUIDocument({
			id: 'action-edit',
			root: createUINode({ id: 'root', type: 'kui.Button' }),
		});
		const result = applyUIOperation(document, {
			kind: 'set-contract-action',
			name: 'continueRequested',
			definition: { sourceId: 'root', trigger: 'tap' },
		});

		expect(result.document.contract.actions?.continueRequested).toEqual({
			sourceId: 'root',
			trigger: 'tap',
		});
		expect(applyUIOperation(result.document, result.inverse).document).toEqual(document);
	});

	it('rejects incompatible data targets and non-numeric transitions', () => {
		const document = createUIDocument({
			id: 'invalid-semantics',
			contract: createUIAssetContract({
				dataFields: { amount: { valueType: 'number' } },
				dataBindings: {
					amount: { source: 'amount', targetId: 'label', property: 'text' },
				},
				states: {
					active: {
						overrides: [{
							targetId: 'label',
							property: 'text',
							value: 'active',
							transition: { duration: 100 },
						}],
					},
				},
			}),
			root: createUINode({ id: 'label', type: 'kui.Label' }),
		});
		const assets = new UIAssetRegistry();
		assets.registerAsset(document);
		const diagnostics = validateUIAssetRegistry(assets);

		expect(diagnostics.map(item => item.path)).toContain(
			'$.assets["invalid-semantics"].contract.dataBindings.amount.source',
		);
		expect(diagnostics.map(item => item.path)).toContain(
			'$.assets["invalid-semantics"].contract.states.active.overrides[0].transition',
		);
	});
});
