import { describe, it, expect, vi, afterEach } from 'vitest';
import { Stage } from '../src/blakron/display/Stage.js';
import { DisplayObject } from '../src/blakron/display/DisplayObject.js';
import { StageScaleMode } from '../src/blakron/display/enums/StageScaleMode.js';
import { OrientationMode } from '../src/blakron/display/enums/OrientationMode.js';
import { Event } from '../src/blakron/events/Event.js';

describe('Stage', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('setContentSize dispatches RESIZE event', () => {
		const stage = new Stage();
		const fn = vi.fn();
		stage.addEventListener(Event.RESIZE, fn);

		stage.setContentSize(800, 600);

		expect(fn).toHaveBeenCalledOnce();
		expect(stage.stageWidth).toBe(800);
		expect(stage.stageHeight).toBe(600);
	});

	it('scaleMode no-ops on same value', () => {
		const stage = new Stage();
		const fn = vi.fn();
		stage.addEventListener(Event.RESIZE, fn);

		stage.scaleMode = StageScaleMode.SHOW_ALL; // same as default
		expect(fn).not.toHaveBeenCalled();
	});

	it('orientation no-ops on same value', () => {
		const stage = new Stage();
		const fn = vi.fn();
		stage.addEventListener(Event.RESIZE, fn);

		stage.orientation = OrientationMode.AUTO;
		expect(fn).not.toHaveBeenCalled();
	});

	it('is a DisplayObjectContainer (can hold $children)', () => {
		const stage = new Stage();
		const child = new DisplayObject();
		stage.addChild(child);
		expect(stage.numChildren).toBe(1);
		expect(child.parent).toBe(stage);
	});
});
