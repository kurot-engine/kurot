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
	height: number;
	charNum: number;
	hasNextLine: boolean;
	elements: IWTextElement[];
}

export interface IHitTextElement {
	lineIndex: number;
	textElementIndex: number;
}
