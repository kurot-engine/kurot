/// <reference types="node" />

import { Event, Stage, Texture, TouchEvent } from '@kurot/core';
import {
	BasicLayout,
	Button,
	EditableText,
	Group,
	HorizontalLayout,
	Image,
	Label,
	ProgressBar,
	Rect,
	TileLayout,
	TextInput,
	ToggleButton,
	VerticalLayout,
} from '@kurot/ui';
import {
	createKurotUIFoundationRegistry,
	createUIAppearanceReference,
	createUIAssetContract,
	createUIDocument,
	createUINode,
	parseUIDocument,
	UIAssetRegistry,
} from '@kurot/ui-document';
import type { UIDocument } from '@kurot/ui-document';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createKurotUI, KurotUIRuntimeError } from '../src/index.js';

const FIXTURE_DIRECTORY = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'../../ui-document/test/fixtures',
);

beforeAll(() => {
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
		font: '',
		measureText: (text: string) => ({ width: text.length * 10 }),
	} as unknown as CanvasRenderingContext2D);
});

describe('createKurotUI', () => {
	it('applies bounded screen data and emits disposable semantic actions', () => {
		const actions: string[] = [];
		const document = createUIDocument({
			id: 'crash-runtime',
			contract: createUIAssetContract({
				dataFields: {
					multiplierText: { valueType: 'string', defaultValue: '1.00x' },
				},
				dataBindings: {
					multiplier: {
						source: 'multiplierText',
						targetId: 'multiplier',
						property: 'text',
					},
				},
				actions: {
					cashoutRequested: { sourceId: 'cashout', trigger: 'tap' },
					soundChanged: { sourceId: 'sound', trigger: 'change' },
				},
			}),
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				children: [
					createUINode({ id: 'multiplier', type: 'kui.Label' }),
					createUINode({ id: 'cashout', type: 'kui.Button' }),
					createUINode({ id: 'sound', type: 'kui.ToggleButton' }),
				],
			}),
		});
		const result = createKurotUI(document, {
			data: { multiplierText: '2.50x' },
			onAction: action => actions.push(action.action),
		});
		const multiplier = requireInstance(
			result.instances.get('multiplier'),
			Label,
		);
		const cashout = requireInstance(result.instances.get('cashout'), Button);
		const sound = requireInstance(result.instances.get('sound'), ToggleButton);

		expect(multiplier.text).toBe('2.50x');
		result.data.setValue('multiplierText', '3.10x');
		expect(result.data.getValue('multiplierText')).toBe('3.10x');
		expect(multiplier.text).toBe('3.10x');
		TouchEvent.dispatchTouchEvent(cashout, TouchEvent.TOUCH_TAP, true);
		sound.dispatchEventWith(Event.CHANGE);
		expect(actions).toEqual(['cashoutRequested', 'soundChanged']);

		result.dispose();
		TouchEvent.dispatchTouchEvent(cashout, TouchEvent.TOUCH_TAP, true);
		sound.dispatchEventWith(Event.CHANGE);
		expect(actions).toEqual(['cashoutRequested', 'soundChanged']);
	});

	it('executes bounded numeric appearance transitions', () => {
		const appearance = createUIDocument({
			id: 'transition-button',
			assetKind: 'appearance',
			contract: createUIAssetContract({
				targetType: 'kui.Button',
				states: {
					pressed: {
						overrides: [{
							targetId: 'background',
							property: 'alpha',
							value: 0.6,
							transition: { duration: 0, easing: 'linear' },
						}],
					},
				},
			}),
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				children: [
					createUINode({
						id: 'background',
						type: 'kui.Rect',
						properties: { alpha: 1 },
					}),
				],
			}),
		});
		const document = createUIDocument({
			id: 'transition-preview',
			root: createUINode({
				id: 'button',
				type: 'kui.Button',
				appearance: createUIAppearanceReference(appearance.id),
			}),
		});
		const assets = new UIAssetRegistry();
		assets.registerAsset(appearance);
		const result = createKurotUI(document, { assets });
		const button = requireInstance(result.root, Button);
		const background = requireInstance(
			result.instances.get('button@appearance:transition-button/background'),
			Rect,
		);
		const stage = new Stage();
		stage.addChild(button);
		button.currentState = 'pressed';
		button.validateNow();

		expect(background.alpha).toBe(0.6);
	});

	it('materializes the foundation components and inherited properties', () => {
		const document = createUIDocument({
			id: 'foundation-preview',
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				properties: {
					alpha: 0.9,
					height: 360,
					left: 24,
					layout: {
						type: 'kui.VerticalLayout',
						properties: { gap: 12, paddingLeft: 16, paddingTop: 20 },
					},
					width: 640,
				},
				children: [
					createUINode({
						id: 'title',
						type: 'kui.Label',
						properties: {
							bold: true,
							size: 28,
							text: 'Kurot UI Runtime',
							textColor: 0x38bdf8,
						},
					}),
					createUINode({
						id: 'image',
						type: 'kui.Image',
						properties: {
							fillMode: 'scale',
							scale9Grid: { height: 12, width: 14, x: 2, y: 3 },
							smoothing: false,
						},
					}),
					createUINode({
						id: 'panel',
						type: 'kui.Rect',
						properties: {
							fillAlpha: 0.75,
							fillColor: 0x172554,
							strokeColor: 0x60a5fa,
							strokeWeight: 2,
						},
					}),
					createUINode({
						id: 'action',
						type: 'kui.Button',
						properties: {
							enabled: false,
							label: 'Continue',
							selected: true,
							toggle: true,
						},
					}),
					createUINode({
						id: 'sound-toggle',
						type: 'kui.ToggleButton',
						properties: { label: 'Sound', selected: true },
					}),
					createUINode({
						id: 'loading-progress',
						type: 'kui.ProgressBar',
						properties: {
							direction: 'btt',
							maximum: 200,
							minimum: 10,
							slideDuration: 0,
							value: 125,
						},
					}),
				],
			}),
		});

		const result = createKurotUI(document);
		const root = requireInstance(result.root, Group);
		const title = requireInstance(result.instances.get('title'), Label);
		const image = requireInstance(result.instances.get('image'), Image);
		const panel = requireInstance(result.instances.get('panel'), Rect);
		const action = requireInstance(result.instances.get('action'), Button);
		const soundToggle = requireInstance(
			result.instances.get('sound-toggle'),
			ToggleButton,
		);
		const loadingProgress = requireInstance(
			result.instances.get('loading-progress'),
			ProgressBar,
		);

		expect(root.alpha).toBe(0.9);
		expect(root.left).toBe(24);
		expect(root.width).toBe(640);
		expect(root.height).toBe(360);
		expect(root.numChildren).toBe(6);
		expect(root.getChildAt(0)).toBe(title);
		const layout = requireInstance(root.layout, VerticalLayout);
		expect(layout.gap).toBe(12);
		expect(layout.paddingLeft).toBe(16);
		expect(layout.paddingTop).toBe(20);
		expect(title.text).toBe('Kurot UI Runtime');
		expect(title.bold).toBe(true);
		expect(image.smoothing).toBe(false);
		expect(image.scale9Grid).toMatchObject({ height: 12, width: 14, x: 2, y: 3 });
		expect(panel.fillColor).toBe(0x172554);
		expect(panel.strokeWeight).toBe(2);
		expect(action.label).toBe('Continue');
		expect(action.enabled).toBe(false);
		expect(action.selected).toBe(true);
		expect(action.toggle).toBe(true);
		expect(soundToggle.label).toBe('Sound');
		expect(soundToggle.selected).toBe(true);
		expect(soundToggle.toggle).toBe(true);
		expect(loadingProgress.direction).toBe('btt');
		expect(loadingProgress.maximum).toBe(200);
		expect(loadingProgress.minimum).toBe(10);
		expect(loadingProgress.slideDuration).toBe(0);
		expect(loadingProgress.value).toBe(125);
	});

	it('supports project components through a semantic definition and runtime adapter', () => {
		const registry = createKurotUIFoundationRegistry();
		registry.register({
			type: 'app.Panel',
			extends: 'kui.Group',
			children: 'multiple',
			properties: {
				title: { valueType: 'string' },
			},
		});
		const document = createUIDocument({
			id: 'custom-component',
			root: createUINode({
				id: 'panel',
				type: 'app.Panel',
				properties: { title: 'Inventory' },
				children: [createUINode({ id: 'label', type: 'kui.Label' })],
			}),
		});

		const result = createKurotUI(document, {
			registry,
			adapters: {
				'app.Panel': {
					create: () => new Group(),
					applyProperty: (instance, name, value) => {
						if (name !== 'title' || typeof value !== 'string') return false;
						instance.name = value;
						return true;
					},
				},
			},
		});
		const panel = requireInstance(result.root, Group);

		expect(panel.name).toBe('Inventory');
		expect(panel.numChildren).toBe(1);
		expect(result.instances.get('label')).toBeInstanceOf(Label);
	});

	it('binds ToggleButton and ProgressBar appearance parts to live controls', () => {
		const toggleAppearance = createUIDocument({
			id: 'toggle-appearance',
			assetKind: 'appearance',
			contract: createUIAssetContract({
				targetType: 'kui.ToggleButton',
				parts: { labelDisplay: { nodeId: 'labelDisplay' } },
			}),
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				children: [
					createUINode({ id: 'labelDisplay', type: 'kui.Label' }),
				],
			}),
		});
		const progressAppearance = createUIDocument({
			id: 'progress-appearance',
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
				children: [
					createUINode({
						id: 'thumb',
						type: 'kui.Rect',
						properties: { height: 30, width: 200 },
					}),
					createUINode({ id: 'labelDisplay', type: 'kui.Label' }),
				],
			}),
		});
		const document = createUIDocument({
			id: 'control-preview',
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				children: [
					createUINode({
						id: 'toggle',
						type: 'kui.ToggleButton',
						properties: { label: 'Sound', selected: true },
						appearance: createUIAppearanceReference(toggleAppearance.id),
					}),
					createUINode({
						id: 'progress',
						type: 'kui.ProgressBar',
						properties: { slideDuration: 0, value: 50 },
						appearance: createUIAppearanceReference(progressAppearance.id),
					}),
				],
			}),
		});
		const assets = new UIAssetRegistry();
		assets.registerAsset(toggleAppearance);
		assets.registerAsset(progressAppearance);

		const result = createKurotUI(document, { assets });
		const toggle = requireInstance(result.instances.get('toggle'), ToggleButton);
		const progress = requireInstance(
			result.instances.get('progress'),
			ProgressBar,
		);
		const toggleLabel = requireInstance(
			result.instances.get('toggle@appearance:toggle-appearance/labelDisplay'),
			Label,
		);
		const progressThumb = requireInstance(
			result.instances.get('progress@appearance:progress-appearance/thumb'),
			Rect,
		);
		const progressLabel = requireInstance(
			result.instances.get(
				'progress@appearance:progress-appearance/labelDisplay',
			),
			Label,
		);

		expect(toggle.labelDisplay).toBe(toggleLabel);
		expect(toggleLabel.text).toBe('Sound');
		expect(progress.thumb).toBe(progressThumb);
		expect(progress.labelDisplay).toBe(progressLabel);
		expect(progress.ratio).toBe(0.5);
		progress.updateDisplayList(200, 30);
		expect(progressThumb.scrollRect).toMatchObject({ width: 100, height: 30 });
		expect(progressLabel.text).toBe('50 / 100');

		const stage = new Stage();
		stage.addChild(result.root);
		dispatchTap(toggle);
		expect(toggle.selected).toBe(false);
		dispatchTap(toggle);
		expect(toggle.selected).toBe(true);
	});

	it('materializes EditableText as an authored appearance part', () => {
		const document = createUIDocument({
			id: 'editable-text-preview',
			root: createUINode({
				id: 'text-display',
				type: 'kui.EditableText',
				properties: {
					inputType: 'text',
					maxChars: 24,
					promptColor: 0x64748b,
					restrict: 'A-Za-z0-9_',
					size: 18,
					textColor: 0xe2e8f0,
				},
			}),
		});

		const editableText = requireInstance(
			createKurotUI(document).root,
			EditableText,
		);

		expect(editableText.inputType).toBe('text');
		expect(editableText.maxChars).toBe(24);
		expect(editableText.prompt).toBe('');
		expect(editableText.promptColor).toBe(0x64748b);
		expect(editableText.restrict).toBe('A-Za-z0-9_');
		expect(editableText.size).toBe(18);
		expect(editableText.textColor).toBe(0xe2e8f0);
	});

	it('binds a TextInput appearance and forwards cached input properties', () => {
		const appearance = createUIDocument({
			id: 'text-input-appearance',
			assetKind: 'appearance',
			contract: createUIAssetContract({
				targetType: 'kui.TextInput',
				parts: {
					promptDisplay: { nodeId: 'promptDisplay' },
					textDisplay: { nodeId: 'textDisplay' },
				},
				states: {
					normal: { overrides: [] },
					normalWithPrompt: {
						overrides: [
							{
								targetId: 'promptDisplay',
								property: 'visible',
								value: true,
							},
						],
					},
				},
			}),
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				children: [
					createUINode({ id: 'textDisplay', type: 'kui.EditableText' }),
					createUINode({
						id: 'promptDisplay',
						type: 'kui.Label',
						properties: { visible: false },
					}),
				],
			}),
		});
		const document = createUIDocument({
			id: 'text-input-preview',
			root: createUINode({
				id: 'player-name',
				type: 'kui.TextInput',
				properties: {
					displayAsPassword: true,
					inputType: 'text',
					maxChars: 20,
					prompt: 'Player name',
					restrict: 'A-Za-z0-9_',
					text: 'Kurot',
					textColor: 0x38bdf8,
				},
				appearance: createUIAppearanceReference(appearance.id),
			}),
		});
		const assets = new UIAssetRegistry();
		assets.registerAsset(appearance);

		const result = createKurotUI(document, { assets });
		const input = requireInstance(result.root, TextInput);
		const textDisplay = requireInstance(
			result.instances.get(
				'player-name@appearance:text-input-appearance/textDisplay',
			),
			EditableText,
		);
		const promptDisplay = requireInstance(
			result.instances.get(
				'player-name@appearance:text-input-appearance/promptDisplay',
			),
			Label,
		);

		expect(input.textDisplay).toBe(textDisplay);
		expect(input.promptDisplay).toBe(promptDisplay);
		expect(textDisplay.text).toBe('Kurot');
		expect(textDisplay.textColor).toBe(0x38bdf8);
		expect(textDisplay.displayAsPassword).toBe(true);
		expect(textDisplay.maxChars).toBe(20);
		expect(textDisplay.restrict).toBe('A-Za-z0-9_');
		expect(textDisplay.inputType).toBe('text');
		expect(promptDisplay.text).toBe('Player name');
		expect(promptDisplay.touchEnabled).toBe(false);
		const stage = new Stage();
		stage.addChild(input);
		input.validateNow();
		expect(input.currentState).toBe('normal');
		expect(promptDisplay.visible).toBe(false);

		input.text = '';
		input.validateNow();
		expect(input.currentState).toBe('normalWithPrompt');
		expect(promptDisplay.visible).toBe(true);

		let focused = false;
		textDisplay.setFocus = (): void => {
			focused = true;
		};
		dispatchTouchBegin(input);
		expect(focused).toBe(true);
	});

	it('materializes reusable assets and all instance-local semantics', () => {
		const actionCard = readFixture('action-card.component.json');
		const appearance = readFixture('button.appearance.json');
		const screen = readFixture('lobby.screen.json');
		const assets = new UIAssetRegistry();
		assets.registerAsset(actionCard);
		assets.registerAsset(appearance);
		assets.registerAsset(screen);
		assets.registerToken({
			key: 'color.action.primary',
			tokenType: 'color',
			value: 0x3366ff,
		});

		const result = createKurotUI(screen, { assets });
		const root = requireInstance(result.root, Group);
		const play = requireInstance(result.instances.get('play-action'), Group);
		const settings = requireInstance(result.instances.get('settings-action'), Group);
		const playLabel = requireInstance(result.instances.get('play-action/label'), Label);
		const settingsLabel = requireInstance(
			result.instances.get('settings-action/label'),
			Label,
		);
		const playBackground = requireInstance(
			result.instances.get('play-action/background'),
			Rect,
		);
		const playSlot = requireInstance(
			result.instances.get('play-action/content-slot'),
			Group,
		);
		const button = requireInstance(result.instances.get('native-button'), Button);
		const appearanceBackground = requireInstance(
			result.instances.get(
				'native-button@appearance:primary-button-appearance/background',
			),
			Rect,
		);

		expect(root.numChildren).toBe(3);
		expect(root.getChildAt(0)).toBe(play);
		expect(root.getChildAt(1)).toBe(settings);
		expect(play.left).toBe(24);
		expect(settings.right).toBe(24);
		expect(playLabel.text).toBe('Play');
		expect(playLabel.textColor).toBe(0xffffff);
		expect(settingsLabel.text).toBe('Settings');
		expect(playBackground.fillColor).toBe(0x3366ff);
		expect(playSlot.numChildren).toBe(1);
		expect(result.instances.get('play-hint')).toBe(playSlot.getChildAt(0));
		expect(button.label).toBe('Help');
		expect(button.skin?.skinParts).toEqual(['background']);
		expect(button.skin?.states.map(state => state.name)).toEqual(['pressed']);
		expect(appearanceBackground.fillColor).toBe(0x3366ff);
		expect(appearanceBackground.strokeWeight).toBe(2);
		const skin = button.skin;
		if (!skin) throw new Error('Expected materialized Skin.');
		skin.states[0]?.overrides[0]?.apply(button, skin);
		expect(appearanceBackground.alpha).toBe(0.8);

		const playState = result.stateControllers.get('play-action');
		const settingsState = result.stateControllers.get('settings-action');
		expect(playState?.states).toEqual(['disabled']);
		expect(settingsState?.states).toEqual(['disabled']);
		playState?.setState('disabled');
		expect(playState?.currentState).toBe('disabled');
		expect(play.alpha).toBe(0.5);
		expect(settings.alpha).toBe(1);
		expect(() => playState?.setState('missing')).toThrowError(
			expect.objectContaining({ code: 'unknown-state' }),
		);
		expect(playState?.currentState).toBe('disabled');
		expect(play.alpha).toBe(0.5);
		playState?.clearState();
		expect(playState?.currentState).toBeUndefined();
		expect(play.alpha).toBe(1);
	});

	it('rejects an unknown appearance variant before materialization', () => {
		const actionCard = readFixture('action-card.component.json');
		const appearance = readFixture('button.appearance.json');
		const screen = readFixture('lobby.screen.json');
		const nativeButton = screen.root.children[2]!;
		const invalidScreen = {
			...screen,
			root: {
				...screen.root,
				children: [
					...screen.root.children.slice(0, 2),
					{
						...nativeButton,
						appearance: {
							...nativeButton.appearance!,
							variant: 'missing',
						},
					},
				],
			},
		};
		const assets = new UIAssetRegistry();
		assets.registerAsset(actionCard);
		assets.registerAsset(appearance);
		const error = captureRuntimeError(() =>
			createKurotUI(invalidScreen, { assets }),
		);

		expect(error.code).toBe('invalid-document');
		expect(error.diagnostics).toContainEqual({
			code: 'unknown-variant',
			severity: 'error',
			path: '$.assets["lobby-screen"].root.children[2].appearance.variant',
			message:
				'Variant "missing" is not published by appearance asset "primary-button-appearance".',
		});
	});

	it('resolves registered image resources to runtime Texture objects', () => {
		const document = createUIDocument({
			id: 'resource-preview',
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				children: [
					createUINode({
						id: 'image',
						type: 'kui.Image',
						properties: {
							source: {
								kind: 'resource',
								key: 'image.logo',
								resourceType: 'image',
							},
					},
					}),
					createUINode({
						id: 'button',
						type: 'kui.Button',
						properties: {
							icon: {
								kind: 'resource',
								key: 'image.logo',
								resourceType: 'image',
							},
						},
					}),
				],
			}),
		});
		const assets = new UIAssetRegistry();
		assets.registerResource({ key: 'image.logo', resourceType: 'image' });
		const texture = new Texture();

		const result = createKurotUI(document, {
			assets,
			resourceAdapters: {
				image: () => texture,
			},
		});

		expect(
			requireInstance(result.instances.get('image'), Image).source,
		).toBe(texture);
		expect(
			requireInstance(result.instances.get('button'), Button).icon,
		).toBe(texture);
	});

	it('reports document validation failures as structured runtime errors', () => {
		const duplicate = createUINode({ id: 'duplicate', type: 'kui.Label' });
		const document = createUIDocument({
			id: 'invalid-document',
			root: createUINode({
				id: 'duplicate',
				type: 'kui.Group',
				children: [duplicate],
			}),
		});

		const error = captureRuntimeError(() => createKurotUI(document));

		expect(error.code).toBe('invalid-document');
		expect(error.path).toBe('$');
		expect(error.diagnostics.length).toBeGreaterThan(0);
	});

	it('rejects malformed semantic value objects at the exact runtime path', () => {
		const document = createUIDocument({
			id: 'invalid-layout',
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				properties: {
					layout: { type: 'kui.VerticalLayout', properties: { gap: 'wide' } },
				},
			}),
		});

		const error = captureRuntimeError(() => createKurotUI(document));

		expect(error.code).toBe('invalid-layout');
		expect(error.path).toBe('$.root.properties.layout.properties.gap');
	});

	it.each([
		['kui.BasicLayout', BasicLayout],
		['kui.HorizontalLayout', HorizontalLayout],
		['kui.TileLayout', TileLayout],
		['kui.VerticalLayout', VerticalLayout],
	] as const)('creates the supported %s descriptor', (layoutType, layoutClass) => {
		const document = createUIDocument({
			id: layoutType,
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				properties: { layout: { type: layoutType } },
			}),
		});

		const root = requireInstance(createKurotUI(document).root, Group);

		expect(root.layout).toBeInstanceOf(layoutClass);
	});

	it('rejects malformed nine-slice rectangles at the exact runtime path', () => {
		const document = createUIDocument({
			id: 'invalid-rectangle',
			root: createUINode({
				id: 'image',
				type: 'kui.Image',
				properties: {
					scale9Grid: { height: 12, width: -1, x: 2, y: 3 },
				},
			}),
		});

		const error = captureRuntimeError(() => createKurotUI(document));

		expect(error.code).toBe('invalid-rectangle');
		expect(error.path).toBe('$.root.properties.scale9Grid.width');
	});
});

