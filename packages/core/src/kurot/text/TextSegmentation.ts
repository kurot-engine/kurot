let wordSegmenter: Intl.Segmenter | undefined;
let graphemeSegmenter: Intl.Segmenter | undefined;

export function getWordSegments(text: string): Intl.Segments {
	wordSegmenter ??= new Intl.Segmenter(undefined, { granularity: 'word' });
	return wordSegmenter.segment(text);
}

export function getGraphemeSegments(text: string): Intl.Segments {
	graphemeSegmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' });
	return graphemeSegmenter.segment(text);
}

/**
 * End offsets use UTF-16 units, matching TextField's source and caret indices.
 */
export function getGraphemeEndPositions(text: string): number[] {
	return Array.from(getGraphemeSegments(text), segment => segment.index + segment.segment.length);
}
