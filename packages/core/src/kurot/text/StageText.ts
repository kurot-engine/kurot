import { EventDispatcher } from '../events/EventDispatcher.js';
import type { TextField } from './TextField.js';

/**
 * Manages the native HTML input element used by input text fields.
 */
export class StageText extends EventDispatcher {
	private _textField?: TextField;
	private _inputElement?: HTMLInputElement | HTMLTextAreaElement;
	private _inputDiv?: HTMLDivElement;
	private _text = '';
	private _compositionLock = false;
	private _compositionStart = -1;
	private _compositionEnd = -1;
	private _clearing = false;
	private _isShowing = false;

	setTextField(textField: TextField): void {
		this._textField = textField;
	}

	getText(): string {
		return this._text;
	}

	public get isComposing(): boolean {
		return this._compositionLock;
	}

	public getCompositionRange(): [number, number] | undefined {
		if (!this._compositionLock || this._compositionStart < 0) return undefined;
		return [this._compositionStart, this._compositionEnd];
	}

	setText(value: string): void {
		this._text = value;
		if (this._inputElement) this._inputElement.value = value;
	}

	public setSelection(beginIndex: number, endIndex: number): void {
		const element = this._inputElement;
		if (!element) return;

		const begin = clampIndex(beginIndex, element.value.length);
		const end = clampIndex(endIndex, element.value.length);
		element.setSelectionRange(begin, end);
	}

	public getSelection(): [number, number] {
		const element = this._inputElement;
		if (!element) return [0, 0];

		const begin = element.selectionStart ?? 0;
		const end = element.selectionEnd ?? begin;
		return [begin, end];
	}

	public getScrollTop(): number {
		return this._inputElement instanceof HTMLTextAreaElement
			? this._inputElement.scrollTop
			: 0;
	}

	public setScrollTop(value: number): void {
		if (this._inputElement instanceof HTMLTextAreaElement) {
			this._inputElement.scrollTop = Math.max(0, value);
		}
	}

	setColor(value: number): void {
		if (this._inputElement) {
			this._inputElement.style.color = colorString(value);
		}
	}

	show(_active = false): void {
		if (!this._textField) return;
		if (this._isShowing) {
			this.initElementPosition();
			this.resetStageText();
			return;
		}
		this.ensureElements();
		this.initElementPosition();
		this.resetStageText();
		this.executeShow();
	}

	hide(): void {
		this.clearInputElement();
	}

	addToStage(): void {
		this.ensureElements();
	}

	removeFromStage(): void {
		this.clearInputElement();
		if (this._inputDiv?.parentElement) {
			this._inputDiv.parentElement.removeChild(this._inputDiv);
			this._inputDiv = undefined;
		}
		this._inputElement = undefined;
	}

	onBlur(): void {
	}

	resetStageText(): void {
		this.ensureElements();
		if (!this._textField || !this._inputElement || !this._inputDiv) return;
		const tf = this._textField;
		const el = this._inputElement;

		el.style.fontFamily = tf.fontFamily;
		el.style.fontSize = tf.size + 'px';
		el.style.fontWeight = tf.bold ? 'bold' : 'normal';
		el.style.fontStyle = tf.italic ? 'italic' : 'normal';
		el.style.textAlign = tf.textAlign;
		el.style.color = colorString(tf.textColor);
		if (el instanceof HTMLInputElement) {
			el.type = tf.inputType;
		}
		if (tf.maxChars > 0) {
			el.setAttribute('maxlength', String(tf.maxChars));
		} else {
			el.removeAttribute('maxlength');
		}

		el.style.width = tf.width + 'px';
		el.style.left = '0px';
		el.style.transform = '';

		if (tf.multiline) {
			this.setAreaHeight(tf, el);
			el.style.overflowX = 'hidden';
			el.style.overflowY = 'auto';
			el.style.whiteSpace = 'pre-wrap';
			el.style.wordBreak = tf.wordWrap ? 'normal' : 'break-all';
			el.style.overflowWrap = 'break-word';
			el.scrollTop = tf.$inputScrollY;
		} else {
			const remaining = Math.max(0, tf.height - tf.size);
			const top = remaining * getValign(tf);
			el.style.lineHeight = tf.size + 'px';
			el.style.top = top + 'px';
			el.style.height = Math.min(tf.size, tf.height) + 'px';
			el.style.padding = '0px';
			el.style.overflow = 'hidden';
		}

		this._inputDiv.style.overflow = 'hidden';
		this._inputDiv.style.width = tf.width + 'px';
		this._inputDiv.style.height = tf.height + 'px';

		if (this._isShowing && document.activeElement !== el) {
			this.executeShow();
		}
	}

