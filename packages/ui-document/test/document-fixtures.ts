import {
	createUIAppearanceReference,
	createUIAssetContract,
	createUIAssetReference,
	createUIComponentInstance,
	createUIDesignTokenReference,
	createUIDocument,
	createUINode,
} from '../src/index.js';
import type { UIDocument } from '../src/index.js';

export function createActionCardDocument(): UIDocument {
	return createUIDocument({
		id: 'action-card',
		assetKind: 'component',
		contract: createUIAssetContract({
			componentType: 'game.ActionCard',
			parameters: {
				label: {
					valueType: 'string',
					required: true,
					description: 'Visible action label.',
					bindings: [{ targetId: 'label', property: 'text' }],
				},
			},
			parts: {
				background: { nodeId: 'background' },
				label: { nodeId: 'label' },
			},
			slots: { content: { nodeId: 'content-slot', capacity: 'multiple' } },
			states: {
				disabled: { overrides: [{ targetId: 'root', property: 'alpha', value: 0.5 }] },
			},
			variants: {
				primary: {
					overrides: [{
						targetId: 'background',
						property: 'fillColor',
						value: createUIDesignTokenReference('color', 'color.action.primary'),
					}],
				},
			},
		}),
		root: createUINode({
			id: 'root',
			type: 'kui.Group',
			children: [
				createUINode({ id: 'background', type: 'kui.Rect' }),
				createUINode({ id: 'label', type: 'kui.Label', properties: { text: 'Action' } }),
				createUINode({ id: 'content-slot', type: 'kui.Group' }),
			],
		}),
	});
}

export function createButtonAppearanceDocument(): UIDocument {
	return createUIDocument({
		id: 'primary-button-appearance',
		assetKind: 'appearance',
		contract: createUIAssetContract({
			targetType: 'kui.Button',
			parts: { background: { nodeId: 'background' } },
			states: {
				down: { overrides: [{ targetId: 'background', property: 'alpha', value: 0.8 }] },
			},
			variants: {
				compact: { overrides: [{ targetId: 'background', property: 'strokeWeight', value: 2 }] },
			},
		}),
		root: createUINode({
			id: 'root',
			type: 'kui.Group',
			children: [createUINode({
				id: 'background',
				type: 'kui.Rect',
				properties: { fillColor: createUIDesignTokenReference('color', 'color.action.primary') },
			})],
		}),
	});
}

export function createLobbyDocument(): UIDocument {
	return createUIDocument({
		id: 'lobby-screen',
		root: createUINode({
			id: 'root',
			type: 'kui.Group',
			children: [
				createUINode({
					id: 'play-action',
					type: 'game.ActionCard',
					properties: { left: 24 },
					instance: createUIComponentInstance({
						source: createUIAssetReference('action-card'),
						variant: 'primary',
						parameters: { label: 'Play' },
						overrides: [{ part: 'label', property: 'textColor', value: 0xffffff }],
						slots: {
							content: [createUINode({ id: 'play-hint', type: 'kui.Label', properties: { text: 'Start game' } })],
						},
					}),
				}),
				createUINode({
					id: 'settings-action',
					type: 'game.ActionCard',
					properties: { right: 24 },
					instance: createUIComponentInstance({
						source: createUIAssetReference('action-card'),
						parameters: { label: 'Settings' },
					}),
				}),
				createUINode({
					id: 'native-button',
					type: 'kui.Button',
					properties: { label: 'Help' },
					appearance: createUIAppearanceReference('primary-button-appearance', 'compact'),
				}),
			],
		}),
	});
}
