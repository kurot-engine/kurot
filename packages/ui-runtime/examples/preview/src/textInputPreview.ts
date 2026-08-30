import type { UIDocument, UINode } from '@kurot/ui-document';
import {
	createUIAppearanceReference,
	createUIAssetContract,
	createUIDocument,
	createUINode,
} from '@kurot/ui-document';

/**
 * Creates the preview's interactive TextInput node.
 */
export function createPreviewTextInputNode(appearanceId: string): UINode {
	return createUINode({
		id: 'player-name',
		type: 'kui.TextInput',
		properties: {
			height: 52,
			inputType: 'text',
			maxChars: 20,
			prompt: 'Enter player name',
			restrict: 'A-Za-z0-9_',
			textColor: 0xe2e8f0,
			width: 360,
			x: 220,
			y: 465,
		},
		appearance: createUIAppearanceReference(appearanceId),
	});
}

/**
 * Creates an appearance with the native EditableText and prompt Label parts.
 */
export function createPreviewTextInputAppearance(): UIDocument {
	return createUIDocument({
		id: 'preview-text-input-appearance',
		assetKind: 'appearance',
		contract: createUIAssetContract({
			targetType: 'kui.TextInput',
			parts: {
				promptDisplay: { nodeId: 'promptDisplay' },
				textDisplay: { nodeId: 'textDisplay' },
			},
			states: {
				disabled: {
					overrides: [
						{ targetId: 'root', property: 'alpha', value: 0.5 },
					],
				},
				disabledWithPrompt: {
					overrides: [
						{ targetId: 'root', property: 'alpha', value: 0.5 },
						{ targetId: 'promptDisplay', property: 'visible', value: true },
					],
				},
				normal: { overrides: [] },
				normalWithPrompt: {
					overrides: [
						{ targetId: 'promptDisplay', property: 'visible', value: true },
					],
				},
			},
		}),
		root: createUINode({
			id: 'root',
			type: 'kui.Group',
			properties: { height: 52, width: 360 },
			children: [
				createUINode({
					id: 'background',
					type: 'kui.Rect',
					properties: {
						fillColor: 0x1e293b,
						height: 52,
						strokeColor: 0x38bdf8,
						strokeWeight: 2,
						width: 360,
					},
				}),
				createUINode({
					id: 'textDisplay',
					type: 'kui.EditableText',
					properties: {
						height: 52,
						size: 18,
						textColor: 0xe2e8f0,
						verticalAlign: 'middle',
						width: 324,
						x: 18,
					},
				}),
				createUINode({
					id: 'promptDisplay',
					type: 'kui.Label',
					properties: {
						height: 52,
						size: 18,
						textColor: 0x64748b,
						verticalAlign: 'middle',
						visible: false,
						width: 324,
						x: 18,
					},
				}),
			],
		}),
	});
}
