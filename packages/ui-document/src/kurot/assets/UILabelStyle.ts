import type { UIPropertyPrimitive } from '../model/UIPropertyValue.js';
import { LABEL_PROPERTIES } from '../catalog/properties/basic-component-properties.js';
import { matchesUIPropertyDefinition } from '../schema/matchesUIPropertyDefinition.js';

/**
 * 预设只管理文字外观；内容、换行、字号适配和布局由每个 Label 自己决定。
 */
export const UI_LABEL_STYLE_PROPERTIES = [
	'fontFamily',
	'size',
	'textColor',
	'bold',
	'italic',
	'lineSpacing',
	'stroke',
	'strokeColor',
	'textAlign',
	'verticalAlign',
] as const;

export type UILabelStyleProperty = (typeof UI_LABEL_STYLE_PROPERTIES)[number];
export interface UILabelStyle {
	readonly fontFamily?: string;
	readonly size?: number;
	readonly textColor?: number;
	readonly bold?: boolean;
	readonly italic?: boolean;
	readonly lineSpacing?: number;
	readonly stroke?: number;
	readonly strokeColor?: number;
	readonly textAlign?: 'left' | 'center' | 'right';
	readonly verticalAlign?: 'top' | 'middle' | 'bottom';
}

export function parseUILabelStyles(
	value: unknown,
	colors: Readonly<Record<string, number>>,
	resolveFont: (key: string) => string,
): Readonly<Record<string, UILabelStyle>> {
	if (value === undefined) {
		return Object.freeze({});
	}
	const definitions = requireRecord(value, 'style.labels');
	return Object.freeze(
		Object.fromEntries(
			Object.entries(definitions).map(([key, entry]) => {
				if (!/^[a-z][a-z0-9-]*$/.test(key)) {
					throw new Error(
						`style.labels.${key} must use a lowercase key containing letters, digits or hyphens.`,
					);
				}
				const path = `style.labels.${key}`;
				const preset = requireRecord(entry, path);
				const properties = Object.fromEntries(
					Object.entries(preset).map(([name, authored]) => {
						if (!UI_LABEL_STYLE_PROPERTIES.includes(name as UILabelStyleProperty)) {
							throw new Error(`Unknown Label style field: ${path}.${name}.`);
						}
						let resolved = authored;
						if (name === 'textColor' || name === 'strokeColor') {
							if (typeof authored === 'string' && /^#[0-9a-f]{6}$/i.test(authored)) {
								resolved = Number.parseInt(authored.slice(1), 16);
							} else if (
								typeof authored === 'string' &&
								/^@style:colors:[a-z][a-z0-9-]*$/.test(authored)
							) {
								const colorKey = authored.slice('@style:colors:'.length);
								if (!Object.hasOwn(colors, colorKey)) {
									throw new Error(`${path}.${name}: Unknown project color: ${colorKey}.`);
								}
								resolved = colors[colorKey];
							} else {
								throw new Error(`${path}.${name} must use #RRGGBB or @style:colors:<key>.`);
							}
						} else if (
							name === 'fontFamily' &&
							typeof authored === 'string' &&
							authored.startsWith('@style:')
						) {
							if (!/^@style:fonts:[a-z][a-z0-9-]*$/.test(authored)) {
								throw new Error(`${path}.${name} must use @style:fonts:<key>.`);
							}
							try {
								resolved = resolveFont(authored.slice('@style:fonts:'.length));
							} catch (cause) {
								throw new Error(`${path}.${name}: ${String(cause)}`, { cause });
							}
						}
						const definition = LABEL_PROPERTIES[name];
						if (
							!definition ||
							!isPrimitive(resolved) ||
							!matchesUIPropertyDefinition(resolved, definition)
						) {
							throw new Error(`Invalid Label style value: ${path}.${name}.`);
						}
						if (name === 'fontFamily' && (typeof resolved !== 'string' || !resolved.trim())) {
							throw new Error(`${path}.${name} must be a nonempty font family.`);
						}
						return [name, resolved];
					}),
				);
				return [key, Object.freeze(properties)];
			}),
		),
	);
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new Error(`${path} must be an object.`);
	}
	return value as Record<string, unknown>;
}

function isPrimitive(value: unknown): value is UIPropertyPrimitive {
	return (
		typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))
	);
}
