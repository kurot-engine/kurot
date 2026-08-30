import { createPlayer, Event } from '@kurot/core';
import { TextInput, ToggleButton } from '@kurot/ui';
import type { UIDocument } from '@kurot/ui-document';
import {
	createUIAppearanceReference,
	createUIAssetContract,
	createUIComponentInstance,
	createUIDocument,
	createUINode,
	UIAssetRegistry,
} from '@kurot/ui-document';
import { createKurotUI } from '@kurot/ui-runtime';
import {
	createPreviewTextInputAppearance,
	createPreviewTextInputNode,
} from './textInputPreview.js';

const canvas = requireElement('#game', HTMLCanvasElement);
const status = requireElement('#status', HTMLElement);
const summary = requireElement('#summary', HTMLPreElement);

try {
	const { assets, document } = createPreviewProject();
	const result = createKurotUI(document, { assets });
	result.stateControllers.get('settings-action')?.setState('disabled');
	const soundToggle = result.instances.get('sound-toggle');
	if (!(soundToggle instanceof ToggleButton)) {
		throw new Error('Preview ToggleButton was not materialized.');
	}
	const playerName = result.instances.get('player-name');
	if (!(playerName instanceof TextInput) || !playerName.textDisplay) {
		throw new Error('Preview TextInput was not materialized with its textDisplay.');
	}
	let toggleChangeCount = 0;
	let inputChangeCount = 0;
	const updateStatus = (): void => {
		const state = soundToggle.selected ? 'ON' : 'OFF';
		soundToggle.label = `SOUND ${state}`;
		const inputState = playerName.text || 'empty';
		status.textContent =
			`Rendered · Toggle ${state} (${toggleChangeCount}) · ` +
			`Input ${inputState} (${inputChangeCount})`;
	};
	soundToggle.addEventListener(Event.CHANGE, () => {
		toggleChangeCount++;
		updateStatus();
	});
	playerName.textDisplay.addEventListener(Event.CHANGE, () => {
		inputChangeCount++;
		updateStatus();
	});
	const app = createPlayer({
		canvas,
		contentWidth: 800,
		contentHeight: 540,
		frameRate: 60,
		scaleMode: 'showAll',
	});
	app.start(result.root);
	updateStatus();
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
	const buttonAppearance = createPreviewButtonAppearance();
	const progressAppearance = createPreviewProgressAppearance();
	const textInputAppearance = createPreviewTextInputAppearance();
	const toggleAppearance = createPreviewToggleAppearance();
	const document = createUIDocument({
		id: 'ui-runtime-preview',
		root: createUINode({
			id: 'screen',
			type: 'kui.Group',
			properties: { height: 540, width: 800 },
			children: [
				createUINode({
					id: 'background',
					type: 'kui.Rect',
					properties: {
						fillColor: 0x0f172a,
						height: 540,
						width: 800,
					},
				}),
				createUINode({
					id: 'title',
					type: 'kui.Label',
					properties: {
						bold: true,
						size: 30,
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
										size: 16,
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
				createUINode({
					id: 'button-caption',
					type: 'kui.Label',
					properties: {
						size: 13,
						text: 'Button',
						textColor: 0x94a3b8,
						x: 40,
						y: 333,
					},
				}),
				createUINode({
					id: 'toggle-caption',
					type: 'kui.Label',
					properties: {
						size: 13,
						text: 'ToggleButton · click repeatedly',
						textColor: 0x94a3b8,
						x: 290,
						y: 333,
					},
				}),
				createUINode({
					id: 'progress-caption',
					type: 'kui.Label',
					properties: {
						size: 13,
						text: 'ProgressBar',
						textColor: 0x94a3b8,
						x: 540,
						y: 333,
					},
				}),
				createUINode({
					id: 'variant-button',
					type: 'kui.Button',
					properties: {
						label: 'VARIANT BUTTON',
						x: 40,
						y: 360,
					},
					appearance: createUIAppearanceReference(
						buttonAppearance.id,
						'outlined',
					),
				}),
				createUINode({
					id: 'sound-toggle',
					type: 'kui.ToggleButton',
					properties: {
						label: 'SOUND ON',
						selected: true,
						x: 290,
						y: 360,
					},
					appearance: createUIAppearanceReference(toggleAppearance.id),
				}),
				createUINode({
					id: 'loading-progress',
					type: 'kui.ProgressBar',
					properties: {
						direction: 'ltr',
						maximum: 100,
						minimum: 0,
						slideDuration: 0,
						value: 72,
						x: 540,
						y: 370,
					},
					appearance: createUIAppearanceReference(progressAppearance.id),
				}),
				createUINode({
					id: 'text-input-caption',
					type: 'kui.Label',
					properties: {
						size: 13,
						text: 'TextInput · click and type',
						textColor: 0x94a3b8,
						x: 220,
						y: 438,
					},
				}),
				createPreviewTextInputNode(textInputAppearance.id),
			],
		}),
	});
	const assets = new UIAssetRegistry();
	assets.registerAsset(card);
	assets.registerAsset(buttonAppearance);
	assets.registerAsset(progressAppearance);
	assets.registerAsset(textInputAppearance);
	assets.registerAsset(toggleAppearance);
	assets.registerAsset(document);
	assets.registerToken({
		key: 'color.action.primary',
		tokenType: 'color',
		value: 0x1d4ed8,
	});
	return { assets, document };
}

function createPreviewToggleAppearance(): UIDocument {
	return createUIDocument({
		id: 'preview-toggle-appearance',
		assetKind: 'appearance',
		contract: createUIAssetContract({
			targetType: 'kui.ToggleButton',
			parts: {
				background: { nodeId: 'background' },
				labelDisplay: { nodeId: 'labelDisplay' },
			},
			states: {
				down: {
					overrides: [
						{
							targetId: 'background',
							property: 'fillColor',
							value: 0x1e293b,
						},
					],
				},
				downAndSelected: {
					overrides: [
						{
							targetId: 'background',
							property: 'fillColor',
							value: 0x065f46,
						},
					],
				},
				up: {
					overrides: [
						{
							targetId: 'background',
							property: 'fillColor',
							value: 0x334155,
						},
					],
				},
				upAndSelected: {
					overrides: [
						{
							targetId: 'background',
							property: 'fillColor',
							value: 0x047857,
						},
					],
				},
			},
		}),
		root: createUINode({
			id: 'root',
			type: 'kui.Group',
			properties: { height: 58, width: 210 },
			children: [
				createUINode({
					id: 'background',
					type: 'kui.Rect',
					properties: {
						fillColor: 0x334155,
						height: 58,
						strokeColor: 0x34d399,
						strokeWeight: 2,
						width: 210,
					},
				}),
				createUINode({
					id: 'labelDisplay',
					type: 'kui.Label',
					properties: {
						height: 58,
						size: 18,
						text: 'SOUND ON',
						textAlign: 'center',
						textColor: 0xffffff,
						verticalAlign: 'middle',
						width: 210,
					},
				}),
			],
		}),
	});
}

function createPreviewProgressAppearance(): UIDocument {
	return createUIDocument({
		id: 'preview-progress-appearance',
		assetKind: 'appearance',
		contract: createUIAssetContract({
			targetType: 'kui.ProgressBar',
			parts: {
				labelDisplay: { nodeId: 'labelDisplay' },
				thumb: { nodeId: 'thumb' },
			},
		}),
		root: createUINode({
			id: 'root',
			type: 'kui.Group',
			properties: { height: 38, width: 220 },
			children: [
				createUINode({
					id: 'track',
					type: 'kui.Rect',
					properties: {
						fillColor: 0x1e293b,
						height: 38,
						strokeColor: 0x475569,
						strokeWeight: 2,
						width: 220,
					},
				}),
				createUINode({
					id: 'thumb',
					type: 'kui.Rect',
					properties: {
						fillColor: 0x0284c7,
						height: 38,
						width: 220,
					},
				}),
				createUINode({
					id: 'labelDisplay',
					type: 'kui.Label',
					properties: {
						height: 38,
						size: 16,
						textAlign: 'center',
						textColor: 0xffffff,
						verticalAlign: 'middle',
						width: 220,
					},
				}),
			],
		}),
	});
}

function createPreviewButtonAppearance(): UIDocument {
	return createUIDocument({
		id: 'preview-button-appearance',
		assetKind: 'appearance',
		contract: createUIAssetContract({
			targetType: 'kui.Button',
			parts: {
				background: { nodeId: 'background' },
				labelDisplay: { nodeId: 'labelDisplay' },
			},
			variants: {
				outlined: {
					overrides: [
						{
							targetId: 'background',
							property: 'strokeWeight',
							value: 4,
						},
					],
				},
			},
		}),
		root: createUINode({
			id: 'root',
			type: 'kui.Group',
			properties: { height: 58, width: 220 },
			children: [
				createUINode({
					id: 'background',
					type: 'kui.Rect',
					properties: {
						fillColor: 0x1e293b,
						height: 58,
						strokeColor: 0x38bdf8,
						width: 220,
					},
				}),
				createUINode({
					id: 'labelDisplay',
					type: 'kui.Label',
					properties: {
						height: 58,
						size: 16,
						text: 'VARIANT BUTTON',
						textAlign: 'center',
						textColor: 0xffffff,
						verticalAlign: 'middle',
						width: 220,
					},
				}),
			],
		}),
	});
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
			states: {
				disabled: {
					overrides: [
						{
							targetId: 'root',
							property: 'alpha',
							value: 0.55,
						},
					],
				},
			},
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
						size: 22,
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
