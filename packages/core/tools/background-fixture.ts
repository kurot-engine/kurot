import { createPlayer, Shape, ticker, Event, getTimer, Timer, TimerEvent } from '../src/index.js';
import { Tween } from '../../game/src/index.js';

// This test host withholds callback delivery without using the engine's pause.
const nativeTimeout = window.setTimeout.bind(window);
const nativeRAF = window.requestAnimationFrame.bind(window);
const held: Array<() => void> = [];
let suspended = false;
const scheduleTimeout = (handler: TimerHandler, delay?: number, ...args: unknown[]): number => {
	return nativeTimeout(() => {
		const deliver = (): void => {
			if (typeof handler === 'function') {
				handler(...args);
			}
		};
		if (suspended) {
			held.push(deliver);
		} else {
			deliver();
		}
	}, delay);
};
Object.defineProperty(window, 'setTimeout', { configurable: true, value: scheduleTimeout });
window.requestAnimationFrame = callback => nativeRAF(time => {
	if (suspended) {
		held.push(() => callback(time));
	} else {
		callback(time);
	}
});

const canvas = document.querySelector('canvas');
if (!canvas) {
	throw new Error('Missing test canvas.');
}
const backgroundPolicy = new URL(location.href).searchParams.get('mode') === 'pause' ? 'pause' : 'continue';
const app = createPlayer({ canvas, contentWidth: 640, contentHeight: 240, frameRate: 30, backgroundPolicy });
const square = new Shape();
square.graphics.beginFill(0x72e5d2);
square.graphics.drawRect(0, 0, 32, 32);
square.graphics.endFill();
square.y = 100;
app.stage.addChild(square);
let frames = 0;
let renders = 0;
let seconds = 0;
let completed = 0;
const render = app.player.render.bind(app.player);
app.player.render = (...args): void => {
	renders++;
	render(...args);
};
const timer = new Timer(1000);
timer.addEventListener(TimerEvent.TIMER, () => { seconds++; });
timer.start();
const frame = (): void => { frames++; };
app.stage.addEventListener(Event.ENTER_FRAME, frame);
Tween.get(square, { loop: true }).to({ x: 540 }, 3000)
	.call(() => { completed++; }).to({ x: 0 }, 3000);
app.start();

const probe = {
	suspend(): void { suspended = true; },
	restore(): void {
		suspended = false;
		for (const callback of held.splice(0)) {
			nativeTimeout(callback, 0);
		}
	},
	snapshot() {
		return { frames, renders, seconds, completed, x: square.x, time: getTimer(), pending: ticker.pendingTime, hidden: document.hidden };
	},
	pause(): void { ticker.pause(); },
	resume(): void { ticker.resume(); },
	destroy(): void {
		timer.stop();
		Tween.removeAllTweens();
		app.stage.removeEventListener(Event.ENTER_FRAME, frame);
		app.destroy();
	},
};
Object.assign(window, { probe });