	// ── Element lifecycle ────────────────────────────────────────────────────

	private ensureElements(): void {
		if (!this._textField) return;
		if (this._inputElement && this._textField.multiline !== (this._inputElement instanceof HTMLTextAreaElement)) {
			this._inputElement.remove();
			this._inputElement = undefined;
		}
		if (this._inputDiv && this._inputElement) return;
		if (!this._inputDiv) {
			const div = document.createElement('div');
			div.style.position = 'fixed';
			div.style.boxSizing = 'content-box';
			div.style.left = '0px';
			div.style.top = '-100px';
			div.style.border = 'none';
			div.style.padding = '0';
			div.style.margin = '0';
			div.style.width = '0px';
			div.style.height = '0px';
			div.style.overflow = 'hidden';
			div.style.transformOrigin = '0% 0% 0px';
			div.style.zIndex = '10000';
			div.style.pointerEvents = 'none';
			document.body.appendChild(div);
			this._inputDiv = div;
		}
		if (!this._inputElement) {
			const tf = this._textField;
			const el = tf.multiline ? document.createElement('textarea') : document.createElement('input');
			if (el instanceof HTMLTextAreaElement) {
				el.style.resize = 'none';
				el.wrap = 'soft';
			}
			el.style.position = 'absolute';
			el.style.boxSizing = 'border-box';
			el.style.left = '0px';
			el.style.top = '0px';
			el.style.border = 'none';
			el.style.padding = '0';
			el.style.margin = '0';
			el.style.outline = 'none';
			el.style.background = 'none transparent';
			el.style.overflow = 'hidden';
			el.style.opacity = '0';
			el.style.pointerEvents = 'auto';
			el.value = this._text;
			el.addEventListener('input', this.onTextInput);
			el.addEventListener('compositionstart', () => {
				this._compositionLock = true;
				const [begin, end] = this.getSelection();
				this._compositionStart = Math.min(begin, end);
				this._compositionEnd = Math.max(begin, end);
				this.dispatchCompositionChange();
			});
			el.addEventListener('compositionend', () => {
				this._compositionLock = false;
				this.onTextInput();
				this._compositionStart = -1;
				this._compositionEnd = -1;
				this.dispatchCompositionChange();
			});
			el.addEventListener('select', this.onSelectionChange);
			el.addEventListener('keyup', this.onSelectionChange);
			el.addEventListener('click', this.onSelectionChange);
			el.addEventListener('scroll', this.onScroll);
			el.addEventListener('focus', () => {
				this.dispatchEventWith('focus');
			});
			el.addEventListener('blur', () => {
				this.dispatchEventWith('blur');
				this.clearInputElement();
			});
			this._inputDiv.appendChild(el);
			this._inputElement = el;
		}
	}

	private initElementPosition(): void {
		if (!this._textField || !this._inputDiv) return;
		const tf = this._textField;
		const canvas = this.getCanvas();

		const matrix = tf.$getConcatenatedMatrix();
		let left = 0;
		let top = 0;
		let scaleX = 1;
		let scaleY = 1;

		if (canvas) {
			const rect = canvas.getBoundingClientRect();
			const borderLeft = canvas.clientLeft;
			const borderTop = canvas.clientTop;
			const stage = tf.stage;
			const logicalWidth = stage?.stageWidth || canvas.width;
			const logicalHeight = stage?.stageHeight || canvas.height;

			scaleX = (canvas.clientWidth || 1) / (logicalWidth || 1);
			scaleY = (canvas.clientHeight || 1) / (logicalHeight || 1);
			left = rect.left + borderLeft;
			top = rect.top + borderTop;
		}

		this._inputDiv.style.left = left + 'px';
		this._inputDiv.style.top = top + 'px';

		if (tf.multiline && tf.height > tf.size && this._inputElement) {
			this._inputElement.style.top = `${-tf.lineSpacing / 2}px`;
		} else if (this._inputElement) {
			this._inputElement.style.top = '0px';
		}

		this._inputDiv.style.transform =
			`matrix(${matrix.a * scaleX},${matrix.b * scaleY},${matrix.c * scaleX},${matrix.d * scaleY},${matrix.tx * scaleX},${matrix.ty * scaleY})`;
	}

