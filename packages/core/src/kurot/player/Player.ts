import { Stage } from '../display/Stage.js';
import { DisplayObject } from '../display/DisplayObject.js';
import { DisplayObjectContainer } from '../display/DisplayObjectContainer.js';
import { Matrix } from '../geom/Matrix.js';
import { RenderBuffer, CanvasRenderer } from './canvas/index.js';
import { ticker, type Renderable } from './SystemTicker.js';
import { WebGLRenderContext, WebGLRenderBuffer, WebGLRenderer } from './webgl/index.js';

/**
 * The Player ties together a Stage and a renderer.
 * Automatically uses WebGL if available, falls back to Canvas 2D.
 */
export class Player implements Renderable {
	// ── Static fields ─────────────────────────────────────────────────────────
	private static readonly _IDENTITY = new Matrix();

	// ── Instance fields ───────────────────────────────────────────────────────
	public readonly stage: Stage;
	private _isPlaying = false;
	private _root?: DisplayObject;
	private _canvas2dBuffer?: RenderBuffer;
	private _canvas2dRenderer?: CanvasRenderer;
	private _webglBuffer?: WebGLRenderBuffer;
	private _webglRenderer?: WebGLRenderer;
	private _webglContext?: WebGLRenderContext;
	private _unregisterCallbacks: Array<() => void> = [];

	public readonly perf = {
		frameCount: 0,
		lastFrameTime: 0,
		fps: 0,
		avgFps: 0,
		minFps: 0 as number,
		maxFps: 0 as number,
		drawCalls: 0,
		avgDrawCalls: 0,
		renderTimeMs: 0,
		avgRenderTimeMs: 0,
		maxRenderTimeMs: 0,
		totalRenderTimeMs: 0,
	};

	private _fpsFrames = 0;
	private _fpsLastTime = performance.now();

	// ── Constructor ───────────────────────────────────────────────────────────
	public constructor(canvas: HTMLCanvasElement, stage?: Stage) {
		this.stage = stage ?? new Stage();

		try {
			this._webglContext = new WebGLRenderContext(canvas);
			this._webglBuffer = new WebGLRenderBuffer(
				this._webglContext,
				canvas.width || 1,
				canvas.height || 1,
				true,
			);
			this._webglRenderer = new WebGLRenderer();

			// Wire up renderer hooks. The engine is single-Player by design:
			// Player assigns these static hooks directly and clears them in
			// `destroy()`. There is no multi-Player listener registry.
			const renderer = this._webglRenderer;
			DisplayObject.$onStructureChange = () => renderer.markStructureDirty();
			DisplayObjectContainer.$onContainerStructureChange = owner => renderer.markStructureDirty(owner);
			DisplayObject.$onRenderableDirty = obj => renderer.markRenderableDirty(obj);
			this._unregisterCallbacks.push(
				// After context loss + restore, all WebGL textures are invalid and
				// the instruction set contains stale texture references. Force a
				// full rebuild so the next render re-uploads everything.
				this._webglContext.addContextRestoredListener(() => renderer.markStructureDirty()),
			);

			return;
		} catch {
			// WebGL init failed — fall through to Canvas 2D. Drop references so the
			// half-constructed context can be GC'd; the GL resources themselves are
			// reclaimed by the browser when the canvas is dropped.
			this._webglContext = undefined;
			this._webglBuffer = undefined;
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Failed to get Canvas 2D context');
		this._canvas2dBuffer = new RenderBuffer();
		(this._canvas2dBuffer as { surface: HTMLCanvasElement }).surface = canvas;
		(this._canvas2dBuffer as { context: CanvasRenderingContext2D }).context = ctx;
		this._canvas2dRenderer = new CanvasRenderer();
	}

	public get isWebGL(): boolean {
		return !!this._webglRenderer;
	}

	public start(root?: DisplayObject): void {
		if (this._isPlaying) return;
		this._isPlaying = true;
		if (root && !this._root) {
			this._root = root;
			this.stage.addChild(root);
		}
		ticker.addPlayer(this);
		ticker.start();
	}

	public stop(): void {
		this.pause();
	}

	public pause(): void {
		if (!this._isPlaying) return;
		this._isPlaying = false;
		ticker.removePlayer(this);
	}

	/** Destroy the player and release all resources. */
	public destroy(): void {
		this.pause();
		for (const fn of this._unregisterCallbacks) fn();
		this._unregisterCallbacks = [];
		// Single-Player engine: clear the static renderer hooks so they stop
		// notifying a renderer whose owner is gone.
		DisplayObject.$onStructureChange = undefined;
		DisplayObject.$onRenderableDirty = undefined;
		DisplayObjectContainer.$onContainerStructureChange = undefined;
	}

	public updateStageSize(width: number, height: number): void {
		this.stage.resize(width, height);
		if (this._webglBuffer) {
			this._webglBuffer.resize(width, height);
		} else {
			this._canvas2dBuffer?.resize(width, height);
		}
	}

	// ── Public methods (Renderable) ───────────────────────────────────────────

	public render(_triggerByFrame: boolean, _costTicker: number): void {
		const t0 = performance.now();

		if (this._webglBuffer && this._webglRenderer) {
			this._webglBuffer.clear();
			this.perf.drawCalls = this._webglRenderer.render(this.stage, this._webglBuffer, Player._IDENTITY);
		} else if (this._canvas2dBuffer && this._canvas2dRenderer) {
			this._canvas2dBuffer.clear();
			this.perf.drawCalls = this._canvas2dRenderer.render(this.stage, this._canvas2dBuffer);
		}

		const renderTime = performance.now() - t0;
		this.perf.renderTimeMs = renderTime;
		this.perf.totalRenderTimeMs += renderTime;
		if (renderTime > this.perf.maxRenderTimeMs) this.perf.maxRenderTimeMs = renderTime;

		this.perf.frameCount++;
		this._fpsFrames++;

		const now = performance.now();
		const elapsed = now - this._fpsLastTime;
		if (elapsed >= 1000) {
			const fps = (this._fpsFrames / elapsed) * 1000;
			this.perf.fps = fps;
			if (fps < this.perf.minFps) this.perf.minFps = fps;
			if (fps > this.perf.maxFps) this.perf.maxFps = fps;
			this.perf.avgFps =
				this.perf.frameCount /
					(this.perf.totalRenderTimeMs / 1000 + (now - this._fpsLastTime + elapsed) / 1000) || fps;
			this._fpsFrames = 0;
			this._fpsLastTime = now;
		}

		this.perf.avgDrawCalls = this.perf.drawCalls;
		this.perf.avgRenderTimeMs = this.perf.totalRenderTimeMs / this.perf.frameCount;
	}
}
