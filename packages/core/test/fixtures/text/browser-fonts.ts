import { readFile } from 'node:fs/promises';

/**
 * Test-only font subsets cover every character in languages.ts, including marks.
 * Keep the font choice explicit so a missing glyph cannot pass as system tofu.
 */
export const browserFontNames = [
	'noto-sans',
	'barlow',
	'barlow-bold',
	'arabic',
	'hebrew',
	'devanagari',
	'bengali',
	'korean',
	'thai',
	'japanese',
	'simplified',
	'traditional',
] as const;

export function textFixtureFamily(script: string): string {
	const name = ['latin', 'greek', 'cyrillic'].includes(script) ? 'noto-sans' : script;
	return `Fixture-${name}`;
}

export async function loadBrowserFonts(): Promise<Map<string, Buffer>> {
	return new Map(
		await Promise.all(
			browserFontNames.map(
				async name =>
					[`/${name}.woff2`, await readFile(new URL(`./fonts/${name}.woff2`, import.meta.url))] as const,
			),
		),
	);
}
