import { Bitmap, resource, ticker, TouchEvent } from '@kurot/core';
import type { Texture } from '@kurot/core';
import { makePage } from './common.js';

const page = makePage('Asset Hunt — tap the gem', ['start', 'retry', 'restart', 'close']);
export const app = page.app;
const controls = new AbortController();
let phase = 'ready'; let score = 0; let loaded = 0; let total = 2; let generation = 0;
let rules = { points: 5, goal: 15 };
let gem: Bitmap | undefined;

function mirror(): void {
	page.mirror(phase, score, { loaded: String(loaded), total: String(total) });
	page.buttons.start.disabled = phase !== 'ready';
	page.buttons.retry.disabled = phase !== 'error';
	page.buttons.restart.disabled = phase !== 'ended';
	page.buttons.close.disabled = phase === 'disposed';
}

function collect(): void {
	if (phase !== 'playing') return;
	score += rules.points;
	if (score >= rules.goal) { phase = 'ended'; }
	mirror();
}

function release(): void {
	gem?.removeEventListener(TouchEvent.TOUCH_TAP, collect);
	if (gem?.parent) { gem.parent.removeChild(gem); }
	gem = undefined;
	if (resource.hasGroup('round')) { resource.destroyGroup('round'); }
}

async function load(): Promise<void> {
	if (phase === 'disposed') return;
	const own = ++generation;
	release(); phase = 'loading'; score = 0; loaded = 0; mirror();
	try {
		await resource.loadConfig('resource/default.res.json', 'resource/');
		await resource.loadGroup('round', 0, (done, count) => {
			if (own !== generation) return;
			loaded = done; total = count; mirror();
		});
		if (own !== generation) return;
		const texture = resource.get<Texture>('gem');
		const configuration = resource.get<{ points: number; goal: number }>('rules');
		if (!texture || !configuration) throw new Error('Missing loaded data.');
		rules = configuration; gem = new Bitmap(texture); gem.name = 'gem';
		gem.x = 272; gem.y = 312; gem.width = 96; gem.height = 96; gem.touchEnabled = true;
		gem.addEventListener(TouchEvent.TOUCH_TAP, collect); page.root.addChild(gem);
		phase = 'playing'; mirror();
	} catch {
		if (own === generation) { phase = 'error'; mirror(); }
	} finally {
		if (phase === 'disposed') { release(); }
	}
}

function dispose(): void {
	if (phase === 'disposed') return;
	generation++; phase = 'disposed'; controls.abort(); release(); mirror(); app.destroy(); ticker.stop();
}

for (const id of ['start', 'retry', 'restart']) {
	page.buttons[id].addEventListener('click', () => { void load(); }, { signal: controls.signal });
}
page.buttons.close.addEventListener('click', dispose, { signal: controls.signal });
window.addEventListener('pagehide', dispose, { signal: controls.signal });
mirror();
