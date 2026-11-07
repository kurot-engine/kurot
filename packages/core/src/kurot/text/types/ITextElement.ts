export interface ITextStyle {
	textColor?: number;
	strokeColor?: number;
	size?: number;
	stroke?: number;
	bold?: boolean;
	italic?: boolean;
	fontFamily?: string;
	href?: string;
	target?: string;
	underline?: boolean;
}

export interface ITextElement {
	text: string;
	style?: ITextStyle;
}

export interface IWTextElement extends ITextElement {
	width: number;
}

export interface ILineElement {
	width: number;
	/**
	 * Dynamic row height contains run sizes and font ascent/descent; input uses its base size.
	 */
	height: number;
	/**
	 * Shared alphabetic baseline measured from the stable line-frame top, in logical pixels.
	 */
	baseline: number;
	/**
	 * Largest visible run extent above the shared baseline, excluding outlines.
	 */
	inkAscent: number;
	/**
	 * Largest visible run extent below the shared baseline, excluding outlines.
	 */
	inkDescent: number;
	charNum: number;
	hasNextLine: boolean;
	elements: IWTextElement[];
}

export interface IHitTextElement {
	lineIndex: number;
	textElementIndex: number;
}
