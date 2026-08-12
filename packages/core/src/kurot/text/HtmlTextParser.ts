import type { ITextElement, ITextStyle } from './types/ITextElement.js';

const REPLACE_PAIRS: [RegExp, string][] = [
	[/&lt;/g, '<'],
	[/&gt;/g, '>'],
	[/&amp;/g, '&'],
	[/&quot;/g, '"'],
	[/&apos;/g, "'"],
];

const HEAD_REG = /^(color|textcolor|strokecolor|stroke|b|bold|i|italic|u|size|fontfamily|href|target)(\s)*=/;

function replaceSpecial(value: string): string {
	for (const [pattern, replacement] of REPLACE_PAIRS) {
		value = value.replace(pattern, replacement);
	}
	return value;
}

function parseProperty(info: ITextStyle, head: string, value: string): void {
	switch (head.toLowerCase()) {
		case 'color':
		case 'textcolor':
			info.textColor = parseInt(value.replace(/#/, '0x'));
			break;
		case 'strokecolor':
			info.strokeColor = parseInt(value.replace(/#/, '0x'));
			break;
		case 'stroke':
			info.stroke = parseInt(value);
			break;
		case 'b':
		case 'bold':
			info.bold = value === 'true';
			break;
		case 'u':
			info.underline = value === 'true';
			break;
		case 'i':
		case 'italic':
			info.italic = value === 'true';
			break;
		case 'size':
			info.size = parseInt(value);
			break;
		case 'fontfamily':
			info.fontFamily = value;
			break;
		case 'href':
			info.href = replaceSpecial(value);
			break;
		case 'target':
			info.target = replaceSpecial(value);
			break;
	}
}

function parseTag(str: string): ITextStyle {
	str = str.trim();
	const info: ITextStyle = {};

	if (str.charAt(0) === 'i' || str.charAt(0) === 'b' || str.charAt(0) === 'u') {
		parseProperty(info, str, 'true');
		return info;
	}

	const header = str.match(/^(font|a)\s/);
	if (!header) return info;

	str = str.substring(header[0].length).trim();
	let titles: RegExpMatchArray | undefined;
	while ((titles = str.match(HEAD_REG) ?? undefined)) {
		const title = titles[0];
		str = str.substring(title.length).trim();
		let value = '';
		let next = 0;
		if (str.charAt(0) === '"') {
			next = str.indexOf('"', 1);
			value = str.substring(1, next);
			next++;
		} else if (str.charAt(0) === "'") {
			next = str.indexOf("'", 1);
			value = str.substring(1, next);
			next++;
		} else {
			const m = str.match(/(\S)+/);
			value = m ? m[0] : '';
			next = value.length;
		}
		parseProperty(info, title.substring(0, title.length - 1).trim(), value.trim());
		str = str.substring(next).trim();
	}

	return info;
}

/**
 * Parses HTML-like markup into an array of ITextElement objects
 * suitable for assigning to TextField.textFlow.
 */
export class HtmlTextParser {
	private _stack: ITextStyle[] = [];
	private _result: ITextElement[] = [];

	public parse(htmltext: string): ITextElement[] {
		this._stack = [];
		this._result = [];
		let firstIdx = 0;
		const length = htmltext.length;

		while (firstIdx < length) {
			const startIdx = htmltext.indexOf('<', firstIdx);
			if (startIdx < 0) {
				this.addText(htmltext.substring(firstIdx));
				break;
			}

			this.addText(htmltext.substring(firstIdx, startIdx));

			let endIdx = htmltext.indexOf('>', startIdx);
			if (endIdx === -1) endIdx = startIdx;

			if (htmltext.charAt(startIdx + 1) === '/') {
				this._stack.pop();
			} else {
				const tagContent = htmltext.substring(startIdx + 1, endIdx);
				const style = parseTag(tagContent);
				if (this._stack.length > 0) {
					const parent = this._stack[this._stack.length - 1];
					for (const key in parent) {
						if ((style as Record<string, unknown>)[key] === undefined) {
							(style as Record<string, unknown>)[key] = (parent as Record<string, unknown>)[key];
						}
					}
				}
				this._stack.push(style);
			}

			firstIdx = endIdx + 1;
		}

		return this._result;
	}

	/** @deprecated Use parse() instead. */
	public parser(htmltext: string): ITextElement[] {
		return this.parse(htmltext);
	}

	private addText(value: string): void {
		if (!value) return;
		value = replaceSpecial(value);
		if (this._stack.length > 0) {
			this._result.push({ text: value, style: this._stack[this._stack.length - 1] });
		} else {
			this._result.push({ text: value });
		}
	}
}
