import { Shape, ticker } from '@kurot/core';
import { Ease, Tween } from '@kurot/game';
import { makePage } from './common.js';

const page = makePage('Tween Sprint — three laps', ['start', 'pause', 'restart', 'close']);
export const app = page.app;
const runner = new Shape(); runner.name = 'runner'; runner.x = 120; runner.y = 360;
runner.graphics.beginFill(0xffce60); runner.graphics.drawCircle(0, 0, 24); runner.graphics.endFill();
page.root.addChild(runner);
const controls = new AbortController();
let phase = 'ready'; let score = 0; let generation = 0;

function mirror(): void {
	page.mirror(phase, score, { x: String(runner.x) });
	page.buttons.start.disabled = phase !== 'ready';
	page.buttons.pause.disabled = !['playing', 'paused'].includes(phase);
	page.buttons.restart.disabled = phase === 'disposed';
	page.buttons.close.disabled = phase === 'disposed';
}

function lap(own: number): void {
	runner.x = 120;
	Tween.get(runner, { onChange: () => { if (phase === 'playing' && own === generation) { mirror(); } } })
		.to({ x: 520 }, 800, Ease.linear).call(() => {
			if (own !== generation || phase !== 'playing') return;
			score++;
			if (score === 3) { phase = 'ended'; mirror(); }
			else { lap(own); }
		});
}

function start(): void {
	if (phase === 'disposed') return;
	generation++; Tween.removeTweens(runner); score = 0; phase = 'playing'; lap(generation); mirror();
}

function pause(): void {
	if (phase === 'playing') { phase = 'paused'; Tween.pauseTweens(runner); }
	else if (phase === 'paused') { phase = 'playing'; Tween.resumeTweens(runner); }
	mirror();
}

function dispose(): void {
	if (phase === 'disposed') return;
	generation++; phase = 'disposed'; Tween.removeTweens(runner); controls.abort(); mirror(); app.destroy(); page.root.removeChildren(); ticker.stop();
}

page.buttons.start.addEventListener('click', start, { signal: controls.signal });
page.buttons.restart.addEventListener('click', start, { signal: controls.signal });
page.buttons.pause.addEventListener('click', pause, { signal: controls.signal });
page.buttons.close.addEventListener('click', dispose, { signal: controls.signal });
window.addEventListener('pagehide', dispose, { signal: controls.signal });
mirror();
