import {
	BasicLayout,
	Button,
	Group,
	HorizontalLayout,
	Image,
	Label,
	Rect,
	TileLayout,
	VerticalLayout,
} from '@kurot/ui';
import {
	createKurotUIFoundationRegistry,
	createUIDocument,
	createUINode,
} from '@kurot/ui-document';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createKurotUI, KurotUIRuntimeError } from '../src/index.js';

beforeAll(() => {
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
		font: '',
		measureText: (text: string) => ({ width: text.length * 10 }),
	} as unknown as CanvasRenderingContext2D);
});

describe('createKurotUI', () => {
	it('materializes the foundation components and inherited properties', () => {
		const document = createUIDocument({
			id: 'foundation-preview',
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				properties: {
					alpha: 0.9,
					height: 360,
					layout: {
						type: 'kui.VerticalLayout',
						properties: { gap: 12, paddingLeft: 16, paddingTop: 20 },
					},
					width: 640,
				},
				children: [
					createUINode({
						id: 'title',
						type: 'kui.Label',
						properties: {
							bold: true,
							size: 28,
							text: 'Kurot UI Runtime',
							textColor: 0x38bdf8,
						},
					}),
					createUINode({
						id: 'image',
						type: 'kui.Image',
						properties: {
							fillMode: 'scale',
							scale9Grid: { height: 12, width: 14, x: 2, y: 3 },
							smoothing: false,
						},
					}),
					createUINode({
						id: 'panel',
						type: 'kui.Rect',
						properties: {
							fillAlpha: 0.75,
							fillColor: 0x172554,
							strokeColor: 0x60a5fa,
							strokeWeight: 2,
						},
					}),
					createUINode({
						id: 'action',
						type: 'kui.Button',
						properties: { label: 'Continue', selected: true, toggle: true },
					}),
				],
			}),
		});

		const result = createKurotUI(document);
		const root = requireInstance(result.root, Group);
		const title = requireInstance(result.instances.get('title'), Label);
		const image = requireInstance(result.instances.get('image'), Image);
		const panel = requireInstance(result.instances.get('panel'), Rect);
		const action = requireInstance(result.instances.get('action'), Button);

		expect(root.alpha).toBe(0.9);
		expect(root.width).toBe(640);
		expect(root.height).toBe(360);
		expect(root.numChildren).toBe(4);
		expect(root.getChildAt(0)).toBe(title);
		const layout = requireInstance(root.layout, VerticalLayout);
		expect(layout.gap).toBe(12);
		expect(layout.paddingLeft).toBe(16);
		expect(layout.paddingTop).toBe(20);
		expect(title.text).toBe('Kurot UI Runtime');
		expect(title.bold).toBe(true);
		expect(image.smoothing).toBe(false);
		expect(image.scale9Grid).toMatchObject({ height: 12, width: 14, x: 2, y: 3 });
		expect(panel.fillColor).toBe(0x172554);
		expect(panel.strokeWeight).toBe(2);
		expect(action.label).toBe('Continue');
		expect(action.selected).toBe(true);
		expect(action.toggle).toBe(true);
	});

	it('supports project components through a semantic definition and runtime adapter', () => {
		const registry = createKurotUIFoundationRegistry();
		registry.register({
			type: 'app.Panel',
			extends: 'kui.Group',
			children: 'multiple',
			properties: {
				title: { valueType: 'string' },
			},
		});
		const document = createUIDocument({
			id: 'custom-component',
			root: createUINode({
				id: 'panel',
				type: 'app.Panel',
				properties: { title: 'Inventory' },
				children: [createUINode({ id: 'label', type: 'kui.Label' })],
			}),
		});

		const result = createKurotUI(document, {
			registry,
			adapters: {
				'app.Panel': {
					create: () => new Group(),
					applyProperty: (instance, name, value) => {
						if (name !== 'title' || typeof value !== 'string') return false;
						instance.name = value;
						return true;
					},
				},
			},
		});
		const panel = requireInstance(result.root, Group);

		expect(panel.name).toBe('Inventory');
		expect(panel.numChildren).toBe(1);
		expect(result.instances.get('label')).toBeInstanceOf(Label);
	});

	it('reports document validation failures as structured runtime errors', () => {
		const duplicate = createUINode({ id: 'duplicate', type: 'kui.Label' });
		const document = createUIDocument({
			id: 'invalid-document',
			root: createUINode({
				id: 'duplicate',
				type: 'kui.Group',
				children: [duplicate],
			}),
		});

		const error = captureRuntimeError(() => createKurotUI(document));

		expect(error.code).toBe('invalid-document');
		expect(error.path).toBe('$');
		expect(error.diagnostics.length).toBeGreaterThan(0);
	});

	it('rejects malformed semantic value objects at the exact runtime path', () => {
		const document = createUIDocument({
			id: 'invalid-layout',
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				properties: {
					layout: { type: 'kui.VerticalLayout', properties: { gap: 'wide' } },
				},
			}),
		});

		const error = captureRuntimeError(() => createKurotUI(document));

		expect(error.code).toBe('invalid-layout');
		expect(error.path).toBe('$.root.properties.layout.properties.gap');
	});

	it.each([
		['kui.BasicLayout', BasicLayout],
		['kui.HorizontalLayout', HorizontalLayout],
		['kui.TileLayout', TileLayout],
		['kui.VerticalLayout', VerticalLayout],
	] as const)('creates the supported %s descriptor', (layoutType, layoutClass) => {
		const document = createUIDocument({
			id: layoutType,
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				properties: { layout: { type: layoutType } },
			}),
		});

		const root = requireInstance(createKurotUI(document).root, Group);

		expect(root.layout).toBeInstanceOf(layoutClass);
	});

	it('rejects malformed nine-slice rectangles at the exact runtime path', () => {
		const document = createUIDocument({
			id: 'invalid-rectangle',
			root: createUINode({
				id: 'image',
				type: 'kui.Image',
				properties: {
					scale9Grid: { height: 12, width: -1, x: 2, y: 3 },
				},
			}),
		});

		const error = captureRuntimeError(() => createKurotUI(document));

		expect(error.code).toBe('invalid-rectangle');
		expect(error.path).toBe('$.root.properties.scale9Grid.width');
	});
});

function requireInstance<T extends object>(
	value: object | undefined,
	type: abstract new (...args: never[]) => T,
): T {
	if (value instanceof type) return value;
	throw new Error(`Expected ${type.name} instance.`);
}

function captureRuntimeError(operation: () => void): KurotUIRuntimeError {
	try {
		operation();
	} catch (error) {
		if (error instanceof KurotUIRuntimeError) return error;
		throw error;
	}
	throw new Error('Expected KurotUIRuntimeError.');
}
