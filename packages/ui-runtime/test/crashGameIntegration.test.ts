/// <reference types="node" />

import { Stage, TouchEvent } from '@kurot/core';
import { Button, Group, Image, Label, ProgressBar, Rect } from '@kurot/ui';
import {
	createUIAppearanceReference,
	createUIAssetContract,
	createUIDocument,
	createUINode,
	createUIResourceReference,
	UIAssetRegistry,
} from '@kurot/ui-document';
import type { UIDocument } from '@kurot/ui-document';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createKurotUI } from '../src/index.js';

beforeAll(() => {
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
		font: '',
		measureText: (text: string) => ({ width: text.length * 10 }),
	} as unknown as CanvasRenderingContext2D);
});

describe('crash-game integration', () => {
	it('materializes a data-driven screen with resources, actions, and transitions', () => {
		const buttonAppearance = createCrashButtonAppearance();
		const document = createCrashScreen(buttonAppearance.id);
		const assets = new UIAssetRegistry();
		assets.registerAsset(buttonAppearance);
		assets.registerResource({
			key: 'crash.logo',
			resourceType: 'image',
		});
		const emittedActions: string[] = [];

		const result = createKurotUI(document, {
			assets,
			data: {
				balanceText: '$1,250.00',
				multiplierText: '2.48x',
				roundProgress: 64,
			},
			onAction: action => {
				emittedActions.push(action.action);
			},
			resourceAdapters: {
				image: reference => `/game-assets/${reference.key}.png`,
			},
		});

		const root = requireInstance(result.root, Group);
		const logo = requireInstance(result.instances.get('logo'), Image);
		const balance = requireInstance(result.instances.get('balance'), Label);
		const multiplier = requireInstance(result.instances.get('multiplier'), Label);
		const progress = requireInstance(result.instances.get('round-progress'), ProgressBar);
		const bet = requireInstance(result.instances.get('bet-action'), Button);
		const cashout = requireInstance(result.instances.get('cashout-action'), Button);

		expect(root.width).toBe(800);
		expect(root.height).toBe(540);
		expect(logo.source).toBe('/game-assets/crash.logo.png');
		expect(balance.text).toBe('$1,250.00');
		expect(multiplier.text).toBe('2.48x');
		expect(progress.value).toBe(64);
		expect(bet.label).toBe('PLACE BET');
		expect(cashout.label).toBe('CASH OUT');

		result.data.setValue('multiplierText', '3.12x');
		result.data.setValue('roundProgress', 82);
		expect(multiplier.text).toBe('3.12x');
		expect(progress.value).toBe(82);

		TouchEvent.dispatchTouchEvent(bet, TouchEvent.TOUCH_TAP, true);
		TouchEvent.dispatchTouchEvent(cashout, TouchEvent.TOUCH_TAP, true);
		expect(emittedActions).toEqual(['betRequested', 'cashoutRequested']);

		const stage = new Stage();
		stage.addChild(root);
		bet.currentState = 'down';
		bet.validateNow();
		const betBackground = requireInstance(
			result.instances.get(
				'bet-action@appearance:crash-button-appearance/background',
			),
			Rect,
		);
		expect(betBackground.alpha).toBe(0.72);
	});
});

function createCrashScreen(buttonAppearanceId: string): UIDocument {
	return createUIDocument({
		id: 'crash-game-screen',
		contract: createUIAssetContract({
			dataFields: {
				balanceText: { valueType: 'string', defaultValue: '$0.00' },
				multiplierText: { valueType: 'string', defaultValue: '1.00x' },
				roundProgress: {
					valueType: 'number',
					minimum: 0,
					maximum: 100,
					defaultValue: 0,
				},
			},
			dataBindings: {
				balance: {
					source: 'balanceText',
					targetId: 'balance',
					property: 'text',
				},
				multiplier: {
					source: 'multiplierText',
					targetId: 'multiplier',
					property: 'text',
				},
				progress: {
					source: 'roundProgress',
					targetId: 'round-progress',
					property: 'value',
				},
			},
			actions: {
				betRequested: { sourceId: 'bet-action', trigger: 'tap' },
				cashoutRequested: { sourceId: 'cashout-action', trigger: 'tap' },
			},
		}),
		root: createUINode({
			id: 'screen',
			type: 'kui.Group',
			properties: { height: 540, width: 800 },
			children: [
				createUINode({
					id: 'background',
					type: 'kui.Rect',
					properties: { fillColor: 0x07111f, height: 540, width: 800 },
				}),
				createUINode({
					id: 'logo',
					type: 'kui.Image',
					properties: {
						height: 72,
						source: createUIResourceReference('image', 'crash.logo'),
						width: 220,
						x: 40,
						y: 32,
					},
				}),
				createUINode({
					id: 'balance',
					type: 'kui.Label',
					properties: { size: 20, textColor: 0xcbd5e1, x: 580, y: 48 },
				}),
				createUINode({
					id: 'multiplier',
					type: 'kui.Label',
					properties: {
						bold: true,
						size: 72,
						textColor: 0x5eead4,
						x: 300,
						y: 160,
					},
				}),
				createUINode({
					id: 'round-progress',
					type: 'kui.ProgressBar',
					properties: {
						height: 16,
						maximum: 100,
						minimum: 0,
						slideDuration: 0,
						width: 640,
						x: 80,
						y: 300,
					},
				}),
				createCrashActionNode(
					'bet-action',
					'PLACE BET',
					80,
					buttonAppearanceId,
				),
				createCrashActionNode(
					'cashout-action',
					'CASH OUT',
					430,
					buttonAppearanceId,
				),
			],
		}),
	});
}

function createCrashActionNode(
	id: string,
	label: string,
	x: number,
	appearanceId: string,
): ReturnType<typeof createUINode> {
	return createUINode({
		id,
		type: 'kui.Button',
		properties: { height: 72, label, width: 290, x, y: 390 },
		appearance: createUIAppearanceReference(appearanceId),
	});
}

function createCrashButtonAppearance(): UIDocument {
	return createUIDocument({
		id: 'crash-button-appearance',
		assetKind: 'appearance',
		contract: createUIAssetContract({
			targetType: 'kui.Button',
			parts: {
				background: { nodeId: 'background' },
				labelDisplay: { nodeId: 'labelDisplay' },
			},
			states: {
				down: {
					overrides: [{
						targetId: 'background',
						property: 'alpha',
						value: 0.72,
						transition: { duration: 0, easing: 'ease-out' },
					}],
				},
			},
		}),
		root: createUINode({
			id: 'root',
			type: 'kui.Group',
			properties: { height: 72, width: 290 },
			children: [
				createUINode({
					id: 'background',
					type: 'kui.Rect',
					properties: {
						ellipseHeight: 18,
						ellipseWidth: 18,
						fillColor: 0x0f766e,
						height: 72,
						width: 290,
					},
				}),
				createUINode({
					id: 'labelDisplay',
					type: 'kui.Label',
					properties: {
						bold: true,
						height: 72,
						size: 24,
						textAlign: 'center',
						textColor: 0xffffff,
						verticalAlign: 'middle',
						width: 290,
					},
				}),
			],
		}),
	});
}

function requireInstance<T>(
	value: unknown,
	type: abstract new (...args: never[]) => T,
): T {
	if (value instanceof type) {
		return value;
	}
	throw new Error(`Expected ${type.name} instance.`);
}
