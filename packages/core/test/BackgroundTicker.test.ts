import { afterEach, describe, expect, it, vi } from 'vitest';
import { Stage } from '../src/kurot/display/Stage.js';
import { Event } from '../src/kurot/events/Event.js';
import { getTimer, setupLifecycle, START_TIME, SystemTicker, ticker } from '../src/kurot/player/SystemTicker.js';

afterEach(() => {
	ticker.stop();
	ticker.resume();
	ticker.setPageHidden(false);
	ticker.backgroundPolicy = 'pause';
	vi.restoreAllMocks();
});

function fixture(): { system: SystemTicker; stage: Stage; advance: (ms: number) => void; drain: () => void } {
	let wall = START_TIME + 1000;
	vi.spyOn(Date, 'now').mockImplementation(() => wall);
	const system = new SystemTicker();
	system.backgroundPolicy = 'continue';
	const stage = new Stage();
	return {
		system, stage,
		advance(ms): void {
			wall += ms;
			system.update();
		},
		drain(): void {
			for (let i = 0; system.pendingTime >= 1000 / 30 - 0.000001 && i < 10000; i++) {
				system.update();
			}
		},
	};
}

describe('optional continuous logic', () => {
	it('replays every frame in timestamp order without hidden renders or duplicate updates', () => {
		const { system, stage, advance, drain } = fixture();
		const trace: Array<string | number> = [];
		const render = vi.fn();
		const frame = (): void => { trace.push('frame'); };
		stage.addEventListener(Event.ENTER_FRAME, frame);
		system.startTick(time => { trace.push(time); return true; });
		system.addPlayer({ render });
		try {
			system.setPageHidden(true);
			advance(2000);
			expect(trace).toHaveLength(2); // One frame per task, never a synchronous catch-up loop.
			drain();
			expect(trace).toHaveLength(120);
			expect(trace[118]).toBeCloseTo(3000);
			expect(render).not.toHaveBeenCalled();
			system.update(true);
			expect(trace).toHaveLength(120);
			system.setPageHidden(false);
			advance(1000 / 30);
			expect(trace).toHaveLength(122);
			expect(render).toHaveBeenCalledOnce();
		} finally {
			stage.removeEventListener(Event.ENTER_FRAME, frame);
		}
	});

	it('excludes business pause time even across visibility changes and retained debt', () => {
		const { system, advance, drain } = fixture();
		const times: number[] = [];
		system.startTick(time => { times.push(time); return false; });
		advance(100);
		system.pause();
		system.setPageHidden(true);
		advance(10000);
		system.setPageHidden(false);
		advance(10000);
		expect(times).toHaveLength(1);
		system.resume();
		drain();
		expect(times).toHaveLength(3);
		advance(100);
		drain();
		expect(times).toHaveLength(6);
		expect(times.at(-1)).toBeCloseTo(1200);
	});

	it('gives getTimer the same logical timestamp and preserves deferred work before ENTER_FRAME', () => {
		let wall = START_TIME + 1000;
		vi.spyOn(Date, 'now').mockImplementation(() => wall);
		ticker.backgroundPolicy = 'continue';
		const trace: string[] = [];
		const stage = new Stage();
		const frame = (): void => { trace.push('frame'); };
		const callback = (time: number): boolean => {
			expect(getTimer()).toBe(time);
			ticker.callLater(() => { trace.push('later'); });
			trace.push('tick');
			return false;
		};
		const player = { render: vi.fn() };
		ticker.addPlayer(player);
		ticker.startTick(callback);
		stage.addEventListener(Event.ENTER_FRAME, frame);
		try {
			ticker.setPageHidden(true);
			wall += 1000;
			ticker.update();
			expect(getTimer()).toBe(1034);
			expect(trace).toEqual(['tick', 'later', 'frame']);
			expect(player.render).not.toHaveBeenCalled();
		} finally {
			ticker.stopTick(callback);
			ticker.removePlayer(player);
			stage.removeEventListener(Event.ENTER_FRAME, frame);
		}
	});

	it('default lifecycle resume never clears a business pause', () => {
		const stage = new Stage();
		const callback = vi.fn(() => false);
		ticker.startTick(callback);
		const hidden = vi.spyOn(document, 'hidden', 'get');
		const dispose = setupLifecycle(stage);
		try {
			ticker.pause();
			hidden.mockReturnValue(true);
			document.dispatchEvent(new globalThis.Event('visibilitychange'));
			hidden.mockReturnValue(false);
			document.dispatchEvent(new globalThis.Event('visibilitychange'));
			ticker.update(true);
			expect(callback).not.toHaveBeenCalled();
			ticker.resume();
			ticker.update(true);
			expect(callback).toHaveBeenCalledOnce();
		} finally {
			dispose();
			ticker.stopTick(callback);
		}
	});
});
