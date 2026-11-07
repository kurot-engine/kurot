import { describe, expect, it, vi } from 'vitest';
import { BackdropBlur, CanvasRenderer, Matrix, Rectangle, Sprite } from '../src/index.js';

function canvasState(): { context: CanvasRenderingContext2D; depth(): number } {
	let matrix = new Matrix();
	const stack: Array<{ matrix: Matrix; alpha: number; blend: string }> = [];
	const state = {
		globalAlpha: 1,
		globalCompositeOperation: 'source-over',
		save(): void {
			stack.push({ matrix: matrix.clone(), alpha: state.globalAlpha, blend: state.globalCompositeOperation });
		},
		restore(): void {
			const previous = stack.pop();
			if (previous) {
				matrix = previous.matrix;
				state.globalAlpha = previous.alpha;
				state.globalCompositeOperation = previous.blend;
			}
		},
		transform(a: number, b: number, c: number, d: number, tx: number, ty: number): void {
			matrix.preMultiplyInto(new Matrix(a, b, c, d, tx, ty), matrix);
		},
		setTransform(a: number, b: number, c: number, d: number, tx: number, ty: number): void {
			matrix.setTo(a, b, c, d, tx, ty);
		},
		beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(),
	};
	return { context: state as unknown as CanvasRenderingContext2D, depth: () => stack.length };
}

describe('Canvas backdrop exception boundaries', () => {
	it.each(['transform', 'scroll', 'blend-clip'])('unwinds nested %s state before the next frame', kind => {
		const renderer = new CanvasRenderer();
		const { context, depth } = canvasState();
		const root = new Sprite();
		const outer = new Sprite();
		const inner = new Sprite();
		const effect = new BackdropBlur({ width: 80, height: 50 });
		outer.rotation = 10;
		outer.alpha = 0.5;
		inner.rotation = 5;
		effect.rotation = 3;
		effect.alpha = 0.7;
		if (kind === 'scroll') {
			inner.scrollRect = new Rectangle(4, 5, 100, 80);
		} else if (kind === 'blend-clip') {
			inner.blendMode = 'lighter';
			inner.mask = new Rectangle(0, 0, 100, 80);
		}
		root.addChild(outer);
		outer.addChild(inner);
		inner.addChild(effect);
		const backdrop = Reflect.get(renderer, '_backdrop') as { render(): number };
		const sample = vi.spyOn(backdrop, 'render').mockImplementationOnce(() => {
			throw new Error('sampling failed');
		});
		expect(() => renderer.renderToContext(root, context, 0, 0, 2)).toThrow('sampling failed');
		expect(depth()).toBe(0);
		expect(context.globalAlpha).toBe(1);
		expect(context.globalCompositeOperation).toBe('source-over');
		context.setTransform(1, 0, 0, 1, 0, 0);
		let alpha = 0;
		sample.mockImplementation(() => {
			alpha = context.globalAlpha;
			return 1;
		});
		renderer.renderToContext(root, context, 0, 0, 2);
		expect(alpha).toBeCloseTo(0.35);
		expect(depth()).toBe(0);
		expect(context.globalAlpha).toBe(1);
	});
});