function requireInstance<T extends object>(
	value: object | undefined,
	type: abstract new (...args: never[]) => T,
): T {
	if (value instanceof type) return value;
	throw new Error(`Expected ${type.name} instance.`);
}

function captureRuntimeError(operation: () => void): KurotUIRuntimeError {
	try {
		operation();
	} catch (error) {
		if (error instanceof KurotUIRuntimeError) return error;
		throw error;
	}
	throw new Error('Expected KurotUIRuntimeError.');
}

function dispatchTap(target: ToggleButton): void {
	TouchEvent.dispatchTouchEvent(
		target,
		TouchEvent.TOUCH_BEGIN,
		true,
		false,
		10,
		10,
		1,
		true,
	);
	TouchEvent.dispatchTouchEvent(
		target,
		TouchEvent.TOUCH_END,
		true,
		false,
		10,
		10,
		1,
		false,
	);
}

function dispatchTouchBegin(target: TextInput): void {
	TouchEvent.dispatchTouchEvent(
		target,
		TouchEvent.TOUCH_BEGIN,
		true,
		false,
		10,
		10,
		1,
		true,
	);
}

function readFixture(name: string): UIDocument {
	return parseUIDocument(
		readFileSync(resolve(FIXTURE_DIRECTORY, name), 'utf8'),
	);
}
