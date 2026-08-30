import type { UIPropertyObject, UIPropertyValue } from '@kurot/ui-document';
import {
	BasicLayout,
	HorizontalLayout,
	LayoutBase,
	LinearLayoutBase,
	TileLayout,
	VerticalLayout,
} from '@kurot/ui';
import { KurotUIRuntimeError } from './KurotUIRuntimeError.js';

/**
 * Creates and configures a Kurot layout from a canonical layout descriptor.
 */
export function createLayout(value: UIPropertyValue, path: string): LayoutBase {
	const descriptor = requireObject(value, path);
	assertExactKeys(descriptor, ['properties', 'type'], path);
	const type = requireString(descriptor.type, `${path}.type`);
	const properties =
		descriptor.properties === undefined
			? {}
			: requireObject(descriptor.properties, `${path}.properties`);

	let layout: LayoutBase;
	switch (type) {
		case 'kui.BasicLayout':
			layout = new BasicLayout();
			break;
		case 'kui.HorizontalLayout':
			layout = new HorizontalLayout();
			break;
		case 'kui.TileLayout':
			layout = new TileLayout();
			break;
		case 'kui.VerticalLayout':
			layout = new VerticalLayout();
			break;
		default:
			throw new KurotUIRuntimeError(
				'invalid-layout',
				`Layout type "${type}" is not supported.`,
				`${path}.type`,
			);
	}

	for (const name of Object.keys(properties).sort()) {
		applyLayoutProperty(layout, name, properties[name], `${path}.properties.${name}`);
	}
	return layout;
}

function applyLayoutProperty(
	layout: LayoutBase,
	name: string,
	value: UIPropertyValue,
	path: string,
): void {
	if (name === 'useVirtualLayout') {
		const enabled = requireBoolean(value, path);
		if (layout instanceof BasicLayout && enabled) {
			throw new KurotUIRuntimeError(
				'invalid-layout',
				'BasicLayout does not support virtual layout.',
				path,
			);
		}
		layout.useVirtualLayout = enabled;
		return;
	}
	if (layout instanceof LinearLayoutBase && applyLinearProperty(layout, name, value, path)) {
		return;
	}
	if (layout instanceof TileLayout && applyTileProperty(layout, name, value, path)) {
		return;
	}
	throw new KurotUIRuntimeError(
		'invalid-layout',
		`Layout property "${name}" is not supported by ${layout.constructor.name}.`,
		path,
	);
}

function applyLinearProperty(
	layout: LinearLayoutBase,
	name: string,
	value: UIPropertyValue,
	path: string,
): boolean {
	switch (name) {
		case 'gap':
			layout.gap = requireNumber(value, path);
			return true;
		case 'horizontalAlign':
			layout.horizontalAlign = requireEnum(
				value,
				['left', 'center', 'right', 'justify', 'contentJustify'],
				path,
			);
			return true;
		case 'paddingBottom':
			layout.paddingBottom = requireNumber(value, path);
			return true;
		case 'paddingLeft':
			layout.paddingLeft = requireNumber(value, path);
			return true;
		case 'paddingRight':
			layout.paddingRight = requireNumber(value, path);
			return true;
		case 'paddingTop':
			layout.paddingTop = requireNumber(value, path);
			return true;
		case 'verticalAlign':
			layout.verticalAlign = requireEnum(
				value,
				['top', 'middle', 'bottom', 'justify', 'contentJustify'],
				path,
			);
			return true;
		default:
			return false;
	}
}

