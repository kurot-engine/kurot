import { DisplayObject, RenderMode, RenderObjectType } from '../../display/DisplayObject.js';
import { Bitmap, setBitmapPixelHitTest } from '../../display/Bitmap.js';
import { Shape } from '../../display/Shape.js';
import { Sprite } from '../../display/Sprite.js';
import { Mesh } from '../../display/Mesh.js';
import { Graphics, setGraphicsHitTest } from '../../display/Graphics.js';
import { PathCommandType, type GraphicsCommand } from '../../display/GraphicsPath.js';
import { Texture } from '../../display/texture/Texture.js';
import { Matrix } from '../../geom/Matrix.js';
import { Rectangle } from '../../geom/Rectangle.js';
import { BlurFilter } from '../../filters/BlurFilter.js';
import { ColorMatrixFilter } from '../../filters/ColorMatrixFilter.js';
import { GlowFilter } from '../../filters/GlowFilter.js';
import { DropShadowFilter } from '../../filters/DropShadowFilter.js';
import { TextField } from '../../text/TextField.js';
import { HorizontalAlign } from '../../text/enums/HorizontalAlign.js';
import { VerticalAlign } from '../../text/enums/VerticalAlign.js';
import { TextFieldType } from '../../text/enums/TextFieldType.js';
import { getFontString } from '../../text/TextMeasurer.js';
import { RenderBuffer, hitTestBuffer } from './RenderBuffer.js';

const CAPS_MAP: Record<string, CanvasLineCap> = { none: 'butt', square: 'square', round: 'round' };

/** Convert a 0xRRGGBB color number to a CSS rgb() string. */
function colorToString(color: number): string {
	const r = (color >> 16) & 0xff;
	const g = (color >> 8) & 0xff;
	const b = color & 0xff;
	return `rgb(${r},${g},${b})`;
}

/**
 * Canvas 2D renderer. Traverses the DisplayObject tree and draws each node
 * using the Canvas 2D API. Equivalent to Egret's `CanvasRenderer`.
 *
 * Performance notes:
 * - Currently does full-tree traversal and full-canvas redraw every frame.
 *   Egret used a DisplayList with dirty-region tracking to only redraw changed areas.
 *   This should be added when performance becomes a concern.
 * - Egret used a RenderNode intermediate layer (BitmapNode, GraphicsNode, etc.)
 *   to cache rendering instructions. Blakron reads DisplayObject data directly,
 *   which is simpler but skips the caching benefit. If profiling shows the JS-side
 *   traversal is a bottleneck, consider adding a lightweight render command cache.
 * - For high-performance scenarios, a WebGL renderer with batch rendering should
 *   be implemented as an alternative backend.
 */
