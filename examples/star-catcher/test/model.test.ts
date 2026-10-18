import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GameModel, PLAYER_HALF_WIDTH } from '../src/GameModel.js';

function advance(model: GameModel, seconds: number): void {
	for (let i = 0; i < Math.ceil(seconds * 60); i++) {
		model.update(1 / 60, 0);
	}
}

describe('Star Catcher round rules', () => {
	it('scores a catch once and advances to a different target', () => {
		const model = new GameModel();
		model.start();
		advance(model, 2.3);
		expect(model.snapshot.score).toBe(10);
		expect(model.snapshot.lives).toBe(3);
		expect(model.snapshot.starX).toBe(160);
	});

	it('ends after three misses and stops advancing', () => {
		const model = new GameModel();
		model.start();
		model.moveTo(0);
		advance(model, 10);
		expect(model.snapshot).toMatchObject({ phase: 'ended', lives: 0, score: 0 });
		const ended = model.snapshot;
		model.start();
		model.moveTo(320);
		advance(model, 3);
		expect(model.snapshot).toEqual(ended);
	});

	it('clamps movement and long frames and freezes paused or disposed rounds', () => {
		const model = new GameModel();
		model.start();
		model.moveTo(-100);
		expect(model.snapshot.playerX).toBe(PLAYER_HALF_WIDTH);
		model.update(60, 0);
		expect(model.snapshot.starY).toBeLessThan(GAME_HEIGHT / 2);
		model.pause();
		const paused = model.snapshot;
		advance(model, 60);
		model.moveTo(500);
		expect(model.snapshot).toEqual(paused);
		model.start();
		advance(model, .1);
		expect(model.snapshot.starY).toBeGreaterThan(paused.starY);
		model.dispose();
		const disposed = model.snapshot;
		model.start();
		advance(model, 5);
		expect(model.snapshot).toEqual(disposed);
	});

	it('creates an independent fresh round for restart', () => {
		const previous = new GameModel();
		previous.start();
		advance(previous, 2.3);
		previous.dispose();
		const next = new GameModel();
		next.start();
		expect(next.snapshot).toMatchObject({ phase: 'playing', score: 0, lives: 3, playerX: 320 });
		expect(previous.snapshot.phase).toBe('disposed');
	});
});
