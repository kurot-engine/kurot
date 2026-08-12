import { Event } from '../events/Event.js';
import { FocusEvent } from '../events/FocusEvent.js';
import { TouchEvent } from '../events/TouchEvent.js';
import { TextField } from './TextField.js';
import { StageText } from './StageText.js';

/**
 * Manages the input lifecycle for a TextField in INPUT mode.
 * Coordinates between the TextField, StageText (native input element),
 * and touch events.
 */
export class InputController {
	// ── Instance fields ───────────────────────────────────────────────────────

	public stageText: StageText;

	private _text: TextField;
	private _isFocus = false;
	private _stageTextAdded = false;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(text: TextField) {
		this._text = text;
		this.stageText = new StageText();
		this.stageText.setTextField(text);
	}

	public addStageText(): void {
		if (this._stageTextAdded) return;

		this._text.touchEnabled = true;

		this.stageText.addToStage();
		this.stageText.addEventListener('updateText', this.onUpdateText);
		this.stageText.addEventListener('focus', this.onFocus);
		this.stageText.addEventListener('blur', this.onBlur);
		this._text.addEventListener(TouchEvent.TOUCH_BEGIN, this.onTouchBegin);
		this._text.addEventListener(TouchEvent.TOUCH_MOVE, this.onTouchMove);

		this._stageTextAdded = true;
	}

	public removeStageText(): void {
		if (!this._stageTextAdded) return;

		this.stageText.removeFromStage();
		this.stageText.removeEventListener('updateText', this.onUpdateText);
		this.stageText.removeEventListener('focus', this.onFocus);
		this.stageText.removeEventListener('blur', this.onBlur);
		this._text.removeEventListener(TouchEvent.TOUCH_BEGIN, this.onTouchBegin);
		this._text.removeEventListener(TouchEvent.TOUCH_MOVE, this.onTouchMove);
		this._text.stage?.removeEventListener(TouchEvent.TOUCH_BEGIN, this.onStageDown);

		if (this._isFocus) {
			this._isFocus = false;
			this._text.setIsTyping(false);
		}

		this._stageTextAdded = false;
	}

	public getText(): string {
		return this.stageText.getText();
	}

	public setText(value: string): void {
		this.stageText.setText(value);
	}

	public setColor(value: number): void {
		this.stageText.setColor(value);
	}

	public focus(active = false): void {
		if (!this._text.$visible) return;
		if (this._isFocus) return;

		const stage = this._text.stage;
		stage?.removeEventListener(TouchEvent.TOUCH_BEGIN, this.onStageDown);
		setTimeout(() => {
			this._text.stage?.addEventListener(TouchEvent.TOUCH_BEGIN, this.onStageDown);
		}, 0);

		this.stageText.show(active);
	}

	public hideInput(): void {
		this.stageText.removeFromStage();
	}

	public updateProperties(): void {
		if (this._isFocus) {
			this.stageText.resetStageText();
			return;
		}
		this.stageText.setText(this._text.text);
		this.stageText.resetStageText();
	}

	// ── Private event handlers ────────────────────────────────────────────────

	private onFocus = (): void => {
		if (!this._isFocus) {
			this._isFocus = true;
			this._text.setIsTyping(true);
			this._text.dispatchEvent(new FocusEvent(FocusEvent.FOCUS_IN, true));
		}
	};

	private onBlur = (): void => {
		if (this._isFocus) {
			this._isFocus = false;
			this._text.stage?.removeEventListener(TouchEvent.TOUCH_BEGIN, this.onStageDown);
			this._text.setIsTyping(false);
			this.stageText.onBlur();
			this._text.dispatchEvent(new FocusEvent(FocusEvent.FOCUS_OUT, true));
		}
	};

	private onTouchBegin = (): void => {
		this.focus();
	};

	private onTouchMove = (): void => {
		this.stageText.hide();
	};

	private onStageDown = (e: TouchEvent): void => {
		if (e.target !== this._text) {
			this.stageText.hide();
		}
	};

	private onUpdateText = (): void => {
		let textValue = this.stageText.getText();
		const restrictAnd = this._text.restrictAnd;
		const restrictNot = this._text.restrictNot;
		if (restrictAnd !== undefined) {
			// Whitelist: keep only characters matching the pattern
			const reg = new RegExp('[' + restrictAnd + ']', 'g');
			const result = textValue.match(reg);
			textValue = result ? result.join('') : '';
		}
		if (restrictNot !== undefined) {
			// Blacklist: remove characters matching the pattern
			textValue = textValue.replace(new RegExp('[' + restrictNot + ']', 'g'), '');
		}
		if (this.stageText.getText() !== textValue) {
			this.stageText.setText(textValue);
		}
		this._text.text = textValue;
		this._text.dispatchEvent(new Event(Event.CHANGE, true));
	};
}