export class CanvasRenderer {
	// ── Instance fields ───────────────────────────────────────────────────────
	private _hasFill = false;
	private _hasStroke = false;

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Renders a display object tree into the given buffer.
	 */
	public render(displayObject: DisplayObject, buffer: RenderBuffer, matrix?: Matrix): number {
		const ctx = buffer.context;
		if (matrix) {
			ctx.save();
			ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);
		}
		const drawCalls = this.drawDisplayObject(displayObject, ctx, 0, 0, true);
		if (matrix) ctx.restore();
		return drawCalls;
	}

	/** @internal Used by WebGLRenderer for offscreen DisplayList rendering. */
	public renderToContext(
		displayObject: DisplayObject,
		ctx: CanvasRenderingContext2D,
		offsetX: number,
		offsetY: number,
	): void {
		this.drawDisplayObject(displayObject, ctx, offsetX, offsetY, true);
	}

	/** @internal Used by WebGLRenderer to rasterize a Graphics object into a Canvas 2D context. */
	public renderGraphicsToContext(
		graphics: Graphics,
		ctx: CanvasRenderingContext2D,
		offsetX: number,
		offsetY: number,
		forHitTest = false,
		skipCache = false,
	): void {
		this.renderGraphics(graphics, ctx, offsetX, offsetY, forHitTest, skipCache);
	}

	/** @internal Used by WebGL TextPipe to rasterize a TextField into a Canvas 2D context. */
	public renderTextFieldToContext(
		tf: TextField,
		ctx: CanvasRenderingContext2D,
		offsetX: number,
		offsetY: number,
	): void {
		this.renderTextField(tf, ctx, offsetX, offsetY);
	}

	/** @internal Used by Bitmap pixel hit test. */
	public renderBitmapToContext(
		bitmap: Bitmap,
		ctx: CanvasRenderingContext2D,
		offsetX: number,
		offsetY: number,
	): void {
		this.renderBitmap(bitmap, ctx, offsetX, offsetY);
	}
	// ── Private: tree traversal ───────────────────────────────────────────────

	private drawDisplayObject(
		displayObject: DisplayObject,
		ctx: CanvasRenderingContext2D,
		offsetX: number,
		offsetY: number,
		_isStage = false,
	): number {
		let drawCalls = 0;

		// DisplayList cache (cacheAsBitmap)
		const $displayList = displayObject.$displayList;
		if ($displayList && !_isStage) {
			if (displayObject.$cacheDirty || displayObject.$renderDirty) {
				if ($displayList.updateSurfaceSize()) {
					$displayList.renderBuffer.clear();
					const resolution = $displayList.actualResolution;
					$displayList.renderBuffer.context.setTransform(resolution, 0, 0, resolution, 0, 0);
					this.drawDisplayObject(
						displayObject,
						$displayList.renderBuffer.context,
						$displayList.offsetX,
						$displayList.offsetY,
						true,
					);
					$displayList.updateBitmapData();
				}
				displayObject.$cacheDirty = false;
				displayObject.$renderDirty = false;
			}
			// Draw cached result and skip $children
			if ($displayList.bitmapData?.source) {
				const resolution = $displayList.actualResolution;
				const previousSmoothing = ctx.imageSmoothingEnabled;
				ctx.imageSmoothingEnabled = $displayList.scaleMode === 'linear';
				ctx.drawImage(
					$displayList.bitmapData.source as CanvasImageSource,
					offsetX - $displayList.offsetX,
					offsetY - $displayList.offsetY,
					$displayList.renderBuffer.width / resolution,
					$displayList.renderBuffer.height / resolution,
				);
				ctx.imageSmoothingEnabled = previousSmoothing;
				drawCalls++;
			}
			return drawCalls;
		}

		// Draw self
		drawCalls += this.renderSelf(displayObject, ctx, offsetX, offsetY);

		// Draw $children
		const $children = displayObject.$children;
		if (!$children) return drawCalls;

		for (let i = 0; i < $children.length; i++) {
			const child = $children[i];
			if (child.$renderMode === RenderMode.NONE) continue;

			let childOffsetX: number;
			let childOffsetY: number;

			if (child.$useTranslate) {
				const m = child.$getMatrix();
				childOffsetX = offsetX + child.$x;
				childOffsetY = offsetY + child.$y;
				ctx.save();
				ctx.transform(m.a, m.b, m.c, m.d, childOffsetX, childOffsetY);
				childOffsetX = -child.$anchorOffsetX;
				childOffsetY = -child.$anchorOffsetY;
			} else {
				childOffsetX = offsetX + child.$x - child.$anchorOffsetX;
				childOffsetY = offsetY + child.$y - child.$anchorOffsetY;
			}

			let prevAlpha: number | undefined;
			if (child.$alpha !== 1) {
				prevAlpha = ctx.globalAlpha;
				ctx.globalAlpha *= child.$alpha;
			}

			if (child.$renderMode === RenderMode.FILTER) {
				drawCalls += this.drawWithFilter(child, ctx, childOffsetX, childOffsetY);
			} else if (child.$renderMode === RenderMode.SCROLLRECT) {
				drawCalls += this.drawWithScrollRect(child, ctx, childOffsetX, childOffsetY);
			} else if (child.$renderMode === RenderMode.CLIP) {
				drawCalls += this.drawWithClip(child, ctx, childOffsetX, childOffsetY);
			} else {
				drawCalls += this.drawDisplayObject(child, ctx, childOffsetX, childOffsetY);
			}

			if (child.$useTranslate) {
				ctx.restore();
			} else if (prevAlpha !== undefined) {
				ctx.globalAlpha = prevAlpha;
			}
		}

		return drawCalls;
	}

	private drawWithScrollRect(
		displayObject: DisplayObject,
		ctx: CanvasRenderingContext2D,
		offsetX: number,
		offsetY: number,
	): number {
		const rect = displayObject.$scrollRect ?? displayObject.$maskRect;
		if (!rect || rect.isEmpty()) return 0;
		if (displayObject.$scrollRect) {
			offsetX -= rect.x;
			offsetY -= rect.y;
		}
		ctx.save();
		ctx.beginPath();
		ctx.rect(rect.x + offsetX, rect.y + offsetY, rect.width, rect.height);
		ctx.clip();
		const drawCalls = this.drawDisplayObject(displayObject, ctx, offsetX, offsetY);
		ctx.restore();
		return drawCalls;
	}

	private drawWithFilter(
		displayObject: DisplayObject,
		ctx: CanvasRenderingContext2D,
		offsetX: number,
		offsetY: number,
	): number {
		const filters = displayObject.$filters;
		if (!filters.length) return this.drawDisplayObject(displayObject, ctx, offsetX, offsetY);

		const bounds = displayObject.$getOriginalBounds();
		if (bounds.width <= 0 || bounds.height <= 0) return 0;

		// Build CSS filter string for GPU-accelerated filters.
		// ColorMatrixFilter cannot be expressed as a CSS filter string (arbitrary matrix),
		// so it falls back to the CPU pixel path below.
		const cssFilters: string[] = [];
		let hasCpuFilter = false;

		for (const filter of filters) {
			if (filter instanceof BlurFilter) {
				// Average blurX/blurY — CSS blur is isotropic.
				const radius = (filter.blurX + filter.blurY) / 2;
				if (radius > 0) cssFilters.push(`blur(${radius}px)`);
			} else if (filter instanceof DropShadowFilter) {
				const angleRad = (filter.angle / 180) * Math.PI;
				const dx = Math.round(filter.distance * Math.cos(angleRad));
				const dy = Math.round(filter.distance * Math.sin(angleRad));
				const blur = (filter.blurX + filter.blurY) / 2;
				const r = (filter.color >> 16) & 0xff;
				const g = (filter.color >> 8) & 0xff;
				const b = filter.color & 0xff;
				const a = Math.round(filter.alpha * 255);
				cssFilters.push(`drop-shadow(${dx}px ${dy}px ${blur}px rgba(${r},${g},${b},${a / 255}))`);
			} else if (filter instanceof GlowFilter) {
				// Approximate glow as a zero-offset drop-shadow.
				const blur = (filter.blurX + filter.blurY) / 2;
				const r = (filter.color >> 16) & 0xff;
				const g = (filter.color >> 8) & 0xff;
				const b = filter.color & 0xff;
				const a = Math.round(filter.alpha * filter.strength * 255);
				cssFilters.push(`drop-shadow(0px 0px ${blur}px rgba(${r},${g},${b},${a / 255}))`);
			} else if (filter instanceof ColorMatrixFilter) {
				hasCpuFilter = true;
			}
		}

		const hasBlendMode = displayObject.$blendMode !== 0;

		// ── Fast path: all filters expressible as CSS ─────────────────────────
		if (!hasCpuFilter && cssFilters.length > 0) {
			ctx.save();
			ctx.filter = cssFilters.join(' ');
			if (hasBlendMode) ctx.globalCompositeOperation = displayObject.blendMode as GlobalCompositeOperation;

			let drawCalls = 0;
			if (displayObject.$mask) {
				drawCalls += this.drawWithClip(displayObject, ctx, offsetX, offsetY);
			} else if (displayObject.$scrollRect || displayObject.$maskRect) {
				drawCalls += this.drawWithScrollRect(displayObject, ctx, offsetX, offsetY);
			} else {
				drawCalls += this.drawDisplayObject(displayObject, ctx, offsetX, offsetY);
			}

			ctx.restore();
			return drawCalls;
		}

		// ── CPU fallback: ColorMatrixFilter or mixed ──────────────────────────
		const bufferW = Math.ceil(bounds.width);
		const bufferH = Math.ceil(bounds.height);
		const offscreen = new RenderBuffer(bufferW, bufferH);
		const offCtx = offscreen.context;

		// Apply CSS-capable filters on the offscreen context before drawing.
		if (cssFilters.length > 0) offCtx.filter = cssFilters.join(' ');

		let drawCalls = 0;
		if (displayObject.$mask) {
			drawCalls += this.drawWithClip(displayObject, offCtx, -bounds.x, -bounds.y);
		} else if (displayObject.$scrollRect || displayObject.$maskRect) {
			drawCalls += this.drawWithScrollRect(displayObject, offCtx, -bounds.x, -bounds.y);
		} else {
			drawCalls += this.drawDisplayObject(displayObject, offCtx, -bounds.x, -bounds.y);
		}

		if (drawCalls === 0) {
			offscreen.destroy();
			return 0;
		}

		offCtx.filter = 'none';

		// Apply CPU-only filters (ColorMatrixFilter).
		const imageData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height);
		const data = imageData.data;
		for (const filter of filters) {
			if (filter instanceof ColorMatrixFilter) {
				applyColorMatrix(data, filter.matrix);
			}
		}
		offCtx.putImageData(imageData, 0, 0);

		if (hasBlendMode) ctx.globalCompositeOperation = displayObject.blendMode as GlobalCompositeOperation;
		ctx.drawImage(offscreen.surface, offsetX + bounds.x, offsetY + bounds.y);
		if (hasBlendMode) ctx.globalCompositeOperation = 'source-over';

		offscreen.destroy();
		return drawCalls + 1;
	}

	private drawWithClip(
		displayObject: DisplayObject,
		ctx: CanvasRenderingContext2D,
		offsetX: number,
		offsetY: number,
	): number {
		const scrollRect = displayObject.$scrollRect ?? displayObject.$maskRect;
		const mask = displayObject.$mask;
		const hasBlendMode = displayObject.$blendMode !== 0;

		if (hasBlendMode) {
			ctx.globalCompositeOperation = displayObject.blendMode as GlobalCompositeOperation;
		}

		if (scrollRect) {
			ctx.save();
			ctx.beginPath();
			ctx.rect(scrollRect.x + offsetX, scrollRect.y + offsetY, scrollRect.width, scrollRect.height);
			ctx.clip();
		}

		// DisplayObject mask: render content and mask to offscreen buffers,
		// composite with 'destination-in' to produce the masked result.
		if (mask) {
			const bounds = displayObject.$getOriginalBounds();
			if (bounds.width <= 0 || bounds.height <= 0) {
				if (scrollRect) ctx.restore();
				if (hasBlendMode) ctx.globalCompositeOperation = 'source-over';
				return 0;
			}
			const bw = Math.ceil(bounds.width);
			const bh = Math.ceil(bounds.height);
			const bx = bounds.x;
			const by = bounds.y;

			// Render content to offscreen buffer
			const contentBuffer = new RenderBuffer(bw, bh);
			const contentCtx = contentBuffer.context;
			const drawCalls = this.drawDisplayObject(displayObject, contentCtx, -bx, -by);

			// Render mask shape to the same buffer using destination-in
			contentCtx.globalCompositeOperation = 'destination-in';
			const maskMatrix = mask.$getConcatenatedMatrix();
			const parentMatrix = displayObject.$getConcatenatedMatrix();
			// Transform mask relative to the content's local space
			contentCtx.save();
			const invA = parentMatrix.a,
				invB = parentMatrix.b,
				invC = parentMatrix.c,
				invD = parentMatrix.d;
			const invTx = parentMatrix.tx,
				invTy = parentMatrix.ty;
			const det = invA * invD - invB * invC;
			if (Math.abs(det) > 1e-6) {
				const ia = invD / det,
					ib = -invB / det,
					ic = -invC / det,
					id = invA / det;
				const itx = (invC * invTy - invD * invTx) / det;
				const ity = (invB * invTx - invA * invTy) / det;
				// Combine: inverse(parent) * mask
				const ra = ia * maskMatrix.a + ic * maskMatrix.b;
				const rb = ib * maskMatrix.a + id * maskMatrix.b;
				const rc = ia * maskMatrix.c + ic * maskMatrix.d;
				const rd = ib * maskMatrix.c + id * maskMatrix.d;
				const rtx = ia * maskMatrix.tx + ic * maskMatrix.ty + itx - bx;
				const rty = ib * maskMatrix.tx + id * maskMatrix.ty + ity - by;
				contentCtx.setTransform(ra, rb, rc, rd, rtx, rty);
			} else {
				contentCtx.translate(-bx, -by);
			}
			this.drawDisplayObject(mask, contentCtx, 0, 0);
			contentCtx.restore();
			contentCtx.globalCompositeOperation = 'source-over';

			// Draw the masked result onto the main context
			ctx.drawImage(contentBuffer.surface, offsetX + bx, offsetY + by);
			contentBuffer.destroy();

			if (scrollRect) ctx.restore();
			if (hasBlendMode) ctx.globalCompositeOperation = 'source-over';
			return drawCalls + 1;
		}

		const drawCalls = this.drawDisplayObject(displayObject, ctx, offsetX, offsetY);

		if (scrollRect) ctx.restore();
		if (hasBlendMode) ctx.globalCompositeOperation = 'source-over';

		return drawCalls;
	}

	// ── Private: render individual node types ─────────────────────────────────

	private renderSelf(
		displayObject: DisplayObject,
		ctx: CanvasRenderingContext2D,
		offsetX: number,
		offsetY: number,
	): number {
		switch (displayObject.$renderObjectType) {
			case RenderObjectType.MESH:
				return this.renderMesh(displayObject as Mesh, ctx, offsetX, offsetY);
			case RenderObjectType.BITMAP:
				return this.renderBitmap(displayObject as Bitmap, ctx, offsetX, offsetY);
			case RenderObjectType.SHAPE:
				return this.renderGraphics((displayObject as Shape).graphics, ctx, offsetX, offsetY);
			case RenderObjectType.SPRITE:
				return this.renderGraphics((displayObject as Sprite).graphics, ctx, offsetX, offsetY);
			case RenderObjectType.TEXT:
				return this.renderTextField(displayObject as TextField, ctx, offsetX, offsetY);
			case RenderObjectType.PARTICLE:
				return this.renderParticleSystem(displayObject, ctx, offsetX, offsetY);
			default:
				return 0;
		}
	}

	private renderMesh(mesh: Mesh, ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): number {
		const bd = mesh.bitmapData;
		if (!bd?.source || mesh.vertices.length === 0) return 0;

		// Canvas 2D doesn't natively support mesh rendering.
		// Fall back to drawing the full texture as a simple bitmap.
		const destW = !isNaN(mesh.width) ? mesh.width : mesh.textureWidth;
		const destH = !isNaN(mesh.height) ? mesh.height : mesh.textureHeight;
		ctx.drawImage(
			bd.source as CanvasImageSource,
			mesh.bitmapX,
			mesh.bitmapY,
			mesh.bitmapWidth,
			mesh.bitmapHeight,
			offsetX + mesh.bitmapOffsetX,
			offsetY + mesh.bitmapOffsetY,
			destW,
			destH,
		);
		return 1;
	}

	private renderBitmap(bitmap: Bitmap, ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): number {
		const bd = bitmap.bitmapData;
		if (!bd?.source) return 0;

		const destW = !isNaN(bitmap.width) ? bitmap.width : bitmap.textureWidth;
		const destH = !isNaN(bitmap.height) ? bitmap.height : bitmap.textureHeight;
		if (destW <= 0 || destH <= 0) return 0;

		ctx.imageSmoothingEnabled = bitmap.smoothing;
		ctx.drawImage(
			bd.source as CanvasImageSource,
			bitmap.bitmapX,
			bitmap.bitmapY,
			bitmap.bitmapWidth,
			bitmap.bitmapHeight,
			offsetX + bitmap.bitmapOffsetX,
			offsetY + bitmap.bitmapOffsetY,
			destW,
			destH,
		);
		return 1;
	}

	private renderGraphics(
		graphics: Graphics,
		ctx: CanvasRenderingContext2D,
		offsetX: number,
		offsetY: number,
		forHitTest = false,
		skipCache = false,
	): number {
		if (graphics.commands.length === 0) return 0;

		// ── Offscreen cache (skip for hit-test or when caller manages its own cache) ──
		if (!forHitTest && !skipCache) {
			if (graphics.canvasCacheDirty || !graphics.offscreenCanvas) {
				// Measure bounds to size the offscreen canvas
				const bounds = new Rectangle();
				graphics.$measureContentBounds(bounds);
				const cw = Math.ceil(bounds.width) || 1;
				const ch = Math.ceil(bounds.height) || 1;

				// Create or resize offscreen canvas
				if (!graphics.offscreenCanvas) {
					graphics.offscreenCanvas = document.createElement('canvas');
					graphics.offscreenCtx = graphics.offscreenCanvas.getContext('2d', { willReadFrequently: true })!;
				}
				const oc = graphics.offscreenCanvas;
				if (oc.width !== cw || oc.height !== ch) {
					oc.width = cw;
					oc.height = ch;
				} else {
					graphics.offscreenCtx!.clearRect(0, 0, cw, ch);
				}
				const oc2d = graphics.offscreenCtx!;
				oc2d.save();
				oc2d.translate(-bounds.x, -bounds.y);
				this._hasFill = false;
				this._hasStroke = false;
				for (const cmd of graphics.commands) {
					this.executeGraphicsCommand(cmd, oc2d, false);
				}
				// Flush any open path that wasn't closed by endFill
				this.flushOpenPath(oc2d);
				oc2d.restore();

				graphics.offscreenBoundsX = bounds.x;
				graphics.offscreenBoundsY = bounds.y;
				graphics.canvasCacheDirty = false;
			}

			// Draw cached offscreen canvas
			ctx.drawImage(
				graphics.offscreenCanvas!,
				offsetX + graphics.offscreenBoundsX!,
				offsetY + graphics.offscreenBoundsY!,
			);
			return 1;
		}

		// ── Hit-test path: direct execution, no cache ─────────────────────────
		ctx.save();
		ctx.translate(offsetX, offsetY);
		this._hasFill = false;
		this._hasStroke = false;
		for (const cmd of graphics.commands) {
			this.executeGraphicsCommand(cmd, ctx, forHitTest);
		}
		// Flush any open path that wasn't closed by endFill
		this.flushOpenPath(ctx);
		ctx.restore();
		return 1;
	}

	private renderTextField(tf: TextField, ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): number {
		tf.getLinesArr(); // ensure lines are computed

		// INPUT mode while focused: HTML input element owns the display.
		// Only render background/border so the field is visible, but skip
		// text content to avoid the double-text artefact.
		const inputFocused = tf.type === TextFieldType.INPUT && tf.isTyping;

		const width = !isNaN(tf.$explicitWidth) ? tf.$explicitWidth : tf.textWidth;
		const height = !isNaN(tf.$explicitHeight) ? tf.$explicitHeight : tf.textHeight;
		if (width <= 0 || height <= 0) return 0;

		ctx.save();
		ctx.translate(offsetX, offsetY);

		// ── Background ────────────────────────────────────────────────────────
		if (tf.background) {
			ctx.fillStyle = colorToString(tf.backgroundColor);
			ctx.fillRect(0, 0, width, height);
		}

		// ── Border ────────────────────────────────────────────────────────────
		if (tf.border) {
			ctx.strokeStyle = colorToString(tf.borderColor);
			ctx.lineWidth = 1;
			ctx.strokeRect(0, 0, width, height);
		}

		// While the native input is active, skip text/cursor rendering.
		if (inputFocused) {
			ctx.restore();
			return 0;
		}

		// ── Clip to visible area (for scrollV support) ────────────────────────
		ctx.beginPath();
		ctx.rect(0, 0, width, height);
		ctx.clip();

		// ── Compute vertical offset ───────────────────────────────────────────
		const lines = tf.getLinesArr();
		const lineSpacing = tf.lineSpacing;
		let totalTextHeight = 0;
		for (let i = 0; i < lines.length; i++) {
			totalTextHeight += lines[i].height;
			if (i > 0) totalTextHeight += lineSpacing;
		}

		let verticalOffset = 0;
		if (tf.verticalAlign === VerticalAlign.MIDDLE) {
			verticalOffset = Math.max(0, (height - totalTextHeight) / 2);
		} else if (tf.verticalAlign === VerticalAlign.BOTTOM) {
			verticalOffset = Math.max(0, height - totalTextHeight);
		}

		// ── ScrollV offset ────────────────────────────────────────────────────
		const scrollOffset = tf.getScrollYOffset();

		// ── Draw lines (Egret-style: textBaseline='middle', y at line-height center) ──
		// Following Egret's TextField.drawText():
		//   drawY advances by h/2 before drawing, then h/2 + lineSpacing after.
		//   Each element's y = drawY + (lineHeight - elementSize) / 2.
		//   With textBaseline='middle', the browser handles vertical centering automatically.
		let drawY = verticalOffset - scrollOffset;
		let drawCalls = 0;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const h = line.height;
			drawY += h / 2;

			if (drawY + h / 2 < 0 || drawY - h / 2 > height) {
				drawY += h / 2 + lineSpacing;
				continue;
			}

			// Horizontal alignment offset
			let lineX = 0;
			if (tf.textAlign === HorizontalAlign.RIGHT) {
				lineX = width - line.width;
			} else if (tf.textAlign === HorizontalAlign.CENTER) {
				lineX = (width - line.width) / 2;
			}

			// Draw each element in the line
			for (const el of line.elements) {
				const style = el.style;
				const fontSize = style?.size ?? tf.size;
				const fontFamily = style?.fontFamily ?? tf.fontFamily;
				const bold = style?.bold ?? tf.bold;
				const italic = style?.italic ?? tf.italic;
				const textColor = style?.textColor ?? tf.textColor;
				const strokeColor = style?.strokeColor ?? tf.strokeColor;
				const stroke = style?.stroke ?? tf.stroke;

				const fontStr = getFontString(fontSize, fontFamily, bold, italic);
				ctx.font = fontStr;
				ctx.textBaseline = 'middle';
				ctx.textAlign = 'left';

				const textY = drawY + (h - fontSize) / 2;

				// Stroke
				if (stroke > 0) {
					ctx.strokeStyle = colorToString(strokeColor);
					ctx.lineWidth = stroke * 2;
					ctx.lineJoin = 'round';
					ctx.strokeText(el.text, lineX, textY);
					drawCalls++;
				}

				// Fill
				ctx.fillStyle = colorToString(textColor);
				ctx.fillText(el.text, lineX, textY);
				drawCalls++;

				lineX += el.width;
			}

			drawY += h / 2 + lineSpacing;
		}

		// ── INPUT cursor ──────────────────────────────────────────────────────
		if (tf.type === TextFieldType.INPUT && tf.isTyping) {
			// Draw blinking cursor at caretIndex position
			const caretIndex = tf.caretIndex;
			const fontStr = getFontString(tf.size, tf.fontFamily, tf.bold, tf.italic);
			ctx.font = fontStr;
			ctx.textBaseline = 'middle';

			// Calculate cursor x by measuring text up to caretIndex
			let cursorX = 0;
			let charCount = 0;
			for (const line of lines) {
				for (const el of line.elements) {
					const elLen = el.text.length;
					if (charCount + elLen >= caretIndex) {
						const partial = el.text.substring(0, caretIndex - charCount);
						cursorX += ctx.measureText(partial).width;
						charCount = caretIndex;
						break;
					}
					cursorX += el.width;
					charCount += elLen;
				}
				if (charCount >= caretIndex) break;
				cursorX = 0; // reset x for next line
			}

			const cursorY = verticalOffset - scrollOffset;
			ctx.fillStyle = colorToString(tf.textColor);
			ctx.fillRect(cursorX, cursorY, 1, tf.size);
			drawCalls++;
		}

		ctx.restore();
		return drawCalls > 0 ? 1 : 0;
	}

	private renderParticleSystem(
		obj: DisplayObject,
		ctx: CanvasRenderingContext2D,
		offsetX: number,
		offsetY: number,
	): number {
		const ps = obj as unknown as {
			readonly particles: readonly {
				x: number;
				y: number;
				scale: number;
				rotation: number;
				alpha: number;
				blendMode: number;
				$getMatrix(regX: number, regY: number): Matrix;
			}[];
			texture: Texture;
			numParticles: number;
		};

		if (ps.numParticles === 0) return 0;

		const texture = ps.texture;
		const bd = texture.bitmapData;
		if (!bd?.source) return 0;

		const source = bd.source as CanvasImageSource;
		const bitmapX = texture.bitmapX;
		const bitmapY = texture.bitmapY;
		const bitmapWidth = texture.bitmapWidth;
		const bitmapHeight = texture.bitmapHeight;
		const texW = texture.textureWidth;
		const texH = texture.textureHeight;
		const regX = texW / 2;
		const regY = texH / 2;

		for (let i = 0; i < ps.numParticles; i++) {
			const particle = ps.particles[i];
			const matrix = particle.$getMatrix(regX, regY);

			ctx.save();
			ctx.globalAlpha *= particle.alpha;
			ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, offsetX + matrix.tx, offsetY + matrix.ty);

			ctx.drawImage(source, bitmapX, bitmapY, bitmapWidth, bitmapHeight, 0, 0, texW, texH);

			ctx.restore();
		}

		return ps.numParticles;
	}

	private flushOpenPath(ctx: CanvasRenderingContext2D): void {
		if (this._hasFill) ctx.fill();
		if (this._hasStroke) ctx.stroke();
		this._hasFill = false;
		this._hasStroke = false;
	}

	private executeGraphicsCommand(cmd: GraphicsCommand, ctx: CanvasRenderingContext2D, forHitTest = false): void {
		switch (cmd.type) {
			case PathCommandType.BeginFill:
				ctx.fillStyle = forHitTest
					? '#000'
					: `rgba(${(cmd.color >> 16) & 0xff},${(cmd.color >> 8) & 0xff},${cmd.color & 0xff},${cmd.alpha})`;
				ctx.beginPath();
				this._hasFill = true;
				break;
			case PathCommandType.BeginGradientFill: {
				if (forHitTest) {
					ctx.fillStyle = '#000';
					ctx.beginPath();
					this._hasFill = true;
					break;
				}
				// createGradientBox uses the Flash/Egret convention where the matrix
				// maps gradient space ±819.2 (1638.4/2) to the desired box edges.
				const GH = 819.2;
				let gradient: CanvasGradient;
				if (cmd.matrix) {
					const m = cmd.matrix;
					if (cmd.gradientType === 'radial') {
						const cx = m.tx;
						const cy = m.ty;
						const rx = Math.sqrt(m.a * m.a + m.b * m.b) * GH;
						const ry = Math.sqrt(m.c * m.c + m.d * m.d) * GH;
						gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
					} else {
						const x0 = m.a * -GH + m.tx;
						const y0 = m.b * -GH + m.ty;
						const x1 = m.a * GH + m.tx;
						const y1 = m.b * GH + m.ty;
						gradient = ctx.createLinearGradient(x0, y0, x1, y1);
					}
				} else {
					if (cmd.gradientType === 'radial') {
						gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, GH);
					} else {
						gradient = ctx.createLinearGradient(-GH, 0, GH, 0);
					}
				}
				for (let i = 0; i < cmd.colors.length; i++) {
					const c = cmd.colors[i];
					const a = cmd.alphas[i] ?? 1;
					const r = (cmd.ratios[i] ?? 0) / 255;
					gradient.addColorStop(r, `rgba(${(c >> 16) & 0xff},${(c >> 8) & 0xff},${c & 0xff},${a})`);
				}
				ctx.fillStyle = gradient;
				ctx.beginPath();
				this._hasFill = true;
				break;
			}
			case PathCommandType.EndFill:
				if (this._hasFill) ctx.fill();
				ctx.closePath();
				if (this._hasStroke) ctx.stroke();
				this._hasFill = false;
				break;
			case PathCommandType.LineStyle:
				ctx.lineWidth = cmd.thickness;
				ctx.strokeStyle = forHitTest
					? '#000'
					: `rgba(${(cmd.color >> 16) & 0xff},${(cmd.color >> 8) & 0xff},${cmd.color & 0xff},${cmd.alpha})`;
				ctx.lineCap = CAPS_MAP[cmd.caps ?? 'none'] ?? 'butt';
				ctx.lineJoin = (cmd.joints ?? 'round') as CanvasLineJoin;
				ctx.miterLimit = cmd.miterLimit;
				if (cmd.lineDash) ctx.setLineDash(cmd.lineDash);
				this._hasStroke = true;
				break;
			case PathCommandType.MoveTo:
				ctx.moveTo(cmd.x, cmd.y);
				break;
			case PathCommandType.LineTo:
				ctx.lineTo(cmd.x, cmd.y);
				break;
			case PathCommandType.CurveTo:
				ctx.quadraticCurveTo(cmd.cx, cmd.cy, cmd.ax, cmd.ay);
				break;
			case PathCommandType.CubicCurveTo:
				ctx.bezierCurveTo(cmd.cx1, cmd.cy1, cmd.cx2, cmd.cy2, cmd.ax, cmd.ay);
				break;
			case PathCommandType.DrawRect:
				ctx.beginPath();
				ctx.rect(cmd.x, cmd.y, cmd.w, cmd.h);
				if (this._hasFill) ctx.fill();
				if (this._hasStroke) ctx.stroke();
				break;
			case PathCommandType.DrawRoundRect: {
				const { x, y, w, h, ew, eh } = cmd;
				const rx = ew / 2,
					ry = eh / 2;
				ctx.beginPath();
				ctx.moveTo(x + rx, y);
				ctx.lineTo(x + w - rx, y);
				ctx.ellipse(x + w - rx, y + ry, rx, ry, 0, -Math.PI / 2, 0);
				ctx.lineTo(x + w, y + h - ry);
				ctx.ellipse(x + w - rx, y + h - ry, rx, ry, 0, 0, Math.PI / 2);
				ctx.lineTo(x + rx, y + h);
				ctx.ellipse(x + rx, y + h - ry, rx, ry, 0, Math.PI / 2, Math.PI);
				ctx.lineTo(x, y + ry);
				ctx.ellipse(x + rx, y + ry, rx, ry, 0, Math.PI, Math.PI * 1.5);
				ctx.closePath();
				if (this._hasFill) ctx.fill();
				if (this._hasStroke) ctx.stroke();
				break;
			}
			case PathCommandType.DrawCircle:
				ctx.beginPath();
				ctx.arc(cmd.x, cmd.y, cmd.r, 0, Math.PI * 2);
				if (this._hasFill) ctx.fill();
				if (this._hasStroke) ctx.stroke();
				break;
			case PathCommandType.DrawEllipse: {
				const cx = cmd.x + cmd.w / 2;
				const cy = cmd.y + cmd.h / 2;
				ctx.beginPath();
				ctx.ellipse(cx, cy, cmd.w / 2, cmd.h / 2, 0, 0, Math.PI * 2);
				if (this._hasFill) ctx.fill();
				if (this._hasStroke) ctx.stroke();
				break;
			}
			case PathCommandType.DrawArc:
				ctx.beginPath();
				ctx.arc(cmd.x, cmd.y, cmd.r, cmd.start, cmd.end, cmd.ccw);
				if (this._hasStroke) ctx.stroke();
				break;
			case PathCommandType.Clear:
				this._hasFill = false;
				this._hasStroke = false;
				break;
		}
	}
}

