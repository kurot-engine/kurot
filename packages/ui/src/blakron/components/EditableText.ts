import { Event, TextFieldInputType, TextFieldType } from '@blakron/core';
import type { IDisplayText } from '../core/IDisplayText.js';
import { PropertyEvent } from '../events/PropertyEvent.js';
import { Label } from './Label.js';

/**
 * Editable text component with EUI layout participation and prompt support.
 *
 * The native-input TextField lives inside this Component, just like Label's
 * display TextField. Consequently BasicLayout constraints are resolved on the
 * wrapper first and updateDisplayList passes the final bounds to StageText.
 *
 * Egret-compatible: eui.EditableText
 */
export class EditableText extends Label implements IDisplayText {
	private _prompt = '';
	private _promptColor = 0x999999;
	private _userTextColor = 0xffffff;
	private _isShowingPrompt = false;
	private _isFocused = false;
	private _asPassword = false;

	public constructor() {
		super();
		this._textField.type = TextFieldType.INPUT;
		this.addEventListener(Event.FOCUS_IN, this._onFocusIn);
		this.addEventListener(Event.FOCUS_OUT, this._onFocusOut);
	}

	public get prompt(): string {
		return this._prompt;
	}

	public set prompt(value: string) {
		if (this._prompt === value) return;
		this._prompt = value;
		if (!this._isFocused && (!this.text || this.text === this._prompt)) this._showPrompt();
	}

	public get promptColor(): number {
		return this._promptColor;
	}

	public set promptColor(value: number) {
		this._promptColor = value;
		if (this._isShowingPrompt) this._textField.textColor = value;
	}

	public override get text(): string {
		return this._isShowingPrompt ? '' : this._textField.text;
	}

	public override set text(value: string) {
		if (this._isShowingPrompt && value === this._prompt) return;
		this._isShowingPrompt = false;
		this._textField.textColor = this._userTextColor;
		this._textField.displayAsPassword = this._asPassword;
		this._textField.text = value ?? '';
		PropertyEvent.dispatchPropertyEvent(this, 'text');
		this.invalidateSize();
		this.invalidateDisplayList();
		if (!this._isFocused && !value) this._showPrompt();
	}

	public override get textColor(): number {
		return this._textField.textColor;
	}

	public override set textColor(value: number) {
		if (!this._isShowingPrompt) this._userTextColor = value;
		this._textField.textColor = value;
	}

	public override get displayAsPassword(): boolean {
		return this._textField.displayAsPassword;
	}

	public override set displayAsPassword(value: boolean) {
		this._asPassword = value;
		if (!this._isShowingPrompt) this._textField.displayAsPassword = value;
	}

	public get inputType(): TextFieldInputType {
		return this._textField.inputType;
	}

	public set inputType(value: TextFieldInputType) {
		this._textField.inputType = value;
	}

	public get restrict(): string | undefined {
		return this._textField.restrict;
	}

	public set restrict(value: string | undefined) {
		this._textField.restrict = value;
	}

	public get selectionBeginIndex(): number {
		return this._textField.selectionBeginIndex;
	}

	public get selectionEndIndex(): number {
		return this._textField.selectionEndIndex;
	}

	public get caretIndex(): number {
		return this._textField.caretIndex;
	}

	public setFocus(): void {
		this._textField.setFocus();
	}

	public setSelection(beginIndex: number, endIndex: number): void {
		this._textField.setSelection(beginIndex, endIndex);
	}

	private _showPrompt(): void {
		if (!this._prompt) return;
		this._isShowingPrompt = true;
		this._textField.textColor = this._promptColor;
		this._textField.displayAsPassword = false;
		this._textField.text = this._prompt;
	}

	private _onFocusIn = (): void => {
		this._isFocused = true;
		if (this._isShowingPrompt) {
			this._isShowingPrompt = false;
			this._textField.textColor = this._userTextColor;
			this._textField.displayAsPassword = this._asPassword;
			this._textField.text = '';
		}
	};

	private _onFocusOut = (): void => {
		this._isFocused = false;
		if (!this._textField.text) this._showPrompt();
	};
}
