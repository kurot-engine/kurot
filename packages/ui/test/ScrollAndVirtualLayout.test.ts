import { describe, expect, it, vi } from 'vitest';
import { getTimer, Stage, TouchEvent } from '@kurot/core';
import { ArrayCollection, BasicLayout, Group, HorizontalLayout, ItemRenderer, List, Scroller, TileLayout, TouchScroll, VerticalLayout } from '../src/index.js';

class SizedRenderer extends ItemRenderer {
	public constructor() {
		super();
		this.width = 100;
		this.height = 50;
	}
}

describe('virtual layout integration', () => {
	for (const Layout of [TileLayout, VerticalLayout, HorizontalLayout]) {
		it(`${Layout.name} creates visible renderers and recycles offscreen indices`, () => {
			const list = new List();
			const layout = new Layout();
			list.layout = layout;
			list.itemRenderer = SizedRenderer;
			list.width = 415;
			list.height = 120;
			list.scrollEnabled = true;
			if (layout instanceof TileLayout) {
				layout.requestedColumnCount = 4;
				layout.columnWidth = 100;
				layout.rowHeight = 50;
				layout.horizontalGap = 5;
				layout.verticalGap = 10;
			}
			list.useVirtualLayout = true;
			list.dataProvider = new ArrayCollection(Array.from({ length: 100 }, (_, i) => i));
			list.commitProperties();
			layout.updateDisplayList(415, 120);
			expect(list.numChildren).toBeGreaterThan(0);
			expect(list.numChildren).toBeLessThan(100);
			expect(list.getElementAt(0)).toBeDefined();
			if (layout instanceof HorizontalLayout) {
				list.scrollH = 1000;
			} else {
				list.scrollV = 600;
			}
			layout.updateDisplayList(415, 120);
			expect(list.getElementAt(0)).toBeUndefined();
			expect(list.numChildren).toBeGreaterThan(0);
			expect(list.numChildren).toBeLessThan(100);
			list.scrollH = 0;
			list.scrollV = 0;
			layout.updateDisplayList(415, 120);
			expect(list.getElementAt(0)).toBeDefined();
		});
	}
	it('BasicLayout explicitly rejects virtualization', () => {
		const layout = new BasicLayout();
		layout.useVirtualLayout = true;
		expect(layout.useVirtualLayout).toBe(false);
	});
	it('virtual TileLayout uses measured renderer size without explicit cell dimensions', () => {
		const list = new List();
		const layout = new TileLayout();
		list.layout = layout;
		list.width = 415;
		list.height = 120;
		list.itemRenderer = SizedRenderer;
		list.useVirtualLayout = true;
		layout.requestedColumnCount = 4;
		list.dataProvider = new ArrayCollection(Array.from({ length: 100 }, (_, i) => i));
		list.commitProperties();
		list.measure();
		layout.updateDisplayList(415, 120);
		expect(layout.columnWidth).toBe(100);
		expect(layout.rowHeight).toBe(50);
		expect(list.numChildren).toBeGreaterThan(0);
		list.dataProvider.removeAll();
		list.commitProperties();
		layout.updateDisplayList(415, 120);
		expect(list.getElementAt(0)).toBeUndefined();
		for (let i = 0; i < list.numChildren; i++) {
			expect(list.getChildAt(i)?.visible).toBe(false);
		}
		expect(list.contentHeight).toBe(0);
	});
});

describe('scroll release lifecycle', () => {
	it('ends a real propagated drag before viewport capture swallows TOUCH_END', () => {
		const stage = new Stage();
		const scroller = new Scroller();
		const viewport = new Group();
		scroller.viewport = viewport;
		stage.addChild(scroller);
		viewport.setContentSize(100, 1000);
		vi.spyOn(viewport, 'getLayoutBounds').mockImplementation(bounds => { bounds.setTo(0, 0, 100, 100); });
		const send = (type: string, y: number): void => {
			const event = new TouchEvent(type, true, false, 20, y, 1);
			viewport.dispatchEvent(event);
		};
		send(TouchEvent.TOUCH_BEGIN, 50);
		send(TouchEvent.TOUCH_MOVE, 70);
		send(TouchEvent.TOUCH_MOVE, 90);
		expect(viewport.scrollV).toBeLessThan(0);
		send(TouchEvent.TOUCH_END, 90);
		expect(stage.hasEventListener(TouchEvent.TOUCH_MOVE)).toBe(false);
		send(TouchEvent.TOUCH_BEGIN, 50);
		expect(stage.hasEventListener(TouchEvent.TOUCH_MOVE)).toBe(true);
		send(TouchEvent.TOUCH_CANCEL, 50);
		stage.removeChild(scroller);
	});

	it('flings in the drag direction and notifies completion exactly once', () => {
		let position = 100;
		const end = vi.fn();
		const scroll = new TouchScroll(value => { position = value; }, end);
		const internal = scroll as unknown as {
			_onTick(time: number): boolean;
			_animation: { _doInterval(time: number): boolean };
		};
		scroll.start(100);
		scroll.update(80, 1000, position);
		internal._onTick(getTimer() + 20);
		scroll.finish(position, 1000);
		expect(scroll.isPlaying()).toBe(true);
		internal._animation._doInterval(getTimer() + 2000);
		expect(position).toBeGreaterThan(120);
		expect(position).toBeLessThanOrEqual(1000);
		expect(end).toHaveBeenCalledTimes(1);
		scroll.stop();
	});

	it('rebounds to the boundary and completes without leaving a tick running', () => {
		let position = -40;
		const end = vi.fn();
		const scroll = new TouchScroll(value => { position = value; }, end);
		scroll.finish(position, 500);
		const internal = scroll as unknown as { _animation: { _doInterval(time: number): boolean } };
		internal._animation._doInterval(getTimer() + 400);
		expect(position).toBe(0);
		expect(end).toHaveBeenCalledTimes(1);
		expect(scroll.isPlaying()).toBe(false);
	});
	for (const bounces of [true, false]) {
		it(`reverse fling stays within bounds with bounces=${bounces}`, () => {
			let position = 500;
			const end = vi.fn();
			const scroll = new TouchScroll(value => { position = value; }, end);
			scroll.bounces = bounces;
			const internal = scroll as unknown as {
				_onTick(time: number): boolean;
				_animation: { _doInterval(time: number): boolean };
			};
			scroll.start(100);
			scroll.update(150, 1000, position);
			internal._onTick(getTimer() + 20);
			scroll.finish(position, 1000);
			internal._animation._doInterval(getTimer() + 2000);
			expect(position).toBeGreaterThanOrEqual(0);
			expect(position).toBeLessThan(450);
			expect(end).toHaveBeenCalledTimes(1);
		});
	}
	it('interrupting a rebound stops its animation without reporting completion', () => {
		const end = vi.fn();
		const scroll = new TouchScroll(() => {}, end);
		scroll.finish(-40, 500);
		expect(scroll.isPlaying()).toBe(true);
		scroll.stop();
		expect(scroll.isPlaying()).toBe(false);
		expect(scroll.isStarted()).toBe(false);
		expect(end).not.toHaveBeenCalled();
	});
});
