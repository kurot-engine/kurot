import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Sprite } from '../src/kurot/display/Sprite.js';
import { BlurFilter } from '../src/kurot/filters/BlurFilter.js';
import { CanvasRenderer } from '../src/kurot/player/canvas/CanvasRenderer.js';
import { DisplayList } from '../src/kurot/player/canvas/DisplayList.js';
import { getFilterContentBounds } from '../src/kurot/player/pipes/filter-bounds.js';
import { TextPipe } from '../src/kurot/player/pipes/TextPipe.js';
import type { RenderBuffer } from '../src/kurot/player/RenderBuffer.js';
import { TextField } from '../src/kurot/text/TextField.js';
import { getTextRenderPadding } from '../src/kurot/text/TextRenderBounds.js';
import { TextFieldType } from '../src/kurot/text/enums/TextFieldType.js';
import { createTextMetrics } from './helpers/text-metrics.js';

function createContext(): CanvasRenderingContext2D {
	return {
		setTransform: vi.fn(), clearRect: vi.fn(),
		save: vi.fn(), restore: vi.fn(), translate: vi.fn(),
		beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(),
		fillText: vi.fn(), strokeText: vi.fn(),
		measureText: vi.fn((text: string) => createTextMetrics(text.length * 10)),
	} as unknown as CanvasRenderingContext2D;
}

function createText(): TextField {
	const field = new TextField();
	field.size = 20;
	field.text = 'How to play';
	field.stroke = 2;
	return field;
}

let context: CanvasRenderingContext2D;

beforeEach(() => {
	context = createContext();
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
});

afterEach(() => vi.restoreAllMocks());

describe('outlined text rendering', () => {
	it('preserves measurement, alignment dimensions and line caches', () => {
		const field = createText();
		const lines = field.getLinesArr();
		const metrics = [field.width, field.height, field.textWidth, field.textHeight];
		const measurement = field.measureText();
		new CanvasRenderer().renderTextFieldToContext(field, context, 0, 0);

		expect(context.rect).toHaveBeenCalledWith(-6, -6, 122, 32);
		expect(context.strokeText).toHaveBeenCalledWith('How to play', 0, 10);
		expect([field.width, field.height, field.textWidth, field.textHeight]).toEqual(metrics);
		expect(field.measureText()).toEqual(measurement);
		expect(field.getLinesArr()).toBe(lines);
		expect(field.getBounds().x).toBe(0);
		expect(field.getBounds().width).toBe(110);
	});

	it('uses the largest actual run stroke, including inherited and disabled strokes', () => {
		const field = createText();
		field.textFlow = [{ text: 'A', style: { stroke: 0 } }, { text: 'B', style: { stroke: 3.25 } }];
		expect(getTextRenderPadding(field)).toBe(9);
		field.textFlow = [{ text: 'A', style: { stroke: 0 } }];
		expect(getTextRenderPadding(field)).toBe(0);
		field.textFlow = [{ text: 'A' }];
		expect(getTextRenderPadding(field)).toBe(6);
	});

	it('retains the exact input viewport even with thick strokes', () => {
		const field = createText();
		field.type = TextFieldType.INPUT;
		field.width = 50;
		field.height = 20;
		field.stroke = 10;
		new CanvasRenderer().renderTextFieldToContext(field, context, 0, 0);
		expect(context.rect).toHaveBeenCalledWith(0, 0, 50, 20);
		expect(getTextRenderPadding(field)).toBe(0);
	});

	it('does not paint fully hidden lines into the stroke margin when scrolling', () => {
		const field = createText();
		field.text = 'A\nB\nC';
		field.height = 20;
		field.scrollV = 2;
		new CanvasRenderer().renderTextFieldToContext(field, context, 0, 0);
		expect(context.strokeText).toHaveBeenCalledExactlyOnceWith('B', 0, 10);
		expect(context.fillText).toHaveBeenCalledExactlyOnceWith('B', 0, 10);
	});

	it('keeps zero-size fields empty despite an outline', () => {
		const field = createText();
		field.width = 0;
		new CanvasRenderer().renderTextFieldToContext(field, context, 0, 0);
		expect(context.strokeText).not.toHaveBeenCalled();
		const cache = DisplayList.create(field)!;
		expect(cache.updateSurfaceSize()).toBe(false);
		DisplayList.release(cache);
	});

	it('includes descendant ink in caches and filter captures without changing layout', () => {
		const root = new Sprite();
		const field = createText();
		field.x = 10;
		field.filters = [new BlurFilter(4, 4)];
		root.addChild(field);
		const cache = DisplayList.create(root)!;
		expect(cache.updateSurfaceSize()).toBe(true);
		expect(cache.offsetX).toBe(-4);
		expect(cache.offsetY).toBe(6);
		expect([cache.canvasBuffer.width, cache.canvasBuffer.height]).toEqual([122, 32]);
		expect(root.getBounds().width).toBe(110);
		const filtered = getFilterContentBounds(root);
		expect([filtered.x, filtered.y, filtered.width, filtered.height]).toEqual([0, -10, 130, 40]);
		DisplayList.release(cache);
	});

	it('pads GPU textures at resolution 2, preserves placement and updates changed outlines', () => {
		const texture = {} as WebGLTexture;
		const gpu = {
			contextVersion: 0, resolution: 2, maxTextureSize: 4096,
			createTexture: vi.fn((_source: HTMLCanvasElement) => texture),
			updateTexture: vi.fn(), registerTextureForGC: vi.fn(),
			unregisterTextureGC: vi.fn(), drawTexture: vi.fn(),
		};
		const buffer = { context: gpu, offsetX: 0, offsetY: 0 } as unknown as RenderBuffer;
		const rasterizer = { renderTextFieldToContext: vi.fn() } as unknown as CanvasRenderer;
		const pipe = new TextPipe(rasterizer);
		const field = createText();
		const instruction = { renderPipeId: 'text' as const, renderable: field, offsetX: 0, offsetY: 0 };
		pipe.execute(instruction, buffer);
		expect(rasterizer.renderTextFieldToContext).toHaveBeenLastCalledWith(field, context, 6, 6);
		expect(gpu.drawTexture).toHaveBeenLastCalledWith(texture, 0, 0, 244, 64, -6, -6, 122, 32, 244, 64);
		expect(field.width).toBe(110);
		field.stroke = 4;
		pipe.execute(instruction, buffer);
		expect(gpu.updateTexture).toHaveBeenCalledOnce();
		expect(gpu.drawTexture).toHaveBeenLastCalledWith(texture, 0, 0, 260, 80, -10, -10, 130, 40, 260, 80);
		field.stroke = 0;
		pipe.execute(instruction, buffer);
		expect(gpu.drawTexture).toHaveBeenLastCalledWith(texture, 0, 0, 220, 40, 0, 0, 110, 20, 220, 40);
		field.stroke = 2;
		gpu.maxTextureSize = 122;
		pipe.execute(instruction, buffer);
		const surface = gpu.createTexture.mock.calls[0][0];
		expect(surface.width).toBeLessThanOrEqual(122);
		expect(surface.height).toBeLessThanOrEqual(122);
		expect(gpu.drawTexture.mock.lastCall?.slice(5, 9)).toEqual([-6, -6, 122, 32]);
	});
});
