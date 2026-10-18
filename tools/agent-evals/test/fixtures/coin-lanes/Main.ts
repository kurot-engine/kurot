import { createPlayer, Shape, Sprite, TextField, ticker, TouchEvent } from '@kurot/core';

function canvasElement(): HTMLCanvasElement {
	const canvas = document.getElementById('gameCanvas');
	if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing canvas.');
	return canvas;
}

function button(id: string): HTMLButtonElement {
	const element = document.createElement('button');
	element.id = id;
	element.textContent = id[0].toUpperCase() + id.slice(1);
	document.body.append(element);
	return element;
}

const app = createPlayer({ canvas: canvasElement(), contentWidth: 640, contentHeight: 800 });
const root = new Sprite();
const background = new Shape();
background.graphics.beginFill(0x173741);
background.graphics.drawRect(0, 0, 640, 800);
background.graphics.endFill();
background.touchEnabled = true;
root.addChild(background);
const coin = new Shape();
coin.graphics.beginFill(0xffcf50);
coin.graphics.drawCircle(0, 0, 18);
coin.graphics.endFill();
root.addChild(coin);
const basket = new Shape();
basket.graphics.beginFill(0x8dd7c2);
basket.graphics.drawRect(-45, -10, 90, 20);
basket.graphics.endFill();
basket.y = 680;
root.addChild(basket);
const hud = new TextField();
hud.width = 620;
hud.x = 10;
hud.y = 10;
hud.size = 20;
root.addChild(hud);
app.start(root);
const start = button('start');
const restart = button('restart');
const close = button('close');
const status = document.createElement('output');
status.id = 'status';
document.body.append(status);
const controls = new AbortController();
const lanes = [120, 320, 520];
const sequence = [1, 0, 2];
let phase: 'ready' | 'playing' | 'ended' | 'disposed' = 'ready';
let lane = 1;
let index = 0;
let y = 100;
let score = 0;
let lives = 3;
let previous: number | undefined;

function render(): void {
	basket.x = lanes[lane];
	coin.x = lanes[sequence[index % sequence.length]];
	coin.y = y;
	hud.text = `Score ${score} Lives ${lives} — A/D, arrows or tap a lane`;
	status.textContent = `${phase}: ${score}, ${lives}`;
	Object.assign(status.dataset, { phase, score: String(score), lives: String(lives), lane: String(lane) });
}

function tick(time: number): boolean {
	const seconds = previous === undefined ? 0 : Math.min((time - previous) / 1000, .05);
	previous = time;
	if (phase !== 'playing') return false;
	const before = y;
	y += 300 * seconds;
	if (before < 680 && y >= 680 && lane === sequence[index % sequence.length]) {
		score++;
		y = 100;
		index++;
	} else if (y >= 760) {
		lives--;
		y = 100;
		index++;
		if (lives === 0) { phase = 'ended'; ticker.stopTick(tick, undefined); }
	}
	render();
	return false;
}

function begin(): void {
	if (phase === 'disposed') return;
	ticker.stopTick(tick, undefined);
	phase = 'playing';
	lane = 1; index = 0; y = 100; score = 0; lives = 3; previous = undefined;
	ticker.startTick(tick, undefined);
	render();
}

function touch(event: TouchEvent): void {
	if (phase !== 'playing') return;
	lane = Math.max(0, Math.min(2, Math.floor(event.stageX / 640 * 3)));
	render();
}

function dispose(): void {
	if (phase === 'disposed') return;
	phase = 'disposed';
	ticker.stopTick(tick, undefined);
	app.stage.removeEventListener(TouchEvent.TOUCH_BEGIN, touch);
	controls.abort();
	app.destroy();
	ticker.stop();
	for (const control of [start, restart, close]) { control.disabled = true; }
	render();
}

window.addEventListener('keydown', event => {
	if (phase !== 'playing' || event.repeat) return;
	if (['ArrowLeft', 'KeyA'].includes(event.code)) lane = Math.max(0, lane - 1);
	if (['ArrowRight', 'KeyD'].includes(event.code)) lane = Math.min(2, lane + 1);
	event.preventDefault();
	render();
}, { signal: controls.signal });
window.addEventListener('pagehide', dispose, { signal: controls.signal });
app.stage.addEventListener(TouchEvent.TOUCH_BEGIN, touch);
start.addEventListener('click', begin, { signal: controls.signal });
restart.addEventListener('click', begin, { signal: controls.signal });
close.addEventListener('click', dispose, { signal: controls.signal });
render();
