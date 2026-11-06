import { afterEach, describe, expect, it, vi } from 'vitest';
import { SystemTicker, START_TIME, ticker } from '../src/kurot/player/SystemTicker.js';
import { Timer } from '../src/kurot/utils/Timer.js';
import { TimerEvent } from '../src/kurot/events/TimerEvent.js';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('SystemTicker callback ownership', () => {
	it('deduplicates function identities, supplies timestamps and calls without a receiver', () => {
		const system = new SystemTicker();
		const received: Array<{ receiver: unknown; time: number }> = [];
		const schedule = vi.spyOn(globalThis, 'requestAnimationFrame');
		vi.spyOn(Date, 'now').mockReturnValue(START_TIME + 1200);
		function onTick(this: unknown, time: number): boolean {
			received.push({ receiver: this, time });
			return false;
		}
		system.startTick(onTick);
		system.startTick(onTick);
		expect(schedule).not.toHaveBeenCalled();
		system.update(true);
		expect(received).toEqual([{ receiver: undefined, time: 1200 }]);
		system.stopTick(() => false);
		system.stopTick(onTick);
		system.stopTick(onTick);
		system.update(true);
		expect(received).toHaveLength(1);
	});

	it('keeps distinct bound callbacks independent and removes the retained identity', () => {
		const system = new SystemTicker();
		const first = { calls: 0 };
		const second = { calls: 0 };
		function update(this: { calls: number }): boolean {
			this.calls++;
			return false;
		}
		const firstTick = update.bind(first);
		const secondTick = update.bind(second);
		system.startTick(firstTick);
		system.startTick(secondTick);
		system.update(true);
		system.stopTick(firstTick);
		system.update(true);
		expect(first.calls).toBe(1);
		expect(second.calls).toBe(2);
	});

	it('keeps the current snapshot stable when callbacks add or remove registrations', () => {
		const system = new SystemTicker();
		const calls: string[] = [];
		const third = (): boolean => {
			calls.push('third');
			return false;
		};
		const second = (): boolean => {
			calls.push('second');
			return false;
		};
		const first = (): boolean => {
			calls.push('first');
			system.stopTick(second);
			system.startTick(third);
			return false;
		};
		system.startTick(first);
		system.startTick(second);
		system.update(true);
		expect(calls).toEqual(['first', 'second']);
		system.update(true);
		expect(calls).toEqual(['first', 'second', 'first', 'third']);
	});

	it('honors rendering requests while the normal rendered frame is throttled', () => {
		const system = new SystemTicker();
		const render = vi.fn();
		vi.spyOn(Date, 'now').mockReturnValue(START_TIME);
		system.addPlayer({ render });
		system.startTick(() => true);
		system.update();
		expect(render).toHaveBeenCalledWith(false, 0);
	});

	it('pauses callbacks and resumes with the same function registrations', () => {
		const system = new SystemTicker();
		const callback = vi.fn(() => false);
		system.startTick(callback);
		system.pause();
		system.update(true);
		expect(callback).not.toHaveBeenCalled();
		system.resume();
		system.update(true);
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('drives Timer arrow callbacks and unregisters them on completion', () => {
		let now = START_TIME;
		vi.spyOn(Date, 'now').mockImplementation(() => now);
		const timer = new Timer(100, 2);
		const onTimer = vi.fn();
		const onComplete = vi.fn();
		timer.addEventListener(TimerEvent.TIMER, onTimer);
		timer.addEventListener(TimerEvent.TIMER_COMPLETE, onComplete);
		try {
			timer.start();
			now += 100;
			ticker.update(true);
			now += 100;
			ticker.update(true);
			now += 100;
			ticker.update(true);
			expect(onTimer).toHaveBeenCalledTimes(2);
			expect(onComplete).toHaveBeenCalledTimes(1);
			expect(timer.running).toBe(false);
		} finally {
			timer.stop();
		}
	});
});
