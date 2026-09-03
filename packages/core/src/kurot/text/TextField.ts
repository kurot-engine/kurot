import { DisplayObject, RenderObjectType } from '../display/DisplayObject.js';
import type { Stage } from '../display/Stage.js';
import { Rectangle } from '../geom/Rectangle.js';
import { TouchEvent } from '../events/TouchEvent.js';
import { TextEvent } from '../events/TextEvent.js';
import { measureText, getFontString } from './TextMeasurer.js';
import type { ITextElement, ILineElement, IWTextElement } from './types/ITextElement.js';
import { HorizontalAlign } from './enums/HorizontalAlign.js';
import { VerticalAlign } from './enums/VerticalAlign.js';
import { TextFieldType } from './enums/TextFieldType.js';
import { TextFieldInputType } from './enums/TextFieldInputType.js';
import { InputController } from './InputController.js';
import { tokenize, splitGraphemes } from './WordWrap.js';

/**
 * TextField displays text content. Supports single-line, multi-line, word wrap,
 * rich text (textFlow), input mode, and basic styling.
 */
export class TextField extends DisplayObject {
	// ── Static fields ─────────────────────────────────────────────────────────

	public static default_fontFamily = 'Arial';
	public static default_size = 30;
	public static default_textColor = 0xffffff;

	// ── Instance fields ───────────────────────────────────────────────────────

	private _fontFamily = TextField.default_fontFamily;
	private _fontSize = TextField.default_size;
	private _bold = false;
	private _italic = false;
	private _textAlign: HorizontalAlign = HorizontalAlign.LEFT;
	private _verticalAlign: VerticalAlign = VerticalAlign.TOP;
	private _textColor = TextField.default_textColor;
	private _strokeColor = 0x000000;
	private _stroke = 0;
	private _resolution?: number;
	private _lineSpacing = 0;
	private _wordWrap = false;
	private _multiline = false;
	private _type: TextFieldType = TextFieldType.DYNAMIC;
	private _inputType: TextFieldInputType = TextFieldInputType.TEXT;
	private _text = '';
	private _displayAsPassword = false;
	private _maxChars = 0;
	private _scrollV = 1;
	private _restrict?: string;
	private _restrictAnd?: string;
	private _restrictNot?: string;
	private _border = false;
	private _borderColor = 0x000000;
	private _background = false;
	private _backgroundColor = 0xffffff;
	private _textFlow?: ITextElement[];
	private _textWidth = 0;
	private _textHeight = 0;
	private _numLines = 0;
	private _linesArr?: ILineElement[];
	private _textDirty = true;
	private _fontString = '';
	private _selectionAnchor = 0;
	private _selectionActive = 0;
	private _isTyping = false;
	private _inputScrollX = 0;
	private _inputScrollY = 0;
	private _caretVisible = false;
	private _compositionStart = -1;
	private _compositionEnd = -1;
	private _inputController?: InputController;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor() {
		super();
		this.$renderObjectType = RenderObjectType.TEXT;
		this.invalidateFontString();
	}

	public override get width(): number {
		return isNaN(this.$explicitWidth) ? this.$getOriginalBounds().width : this.$explicitWidth;
	}
	public override set width(value: number) {
		const v = isNaN(value) ? NaN : value;
		if (this.$explicitWidth === v) return;
		this.$explicitWidth = v;
		this.invalidateText();
	}

