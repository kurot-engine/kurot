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
	private _caretTimer = 0;

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
		this.stageText.addEventListener('updateSelection', this.onUpdateSelection);
		this.stageText.addEventListener('updateComposition', this.onUpdateComposition);
		this.stageText.addEventListener('updateScroll', this.onUpdateScroll);
		this.stageText.addEventListener('focus', this.onFocus);
		this.stageText.addEventListener('blur', this.onBlur);
		this._text.addEventListener(TouchEvent.TOUCH_BEGIN, this.onTouchBegin);
		this._text.addEventListener(TouchEvent.TOUCH_TAP, this.onTouchTap);

		this._stageTextAdded = true;
	}

	public removeStageText(): void {
		if (!this._stageTextAdded) return;

		this.stageText.removeFromStage();
		this.stageText.removeEventListener('updateText', this.onUpdateText);
		this.stageText.removeEventListener('updateSelection', this.onUpdateSelection);
		this.stageText.removeEventListener('updateComposition', this.onUpdateComposition);
		this.stageText.removeEventListener('updateScroll', this.onUpdateScroll);
		this.stageText.removeEventListener('focus', this.onFocus);
		this.stageText.removeEventListener('blur', this.onBlur);
		this._text.removeEventListener(TouchEvent.TOUCH_BEGIN, this.onTouchBegin);
		this._text.removeEventListener(TouchEvent.TOUCH_TAP, this.onTouchTap);
		this._text.stage?.removeEventListener(TouchEvent.TOUCH_BEGIN, this.onStageDown);

		if (this._isFocus) {
			this._isFocus = false;
			this.stopCaretBlink();
			this._text.setIsTyping(false);
		}

		this._stageTextAdded = false;
	}

	public setText(value: string): void {
		this.stageText.setText(value);
	}

	public setSelection(beginIndex: number, endIndex: number): void {
		this.stageText.setSelection(beginIndex, endIndex);
	}

	public setScrollTop(value: number): void {
		this.stageText.setScrollTop(value);
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
		if (!this._stageTextAdded) {
			this.stageText.setText(this._text.text);
			return;
		}
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
			this.startCaretBlink();
			this._text.dispatchEvent(new FocusEvent(FocusEvent.FOCUS_IN, true));
		}
	};

	private onBlur = (): void => {
		if (this._isFocus) {
			this._isFocus = false;
			this.stopCaretBlink();
			this._text.stage?.removeEventListener(TouchEvent.TOUCH_BEGIN, this.onStageDown);
			this._text.setIsTyping(false);
			this.stageText.onBlur();
			this._text.dispatchEvent(new FocusEvent(FocusEvent.FOCUS_OUT, true));
		}
	};

	private onTouchBegin = (event: TouchEvent): void => {
		const index = this._text.$getInputIndexAt(event.localX, event.localY);
		this._text.setSelection(index, index);
	};

	private onTouchTap = (): void => {
		this.focus();
	};

	private onStageDown = (e: TouchEvent): void => {
		if (e.target !== this._text) {
			this.stageText.hide();
		}
	};

	private onUpdateText = (): void => {
		let textValue = this.stageText.getText();
		if (!this.stageText.isComposing) {
			const restrictAnd = this._text.restrictAnd;
			const restrictNot = this._text.restrictNot;
			if (restrictAnd !== undefined) {
				const reg = new RegExp('[' + restrictAnd + ']', 'g');
				const result = textValue.match(reg);
				textValue = result ? result.join('') : '';
			}
			if (restrictNot !== undefined) {
				textValue = textValue.replace(new RegExp('[' + restrictNot + ']', 'g'), '');
			}
		}
		if (this.stageText.getText() !== textValue) {
			this.stageText.setText(textValue);
		}
		const changed = this._text.$setTextFromInput(textValue);
		this.syncSelection();
		this.restartCaretBlink();
		if (changed) {
			this._text.dispatchEvent(new Event(Event.CHANGE, true));
		}
	};

	private onUpdateSelection = (): void => {
		this.syncSelection();
		this.restartCaretBlink();
	};

	private onUpdateComposition = (): void => {
		const range = this.stageText.getCompositionRange();
		if (range) {
			this._text.$setCompositionRange(range[0], range[1]);
		} else {
			this._text.$setCompositionRange();
		}
	};

	private onUpdateScroll = (): void => {
		const scrollTop = this.stageText.getScrollTop();
		this._text.$setInputScrollY(scrollTop);
		if (this._text.$inputScrollY !== scrollTop) {
			this.stageText.setScrollTop(this._text.$inputScrollY);
		}
	};

	private syncSelection(): void {
		const [begin, end] = this.stageText.getSelection();
		this._text.$setSelectionFromInput(begin, end);
	}

	private startCaretBlink(): void {
		this.stopCaretBlink();
		this._text.$setCaretVisible(true);
		this._caretTimer = window.setInterval(() => {
			this._text.$setCaretVisible(!this._text.$caretVisible);
		}, 500);
	}

	private restartCaretBlink(): void {
		if (!this._isFocus) return;
		this.startCaretBlink();
	}

	private stopCaretBlink(): void {
		if (this._caretTimer === 0) return;
		window.clearInterval(this._caretTimer);
		this._caretTimer = 0;
	}
}
