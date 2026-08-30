import { createPlayer } from '@kurot/core';
import type { UIDocument } from '@kurot/ui-document';
import {
	createUIAssetContract,
	createUIComponentInstance,
	createUIDocument,
	createUINode,
	UIAssetRegistry,
} from '@kurot/ui-document';
import { createKurotUI } from '@kurot/ui-runtime';

const canvas = requireElement('#game', HTMLCanvasElement);
const status = requireElement('#status', HTMLElement);
const summary = requireElement('#summary', HTMLPreElement);

try {
	const { assets, document } = createPreviewProject();
	const result = createKurotUI(document, { assets });
	const app = createPlayer({
		canvas,
		contentWidth: 800,
		contentHeight: 450,
		frameRate: 60,
		scaleMode: 'showAll',
	});
	app.start(result.root);
	status.textContent = 'Rendered';
	summary.textContent = [
		`document: ${document.id}`,
		`root: ${result.root.constructor.name}`,
		`instances: ${result.instances.size}`,
		...Array.from(result.instances, ([id, instance]) =>
			`  ${id.padEnd(12)} → ${instance.constructor.name}`,
		),
	].join('\n');
} catch (error) {
	status.textContent = 'Failed';
	summary.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
}

function createPreviewProject(): {
	readonly assets: UIAssetRegistry;
	readonly document: UIDocument;
} {
	const card = createPreviewCard();
	const document = createUIDocument({
		id: 'ui-runtime-preview',
		root: createUINode({
			id: 'screen',
			type: 'kui.Group',
			properties: { height: 450, width: 800 },
			children: [
				createUINode({
					id: 'background',
					type: 'kui.Rect',
					properties: {
						fillColor: 0x0f172a,
						height: 450,
						width: 800,
					},
				}),
				createUINode({
					id: 'title',
					type: 'kui.Label',
					properties: {
						bold: true,
						size: 38,
						text: 'UIDocument → live Kurot UI',
						textColor: 0xffffff,
						x: 92,
						y: 42,
					},
				}),
				createUINode({
					id: 'play-action',
					type: 'preview.ActionCard',
					properties: { x: 70, y: 135 },
					instance: createUIComponentInstance({
						source: { kind: 'asset', assetId: card.id },
						parameters: { label: 'PLAY' },
						variant: 'primary',
						slots: {
							content: [
								createUINode({
									id: 'play-hint',
									type: 'kui.Label',
									properties: {
										text: 'Reusable instance A',
										textColor: 0xbfdbfe,
									},
								}),
							],
						},
					}),
				}),
				createUINode({
					id: 'settings-action',
					type: 'preview.ActionCard',
					properties: { x: 430, y: 135 },
					instance: createUIComponentInstance({
						source: { kind: 'asset', assetId: card.id },
						parameters: { label: 'SETTINGS' },
						overrides: [
							{ part: 'label', property: 'textColor', value: 0xfde68a },
						],
					}),
				}),
			],
		}),
	});
	const assets = new UIAssetRegistry();
	assets.registerAsset(card);
	assets.registerAsset(document);
	assets.registerToken({
		key: 'color.action.primary',
		tokenType: 'color',
		value: 0x1d4ed8,
	});
	return { assets, document };
}

function createPreviewCard(): UIDocument {
	return createUIDocument({
		id: 'preview-action-card',
		assetKind: 'component',
		contract: createUIAssetContract({
			componentType: 'preview.ActionCard',
			parameters: {
				label: {
					valueType: 'string',
					required: true,
					bindings: [{ targetId: 'label', property: 'text' }],
				},
			},
			parts: { label: { nodeId: 'label' } },
			slots: { content: { nodeId: 'content-slot', capacity: 'multiple' } },
			variants: {
				primary: {
					overrides: [
						{
							targetId: 'background',
							property: 'fillColor',
							value: {
								kind: 'token',
								key: 'color.action.primary',
								tokenType: 'color',
							},
						},
					],
				},
			},
		}),
		root: createUINode({
			id: 'root',
			type: 'kui.Group',
			properties: { height: 180, width: 300 },
			children: [
				createUINode({
					id: 'background',
					type: 'kui.Rect',
					properties: {
						fillColor: 0x334155,
						height: 180,
						width: 300,
					},
				}),
				createUINode({
					id: 'label',
					type: 'kui.Label',
					properties: {
						bold: true,
						size: 28,
						text: 'Action',
						textColor: 0xffffff,
						x: 24,
						y: 28,
					},
				}),
				createUINode({
					id: 'content-slot',
					type: 'kui.Group',
					properties: { x: 24, y: 92 },
				}),
			],
		}),
	});
}

function requireElement<T extends Element>(
	selector: string,
	type: { new (): T },
): T {
	const element = document.querySelector(selector);
	if (element instanceof type) return element;
	throw new Error(`Required preview element "${selector}" is missing.`);
}
