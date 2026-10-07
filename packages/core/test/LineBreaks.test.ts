// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
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

	it.each(['👩‍👩‍👧‍👦', '🇨🇳', '👍🏽', 'e\u0301', 'क्ष'])(
		'keeps the complete grapheme %j in ordinary and emergency wrapping',
		text => {
			expect(getWordLineBreaks(text).map(point => point.position)).toEqual([text.length]);
			expect(getWordLineBreaks(text, true).map(point => point.position)).toEqual([text.length]);
		},
	);

	it('retains tailoring and grapheme protection in a minified browser bundle without keepNames', async () => {
		const result = await build({
			entryPoints: [fileURLToPath(new URL('../src/kurot/text/LineBreaks.ts', import.meta.url))],
			bundle: true,
			platform: 'browser',
			target: 'es2022',
			format: 'iife',
			globalName: 'LineBreakTest',
			minify: true,
			keepNames: false,
			write: false,
		});
		const output = result.outputFiles[0];
		const context = createContext({ atob, TextDecoder, TextEncoder, Intl });
		runInContext(output.text, context);
		const cases: { text: string; emergency: boolean; expected: number[] }[] = [
			{ text: 'abcdef', emergency: true, expected: [1, 2, 3, 4, 5, 6] },
			{ text: 'สวัสดีครับ', emergency: false, expected: [6, 10] },
			{ text: '你好，世界！', emergency: false, expected: [1, 3, 4, 6] },
			{ text: '👩‍👩‍👧‍👦', emergency: false, expected: [11] },
			{ text: '👩‍👩‍👧‍👦', emergency: true, expected: [11] },
			{ text: '🇨🇳', emergency: true, expected: [4] },
			{ text: '👍🏽', emergency: true, expected: [4] },
			{ text: 'e\u0301', emergency: true, expected: [2] },
			{ text: 'a\u00a0b', emergency: true, expected: [3] },
			{ text: 'a\u202fb', emergency: true, expected: [3] },
			{ text: 'a\u2060b', emergency: true, expected: [3] },
		];
		for (const { text, emergency, expected } of cases) {
			const actual: unknown = runInContext(
				`JSON.stringify(LineBreakTest.getWordLineBreaks(${JSON.stringify(text)}, ${emergency}).map(point => point.position))`,
				context,
			);
			expect(actual, text).toBe(JSON.stringify(expected));
		}
	});
});
