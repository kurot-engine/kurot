/// <reference types="node" />

import { Stage, ticker } from '@kurot/core';
import { Button, Rect } from '@kurot/ui';
import {
	createUIAppearanceReference,
	createUIAssetContract,
	createUIDocument,
	createUINode,
	UIAssetRegistry,
} from '@kurot/ui-document';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createKurotUI } from '../src/index.js';

beforeAll(() => {
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
		font: '',
		measureText: (text: string) => ({ width: text.length * 10 }),
	} as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
	vi.useRealTimers();
});

describe('appearance transitions', () => {
	it('interpolates a numeric native-state override over its duration', () => {
		vi.useFakeTimers();
		const appearance = createUIDocument({
			id: 'transition-button',
			assetKind: 'appearance',
			contract: createUIAssetContract({
				targetType: 'kui.Button',
				states: {
					down: {
						overrides: [{
							targetId: 'background',
							property: 'alpha',
							value: 0.6,
							transition: { duration: 30, easing: 'linear' },
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

		button.currentState = 'down';
		button.validateNow();
		expect(background.alpha).toBe(1);
		vi.advanceTimersByTime(15);
		ticker.update(true);
		expect(background.alpha).toBeCloseTo(0.8, 5);
		vi.advanceTimersByTime(15);
		ticker.update(true);
		expect(background.alpha).toBeCloseTo(0.6, 5);
	});
});

function requireInstance<T>(
	value: unknown,
	type: abstract new (...args: never[]) => T,
): T {
	if (value instanceof type) {
		return value;
	}
	throw new Error(`Expected ${type.name} instance.`);
}
