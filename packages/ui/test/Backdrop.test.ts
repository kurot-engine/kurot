import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackdropBlur, Sprite, Stage } from '@kurot/core';
import { Backdrop, Group, Skin, UIContext, UILayer } from '../src/index.js';

const stages: Stage[] = [];

function stage(): Stage {
	const result = new Stage();
	result.setContentSize(800, 600);
	stages.push(result);
	return result;
}

function effect(backdrop: Backdrop): BackdropBlur {
	const child = backdrop.getChildAt(0);
	expect(child).toBeInstanceOf(BackdropBlur);
	return child as BackdropBlur;
}

function fill(backdrop: Backdrop): void {
	backdrop.left = backdrop.right = backdrop.top = backdrop.bottom = 0;
}

afterEach(() => {
	for (const current of stages.splice(0)) {
		current.removeChildren();
	}
});

describe('Backdrop', () => {
	it('starts with Core blur defaults and no intrinsic size', () => {
		const backdrop = new Backdrop();
		expect([backdrop.blurX, backdrop.blurY, backdrop.quality, backdrop.resolution]).toEqual([4, 4, 1, undefined]);
		expect([backdrop.width, backdrop.height]).toEqual([0, 0]);
		expect([backdrop.touchEnabled, backdrop.touchChildren]).toEqual([false, false]);
	});

	it('applies logical options and forwards changes with Core validation', () => {
		const backdrop = new Backdrop({ width: 90, height: 60, blurX: 36, blurY: 48, quality: 2, resolution: 0.5 });
		const root = stage();
		root.addChild(backdrop);
		backdrop.validateNow();
		expect([effect(backdrop).width, effect(backdrop).height]).toEqual([90, 60]);
		expect([effect(backdrop).blurX, effect(backdrop).blurY, effect(backdrop).quality, effect(backdrop).resolution])
			.toEqual([36, 48, 2, 0.5]);
		backdrop.blurX = 0;
		backdrop.blurY = 30;
		backdrop.quality = 1;
		backdrop.resolution = undefined;
		expect([effect(backdrop).blurX, effect(backdrop).blurY, effect(backdrop).quality, effect(backdrop).resolution])
			.toEqual([0, 30, 1, undefined]);
		for (const property of ['blurX', 'blurY', 'quality', 'resolution'] as const) {
			expect(() => { backdrop[property] = -1; }).toThrow();
		}
	});

	it('fills a UILayer and follows growing and shrinking Stage dimensions', () => {
		const root = stage();
		const layer = new UILayer();
		const backdrop = new Backdrop();
		fill(backdrop);
		layer.addChild(backdrop);
		root.addChild(layer);
		for (const [width, height] of [[800, 600], [1024, 768], [320, 200]]) {
			root.setContentSize(width, height);
			layer.validateNow();
			expect([backdrop.x, backdrop.y, backdrop.width, backdrop.height]).toEqual([0, 0, width, height]);
			expect([effect(backdrop).width, effect(backdrop).height]).toEqual([width, height]);
		}
	});

	it('uses parent constraints rather than global Stage dimensions', () => {
		const root = stage();
		const panel = new Group();
		panel.width = 200;
		panel.height = 120;
		const backdrop = new Backdrop();
		backdrop.left = 10;
		backdrop.right = 20;
		backdrop.top = 5;
		backdrop.bottom = 15;
		panel.addChild(backdrop);
		root.addChild(panel);
		panel.validateNow();
		expect([backdrop.x, backdrop.y, backdrop.width, backdrop.height]).toEqual([10, 5, 170, 100]);
		expect([effect(backdrop).width, effect(backdrop).height]).toEqual([170, 100]);
		panel.width = 100;
		panel.height = 60;
		panel.validateNow();
		expect([effect(backdrop).width, effect(backdrop).height]).toEqual([70, 40]);
	});

	it('supports percent/center layout and preserves local dimensions under scale', () => {
		const root = stage();
		const layer = new UILayer();
		const backdrop = new Backdrop();
		backdrop.percentWidth = 50;
		backdrop.percentHeight = 50;
		backdrop.horizontalCenter = backdrop.verticalCenter = 0;
		backdrop.scaleX = 2;
		layer.addChild(backdrop);
		root.addChild(layer);
		layer.validateNow();
		expect([backdrop.x, backdrop.y, backdrop.width, backdrop.height]).toEqual([200, 150, 200, 300]);
		expect([effect(backdrop).width, effect(backdrop).height]).toEqual([200, 300]);
	});

	it('does not use a previous allocation as its new preferred size', () => {
		const root = stage();
		const layer = new UILayer();
		const backdrop = new Backdrop();
		fill(backdrop);
		layer.addChild(backdrop);
		root.addChild(layer);
		layer.validateNow();
		backdrop.left = backdrop.right = backdrop.top = backdrop.bottom = NaN;
		backdrop.invalidateSize();
		layer.validateNow();
		expect([backdrop.width, backdrop.height, effect(backdrop).width, effect(backdrop).height]).toEqual([0, 0, 0, 0]);
	});

	it('passes hits through nested Core containers and keeps opt-in input possible', () => {
		const root = stage();
		const background = new Group();
		background.width = background.height = 100;
		root.addChild(background);
		background.validateNow();
		const parent = new Sprite();
		const backdrop = new Backdrop({ width: 100, height: 100 });
		parent.addChild(backdrop);
		root.addChild(parent);
		backdrop.validateNow();
		expect(root.$hitTest(30, 30)).toBe(background);
		backdrop.touchEnabled = true;
		expect(root.$hitTest(30, 30)).toBe(backdrop);
		backdrop.enabled = false;
		expect(root.$hitTest(30, 30)).toBe(background);
		backdrop.enabled = true;
		expect(root.$hitTest(30, 30)).toBe(backdrop);
		backdrop.touchEnabled = false;
		expect(root.$hitTest(30, 30)).toBe(background);
	});

	it('does not apply a UIContext default Skin', () => {
		const factory = vi.fn(() => new Skin());
		const context = new UIContext({
			skins: { blur: factory }, defaults: { Backdrop: 'blur' },
			assetAdapter: { getAsset: (source, reply) => reply(undefined, source) },
		});
		const backdrop = context.run(() => new Backdrop());
		stage().addChild(backdrop);
		backdrop.validateNow();
		expect(factory).not.toHaveBeenCalled();
		expect(backdrop.skin).toBeUndefined();
		expect(backdrop.numChildren).toBe(1);
		context.dispose();
	});

	it('retains one effect across attachment cycles without a new Stage listener', () => {
		const root = stage();
		const backdrop = new Backdrop({ width: 80, height: 60 });
		const original = effect(backdrop);
		for (let cycle = 0; cycle < 5; cycle++) {
			root.addChild(backdrop);
			backdrop.validateNow();
			expect(backdrop.numChildren).toBe(1);
			expect(effect(backdrop)).toBe(original);
			root.removeChild(backdrop);
			expect(backdrop.stage).toBeUndefined();
		}
		expect(root.hasEventListener('resize')).toBe(false);
	});
});
