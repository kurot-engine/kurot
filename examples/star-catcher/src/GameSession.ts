import { Event, ticker } from '@kurot/core';
import type { Sprite, Stage } from '@kurot/core';
import { GameInput } from './GameInput.js';
import { GameModel } from './GameModel.js';
import type { GameSnapshot } from './GameModel.js';
import { GameView } from './GameView.js';

/**
 * Owns one round's display tree, input listeners and ticker callback.
 * dispose() is final; restart creates a new session on the existing Player.
 */
export class GameSession {
	private readonly _model = new GameModel();
	private readonly _view = new GameView();
	private readonly _input: GameInput;
	private _lastTime?: number;
	private _ticking = false;
	private _disposed = false;
	private readonly _onDeactivate = (): void => this.pause();
	private readonly _onTick = (timeStamp: number): boolean => {
		const seconds = this._lastTime === undefined ? 0 : (timeStamp - this._lastTime) / 1000;
		this._lastTime = timeStamp;
		this._model.update(seconds, this._input.axis);
		if (this._model.snapshot.phase === 'ended') {
			this.stopActivity();
		}
		this.render();
		return false;
	};

	public constructor(
		private readonly _stage: Stage,
		private readonly _root: Sprite,
		private readonly _onChange: (state: GameSnapshot) => void,
	) {
		this._input = new GameInput(_stage, this._view, x => {
			this._model.moveTo(x);
			this.render();
		}, () => this.pause());
		_root.addChild(this._view);
		_stage.addEventListener(Event.DEACTIVATE, this._onDeactivate);
		this.render();
	}

	public start(): void {
		if (this._disposed || this._ticking) return;
		this._model.start();
		if (this._model.snapshot.phase !== 'playing') return;
		this._lastTime = undefined;
		this._input.start();
		ticker.startTick(this._onTick, this);
		this._ticking = true;
		this.render();
	}

	public pause(): void {
		if (this._disposed) return;
		this._model.pause();
		this.stopActivity();
		this.render();
	}

	public dispose(): void {
		if (this._disposed) return;
		this._disposed = true;
		this.stopActivity();
		this._stage.removeEventListener(Event.DEACTIVATE, this._onDeactivate);
		this._model.dispose();
		this._root.removeChild(this._view);
		this._view.removeChildren();
	}

	private stopActivity(): void {
		if (this._ticking) {
			ticker.stopTick(this._onTick, this);
			this._ticking = false;
		}
		this._input.stop();
		this._lastTime = undefined;
	}

	private render(): void {
		const snapshot = this._model.snapshot;
		this._view.render(snapshot);
		this._onChange(snapshot);
	}
}
