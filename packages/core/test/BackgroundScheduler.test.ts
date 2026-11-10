import { afterEach, expect, it, vi } from 'vitest';
import { Stage } from '../src/kurot/display/Stage.js';
import { Event } from '../src/kurot/events/Event.js';
import { START_TIME, SystemTicker } from '../src/kurot/player/SystemTicker.js';

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

it('yields between catch-up frames, drains promises in order, and cancels all scheduling on stop', async () => {
	let wall = START_TIME + 1000;
	vi.spyOn(Date, 'now').mockImplementation(() => wall);
	const raf = new Map<number, FrameRequestCallback>();
	let id = 0;
	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
		raf.set(++id, callback);
		return id;
	});
	vi.stubGlobal('cancelAnimationFrame', (key: number) => { raf.delete(key); });
	const system = new SystemTicker();
	system.backgroundPolicy = 'continue';
	const stage = new Stage();
	let frames = 0;
	let settled = 0;
	let yieldedAt = 0;
	let finish: () => void = () => {};
	const complete = new Promise<void>(resolve => { finish = resolve; });
	const frame = (): void => {
		expect(settled).toBe(frames);
		frames++;
		void Promise.resolve().then(() => {}).then(() => {}).then(() => { settled++; });
		if (frames === 1800) {
			system.stop();
			finish();
		}
	};
	stage.addEventListener(Event.ENTER_FRAME, frame);
	try {
		system.start();
		wall += 60000; // A full minute with no browser delivery.
		const wake = [...raf.values()][0];
		raf.clear();
		wake(0);
		expect(frames).toBe(1);
		setTimeout(() => { yieldedAt = frames; }, 0);
		await complete;
		expect(yieldedAt).toBeGreaterThan(0);
		expect(yieldedAt).toBeLessThan(1800);
		expect(raf.size).toBe(0);
		expect(system.pendingTime).toBe(0);
	} finally {
		system.stop();
		stage.removeEventListener(Event.ENTER_FRAME, frame);
	}
});

it('switches between hidden timeouts and foreground animation frames without stale double wakes', () => {
	vi.useFakeTimers();
	const system = new SystemTicker();
	system.backgroundPolicy = 'continue';
	const tick = vi.fn(() => false);
	system.startTick(tick);
	try {
		system.start();
		system.setPageHidden(true);
		vi.advanceTimersByTime(1000);
		expect(tick).toHaveBeenCalledOnce();
		system.setPageHidden(false);
		system.setPageHidden(true);
		system.stop();
		const before = tick.mock.calls.length;
		vi.advanceTimersByTime(60000);
		expect(tick).toHaveBeenCalledTimes(before);
		expect(vi.getTimerCount()).toBe(0);
	} finally {
		system.stop();
		vi.useRealTimers();
	}
});

it('retains default wall-clock scheduling and default pause behavior', () => {
	const system = new SystemTicker();
	const times: number[] = [];
	const render = vi.fn();
	let wall = START_TIME + 1000;
	vi.spyOn(Date, 'now').mockImplementation(() => wall);
	system.addPlayer({ render });
	system.startTick(time => { times.push(time); return false; });
	system.update(true);
	system.setPageHidden(true);
	wall += 10000;
	system.update(true);
	expect(times).toEqual([1000]);
	system.setPageHidden(false);
	system.update(true);
	expect(times).toEqual([1000, 11000]);
	expect(render).toHaveBeenCalledTimes(2);
});
