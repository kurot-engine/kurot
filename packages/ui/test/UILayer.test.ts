import { afterEach, describe, expect, it, vi } from 'vitest';
import { Event, Sprite, Stage, StageScaleMode } from '@kurot/core';
import { Group } from '../src/kurot/components/Group.js';
import { UILayer } from '../src/kurot/components/UILayer.js';

const stages: Stage[] = [];

function createStage(width = 800, height = 600): Stage {
	const stage = new Stage();
	stage.scaleMode = StageScaleMode.NO_SCALE;
	stage.setContentSize(width, height);
	stages.push(stage);
	return stage;
}

afterEach(() => {
	for (const stage of stages.splice(0)) {
		stage.removeChildren();
	}
	vi.restoreAllMocks();
});

describe('UILayer stage sizing', () => {
	it('uses logical stage dimensions immediately on attachment', () => {
		const stage = createStage();
		const layer = new UILayer();
		stage.addChild(layer);

		expect([layer.width, layer.height]).toEqual([800, 600]);
	});

	it('tracks growing and shrinking viewports without writing Stage bounds', () => {
		const stage = createStage();
		stage.width = 17;
		stage.height = 19;
		const layer = new UILayer();
		stage.addChild(layer);

		for (const [width, height] of [[1024, 768], [320, 480]]) {
			stage.setContentSize(width, height);
			expect([layer.width, layer.height]).toEqual([width, height]);
			expect([stage.width, stage.height]).toEqual([17, 19]);
		}
	});

	it('updates percentage and centered child layout after resizing', () => {
		const stage = createStage();
		const layer = new UILayer();
		const child = new Group();
		child.percentWidth = 50;
		child.percentHeight = 50;
		child.horizontalCenter = 0;
		child.verticalCenter = 0;
		layer.addChild(child);
		stage.addChild(layer);
		layer.validateNow();
		expect([child.width, child.height, child.x, child.y]).toEqual([400, 300, 200, 150]);

		stage.setContentSize(1024, 768);
		layer.validateNow();
		expect([child.width, child.height, child.x, child.y]).toEqual([512, 384, 256, 192]);
	});

	it('removes its listener after its stage reference has been cleared', () => {
		const stage = createStage();
		const layer = new UILayer();
		stage.addChild(layer);
		expect(stage.hasEventListener(Event.RESIZE)).toBe(true);

		stage.removeChild(layer);
		expect(layer.stage).toBeUndefined();
		expect(stage.hasEventListener(Event.RESIZE)).toBe(false);
		stage.setContentSize(1024, 768);
		expect([layer.width, layer.height]).toEqual([800, 600]);
	});

	it('also detaches when a plain Core ancestor leaves the stage', () => {
		const stage = createStage();
		const parent = new Sprite();
		const layer = new UILayer();
		parent.addChild(layer);
		stage.addChild(parent);

		stage.removeChild(parent);
		expect(layer.stage).toBeUndefined();
		expect(stage.hasEventListener(Event.RESIZE)).toBe(false);
	});

	it('resynchronizes on repeated attachment without duplicating callbacks', () => {
		const stage = createStage();
		const layer = new UILayer();
		stage.addChild(layer);
		const setWidth = vi.spyOn(layer, 'width', 'set');
		const setHeight = vi.spyOn(layer, 'height', 'set');

		for (let cycle = 0; cycle < 3; cycle++) {
			stage.removeChild(layer);
			setWidth.mockClear();
			setHeight.mockClear();
			stage.setContentSize(900 + cycle, 700 + cycle);
			expect(setWidth).not.toHaveBeenCalled();
			expect(setHeight).not.toHaveBeenCalled();

			stage.addChild(layer);
			expect([layer.width, layer.height]).toEqual([900 + cycle, 700 + cycle]);
			setWidth.mockClear();
			setHeight.mockClear();
			stage.setContentSize(1000 + cycle, 800 + cycle);
			expect(setWidth).toHaveBeenCalledExactlyOnceWith(1000 + cycle);
			expect(setHeight).toHaveBeenCalledExactlyOnceWith(800 + cycle);
		}
	});

	it('switches stage ownership without retaining the old listener', () => {
		const first = createStage();
		const second = createStage(640, 480);
		const layer = new UILayer();
		first.addChild(layer);
		second.addChild(layer);

		expect(first.hasEventListener(Event.RESIZE)).toBe(false);
		expect(second.hasEventListener(Event.RESIZE)).toBe(true);
		expect([layer.width, layer.height]).toEqual([640, 480]);
		const setWidth = vi.spyOn(layer, 'width', 'set');
		first.setContentSize(1280, 720);
		expect(setWidth).not.toHaveBeenCalled();
		second.setContentSize(960, 540);
		expect(setWidth).toHaveBeenCalledExactlyOnceWith(960);
		expect([layer.width, layer.height]).toEqual([960, 540]);
	});

	it('sizes multiple layers independently and preserves remaining listeners', () => {
		const stage = createStage();
		const first = new UILayer();
		const second = new UILayer();
		stage.addChild(first);
		stage.addChild(second);
		stage.setContentSize(1024, 768);
		expect([first.width, first.height, second.width, second.height]).toEqual([1024, 768, 1024, 768]);

		stage.removeChild(first);
		expect(stage.hasEventListener(Event.RESIZE)).toBe(true);
		stage.setContentSize(640, 480);
		expect([first.width, first.height]).toEqual([1024, 768]);
		expect([second.width, second.height]).toEqual([640, 480]);
		stage.removeChild(second);
		expect(stage.hasEventListener(Event.RESIZE)).toBe(false);
	});
});