	public override get height(): number {
		return isNaN(this.$explicitHeight) ? this.$getOriginalBounds().height : this.$explicitHeight;
	}
	public override set height(value: number) {
		const v = isNaN(value) ? NaN : value;
		if (this.$explicitHeight === v) return;
		this.$explicitHeight = v;
		this.invalidateText();
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	public get fontFamily(): string {
		return this._fontFamily;
	}
	public set fontFamily(value: string) {
		if (this._fontFamily !== value) {
			this._fontFamily = value;
			this.invalidateText();
		}
	}

	public get size(): number {
		return this._fontSize;
	}
	public set size(value: number) {
		if (this._fontSize !== value) {
			this._fontSize = value;
			this.invalidateText();
		}
	}

	public get bold(): boolean {
		return this._bold;
	}
	public set bold(value: boolean) {
		if (this._bold !== value) {
			this._bold = value;
			this.invalidateText();
		}
	}

	public get italic(): boolean {
		return this._italic;
	}
	public set italic(value: boolean) {
		if (this._italic !== value) {
			this._italic = value;
			this.invalidateText();
		}
	}

	public get textAlign(): HorizontalAlign {
		return this._textAlign;
	}
	public set textAlign(value: HorizontalAlign) {
		if (this._textAlign !== value) {
			this._textAlign = value;
			this.invalidateText();
		}
	}

	public get verticalAlign(): VerticalAlign {
		return this._verticalAlign;
	}
	public set verticalAlign(value: VerticalAlign) {
		if (this._verticalAlign !== value) {
			this._verticalAlign = value;
			this.invalidateText();
		}
	}

	public get textColor(): number {
		return this._textColor;
	}
	public set textColor(value: number) {
		if (this._textColor !== value) {
			this._textColor = value;
			this._inputController?.setColor(value);
			this.$markDirty();
		}
	}

	public get strokeColor(): number {
		return this._strokeColor;
	}
	public set strokeColor(value: number) {
		if (this._strokeColor !== value) {
			this._strokeColor = value;
			this.$markDirty();
		}
	}

	public get stroke(): number {
		return this._stroke;
	}
	public set stroke(value: number) {
		if (this._stroke !== value) {
			this._stroke = value;
			this.$markDirty();
		}
	}

	/**
	 * Raster resolution used by WebGL text caching.
	 * Undefined follows the renderer's logical-to-physical resolution.
	 */
	public get resolution(): number | undefined {
		return this._resolution;
	}
	public set resolution(value: number | undefined) {
		let resolution = value;
		if (resolution !== undefined && (!Number.isFinite(resolution) || resolution <= 0)) {
			resolution = 1;
		}
		if (this._resolution === resolution) return;
		this._resolution = resolution;
		this.$renderDirty = true;
		this.$markDirty();
	}

	public get lineSpacing(): number {
		return this._lineSpacing;
	}
	public set lineSpacing(value: number) {
		if (this._lineSpacing !== value) {
			this._lineSpacing = value;
			this.invalidateText();
		}
	}

	public get wordWrap(): boolean {
		return this._wordWrap;
	}
	public set wordWrap(value: boolean) {
		if (this._wordWrap !== value) {
			if (this._displayAsPassword) return;
			this._wordWrap = value;
			this.invalidateText();
		}
	}

	public get multiline(): boolean {
		return this._multiline;
	}
	public set multiline(value: boolean) {
		if (this._multiline !== value) {
			this._multiline = value;
			if (!value) {
				this._inputScrollY = 0;
			}
			this.invalidateText();
		}
	}

	public get type(): TextFieldType {
		return this._type;
	}
	public set type(value: TextFieldType) {
		if (this._type === value) return;
		this._type = value;
		if (value === TextFieldType.INPUT) {
			if (!this._inputController) {
				this._inputController = new InputController(this);
			}
			this.touchEnabled = true;
			if (isNaN(this.$explicitWidth)) this.width = 100;
			if (isNaN(this.$explicitHeight)) this.height = 30;
			if (this.stage) {
				this._inputController.addStageText();
			}
			this._inputController.setText(this._text);
			this.$setSelectionFromInput(this._text.length, this._text.length);
		} else {
			if (this._inputController) {
				this._inputController.removeStageText();
				this._inputController = undefined;
			}
			this.touchEnabled = false;
		}
		this.$markDirty();
	}

	public get inputType(): TextFieldInputType {
		return this._inputType;
	}
	public set inputType(value: TextFieldInputType) {
		if (this._inputType === value) return;
		this._inputType = value;
		this._inputController?.updateProperties();
	}

	public get text(): string {
		return this._text;
	}
	public set text(value: string) {
		const normalized = value == null ? '' : String(value);
		if (!this.$setTextFromInput(normalized)) return;
		if (this._inputController) {
			this._inputController.setText(normalized);
			if (!this._isTyping) {
				this.setSelection(normalized.length, normalized.length);
			}
		}
	}

	public get displayAsPassword(): boolean {
		return this._displayAsPassword;
	}
	public set displayAsPassword(value: boolean) {
		if (this._displayAsPassword !== value) {
			this._displayAsPassword = value;
			this.invalidateText();
		}
	}

	public get maxChars(): number {
		return this._maxChars;
	}
	public set maxChars(value: number) {
		if (this._maxChars === value) return;
		this._maxChars = value;
		this._inputController?.updateProperties();
	}

	public get scrollV(): number {
		return Math.min(Math.max(this._scrollV, 1), this.maxScrollV);
	}
	public set scrollV(value: number) {
		value = Math.min(Math.max(value, 1), this.maxScrollV);
		if (this._scrollV !== value) {
			this._scrollV = value;
			if (this._type === TextFieldType.INPUT && this._multiline) {
				this._inputScrollY = Math.min(this.getScrollYOffset(), this.getMaxInputScrollY());
				this._inputController?.setScrollTop(this._inputScrollY);
			}
			this.$markDirty();
		}
	}

	public get maxScrollV(): number {
		this.ensureLines();
		return Math.max(1, this._numLines - this.getScrollNum() + 1);
	}

	public get numLines(): number {
		this.ensureLines();
		return this._numLines;
	}

	public get restrict(): string | undefined {
		return this._restrict;
	}
	public set restrict(value: string | undefined) {
		this._restrict = value;
		if (value === undefined) {
			this._restrictAnd = undefined;
			this._restrictNot = undefined;
		} else {
			let index = -1;
			let i = 0;
			while (i < value.length) {
				const pos = value.indexOf('^', i);
				if (pos < 0) break;
				if (pos === 0 || value.charAt(pos - 1) !== '\\') {
					index = pos;
					break;
				}
				i = pos + 1;
			}
			if (index === 0) {
				this._restrictAnd = undefined;
				this._restrictNot = value.substring(1);
			} else if (index > 0) {
				this._restrictAnd = value.substring(0, index);
				this._restrictNot = value.substring(index + 1);
			} else {
				this._restrictAnd = value;
				this._restrictNot = undefined;
			}
		}
	}

	get restrictAnd(): string | undefined {
		return this._restrictAnd;
	}

	get restrictNot(): string | undefined {
		return this._restrictNot;
	}

	public get border(): boolean {
		return this._border;
	}
	public set border(value: boolean) {
		if (this._border !== value) {
			this._border = value;
			this.$markDirty();
		}
	}

	public get borderColor(): number {
		return this._borderColor;
	}
	public set borderColor(value: number) {
		if (this._borderColor !== value) {
			this._borderColor = value;
			this.$markDirty();
		}
	}

	public get background(): boolean {
		return this._background;
	}
	public set background(value: boolean) {
		if (this._background !== value) {
			this._background = value;
			this.$markDirty();
		}
	}

	public get backgroundColor(): number {
		return this._backgroundColor;
	}
	public set backgroundColor(value: number) {
		if (this._backgroundColor !== value) {
			this._backgroundColor = value;
			this.$markDirty();
		}
	}

	public get textFlow(): ITextElement[] | undefined {
		return this._textFlow;
	}
	public set textFlow(value: ITextElement[] | undefined) {
		this._textFlow = value;
		if (value) {
			this._text = value.map(e => e.text).join('');
		}
		this.invalidateText();
	}

	public get textWidth(): number {
		this.ensureLines();
		return this._textWidth;
	}
	public get textHeight(): number {
		this.ensureLines();
		if (this._type === TextFieldType.INPUT && !this._multiline) {
			return this._fontSize;
		}
		return this._textHeight + (this._numLines - 1) * this._lineSpacing;
	}

	get fontString(): string {
		return this._fontString;
	}

	public get selectionBeginIndex(): number {
		return this._selectionAnchor;
	}
	public get selectionEndIndex(): number {
		return this._selectionActive;
	}
	public get caretIndex(): number {
		return this._selectionActive;
	}

	get isTyping(): boolean {
		return this._isTyping;
	}

	public get $inputScrollX(): number {
		return this._inputScrollX;
	}

	public get $inputScrollY(): number {
		return this._inputScrollY;
	}

	public get $caretVisible(): boolean {
		return this._caretVisible;
	}

	public get $compositionStart(): number {
		return this._compositionStart;
	}

	public get $compositionEnd(): number {
		return this._compositionEnd;
	}

	getLinesArr(): ILineElement[] {
		this.ensureLines();
		return this._linesArr ?? [];
	}

	getScrollYOffset(): number {
		if (this._scrollV <= 1) return 0;
		this.ensureLines();
		const lines = this._linesArr ?? [];
		let offset = 0;
		const startLine = Math.min(this._scrollV - 1, lines.length - 1);
		for (let i = 0; i < startLine; i++) {
			offset += lines[i].height + this._lineSpacing;
		}
		return offset;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	public appendText(text: string): void {
		this.appendElement({ text });
	}

	public appendElement(element: ITextElement): void {
		if (this._displayAsPassword) {
			this.text = this._text + element.text;
			return;
		}
		const flow = this._textFlow
			? [...this._textFlow]
			: this._text
				? [{ text: this._text, style: undefined as ITextElement['style'] }]
				: [];
		flow.push(element);
		this.textFlow = flow;
		if (this._inputController) {
			this._inputController.setText(this._text);
		}
	}

	public setFocus(): void {
		if (this._type === TextFieldType.INPUT && this.stage && this._inputController) {
			this._inputController.focus(true);
		}
	}

	public setSelection(beginIndex: number, endIndex: number): void {
		this.$setSelectionFromInput(beginIndex, endIndex);
		this._inputController?.setSelection(this._selectionAnchor, this._selectionActive);
	}

	setIsTyping(value: boolean): void {
		if (this._isTyping === value) return;
		this._isTyping = value;
		this._caretVisible = value;
		if (value) {
			this.updateInputScroll();
		} else {
			this._inputScrollX = 0;
			this._compositionStart = -1;
			this._compositionEnd = -1;
		}
		this.$renderDirty = true;
		this.$markDirty();
	}

	public getLineHeight(): number {
		return this._fontSize + this._lineSpacing;
	}

	// ── Internal methods ──────────────────────────────────────────────────────

	public $setTextFromInput(value: string): boolean {
		if (this._text === value) return false;

		this._text = value;
		this._textFlow = undefined;
		this._selectionAnchor = clampIndex(this._selectionAnchor, value.length);
		this._selectionActive = clampIndex(this._selectionActive, value.length);
		this.invalidateText();
		return true;
	}

	public $setSelectionFromInput(beginIndex: number, endIndex: number): void {
		const begin = clampIndex(beginIndex, this._text.length);
		const end = clampIndex(endIndex, this._text.length);
		if (this._selectionAnchor === begin && this._selectionActive === end) return;

		this._selectionAnchor = begin;
		this._selectionActive = end;
		this.updateInputScroll();
		this.$renderDirty = true;
		this.$markDirty();
	}

	public $setCaretVisible(value: boolean): void {
		if (this._caretVisible === value) return;
		this._caretVisible = value;
		this.$renderDirty = true;
		this.$markDirty();
	}

	public $setInputScrollY(value: number): void {
		const normalized = Number.isFinite(value) ? Math.max(0, value) : 0;
		const scrollY = Math.min(normalized, this.getMaxInputScrollY());
		const lineHeight = this.getLineHeight();
		const scrollV = lineHeight > 0
			? Math.min(Math.floor(scrollY / lineHeight) + 1, this.maxScrollV)
			: 1;
		if (this._inputScrollY === scrollY && this._scrollV === scrollV) return;
		this._inputScrollY = scrollY;
		this._scrollV = scrollV;
		this.$renderDirty = true;
		this.$markDirty();
	}

	public $setCompositionRange(beginIndex?: number, endIndex?: number): void {
		const begin = beginIndex === undefined ? -1 : clampIndex(beginIndex, this._text.length);
		const end = endIndex === undefined ? -1 : clampIndex(endIndex, this._text.length);
		if (this._compositionStart === begin && this._compositionEnd === end) return;

		this._compositionStart = begin;
		this._compositionEnd = end;
		this.$renderDirty = true;
		this.$markDirty();
	}

	public $getInputIndexAt(localX: number, localY = 0): number {
		if (this._multiline) {
			return this.getMultilineInputIndexAt(localX, localY);
		}

		const displayText = this.getDisplayText();
		const width = !isNaN(this.$explicitWidth) ? this.$explicitWidth : this._textWidth;
		const textWidth = measureText(displayText, this._fontFamily, this._fontSize, this._bold, this._italic);
		let textX = 0;
		if (textWidth > width && this._isTyping) {
			textX = 0;
		} else if (this._textAlign === HorizontalAlign.RIGHT) {
			textX = width - textWidth;
		} else if (this._textAlign === HorizontalAlign.CENTER) {
			textX = (width - textWidth) / 2;
		}
		const x = localX - textX + this._inputScrollX;
		if (x <= 0) return 0;

		let previousWidth = 0;
		for (let index = 1; index <= displayText.length; index++) {
			const currentWidth = measureText(
				displayText.substring(0, index),
				this._fontFamily,
				this._fontSize,
				this._bold,
				this._italic,
			);
			if (x < (previousWidth + currentWidth) / 2) return index - 1;
			previousWidth = currentWidth;
		}
		return displayText.length;
	}

	override $onAddToStage(stage: Stage, $nestLevel: number): void {
		super.$onAddToStage(stage, $nestLevel);
		if (this._type === TextFieldType.INPUT && this._inputController) {
			this._inputController.addStageText();
		}
		this.addEventListener(TouchEvent.TOUCH_TAP, this.onTapHandler);
	}

	override $onRemoveFromStage(): void {
		super.$onRemoveFromStage();
		if (this._inputController) {
			this._inputController.removeStageText();
		}
		this.removeEventListener(TouchEvent.TOUCH_TAP, this.onTapHandler);
	}

	override $measureContentBounds(bounds: Rectangle): void {
		this.ensureLines();
		const w = !isNaN(this.$explicitWidth) ? this.$explicitWidth : this._textWidth;
		const h = !isNaN(this.$explicitHeight) ? this.$explicitHeight : this.textHeight;
		bounds.setTo(0, 0, w, h);
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private invalidateText(): void {
		this._textDirty = true;
		this._linesArr = undefined;
		this.invalidateFontString();
		this.$renderDirty = true;
		this.$markDirty();
		this.updateInputScroll();
		if (this._type === TextFieldType.INPUT && this._multiline) {
			this.$setInputScrollY(this._inputScrollY);
		}
		this._inputController?.updateProperties();
	}

	private updateInputScroll(): void {
		if (!this._isTyping || this._multiline || isNaN(this.$explicitWidth)) {
			this._inputScrollX = 0;
			return;
		}

		const displayText = this.getDisplayText();
		const caretText = displayText.substring(0, this._selectionActive);
		const caretX = measureText(caretText, this._fontFamily, this._fontSize, this._bold, this._italic);
		const viewportWidth = Math.max(0, this.$explicitWidth - 1);
		const textWidth = measureText(displayText, this._fontFamily, this._fontSize, this._bold, this._italic);
		if (textWidth <= viewportWidth) {
			this._inputScrollX = 0;
		} else if (caretX < this._inputScrollX) {
			this._inputScrollX = caretX;
		} else if (caretX > this._inputScrollX + viewportWidth) {
			this._inputScrollX = caretX - viewportWidth;
		}
	}

	private getMultilineInputIndexAt(localX: number, localY: number): number {
		this.ensureLines();
		const lines = this._linesArr ?? [];
		if (lines.length === 0) return 0;

		const width = !isNaN(this.$explicitWidth) ? this.$explicitWidth : this._textWidth;
		const height = !isNaN(this.$explicitHeight) ? this.$explicitHeight : this.textHeight;
		let totalTextHeight = 0;
		for (let i = 0; i < lines.length; i++) {
			totalTextHeight += lines[i].height;
			if (i > 0) totalTextHeight += this._lineSpacing;
		}

		let verticalOffset = 0;
		if (this._verticalAlign === VerticalAlign.MIDDLE) {
			verticalOffset = Math.max(0, (height - totalTextHeight) / 2);
		} else if (this._verticalAlign === VerticalAlign.BOTTOM) {
			verticalOffset = Math.max(0, height - totalTextHeight);
		}

		const contentY = localY + this._inputScrollY - verticalOffset;
		let lineTop = 0;
		let lineStartIndex = 0;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const hitBottom = lineTop + line.height + (i < lines.length - 1 ? this._lineSpacing / 2 : 0);
			if (contentY <= hitBottom) {
				let lineX = 0;
				if (this._textAlign === HorizontalAlign.RIGHT) {
					lineX = width - line.width;
				} else if (this._textAlign === HorizontalAlign.CENTER) {
					lineX = (width - line.width) / 2;
				}

				const x = localX - lineX;
				if (x <= 0) return lineStartIndex;

				let elementStartIndex = lineStartIndex;
				let previousWidth = 0;
				for (const element of line.elements) {
					const style = element.style;
					const fontSize = style?.size ?? this._fontSize;
					const fontFamily = style?.fontFamily ?? this._fontFamily;
					const bold = style?.bold ?? this._bold;
					const italic = style?.italic ?? this._italic;
					let previousCharacterWidth = previousWidth;

					for (let index = 1; index <= element.text.length; index++) {
						const currentWidth = previousWidth + measureText(
							element.text.substring(0, index),
							fontFamily,
							fontSize,
							bold,
							italic,
						);
						if (x < (previousCharacterWidth + currentWidth) / 2) {
							return elementStartIndex + index - 1;
						}
						previousCharacterWidth = currentWidth;
					}
					previousWidth += element.width;
					elementStartIndex += element.text.length;
				}
				return elementStartIndex;
			}

			lineStartIndex += line.charNum;
			lineTop += line.height + this._lineSpacing;
		}

		return this._text.length;
	}

	private getMaxInputScrollY(): number {
		if (!this._multiline || isNaN(this.$explicitHeight)) return 0;
		return Math.max(0, this.textHeight - this.$explicitHeight);
	}

	private invalidateFontString(): void {
		this._fontString = getFontString(this._fontSize, this._fontFamily, this._bold, this._italic);
	}

	private ensureLines(): void {
		if (!this._textDirty && this._linesArr) return;
		this._textDirty = false;
		this._linesArr = this.calculateLines();
		this._numLines = this._linesArr.length;

		let maxWidth = 0;
		let totalHeight = 0;
		for (let i = 0; i < this._linesArr.length; i++) {
			const line = this._linesArr[i];
			if (line.width > maxWidth) maxWidth = line.width;
			totalHeight += line.height;
		}
		this._textWidth = maxWidth;
		this._textHeight = totalHeight;
	}

	private getScrollNum(): number {
		if (!this._multiline) return 1;
		if (isNaN(this.$explicitHeight)) return this._numLines;
		const lineH = this._fontSize + this._lineSpacing;
		if (lineH <= 0) return this._numLines;
		let scrollNum = Math.floor(this.$explicitHeight / lineH);
		const leftH = this.$explicitHeight - lineH * scrollNum;
		if (leftH > this._fontSize / 2) scrollNum++;
		return Math.max(1, scrollNum);
	}

	private calculateLines(): ILineElement[] {
		const elements = this._textFlow ?? [{ text: this.getDisplayText() }];
		const hasTrailingLineBreak = /(?:\r\n|\r|\n)$/.test(elements.map(element => element.text).join(''));
		const maxWidth = !isNaN(this.$explicitWidth) ? this.$explicitWidth : NaN;
		const isInput = this._type === TextFieldType.INPUT;
		const lines: ILineElement[] = [];

		if (!isNaN(maxWidth) && maxWidth === 0) {
			return [{ width: 0, height: 0, charNum: 0, hasNextLine: false, elements: [] }];
		}

		let currentLine: IWTextElement[] = [];
		let lineWidth = 0;
		let lineHeight = this._fontSize;
		let lineCharNum = 0;

		const flushLine = (hasNext: boolean): void => {
			lines.push({
				width: lineWidth,
				height: lineHeight,
				charNum: lineCharNum + (hasNext ? 1 : 0),
				hasNextLine: hasNext,
				elements: currentLine,
			});
			currentLine = [];
			lineWidth = 0;
			lineHeight = this._fontSize;
			lineCharNum = 0;
		};

		for (const element of elements) {
			if (!element.text) continue;
			const style = element.style ?? {};
			const fontSize = typeof style.size === 'number' ? style.size : this._fontSize;
			const fontFamily = style.fontFamily ?? this._fontFamily;
			const bold = style.bold ?? this._bold;
			const italic = style.italic ?? this._italic;

			const segments = element.text.split(/\r\n|\r|\n/);

			for (let si = 0; si < segments.length; si++) {
				const seg = segments[si];
				const isLastSeg = si === segments.length - 1;

				if (seg === '') {
					if (!isLastSeg) {
						flushLine(true);
					}
					continue;
				}

				if (isNaN(maxWidth)) {
					const w = measureText(seg, fontFamily, fontSize, bold, italic);
					currentLine.push({ text: seg, width: w, style: element.style });
					lineWidth += w;
					if (!isInput) lineHeight = Math.max(lineHeight, fontSize);
					lineCharNum += seg.length;
					if (!isLastSeg) flushLine(true);
				} else {
					const totalSegWidth = measureText(seg, fontFamily, fontSize, bold, italic);

					if (lineWidth + totalSegWidth <= maxWidth || !this._multiline) {
						currentLine.push({ text: seg, width: totalSegWidth, style: element.style });
						lineWidth += totalSegWidth;
						if (!isInput) lineHeight = Math.max(lineHeight, fontSize);
						lineCharNum += seg.length;
						if (!isLastSeg) flushLine(true);
					} else {
						const tokenTexts = this._wordWrap ? tokenize(seg) : (seg.match(/[\s\S]/gu) ?? seg.split(''));

						let ww = 0;
						let charNum = 0;

						for (const token of tokenTexts) {
							const w = measureText(token, fontFamily, fontSize, bold, italic);

							if (lineWidth !== 0 && lineWidth + w > maxWidth) {
								flushLine(false);
							}

							if (w > maxWidth) {
								const chars = splitGraphemes(token);
								for (const ch of chars) {
									const cw = measureText(ch, fontFamily, fontSize, bold, italic);
									if (lineWidth !== 0 && lineWidth + cw > maxWidth) {
										flushLine(false);
									}
									currentLine.push({ text: ch, width: cw, style: element.style });
									lineWidth += cw;
									if (!isInput) lineHeight = Math.max(lineHeight, fontSize);
									lineCharNum++;
									charNum++;
								}
							} else {
								currentLine.push({ text: token, width: w, style: element.style });
								lineWidth += w;
								if (!isInput) lineHeight = Math.max(lineHeight, fontSize);
								lineCharNum += token.length;
								charNum += token.length;
								ww += w;
							}
						}

						if (!isLastSeg) flushLine(true);
					}
				}
			}
		}

		if (currentLine.length > 0) {
			lines.push({
				width: lineWidth,
				height: lineHeight,
				charNum: lineCharNum,
				hasNextLine: false,
				elements: currentLine,
			});
		}

		if (lines.length === 0 || (currentLine.length === 0 && hasTrailingLineBreak)) {
			lines.push({ width: 0, height: this._fontSize, charNum: 0, hasNextLine: false, elements: [] });
		}

		return lines;
	}

	private getDisplayText(): string {
		if (this._displayAsPassword) return '*'.repeat(this._text.length);
		return this._text;
	}

	private onTapHandler = (e: TouchEvent): void => {
		if (this._type === TextFieldType.INPUT) return;
		const te = e;
		const element = this.getTextElementAt(te.localX, te.localY);
		if (!element?.style?.href) return;
		const href = element.style.href;
		if (href.startsWith('event:')) {
			TextEvent.dispatchTextEvent(this, TextEvent.LINK, href.substring('event:'.length));
		} else {
			open(href, element.style.target ?? '_blank');
		}
	};

	private getTextElementAt(x: number, y: number): ITextElement | undefined {
		this.ensureLines();
		const lines = this._linesArr ?? [];
		const width = !isNaN(this.$explicitWidth) ? this.$explicitWidth : this._textWidth;
		const height = !isNaN(this.$explicitHeight) ? this.$explicitHeight : this.textHeight;

		let totalTextHeight = 0;
		for (let i = 0; i < lines.length; i++) {
			totalTextHeight += lines[i].height;
			if (i > 0) totalTextHeight += this._lineSpacing;
		}

		let verticalOffset = 0;
		if (this._verticalAlign === VerticalAlign.MIDDLE) {
			verticalOffset = Math.max(0, (height - totalTextHeight) / 2);
		} else if (this._verticalAlign === VerticalAlign.BOTTOM) {
			verticalOffset = Math.max(0, height - totalTextHeight);
		}

		const scrollOffset = this.getScrollYOffset();

		const localY = y - verticalOffset + scrollOffset;

		let lineY = 0;
		for (const line of lines) {
			if (localY < lineY) break;
			if (localY <= lineY + line.height) {
				let lineX = 0;
				if (this._textAlign === HorizontalAlign.RIGHT) {
					lineX = width - line.width;
				} else if (this._textAlign === HorizontalAlign.CENTER) {
					lineX = (width - line.width) / 2;
				}
				for (const el of line.elements) {
					if (x >= lineX && x < lineX + el.width) return el;
					lineX += el.width;
				}
				break;
			}
			lineY += line.height + this._lineSpacing;
		}
		return undefined;
	}
}

function clampIndex(value: number, length: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(Math.trunc(value), length));
}
