import { TouchEvent } from '@kurot/core';
import type { Sprite, Stage } from '@kurot/core';

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);

export class GameInput {
	private readonly _pressed = new Set<string>();
	private _active = false;
	private _touchId?: number;

	private readonly _onKeyDown = (event: KeyboardEvent): void => {
		if (LEFT.has(event.code) || RIGHT.has(event.code)) {
			event.preventDefault();
			this._pressed.add(event.code);
		}
	};

	private readonly _onKeyUp = (event: KeyboardEvent): void => {
		if (LEFT.has(event.code) || RIGHT.has(event.code)) {
			event.preventDefault();
			this._pressed.delete(event.code);
		}
	};

	private readonly _onBlur = (): void => this._pause();

	private readonly _onTouchBegin = (event: TouchEvent): void => {
		if (this._touchId !== undefined) return;
		this._touchId = event.touchPointID;
		this._onTouchMove(event);
	};

	private readonly _onTouchMove = (event: TouchEvent): void => {
		if (event.touchPointID === this._touchId) {
			this._moveTo(this._view.globalToLocal(event.stageX, event.stageY).x);
		}
	};

	private readonly _onTouchEnd = (event: TouchEvent): void => {
		if (event.touchPointID === this._touchId) {
			this._touchId = undefined;
		}
	};

	public constructor(
		private readonly _stage: Stage,
		private readonly _view: Sprite,
		private readonly _moveTo: (x: number) => void,
		private readonly _pause: () => void,
	) {}

	public get axis(): number {
		return Number([...RIGHT].some(key => this._pressed.has(key))) -
			Number([...LEFT].some(key => this._pressed.has(key)));
	}

	public start(): void {
		if (this._active) return;
		this._active = true;
		window.addEventListener('keydown', this._onKeyDown);
		window.addEventListener('keyup', this._onKeyUp);
		window.addEventListener('blur', this._onBlur);
		this._stage.addEventListener(TouchEvent.TOUCH_BEGIN, this._onTouchBegin);
		this._stage.addEventListener(TouchEvent.TOUCH_MOVE, this._onTouchMove);
		this._stage.addEventListener(TouchEvent.TOUCH_END, this._onTouchEnd);
		this._stage.addEventListener(TouchEvent.TOUCH_RELEASE_OUTSIDE, this._onTouchEnd);
		this._stage.addEventListener(TouchEvent.TOUCH_CANCEL, this._onTouchEnd);
	}

	public stop(): void {
		if (!this._active) return;
		this._active = false;
		window.removeEventListener('keydown', this._onKeyDown);
		window.removeEventListener('keyup', this._onKeyUp);
		window.removeEventListener('blur', this._onBlur);
		this._stage.removeEventListener(TouchEvent.TOUCH_BEGIN, this._onTouchBegin);
		this._stage.removeEventListener(TouchEvent.TOUCH_MOVE, this._onTouchMove);
		this._stage.removeEventListener(TouchEvent.TOUCH_END, this._onTouchEnd);
		this._stage.removeEventListener(TouchEvent.TOUCH_RELEASE_OUTSIDE, this._onTouchEnd);
		this._stage.removeEventListener(TouchEvent.TOUCH_CANCEL, this._onTouchEnd);
		this._pressed.clear();
		this._touchId = undefined;
	}
}
