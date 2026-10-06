import { parseUILabelStyles } from './UILabelStyle.js';
import type { UILabelStyle } from './UILabelStyle.js';

export interface UIStyleFontFace {
	readonly url: string;
	readonly weight: number;
}

export interface UIStyleFontFamily {
	readonly fallback: readonly string[];
	readonly faces: readonly UIStyleFontFace[];
}

/**
 * 项目风格配置。字体键表示稳定用途，实际文件与皮肤中的字体别名无关。
 * 所有字体 URL 都相对 resource，样式值不写入 kurot.reskin.json 的编辑元数据。
 */
export interface UIStyleSheet {
	readonly schemaVersion: 1;
	readonly colors: Readonly<Record<string, number>>;
	readonly labels: Readonly<Record<string, UILabelStyle>>;
	readonly fonts: {
		readonly default: string;
		readonly families: Readonly<Record<string, UIStyleFontFamily>>;
	};
}

const FONT_KEY_PATTERN = /^[a-z][a-z0-9-]*$/;
const GENERIC_FONT_FAMILIES = new Set([
	'serif',
	'sans-serif',
	'monospace',
	'cursive',
	'fantasy',
	'system-ui',
	'ui-serif',
	'ui-sans-serif',
	'ui-monospace',
	'ui-rounded',
	'math',
	'emoji',
	'fangsong',
]);

/**
 * 在加载字体之前验证整份配置；错误包含字段位置，不静默使用写死的项目字体。
 */
export function parseUIStyleSheet(value: unknown): UIStyleSheet {
	const root = requireRecord(value, 'style');
	requireKeys(root, ['schemaVersion', 'fonts', 'colors', 'labels'], 'style');
	if (root.schemaVersion !== 1) {
		throw new Error('style.schemaVersion must be 1.');
	}

	const fonts = requireRecord(root.fonts, 'style.fonts');
	requireKeys(fonts, ['default', 'families'], 'style.fonts');
	const defaultKey = requireFontKey(fonts.default, 'style.fonts.default');
	const definitions = requireRecord(fonts.families, 'style.fonts.families');
	const families = Object.fromEntries(
		Object.entries(definitions).map(([key, family]): [string, UIStyleFontFamily] => {
			requireFontKey(key, `style.fonts.families.${key}`);
			return [key, parseFontFamily(family, `style.fonts.families.${key}`)];
		}),
	);

	if (!Object.hasOwn(families, defaultKey)) {
		throw new Error(`style.fonts.default references an undefined font: ${defaultKey}.`);
	}

	const colors = parseColors(root.colors);

	const style: UIStyleSheet = { schemaVersion: 1, fonts: { default: defaultKey, families }, colors, labels: {} };
	const labels = parseUILabelStyles(root.labels, colors, key => getUIStyleFontFamily(style, key));
	return { ...style, labels };
}

export function getUIStyleFontAlias(key: string): string {
	return `kurot-${key}`;
}

/**
 * 默认字体和显式字体用途使用同一种 CSS 字体栈，保留按字符回退的能力。
 */
export function getUIStyleFontFamily(styleSheet: UIStyleSheet, key: string = styleSheet.fonts.default): string {
	if (!Object.hasOwn(styleSheet.fonts.families, key)) {
		throw new Error(`Unknown project font: ${key}.`);
	}
	const family = styleSheet.fonts.families[key];
	if (!family) {
		throw new Error(`Unknown project font: ${key}.`);
	}

	return [quoteFontFamily(getUIStyleFontAlias(key)), ...family.fallback.map(quoteFontFamily)].join(', ');
}

/**
 * Returns a configured RGB value. Unknown keys fail instead of silently substituting a color.
 */
export function getUIStyleColor(colors: Readonly<Record<string, number>>, key: string): number {
	const color = Object.hasOwn(colors, key) ? colors[key] : undefined;
	if (color === undefined) {
		throw new Error(`Unknown project color: ${key}.`);
	}

	if (!Number.isInteger(color) || color < 0 || color > 0xffffff) {
		throw new Error(`Invalid project color: ${key}.`);
	}

	return color;
}

function parseColors(value: unknown): Readonly<Record<string, number>> {
	if (value === undefined) {
		return Object.freeze({});
	}
	const colors = requireRecord(value, 'style.colors');
	return Object.freeze(
		Object.fromEntries(
			Object.entries(colors).map(([key, color]) => {
				if (!FONT_KEY_PATTERN.test(key)) {
					throw new Error(
						`style.colors.${key} must use a lowercase key containing letters, digits or hyphens.`,
					);
				}
				if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) {
					throw new Error(`style.colors.${key} must be a six-digit RGB color (#RRGGBB).`);
				}
				return [key, Number.parseInt(color.slice(1), 16)];
			}),
		),
	);
}

function parseFontFamily(value: unknown, path: string): UIStyleFontFamily {
	const family = requireRecord(value, path);
	requireKeys(family, ['fallback', 'faces'], path);
	if (!Array.isArray(family.fallback)) {
		throw new Error(`${path}.fallback must be a list of font family names.`);
	}
	const fallback = family.fallback.map((name: unknown, index: number) =>
		requireFontName(name, `${path}.fallback[${index}]`),
	);

	if (!Array.isArray(family.faces) || family.faces.length === 0) {
		throw new Error(`${path}.faces must contain at least one font face.`);
	}
	const faces = family.faces.map((face: unknown, index: number) => parseFontFace(face, `${path}.faces[${index}]`));
	const weights = new Set(faces.map(face => face.weight));
	if (weights.size !== faces.length) {
		throw new Error(`${path}.faces must not contain duplicate weights.`);
	}
	if (!weights.has(400)) {
		throw new Error(`${path}.faces must include the normal weight 400.`);
	}

	return { fallback, faces };
}

function parseFontFace(value: unknown, path: string): UIStyleFontFace {
	const face = requireRecord(value, path);
	requireKeys(face, ['url', 'weight'], path);
	const url = face.url;
	if (
		typeof url !== 'string' ||
		url !== url.trim() ||
		/[\\:%?#\x00-\x1f\x7f]/.test(url) ||
		url.startsWith('/') ||
		url.split('/').some(segment => segment === '' || segment === '.' || segment === '..') ||
		!/\.(ttf|otf|woff|woff2)$/i.test(url)
	) {
		throw new Error(`${path}.url must be a resource-relative TTF, OTF, WOFF or WOFF2 path.`);
	}

	const weight = face.weight;
	if (typeof weight !== 'number' || !Number.isInteger(weight) || weight < 100 || weight > 900 || weight % 100 !== 0) {
		throw new Error(`${path}.weight must be 100–900 in steps of 100.`);
	}

	return { url, weight };
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new Error(`${path} must be an object.`);
	}

	return value as Record<string, unknown>;
}

function requireKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
	for (const key of Object.keys(value)) {
		if (!allowed.includes(key)) {
			throw new Error(`Unknown style field: ${path}.${key}.`);
		}
	}
}

function requireFontKey(value: unknown, path: string): string {
	if (typeof value !== 'string' || !FONT_KEY_PATTERN.test(value)) {
		throw new Error(`${path} must be a lowercase font key containing letters, digits or hyphens.`);
	}

	return value;
}

function requireFontName(value: unknown, path: string): string {
	if (typeof value !== 'string' || value.trim() === '' || /[\x00-\x1f\x7f]/.test(value)) {
		throw new Error(`${path} must be a nonempty font family name.`);
	}

	return value.trim();
}

function quoteFontFamily(name: string): string {
	return GENERIC_FONT_FAMILIES.has(name.toLowerCase())
		? name.toLowerCase()
		: `"${name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
