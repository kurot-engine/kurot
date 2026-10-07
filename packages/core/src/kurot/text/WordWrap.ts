/**
 * Locale-aware word segmentation utility.
 *
 * Uses `Intl.Segmenter` (supported in all browsers since 2024) for locale-aware
 * word segmentation, including dictionary-based boundaries. Word boundaries
 * are distinct from Unicode line-break opportunities; TextField uses LineBreaks.
 *
 * Falls back to character-by-character splitting when `Intl.Segmenter` is
 * unavailable.
 */

import { getGraphemeSegments, getWordSegments } from './TextSegmentation.js';

const hasSegmenter = typeof Intl !== 'undefined' && typeof (Intl as Record<string, unknown>).Segmenter === 'function';

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
 * Split text into locale-aware word / space segments.
 *
 * Returns plain strings — each string is either a word or a space.
 * Newlines are NOT included (the caller should split by newlines first).
 *
 * - Latin: "hello world" → ["hello", " ", "world"]
 * - Thai:  "สวัสดีครับ"    → ["สวัสดี", "ครับ"]
 */
export function tokenize(text: string): string[] {
	if (!text) return [];

	if (hasSegmenter) {
		const result: string[] = [];
		for (const seg of getWordSegments(text)) {
			const s = seg.segment;
			if (!s) continue;
			const code = s.charCodeAt(0);
			if (NEWLINES.has(code)) continue;
			result.push(s);
		}
		return result;
	}

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
 * This utility is independent of TextField's UAX #14 line layout.
 */
export function splitGraphemes(text: string): string[] {
	if (hasSegmenter) {
		const result: string[] = [];
		for (const s of getGraphemeSegments(text)) {
			result.push(s.segment);
		}
		return result;
	}
	return [...text];
}
