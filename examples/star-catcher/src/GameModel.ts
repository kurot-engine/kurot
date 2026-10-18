export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 800;
export const PLAYER_Y = 686;
export const PLAYER_HALF_WIDTH = 46;
const STAR_RADIUS = 18;
const SPAWN_X = [320, 160, 480, 240, 400];

export type GamePhase = 'ready' | 'playing' | 'paused' | 'ended' | 'disposed';

export interface GameSnapshot {
	readonly phase: GamePhase;
	readonly score: number;
	readonly lives: number;
	readonly playerX: number;
	readonly starX: number;
	readonly starY: number;
}

/**
 * Application-owned rules in logical pixels. update() accepts elapsed seconds.
 * Spawn positions repeat deterministically so runs can be reproduced.
 */
export class GameModel {
	private _phase: GamePhase = 'ready';
	private _score = 0;
	private _lives = 3;
	private _playerX = GAME_WIDTH / 2;
	private _starX = SPAWN_X[0];
	private _starY = 168;
	private _spawnIndex = 0;

	public get snapshot(): GameSnapshot {
		return {
			phase: this._phase, score: this._score, lives: this._lives,
			playerX: this._playerX, starX: this._starX, starY: this._starY,
		};
	}

	public start(): void {
		if (this._phase === 'ready' || this._phase === 'paused') {
			this._phase = 'playing';
		}
	}

	public pause(): void {
		if (this._phase === 'playing') {
			this._phase = 'paused';
		}
	}

	public moveTo(x: number): void {
		if (this._phase !== 'playing' || !Number.isFinite(x)) return;
		this._playerX = Math.max(PLAYER_HALF_WIDTH, Math.min(GAME_WIDTH - PLAYER_HALF_WIDTH, x));
	}

	/**
	 * Long frames discard time beyond 50 ms; paused/disposed rounds never advance.
	 */
	public update(seconds: number, axis: number): void {
		if (this._phase !== 'playing' || !Number.isFinite(seconds) || seconds <= 0) return;
		const dt = Math.min(seconds, 0.05);
		this.moveTo(this._playerX + Math.max(-1, Math.min(1, axis)) * 400 * dt);
		const previousY = this._starY;
		this._starY += (240 + Math.min(this._score, 300)) * dt;
		// Swept crossing avoids skipping a catch between two updates.
		if (previousY <= PLAYER_Y && this._starY >= PLAYER_Y &&
			Math.abs(this._starX - this._playerX) <= PLAYER_HALF_WIDTH + STAR_RADIUS) {
			this._score += 10;
			this.nextStar();
		} else if (this._starY > GAME_HEIGHT - 42) {
			this._lives--;
			if (this._lives === 0) {
				this._phase = 'ended';
			} else {
				this.nextStar();
			}
		}
	}

	public dispose(): void {
		this._phase = 'disposed';
	}

	private nextStar(): void {
		this._spawnIndex++;
		this._starX = SPAWN_X[this._spawnIndex % SPAWN_X.length];
		this._starY = 168;
	}
}