function applyTileProperty(
	layout: TileLayout,
	name: string,
	value: UIPropertyValue,
	path: string,
): boolean {
	switch (name) {
		case 'columnAlign':
			layout.columnAlign = requireEnum(
				value,
				['left', 'justifyUsingGap', 'justifyUsingWidth'],
				path,
			);
			return true;
		case 'columnWidth':
			layout.columnWidth = requireNonNegativeNumber(value, path);
			return true;
		case 'horizontalAlign':
			layout.horizontalAlign = requireEnum(
				value,
				['left', 'center', 'right', 'justify', 'contentJustify'],
				path,
			);
			return true;
		case 'horizontalGap':
			layout.horizontalGap = requireNumber(value, path);
			return true;
		case 'orientation':
			layout.orientation = requireEnum(value, ['rows', 'columns'], path);
			return true;
		case 'paddingBottom':
			layout.paddingBottom = requireNumber(value, path);
			return true;
		case 'paddingLeft':
			layout.paddingLeft = requireNumber(value, path);
			return true;
		case 'paddingRight':
			layout.paddingRight = requireNumber(value, path);
			return true;
		case 'paddingTop':
			layout.paddingTop = requireNumber(value, path);
			return true;
		case 'requestedColumnCount':
			layout.requestedColumnCount = requireNonNegativeInteger(value, path);
			return true;
		case 'requestedRowCount':
			layout.requestedRowCount = requireNonNegativeInteger(value, path);
			return true;
		case 'rowAlign':
			layout.rowAlign = requireEnum(
				value,
				['top', 'justifyUsingGap', 'justifyUsingHeight'],
				path,
			);
			return true;
		case 'rowHeight':
			layout.rowHeight = requireNonNegativeNumber(value, path);
			return true;
		case 'verticalAlign':
			layout.verticalAlign = requireEnum(
				value,
				['top', 'middle', 'bottom', 'justify', 'contentJustify'],
				path,
			);
			return true;
		case 'verticalGap':
			layout.verticalGap = requireNumber(value, path);
			return true;
		default:
			return false;
	}
}

function assertExactKeys(value: UIPropertyObject, keys: readonly string[], path: string): void {
	for (const key of Object.keys(value)) {
		if (!keys.includes(key)) {
			throw new KurotUIRuntimeError(
				'invalid-layout',
				`Layout descriptor property "${key}" is not supported.`,
				`${path}.${key}`,
			);
		}
	}
}

function requireObject(value: UIPropertyValue, path: string): UIPropertyObject {
	if (isPropertyObject(value)) return value;
	throw new KurotUIRuntimeError('invalid-layout', 'Layout descriptor must be an object.', path);
}

function isPropertyObject(value: UIPropertyValue): value is UIPropertyObject {
	return typeof value === 'object' && !Array.isArray(value);
}

function requireBoolean(value: UIPropertyValue, path: string): boolean {
	if (typeof value === 'boolean') return value;
	throw new KurotUIRuntimeError('invalid-layout', 'Layout property must be a boolean.', path);
}

function requireNumber(value: UIPropertyValue, path: string): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	throw new KurotUIRuntimeError('invalid-layout', 'Layout property must be a number.', path);
}

function requireNonNegativeNumber(value: UIPropertyValue, path: string): number {
	const number = requireNumber(value, path);
	if (number >= 0) return number;
	throw new KurotUIRuntimeError('invalid-layout', 'Layout property must not be negative.', path);
}

function requireNonNegativeInteger(value: UIPropertyValue, path: string): number {
	const number = requireNonNegativeNumber(value, path);
	if (Number.isInteger(number)) return number;
	throw new KurotUIRuntimeError('invalid-layout', 'Layout property must be an integer.', path);
}

function requireString(value: UIPropertyValue | undefined, path: string): string {
	if (typeof value === 'string' && value.length > 0) return value;
	throw new KurotUIRuntimeError('invalid-layout', 'Layout type must be a non-empty string.', path);
}

function requireEnum(
	value: UIPropertyValue,
	values: readonly string[],
	path: string,
): string {
	if (typeof value === 'string' && values.includes(value)) return value;
	throw new KurotUIRuntimeError(
		'invalid-layout',
		`Layout property must be one of: ${values.join(', ')}.`,
		path,
	);
}