// ── Filter pixel manipulation helpers ─────────────────────────────────────────

function applyColorMatrix(data: Uint8ClampedArray, matrix: number[]): void {
	for (let i = 0; i < data.length; i += 4) {
		const r = data[i],
			g = data[i + 1],
			b = data[i + 2],
			a = data[i + 3];
		data[i] = Math.max(0, Math.min(255, r * matrix[0] + g * matrix[1] + b * matrix[2] + a * matrix[3] + matrix[4]));
		data[i + 1] = Math.max(
			0,
			Math.min(255, r * matrix[5] + g * matrix[6] + b * matrix[7] + a * matrix[8] + matrix[9]),
		);
		data[i + 2] = Math.max(
			0,
			Math.min(255, r * matrix[10] + g * matrix[11] + b * matrix[12] + a * matrix[13] + matrix[14]),
		);
		data[i + 3] = Math.max(
			0,
			Math.min(255, r * matrix[15] + g * matrix[16] + b * matrix[17] + a * matrix[18] + matrix[19]),
		);
	}
}

// ── Graphics pixel-perfect hit test ──────────────────────────────────────────
// Registered here to avoid circular dependency between display/ and player/.
// Uses the shared 3×3 hitTestBuffer: translate so the test point lands at (1,1),
// render with forHitTest=true (all shapes drawn as opaque black), then read alpha.

const _hitRenderer = new CanvasRenderer();

setGraphicsHitTest((graphics: Graphics, localX: number, localY: number): boolean => {
	const buf = hitTestBuffer();
	buf.clear();
	const ctx = buf.context;
	// Translate so localX/Y maps to pixel (1,1) in the 3×3 buffer
	ctx.setTransform(1, 0, 0, 1, 1 - localX, 1 - localY);
	_hitRenderer.renderGraphicsToContext(graphics, ctx, 0, 0, true);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	try {
		return buf.getPixels(1, 1)[3] !== 0;
	} catch {
		return false;
	}
});

// ── Bitmap pixel-perfect hit test ────────────────────────────────────────────
// Renders the Bitmap into the shared 3×3 buffer at the test point and reads alpha.

setBitmapPixelHitTest((bitmap: Bitmap, localX: number, localY: number): boolean => {
	const buf = hitTestBuffer();
	buf.clear();
	const ctx = buf.context;
	ctx.setTransform(1, 0, 0, 1, 1 - localX, 1 - localY);
	_hitRenderer.renderBitmapToContext(bitmap, ctx, 0, 0);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	try {
		return buf.getPixels(1, 1)[3] !== 0;
	} catch {
		return false;
	}
});
