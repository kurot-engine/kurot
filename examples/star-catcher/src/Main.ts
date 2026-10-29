import { createPlayer, Sprite, ticker } from '@kurot/core';
import type { GameSnapshot } from './GameModel.js';
import { GameSession } from './GameSession.js';

function button(id: string): HTMLButtonElement {
	const element = document.getElementById(id);
	if (!(element instanceof HTMLButtonElement)) throw new Error(`Missing button: ${id}`);
	return element;
}

function gameElements(): { canvas: HTMLCanvasElement; status: HTMLOutputElement; closedMessage: HTMLElement } {
	const canvas = document.getElementById('gameCanvas');
	const status = document.getElementById('game-status');
	const closedMessage = document.getElementById('closed-message');
	if (!(canvas instanceof HTMLCanvasElement) || !(status instanceof HTMLOutputElement) || !closedMessage) {
		throw new Error('Missing game canvas or accessible status output.');
	}
	return { canvas, status, closedMessage };
}

const { canvas, status, closedMessage } = gameElements();
const start = button('start');
const pause = button('pause');
const restart = button('restart');
const close = button('close');
const app = createPlayer({ canvas });
const root = new Sprite();
const controls = new AbortController();
let disposed = false;

function showState(state: GameSnapshot): void {
	const message = `Score ${state.score} · Chances ${state.lives} · ${state.phase}`;
	if (status.textContent !== message) {
		status.textContent = message;
	}
	status.dataset.phase = state.phase;
	status.dataset.score = String(state.score);
	status.dataset.lives = String(state.lives);
	status.dataset.playerX = String(state.playerX);
	start.disabled = state.phase !== 'ready' && state.phase !== 'paused';
	start.textContent = state.phase === 'paused' ? 'Resume' : 'Start';
	pause.disabled = state.phase !== 'playing';
}

app.start(root);
let session = new GameSession(app.stage, root, showState);
start.addEventListener('click', () => session.start(), { signal: controls.signal });
pause.addEventListener('click', () => session.pause(), { signal: controls.signal });
restart.addEventListener('click', () => {
	session.dispose();
	session = new GameSession(app.stage, root, showState);
	session.start();
}, { signal: controls.signal });

function dispose(): void {
	if (disposed) return;
	disposed = true;
	session.dispose();
	controls.abort();
	app.destroy();
	// This page owns the only Player and every ticker consumer.
	ticker.stop();
	status.dataset.phase = 'disposed';
	status.textContent = 'Game closed. Reload the page to play again.';
	canvas.style.visibility = 'hidden';
	closedMessage.hidden = false;
	for (const control of [start, pause, restart, close]) {
		control.disabled = true;
	}
}

close.addEventListener('click', dispose, { signal: controls.signal });
window.addEventListener('pagehide', dispose, { signal: controls.signal });
