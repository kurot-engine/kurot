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
		const appearance = createUIDocument({
			id: 'primary-action-appearance',
			assetKind: 'appearance',
			contract: createUIAssetContract({
				targetType: 'kui.Button',
				states: {
					down: {
						overrides: [{
							targetId: 'background',
							property: 'alpha',
							value: 0.8,
							transition: { duration: 180, easing: 'ease-out' },
						}],
					},
				},
			}),
			root: createUINode({ id: 'background', type: 'kui.Rect' }),
		});
		const assets = new UIAssetRegistry();
		assets.registerAsset(document);
		assets.registerAsset(appearance);

		expect(validateUIAssetRegistry(assets)).toEqual([]);
		expect(parseUIDocument(serializeUIDocument(document))).toEqual(document);
		expect(parseUIDocument(serializeUIDocument(appearance))).toEqual(appearance);
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
			}),
			root: createUINode({ id: 'label', type: 'kui.Label' }),
		});
		const appearance = createUIDocument({
			id: 'invalid-transition',
			assetKind: 'appearance',
			contract: createUIAssetContract({
				targetType: 'kui.Button',
				states: {
					down: {
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
		assets.registerAsset(appearance);
		const diagnostics = validateUIAssetRegistry(assets);

		expect(diagnostics.map(item => item.path)).toContain(
			'$.assets["invalid-semantics"].contract.dataBindings.amount.source',
		);
		expect(diagnostics.map(item => item.path)).toContain(
			'$.assets["invalid-transition"].contract.states.down.overrides[0].transition',
		);
	});

	it('rejects unsupported actions, resource bindings, states, and required parts', () => {
		const screen = createUIDocument({
			id: 'invalid-capabilities',
			contract: createUIAssetContract({
				dataFields: {
					font: {
						valueType: 'resource-reference',
						resourceTypes: ['font'],
					},
				},
				dataBindings: {
					image: { source: 'font', targetId: 'image', property: 'source' },
				},
				actions: {
					changed: { sourceId: 'label', trigger: 'change' },
				},
			}),
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				children: [
					createUINode({ id: 'label', type: 'kui.Label' }),
					createUINode({ id: 'image', type: 'kui.Image' }),
				],
			}),
		});
		const buttonAppearance = createUIDocument({
			id: 'invalid-button-appearance',
			assetKind: 'appearance',
			contract: createUIAssetContract({
				targetType: 'kui.Button',
				states: { pressed: { overrides: [] } },
			}),
			root: createUINode({ id: 'root', type: 'kui.Group' }),
		});
		const textInputAppearance = createUIDocument({
			id: 'invalid-text-input-appearance',
			assetKind: 'appearance',
			contract: createUIAssetContract({ targetType: 'kui.TextInput' }),
			root: createUINode({ id: 'root', type: 'kui.Group' }),
		});
		const assets = new UIAssetRegistry();
		assets.registerAsset(screen);
		assets.registerAsset(buttonAppearance);
		assets.registerAsset(textInputAppearance);

		const paths = validateUIAssetRegistry(assets).map(item => item.path);
		expect(paths).toContain(
			'$.assets["invalid-capabilities"].contract.dataBindings.image.source',
		);
		expect(paths).toContain(
			'$.assets["invalid-capabilities"].contract.actions.changed.trigger',
		);
		expect(paths).toContain(
			'$.assets["invalid-button-appearance"].contract.states.pressed',
		);
		expect(paths).toContain(
			'$.assets["invalid-text-input-appearance"].contract.parts.textDisplay',
		);
	});
});
