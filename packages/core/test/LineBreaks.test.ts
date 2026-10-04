// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { getDefaultLineBreaks, getWordLineBreaks } from '../src/kurot/text/LineBreaks.js';

describe('Unicode 17.0 UAX #14', () => {
	it('matches the complete official default line break corpus', () => {
		const fixture = gunzipSync(
			readFileSync(new URL('./fixtures/unicode/17.0.0/LineBreakTest.txt.gz', import.meta.url)),
		);
		const provenance = readFileSync(new URL('./fixtures/unicode/17.0.0/README.md', import.meta.url), 'utf8');
		expect(provenance).toContain(createHash('sha256').update(fixture).digest('hex'));
		let caseCount = 0;
		for (const [index, line] of fixture.toString('utf8').split('\n').entries()) {
			const specification = line.split('#')[0].trim();
			if (!specification) continue;
			const expected: number[] = [];
			let text = '';
			for (const token of specification.split(/\s+/)) {
				if (token === '÷') {
					expected.push(text.length);
				} else if (token !== '×') {
					text += String.fromCodePoint(parseInt(token, 16));
				}
			}
			expect(
				getDefaultLineBreaks(text).map(point => point.position),
				`corpus line ${index + 1}`,
			).toEqual(expected);
			caseCount++;
		}
		expect(caseCount).toBeGreaterThan(19000);
	});

	it('keeps non-breaking spaces and word joiners protected during emergency wrapping', () => {
		expect(getWordLineBreaks('a\u00a0b', true).map(point => point.position)).toEqual([3]);
		expect(getWordLineBreaks('a\u202fb', true).map(point => point.position)).toEqual([3]);
		expect(getWordLineBreaks('a\u2060b', true).map(point => point.position)).toEqual([3]);
	});

	it('retains dictionary opportunities for Thai without relaxing punctuation rules', () => {
		const text = 'สวัสดีครับ';
		expect(getDefaultLineBreaks(text).map(point => point.position)).toEqual([text.length]);
		expect(getWordLineBreaks(text).map(point => point.position)).toEqual([6, text.length]);
	});
});
