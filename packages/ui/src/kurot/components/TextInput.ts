import { Event, TouchEvent } from '@kurot/core';
import { Component } from './Component.js';
import { EditableText } from './EditableText.js';
import { Label } from './Label.js';
import type { IDisplayText } from '../core/IDisplayText.js';

/**
 * Text input component with prompt (placeholder) and password support.
 *
 * Skin parts:
 * - `textDisplay`   — EditableText for actual input
 * - `promptDisplay` — Label shown when text is empty and unfocused
 *
 * States: `normal`, `disabled`, `normalWithPrompt`, `disabledWithPrompt`
 *
 * Egret-compatible: eui.TextInput
 */
export class TextInput extends Component implements IDisplayText {
	// ── Instance fields ───────────────────────────────────────────────────

	public textDisplay?: EditableText;
	public promptDisplay?: Label;

	private _prompt = '';
	private _text = '';
	private _textColor?: number;
	private _displayAsPassword = false;
	private _maxChars = 0;
	private _restrict = '';
	private _inputType = 'text';
	private _isFocused = false;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor() {
		super();
		this.addEventListener(TouchEvent.TOUCH_TAP, this._onTouchTap);
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get prompt(): string {
		return this.promptDisplay ? this.promptDisplay.text : this._prompt;
	}

	public set prompt(value: string) {
		this._prompt = value;
		if (this.promptDisplay) this.promptDisplay.text = value;
		this.invalidateState();
	}

	public get text(): string {
		return this.textDisplay ? this.textDisplay.text : this._text;
	}

	public set text(value: string) {
		this._text = value;
		if (this.textDisplay) this.textDisplay.text = value;
		this.invalidateState();
	}

	public get textColor(): number {
		return this.textDisplay ? this.textDisplay.textColor : (this._textColor ?? 0xffffff);
	}

	public set textColor(value: number) {
		this._textColor = value;
		if (this.textDisplay) this.textDisplay.textColor = value;
	}

	public get displayAsPassword(): boolean {
		return this.textDisplay ? this.textDisplay.displayAsPassword : this._displayAsPassword;
	}

	public set displayAsPassword(value: boolean) {
		this._displayAsPassword = value;
		if (this.textDisplay) this.textDisplay.displayAsPassword = value;
	}

	public get maxChars(): number {
		return this.textDisplay ? this.textDisplay.maxChars : this._maxChars;
	}

	public set maxChars(value: number) {
		this._maxChars = value;
		if (this.textDisplay) this.textDisplay.maxChars = value;
	}

	public get restrict(): string {
		return this.textDisplay ? (this.textDisplay.restrict ?? '') : this._restrict;
	}

	public set restrict(value: string) {
		this._restrict = value;
		if (this.textDisplay) this.textDisplay.restrict = value;
	}

	public get inputType(): string {
		return this.textDisplay ? this.textDisplay.inputType : this._inputType;
	}

	public set inputType(value: string) {
		this._inputType = value;
		if (this.textDisplay) this.textDisplay.inputType = value as never;
		this.invalidateProperties();
	}

	// ── Override methods ──────────────────────────────────────────────────

	protected override getCurrentState(): string {
		const hasPrompt = !!this._prompt && !this._isFocused && !this.text;
		if (!this.enabled) {
			return hasPrompt && this.skin?.hasState('disabledWithPrompt') ? 'disabledWithPrompt' : 'disabled';
		}
		return hasPrompt && this.skin?.hasState('normalWithPrompt') ? 'normalWithPrompt' : 'normal';
	}

	protected override onSkinReady(): void {
		super.onSkinReady();
		const { textDisplay, promptDisplay } = this.skinParts;
		if (textDisplay instanceof EditableText) {
			this.textDisplay = textDisplay;
			if (this._text) textDisplay.text = this._text;
			if (this._textColor != null) textDisplay.textColor = this._textColor;
			if (this._displayAsPassword) textDisplay.displayAsPassword = true;
			if (this._maxChars) textDisplay.maxChars = this._maxChars;
			if (this._restrict) textDisplay.restrict = this._restrict;
			if (this._inputType) textDisplay.inputType = this._inputType as never;
			textDisplay.addEventListener(Event.FOCUS_IN, this._onFocusIn);
			textDisplay.addEventListener(Event.FOCUS_OUT, this._onFocusOut);
		}
		if (promptDisplay instanceof Label) {
			this.promptDisplay = promptDisplay;
			promptDisplay.touchEnabled = false;
			if (this._prompt) promptDisplay.text = this._prompt;
		}
	}

	protected override onSkinRemoved(): void {
		if (this.textDisplay) {
			this._text = this.textDisplay.text;
			this._textColor = this.textDisplay.textColor;
			this._displayAsPassword = this.textDisplay.displayAsPassword;
			this._maxChars = this.textDisplay.maxChars;
			this._restrict = this.textDisplay.restrict ?? '';
			this.textDisplay.removeEventListener(Event.FOCUS_IN, this._onFocusIn);
			this.textDisplay.removeEventListener(Event.FOCUS_OUT, this._onFocusOut);
		}
		if (this.promptDisplay) this._prompt = this.promptDisplay.text;
		this.textDisplay = undefined;
		this.promptDisplay = undefined;
		super.onSkinRemoved();
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _onFocusIn = (): void => {
		this._isFocused = true;
		this.invalidateState();
	};

	private _onFocusOut = (): void => {
		this._isFocused = false;
		this.invalidateState();
	};

	private _onTouchTap = (): void => {
		this.textDisplay?.setFocus();
	};
}
