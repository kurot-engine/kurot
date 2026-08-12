/**
 * Multilingual text tokenization for word-wrapping.
 *
 * Uses `Intl.Segmenter` (supported in all browsers since 2024) for locale-aware
 * word segmentation. Correctly handles Latin (space-separated), CJK (each
 * character is a segment), Thai/Khmer/Lao (dictionary-based word boundaries),
 * and mixed-script text.
 *
 * Falls back to character-by-character splitting when `Intl.Segmenter` is
 * unavailable.
 */

// ── Segmenter (lazy, cached) ────────────────────────────────────────────────

let _segmenter: Intl.Segmenter | undefined;

const hasSegmenter = typeof Intl !== 'undefined' && typeof (Intl as Record<string, unknown>).Segmenter === 'function';

function getSegmenter(): Intl.Segmenter {
	if (!_segmenter) {
		_segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
	}
	return _segmenter;
}

// ── Breaking space / newline tables ─────────────────────────────────────────

const BREAKING_SPACES = new Set([
	0x0009, // tab
	0x0020, // space
	0x2000, // en quad
	0x2001, // em quad
	0x2002, // en space
	0x2003, // em space
	0x2004, // three-per-em space
	0x2005, // four-per-em space
	0x2006, // six-per-em space
	0x2008, // punctuation space
	0x2009, // thin space
	0x200a, // hair space
	0x205f, // medium mathematical space
	0x3000, // ideographic space
]);

const NEWLINES = new Set([0x000a, 0x000d]);

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Split text into word / space segments suitable for line-wrapping.
 *
 * Returns plain strings — each string is either a word or a space.
 * Newlines are NOT included (the caller should split by newlines first).
 *
 * - Latin: "hello world" → ["hello", " ", "world"]
 * - CJK:   "你好世界"     → ["你", "好", "世", "界"]
 * - Thai:  "สวัสดีครับ"    → ["สวัสดี", "ครับ"]
 */
export function tokenize(text: string): string[] {
	if (!text) return [];

	if (hasSegmenter) {
		const result: string[] = [];
		for (const seg of getSegmenter().segment(text)) {
			const s = seg.segment;
			if (!s) continue;
			// Skip newlines — caller handles them
			const code = s.charCodeAt(0);
			if (NEWLINES.has(code)) continue;
			result.push(s);
		}
		return result;
	}

	// Fallback: split into individual characters
	const result: string[] = [];
	let buf = '';
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		if (NEWLINES.has(code)) {
			if (buf) {
				result.push(buf);
				buf = '';
			}
			continue;
		}
		if (BREAKING_SPACES.has(code)) {
			if (buf) {
				result.push(buf);
				buf = '';
			}
			result.push(text[i]);
		} else {
			buf += text[i];
		}
	}
	if (buf) result.push(buf);
	return result;
}

/**
 * Split a string into grapheme clusters (user-perceived characters).
 * Used when a single token is wider than the field and must be broken
 * character-by-character.
 */
export function splitGraphemes(text: string): string[] {
	if (hasSegmenter) {
		const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
		const result: string[] = [];
		for (const s of seg.segment(text)) {
			result.push(s.segment);
		}
		return result;
	}
	return [...text];
}