	private executeShow(): void {
		const el = this._inputElement;
		if (!el) return;
		if (el.value !== this._text) {
			el.value = this._text;
		}
		el.style.opacity = '0';
		this._isShowing = true;
		const begin = this._textField?.selectionBeginIndex ?? el.value.length;
		const end = this._textField?.selectionEndIndex ?? begin;
		this.setSelection(begin, end);
		if (el instanceof HTMLTextAreaElement) {
			el.scrollTop = this._textField?.$inputScrollY ?? 0;
		}
		el.focus();
		this.dispatchSelectionChange();
	}

	private clearInputElement(): void {
		if (this._clearing) return;
		this._clearing = true;
		this._isShowing = false;
		this._compositionLock = false;
		this._compositionStart = -1;
		this._compositionEnd = -1;
		this.dispatchCompositionChange();
		const el = this._inputElement;
		const div = this._inputDiv;
		if (el) {
			el.style.opacity = '0';
			el.style.width = '1px';
			el.style.height = '12px';
			el.style.left = '0px';
			el.style.top = '0px';
			el.style.transform = '';
			el.style.padding = '0';
			el.style.lineHeight = '';
			el.style.verticalAlign = '';
			el.blur();
		}
		if (div) {
			div.style.left = '0px';
			div.style.top = '-100px';
			div.style.height = '0px';
			div.style.width = '0px';
			div.style.transform = '';
		}
		this._clearing = false;
	}

	// ── Helpers ─────────────────────────────────────────────────────────────

	private setAreaHeight(tf: TextField, el: HTMLElement): void {
		const cssLineH = tf.size + tf.lineSpacing;
		if (tf.height <= tf.size) {
			el.style.height = tf.size + 'px';
			el.style.padding = '0px';
			el.style.lineHeight = cssLineH + 'px';
		} else {
			el.style.height = tf.height + 'px';
			const rap = Math.max(0, tf.height - tf.textHeight);
			const valign = getValign(tf);
			const top = rap * valign;
			const bottom = rap - top;
			el.style.padding = `${top}px 0px ${bottom}px 0px`;
			el.style.lineHeight = cssLineH + 'px';
		}
	}

	private onTextInput = (): void => {
		if (this._inputElement) {
			this._text = this._inputElement.value;
			if (this._compositionLock) {
				const [, end] = this.getSelection();
				this._compositionEnd = Math.max(this._compositionStart, end);
			}
			this.dispatchScrollChange();
			this.dispatchEventWith('updateText');
			this.dispatchSelectionChange();
			if (this._compositionLock) {
				this.dispatchCompositionChange();
			}
		}
	};

	private onSelectionChange = (): void => {
		this.dispatchScrollChange();
		this.dispatchSelectionChange();
	};

	private onScroll = (): void => {
		this.dispatchScrollChange();
	};

	private dispatchScrollChange(): void {
		if (this._inputElement instanceof HTMLTextAreaElement) {
			this.dispatchEventWith('updateScroll');
		}
	}

	private dispatchSelectionChange(): void {
		this.dispatchEventWith('updateSelection');
	}

	private dispatchCompositionChange(): void {
		this.dispatchEventWith('updateComposition');
	}

	private getCanvas(): HTMLCanvasElement | undefined {
		return document.querySelector('canvas') ?? undefined;
	}
}

function getValign(tf: TextField): number {
	const v = (tf as any).verticalAlign;
	if (v === 'middle' || v === 'Middle') return 0.5;
	if (v === 'bottom' || v === 'Bottom') return 1;
	return 0;
}

function colorString(color: number): string {
	const r = (color >> 16) & 0xff;
	const g = (color >> 8) & 0xff;
	const b = color & 0xff;
	return `rgb(${r},${g},${b})`;
}

function clampIndex(value: number, length: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(Math.trunc(value), length));
}
