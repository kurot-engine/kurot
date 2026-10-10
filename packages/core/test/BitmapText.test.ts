import { describe, expect, it, vi } from 'vitest';
import { BitmapFont, BitmapText, BitmapData, Texture, Rectangle } from '../src/index.js';
import { BitmapTextPipe } from '../src/kurot/player/pipes/BitmapTextPipe.js';
import { WebGLRenderer } from '../src/kurot/player/webgl/WebGLRenderer.js';
import type { WebGLRenderBuffer } from '../src/kurot/player/webgl/WebGLRenderBuffer.js';
import type { BitmapTextInstruction } from '../src/kurot/player/pipes/BitmapTextPipe.js';
import { CanvasRenderer } from '../src/kurot/player/canvas/CanvasRenderer.js';
import type { RenderBuffer } from '../src/kurot/player/RenderBuffer.js';

function makeFont(ownsTexture = false): BitmapFont {
	const canvas = document.createElement('canvas');
	canvas.width = 64;
	canvas.height = 32;
	const texture = new Texture();
	texture.setBitmapData(new BitmapData(canvas));
	return new BitmapFont(
		texture,
		{
			frames: {
				A: { x: 2, y: 3, w: 6, h: 8, offX: 1, offY: 2, sourceW: 10, sourceH: 12 },
				V: { x: 12, y: 3, w: 7, h: 8, offX: 0, offY: 2, sourceW: 10, sourceH: 12 },
			},
		},
		{ ownsTexture },
	);
}
function makeText(): BitmapText {
	const text = new BitmapText();
	text.font = makeFont();
	text.text = 'AV';
	return text;
}

describe('native bitmap text', () => {
	it('centers its line frame by default in either line mode and retains explicit alignment', () => {
		const text = makeText();
		text.height = 30;
		expect(text.verticalAlign).toBe('middle');
		expect(text.getGlyphs().map(glyph => glyph.y)).toEqual([9, 9]);
		text.multiline = false;
		expect(text.getGlyphs().map(glyph => glyph.y)).toEqual([9, 9]);
		text.multiline = true;
		text.text = 'A\nV';
		text.height = 40;
		expect(text.getGlyphs().map(glyph => glyph.y)).toEqual([8, 20]);
		text.verticalAlign = 'top';
		expect(text.getGlyphs().map(glyph => glyph.y)).toEqual([0, 12]);
		text.verticalAlign = 'bottom';
		expect(text.getGlyphs().map(glyph => glyph.y)).toEqual([16, 28]);
	});

	it('measures without invalidating its rendered layout', () => {
		const text = makeText();
		text.width = 10;
		const layout = text.getLayout();
		expect(text.measureText().width).toBe(20);
		expect(text.getLayout()).toBe(layout);
	});
	it('dispatches bitmap text through the complete WebGL leaf pipeline', () => {
		const text = makeText();
		const renderer = new WebGLRenderer() as unknown as {
			_createLeafInstruction(text: BitmapText, x: number, y: number): BitmapTextInstruction;
			_executeLeafInstruction(instruction: BitmapTextInstruction, buffer: WebGLRenderBuffer): void;
		};
		const instruction = renderer._createLeafInstruction(text, 0, 0);
		const drawImage = vi.fn();
		renderer._executeLeafInstruction(instruction, { context: { drawImage } } as unknown as WebGLRenderBuffer);
		expect(instruction.renderPipeId).toBe('bitmapText');
		expect(drawImage).toHaveBeenCalledTimes(2);
	});
	it('has measurable implicit dimensions and refreshes cached layout after changes', () => {
		const text = makeText();
		expect([text.width, text.height, text.textWidth, text.textHeight]).toEqual([20, 12, 20, 12]);
		const previous = text.getLayout();
		text.text = 'A';
		expect(text.textWidth).toBe(10);
		expect(text.getLayout()).not.toBe(previous);
	});
	it('wraps using explicit width and clears constraints with NaN', () => {
		const text = makeText();
		text.width = 10;
		expect(text.getTextLines()).toEqual(['A', 'V']);
		expect(text.textHeight).toBe(24);
		text.width = NaN;
		expect(text.textWidth).toBe(20);
	});
	it('uses first-line-only mode and fallback spaces', () => {
		const text = makeText();
		text.multiline = false;
		text.width = 5;
		text.text = 'A V\nA';
		expect(text.getTextLines()).toEqual(['A V']);
		expect(text.textWidth).toBe(24);
	});
	it('draws atlas regions and trim offsets through the ordinary GPU texture path', () => {
		const text = makeText();
		const drawImage = vi.fn();
		const buffer = { context: { drawImage }, offsetX: 0, offsetY: 0 } as unknown as RenderBuffer;
		new BitmapTextPipe().execute({ renderPipeId: 'bitmapText', renderable: text, offsetX: 0, offsetY: 0 }, buffer);
		expect(drawImage.mock.calls.map(call => call.slice(1, 9))).toEqual([
			[2, 3, 6, 8, 1, 2, 6, 8],
			[12, 3, 7, 8, 10, 2, 7, 8],
		]);
	});
	it('draws identical geometry in the Canvas fallback', () => {
		const text = makeText();
		const drawImage = vi.fn();
		const context = { drawImage, save: vi.fn(), restore: vi.fn(), transform: vi.fn(), setTransform: vi.fn() } as unknown as CanvasRenderingContext2D;
		new CanvasRenderer().renderToContext(text, context, 0, 0);
		expect(drawImage.mock.calls.map(call => call.slice(1))).toEqual([
			[2, 3, 6, 8, 1, 2, 6, 8],
			[12, 3, 7, 8, 10, 2, 7, 8],
		]);
	});
	it('updates line alignment, spacing and bounds', () => {
		const text = makeText();
		text.width = 30;
		text.height = 24;
		text.textAlign = 'right';
		text.verticalAlign = 'bottom';
		text.letterSpacing = 2;
		expect(text.getGlyphs().map(glyph => [glyph.x, glyph.y])).toEqual([
			[8, 12],
			[20, 12],
		]);
		const bounds = new Rectangle();
		text.$measureContentBounds(bounds);
		expect(bounds.right).toBe(30);
	});
	it('borrows fonts and permits fonts to borrow page textures', () => {
		const font = makeFont();
		const page = font.getTexture('A')!.bitmapData!;
		font.dispose();
		font.dispose();
		expect(page.source).toBeDefined();
		expect(font.getTexture('A')).toBeUndefined();
	});
	it('disposes owned page data once', () => {
		const font = makeFont(true);
		const page = font.getTexture('A')!.bitmapData!;
		const dispose = vi.spyOn(page, 'dispose');
		font.dispose();
		font.dispose();
		expect(dispose).toHaveBeenCalledOnce();
	});
	it('rejects out-of-page glyph geometry', () => {
		const texture = new Texture();
		const canvas = document.createElement('canvas');
		canvas.width = 4;
		canvas.height = 4;
		texture.setBitmapData(new BitmapData(canvas));
		expect(() => new BitmapFont(texture, { frames: { A: { x: 3, y: 0, w: 2, h: 4 } } })).toThrow(/exceeds/);
	});
	it('rejects invalid field metrics and clears drawing when the font is removed', () => {
		const text = makeText();
		expect(() => {
			text.width = -1;
		}).toThrow();
		expect(() => {
			text.letterSpacing = Infinity;
		}).toThrow();
		text.font = undefined;
		expect(text.getGlyphs()).toHaveLength(0);
		expect(text.width).toBe(0);
	});
});
