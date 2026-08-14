import type { Graphics } from '../../display/Graphics.js';
import type { DisplayObject } from '../../display/DisplayObject.js';
import { Rectangle } from '../../geom/Rectangle.js';
import type { Instruction } from '../InstructionSet.js';
import type { InstructionSet } from '../InstructionSet.js';
import type { RenderPipe } from '../RenderPipe.js';
import type { RenderContext, TextureHandle } from '../RenderContext.js';
import type { RenderBuffer } from '../RenderBuffer.js';
import type { CanvasRenderer } from '../canvas/index.js';
import { CanvasBuffer } from '../canvas/index.js';

const _scratchBounds = new Rectangle();

export interface GraphicsInstruction extends Instruction {
	readonly renderPipeId: 'graphics';
	renderable: DisplayObject;
	graphics: Graphics;
	offsetX: number;
	offsetY: number;
}

interface GraphicsCache {
	canvasBuffer: CanvasBuffer;
	texture: TextureHandle;
	textureWidth: number;
	textureHeight: number;
	boundsX: number;
	boundsY: number;
}

/**
 * Rasterizes graphics into cached textures for render-buffer drawing.
 */
export class GraphicsPipe implements RenderPipe<DisplayObject> {

	// ── Static fields ─────────────────────────────────────────────────────────
	public static readonly PIPE_ID = 'graphics';

    private static readonly _pool: GraphicsInstruction[] = [];

	// ── Instance fields ───────────────────────────────────────────────────────
	private readonly _canvasRenderer: CanvasRenderer;
	private readonly _cache = new WeakMap<Graphics, GraphicsCache>();
	private readonly _registryTokens = new WeakMap<Graphics, object>();

    private _context?: RenderContext;

	// ── Constructor ───────────────────────────────────────────────────────────
	public constructor(canvasRenderer: CanvasRenderer) {
		this._canvasRenderer = canvasRenderer;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	public static release(inst: GraphicsInstruction): void {
		GraphicsPipe._pool.push(inst);
	}

	public addToInstructionSet(renderable: DisplayObject, set: InstructionSet): void {
		const graphics = renderable.graphics;
		if (!graphics || graphics.commands.length === 0) {
			return;
		}
		set.add(GraphicsPipe._alloc(renderable, graphics, 0, 0));
	}

	public updateRenderable(_renderable: DisplayObject): void {}

	public destroyRenderable(renderable: DisplayObject): void {
		const graphics = renderable.graphics;
		if (!graphics) return;
		const cache = this._cache.get(graphics);
		if (cache?.texture) {
			const token = this._registryTokens.get(graphics);
			if (token) {
				this._context?.unregisterTextureGC(token);
				this._registryTokens.delete(graphics);
			}
			this._context?.deleteTexture(cache.texture);
		}
		this._cache.delete(graphics);
	}

	public execute(inst: GraphicsInstruction, buffer: RenderBuffer): void {
		const { graphics } = inst;
		if (graphics.commands.length === 0) {
			return;
		}

		if (!this._context) this._context = buffer.context;

		const bounds = _scratchBounds;
		bounds.setEmpty();
		graphics.$measureContentBounds(bounds);
		const w = Math.ceil(bounds.width);
		const h = Math.ceil(bounds.height);
		if (w <= 0 || h <= 0) {
			return;
		}

		const ox = inst.offsetX;
		const oy = inst.offsetY;
		buffer.offsetX = 0;
		buffer.offsetY = 0;

		let cache = this._cache.get(graphics);
		if (!cache) {
			cache = {
				canvasBuffer: new CanvasBuffer(w, h),
				texture: undefined,
				textureWidth: 0,
				textureHeight: 0,
				boundsX: bounds.x,
				boundsY: bounds.y,
			};
			this._cache.set(graphics, cache);
		}

		const needsRebuild = graphics.canvasCacheDirty || cache.textureWidth !== w || cache.textureHeight !== h;

		if (needsRebuild) {
			if (cache.canvasBuffer.width !== w || cache.canvasBuffer.height !== h) {
				cache.canvasBuffer.resize(w, h);
			}
			cache.canvasBuffer.clear();
			this._canvasRenderer.renderGraphicsToContext(
				graphics,
				cache.canvasBuffer.context,
				-bounds.x,
				-bounds.y,
				false,
				true,
			);
			const surface = cache.canvasBuffer.surface;
			if (!cache.texture) {
				cache.texture = buffer.context.createTexture(surface);
				const token = {};
				buffer.context.registerTextureForGC(graphics, cache.texture, token);
				this._registryTokens.set(graphics, token);
			} else {
				const oldToken = this._registryTokens.get(graphics);
				if (oldToken) buffer.context.unregisterTextureGC(oldToken);
				buffer.context.updateTexture(cache.texture, surface);
				const token = {};
				buffer.context.registerTextureForGC(graphics, cache.texture, token);
				this._registryTokens.set(graphics, token);
			}
			cache.textureWidth = w;
			cache.textureHeight = h;
			cache.boundsX = bounds.x;
			cache.boundsY = bounds.y;
			graphics.canvasCacheDirty = false;
		}

		if (!cache.texture) {
			return;
		}

		buffer.saveTransform();
		if (cache.boundsX !== 0 || cache.boundsY !== 0) {
			buffer.globalMatrix.append(1, 0, 0, 1, cache.boundsX, cache.boundsY);
		}

		buffer.context.drawTexture(cache.texture, 0, 0, w, h, 0, 0, w, h, w, h);

		buffer.restoreTransform();
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private static _alloc(renderable: DisplayObject, graphics: Graphics, ox: number, oy: number): GraphicsInstruction {
		const inst = GraphicsPipe._pool.pop() ?? {
			renderPipeId: 'graphics',
			renderable,
			graphics,
			offsetX: ox,
			offsetY: oy,
		};
		inst.renderable = renderable;
		inst.graphics = graphics;
		inst.offsetX = ox;
		inst.offsetY = oy;
		return inst;
	}
}
