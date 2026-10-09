import { getWordLineBreaks } from './LineBreaks.js';
import { getFontString, measureTextMetrics } from './TextMeasurer.js';
import { getGraphemeEndPositions } from './TextSegmentation.js';
import type { ILineElement, ITextElement, ITextStyle, IWTextElement } from './types/ITextElement.js';

export interface TextLineLayoutOptions {
	fontFamily: string;
	size: number;
	bold: boolean;
	italic: boolean;
	maxWidth: number;
	wordWrap: boolean;
	multiline: boolean;
	isInput: boolean;
}

interface TextSpan {
	start: number;
	end: number;
	style?: ITextStyle;
}

/**
 * Layout uses the complete text so style boundaries cannot create line breaks.
 * Soft-wrap separator spaces are omitted from painting and measured width,
 * but still count in charNum, preserving input offsets and the original text.
 */
export function layoutTextLines(elements: ITextElement[], options: TextLineLayoutOptions): ILineElement[] {
	if (options.maxWidth === 0) {
		return [{ width: 0, height: 0, baseline: 0, inkAscent: 0, inkDescent: 0, charNum: 0, hasNextLine: false, elements: [] }];
	}

	const fontFrames = new Map<string, TextMetrics>();
	const text = elements.map(element => element.text).join('');
	let offset = 0;
	const spans: TextSpan[] = elements.map(element => {
		const start = offset;
		offset += element.text.length;
		return { start, end: offset, style: element.style };
	});
	const wrapping = options.multiline && Number.isFinite(options.maxWidth);
	const lines: ILineElement[] = [];
	let paragraphStart = 0;
	let spanIndex = 0;

	for (const separator of text.matchAll(/\r\n|[\n\r\v\f\u0085\u2028\u2029]/g)) {
		if (!options.multiline) {
			lines.push(createLine(0, separator.index, false));
			return lines;
		}
		appendParagraph(paragraphStart, separator.index, separator[0].length);
		paragraphStart = separator.index + separator[0].length;
	}
	appendParagraph(paragraphStart, text.length, 0);
	return lines;

	function appendParagraph(start: number, end: number, separatorLength: number): void {
		const paragraph = text.slice(start, end);
		if (!wrapping || !paragraph) {
			const line = createLine(start, end, false);
			line.charNum += separatorLength;
			line.hasNextLine = separatorLength > 0;
			lines.push(line);
			return;
		}

		const graphemeEnds = getGraphemeEndPositions(paragraph);
		const positions = options.wordWrap
			? getWordLineBreaks(paragraph, false, graphemeEnds).map(point => start + point.position)
			: graphemeEnds.map(position => start + position);
		let emergencyPositions: number[] | undefined;
		let emergencyIndex = 0;
		let oversizedBoundary = -1;
		let positionIndex = 0;
		let lineStart = start;

		while (lineStart < end) {
			const measured = new Map<number, ILineElement>();
			const lineAt = (position: number): ILineElement => {
				let line = measured.get(position);
				if (!line) {
					line = createLine(lineStart, position, true);
					measured.set(position, line);
				}
				return line;
			};
			while (positions[positionIndex] <= lineStart) {
				positionIndex++;
			}
			let chosen = lineStart;
			let candidateIndex = positionIndex;
			while (lineStart >= oversizedBoundary && candidateIndex < positions.length) {
				const candidate = positions[candidateIndex];
				if (lineAt(candidate).width > options.maxWidth) {
					break;
				}
				chosen = candidate;
				candidateIndex++;
			}

			if (chosen === lineStart) {
				emergencyPositions ??= getWordLineBreaks(paragraph, true, graphemeEnds).map(
					point => start + point.position,
				);
				const firstBoundary = positions[positionIndex];
				oversizedBoundary = firstBoundary;
				while (emergencyPositions[emergencyIndex] <= lineStart) {
					emergencyIndex++;
				}
				chosen = firstBoundary;
				for (let index = emergencyIndex; index < emergencyPositions.length; index++) {
					const candidate = emergencyPositions[index];
					if (candidate > firstBoundary) {
						break;
					}
					if (lineAt(candidate).width > options.maxWidth) {
						if (chosen === firstBoundary) {
							chosen = candidate;
						}
						break;
					}
					chosen = candidate;
				}
				if (chosen === firstBoundary) {
					oversizedBoundary = -1;
					for (let index = positionIndex + 1; index < positions.length; index++) {
						if (lineAt(positions[index]).width > options.maxWidth) {
							break;
						}
						chosen = positions[index];
					}
				}
			}

			lines.push(lineAt(chosen));
			lineStart = chosen;
		}
		const lastLine = lines[lines.length - 1];
		lastLine.charNum += separatorLength;
		lastLine.hasNextLine = separatorLength > 0;
	}

	// Empty-string font bounds keep fallback glyphs from moving paragraph/input baselines.
	function getFontFrame(style?: ITextStyle): TextMetrics {
		const size = style?.size ?? options.size;
		const family = style?.fontFamily ?? options.fontFamily;
		const bold = style?.bold ?? options.bold;
		const italic = style?.italic ?? options.italic;
		const key = getFontString(size, family, bold, italic);
		let metrics = fontFrames.get(key);
		if (!metrics) {
			metrics = measureTextMetrics('', family, size, bold, italic);
			fontFrames.set(key, metrics);
		}
		return metrics;
	}

	function createLine(start: number, end: number, trimSeparators: boolean): ILineElement {
		let visibleEnd = end;
		if (trimSeparators) {
			while (visibleEnd > start && /[\t ]/.test(text[visibleEnd - 1])) {
				visibleEnd--;
			}
		}

		const lineElements: IWTextElement[] = [];
		let width = 0;
		let height = 0;
		let fontAscent = 0;
		let fontDescent = 0;
		let inkAscent = -Infinity;
		let inkDescent = -Infinity;
		while (spanIndex < spans.length && spans[spanIndex].end <= start) {
			spanIndex++;
		}
		for (let index = spanIndex; index < spans.length; index++) {
			const span = spans[index];
			if (span.start >= visibleEnd) {
				break;
			}
			const content = text.slice(Math.max(start, span.start), Math.min(visibleEnd, span.end));
			const style = span.style;
			const size = style?.size ?? options.size;
			const metrics = measureTextMetrics(
				content,
				style?.fontFamily ?? options.fontFamily,
				size,
				style?.bold ?? options.bold,
				style?.italic ?? options.italic,
			);
			lineElements.push({ text: content, width: metrics.width, style });
			width += metrics.width;
			const frame = getFontFrame(options.isInput ? undefined : style);
			fontAscent = Math.max(fontAscent, frame.fontBoundingBoxAscent);
			fontDescent = Math.max(fontDescent, frame.fontBoundingBoxDescent);
			if (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent > 0) {
				inkAscent = Math.max(inkAscent, metrics.actualBoundingBoxAscent);
				inkDescent = Math.max(inkDescent, metrics.actualBoundingBoxDescent);
			}
			if (!options.isInput) {
				height = Math.max(height, size);
			}
		}
		if (options.isInput) {
			height = options.size;
		} else if (lineElements.length === 0) {
			const blankSpan = spans[spanIndex] ?? spans[spans.length - 1];
			height = blankSpan?.style?.size ?? options.size;
		}
		if (lineElements.length === 0) {
			const style = options.isInput ? undefined : (spans[spanIndex] ?? spans[spans.length - 1])?.style;
			const metrics = getFontFrame(style);
			fontAscent = metrics.fontBoundingBoxAscent;
			fontDescent = metrics.fontBoundingBoxDescent;
		}
		const baseline = (height + fontAscent - fontDescent) / 2;
		return {
			width, height, baseline,
			inkAscent: inkAscent === -Infinity ? 0 : inkAscent,
			inkDescent: inkDescent === -Infinity ? 0 : inkDescent,
			charNum: end - start, hasNextLine: false, elements: lineElements,
		};
	}
}
