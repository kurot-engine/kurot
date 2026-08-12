import { DisplayObject, RenderMode, RenderObjectType } from '../../display/DisplayObject.js';
import { DisplayObjectContainer } from '../../display/DisplayObjectContainer.js';
import { Bitmap } from '../../display/Bitmap.js';
import { Shape } from '../../display/Shape.js';
import { Sprite } from '../../display/Sprite.js';
import { Mesh } from '../../display/Mesh.js';
import { Matrix } from '../../geom/Matrix.js';
import { Rectangle } from '../../geom/Rectangle.js';
import { CanvasRenderer } from '../canvas/CanvasRenderer.js';
import { InstructionSet } from './InstructionSet.js';
import { BitmapPipe, type BitmapInstruction } from './pipes/BitmapPipe.js';
import { GraphicsPipe, type GraphicsInstruction } from './pipes/GraphicsPipe.js';
import { MeshPipe, type MeshInstruction } from './pipes/MeshPipe.js';
import { FilterPipe, type FilterPushInstruction, type FilterPopInstruction } from './pipes/FilterPipe.js';
import { MaskPipe, type MaskPushInstruction, type MaskPopInstruction } from './pipes/MaskPipe.js';
import { TextPipe, type TextInstruction } from './pipes/TextPipe.js';
import { ParticlePipe, type ParticleInstruction } from './pipes/ParticlePipe.js';
import { TextField } from '../../text/TextField.js';
import { WebGLRenderBuffer } from './WebGLRenderBuffer.js';

// ── Transform context ─────────────────────────────────────────────────────────

/**
 * Snapshot of the buffer transform state at the point an instruction was built.
 * Stored on each leaf instruction so execute() can restore the correct transform.
 */
interface TransformState {
	a: number;
	b: number;
	c: number;
	d: number;
	tx: number;
	ty: number;
	offsetX: number;
	offsetY: number;
	alpha: number;
	tint: number;
}

interface InstructionBuildOptions {
	readonly isStage?: boolean;
	readonly inlineRenderGroups?: boolean;
}

const STAGE_BUILD_OPTIONS: InstructionBuildOptions = { isStage: true };
const MASK_BUILD_OPTIONS: InstructionBuildOptions = { inlineRenderGroups: true };

// ── Augmented instruction types ───────────────────────────────────────────────

type BaseLeafInstruction =
	| BitmapInstruction
	| GraphicsInstruction
	| MeshInstruction
	| TextInstruction
	| ParticleInstruction;

type LeafInstruction = BaseLeafInstruction & {
	transform: TransformState;
};

type EffectPushInstruction = (FilterPushInstruction | MaskPushInstruction) & {
	transform: TransformState;
};

interface DisplayListCacheInstruction {
	renderPipeId: 'displayListCache';
	renderable: DisplayObject;
	offsetX: number;
	offsetY: number;
	transform: TransformState;
}

/**
 * Emitted when a RenderGroup container is encountered during build.
 */
interface RenderGroupInstruction {
	renderPipeId: 'renderGroup';
	renderable: DisplayObject;
	set: InstructionSet;
	offsetX: number;
	offsetY: number;
	transform: TransformState;
}

type AnyInstruction =
	| LeafInstruction
	| EffectPushInstruction
	| FilterPopInstruction
	| MaskPopInstruction
	| DisplayListCacheInstruction
	| RenderGroupInstruction;

// ── WebGLRenderer ─────────────────────────────────────────────────────────────

/**
 * Two-phase WebGL renderer inspired by Pixi.js 8's RenderPipe / InstructionSet pattern.
 *
 * Phase A — Build (only when structureDirty):
 *   Traverse the DisplayObject tree and produce a flat InstructionSet.
 *   Each instruction captures the object reference + transform snapshot.
 *
 * Phase B — Execute (every frame):
 *   Walk the InstructionSet and dispatch each instruction to its pipe.
 *   No scene-graph traversal happens here.
 *
 * When only data changes ($renderDirty but not structureDirty):
 *   Call pipe.updateRenderable() for each dirty object, then execute.
 */
export class WebGLRenderer {
	// ── Pipes ─────────────────────────────────────────────────────────────────
	private readonly _canvasRenderer = new CanvasRenderer();
	private readonly _bitmapPipe: BitmapPipe;
	private readonly _graphicsPipe: GraphicsPipe;
	private readonly _meshPipe: MeshPipe;
	private readonly _textPipe: TextPipe;
	private readonly _filterPipe = new FilterPipe();
	private readonly _maskPipe: MaskPipe;
	private readonly _particlePipe = new ParticlePipe();

	// ── Instruction set ───────────────────────────────────────────────────────
	private readonly _instructionSet = new InstructionSet();
	// Scratch instruction sets used by nested mask-object renders.
	private readonly _maskInstructionSets: InstructionSet[] = [];
	// Current mask-object rendering depth.
	private _maskInstructionDepth = 0;

	private readonly _renderGroupSets = new WeakMap<DisplayObjectContainer, InstructionSet>();
	private readonly _renderGroupSetList: Array<WeakRef<DisplayObjectContainer>> = [];

	// Tracks recursive render() depth. Currently render() is never called
	// recursively (cacheAsBitmap uses an instruction-based path, RenderTexture
	// uses CanvasRenderer), so this stays at 0 on entry / exit. The guard below
	// (`if (this._nestLevel === 0)`) therefore fires on every render today.
	// Kept so that a future WebGL cacheAsBitmap / drawToTexture that recurses
	// through render() will only restore the root projection on the outermost
	// call — restoring it on an inner call would corrupt the in-flight
	// offscreen pass. DO NOT remove even though it looks unused.
	private _nestLevel = 0;

	public constructor() {
		this._bitmapPipe = new BitmapPipe();
		this._graphicsPipe = new GraphicsPipe(this._canvasRenderer);
		this._meshPipe = new MeshPipe();
		this._textPipe = new TextPipe(this._canvasRenderer);
		this._maskPipe = new MaskPipe((obj, buffer, offsetX, offsetY) => {
			this._renderMaskObject(obj, buffer, offsetX, offsetY);
		});
	}

	// ── Public entry point ────────────────────────────────────────────────────

	/**
	 * Release pooled instructions (filter/mask push/pop) back to their
	 * respective pipes before a rebuild discards `set`'s current contents.
	 */
	private _releaseInstructions(set: InstructionSet): void {
		for (let i = 0; i < set.instructionSize; i++) {
			const inst = set.instructions[i];
			switch (inst.renderPipeId) {
				case 'filterPush':
					FilterPipe.releasePush(inst as FilterPushInstruction);
					break;
				case 'filterPop':
					FilterPipe.releasePop(inst as FilterPopInstruction);
					break;
				case 'maskPush':
					MaskPipe.releasePush(inst as MaskPushInstruction);
					break;
				case 'maskPop':
					MaskPipe.releasePop(inst as MaskPopInstruction);
					break;
			}
		}
	}

	/**
	 * Render `displayObject` into `buffer` and return the number of draw calls
	 * issued. Rebuilds the instruction set when the scene structure is dirty,
	 * otherwise patches dirty renderables in place, then executes.
	 */
	public render(displayObject: DisplayObject, buffer: WebGLRenderBuffer, matrix: Matrix): number {
		this._nestLevel++;
		const ctx = buffer.context;
		ctx.pushBuffer(buffer);

		// Set (not multiply) the root transform so it doesn't accumulate across frames.
		buffer.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, 0, 0);

		const set = this._instructionSet;

		// ── Phase A: build instructions if scene structure changed ────────────
		if (set.structureDirty) {
			this._releaseInstructions(set);
			set.reset();
			buffer.globalAlpha = 1;
			buffer.globalTintColor = 0xffffff;
			this._buildInstructions(displayObject, set, buffer, matrix.tx, matrix.ty, STAGE_BUILD_OPTIONS);
			set.structureDirty = false;
		} else {
			// ── Partial update: patch GPU data for dirty renderables ──────────
			this._updateDirtyRenderables(set);
			this._prepareRenderGroups(set, buffer);
		}

		// ── Phase B: execute ──────────────────────────────────────────────────
		this._executeInstructions(set, buffer);

		ctx.flush();
		const drawCalls = buffer.drawCalls;
		buffer.onRenderFinish();

		ctx.popBuffer();

		// Reset to identity — clean slate for next frame.
		buffer.setTransform(1, 0, 0, 1, 0, 0);

		// Root $renderDirty is consumed after a full render pass.
		displayObject.$renderDirty = false;

		this._nestLevel--;
		// Only the outermost render() restores the root buffer's projection /
		// viewport. See _nestLevel comment for why this guard exists despite
		// render() currently never recursing.
		//
		// What this call actually does: create()+release() cycles a scratch
		// buffer through the pool, but its real effect is the pushBuffer /
		// popBuffer pair inside WebGLRenderBuffer.resize(). That queues an
		// activateBuffer command which, when flush() runs it, calls
		// _activateBuffer() → onResize(), resetting the GL projection/viewport
		// to the root canvas size. Without this, an in-frame offscreen buffer
		// activation (filter / mask / cacheAsBitmap) leaves the projection set
		// to the offscreen size, and the next frame's output is vertically
		// offset. DO NOT delete as dead code — it is not dead.
		if (this._nestLevel === 0) {
			WebGLRenderBuffer.release(WebGLRenderBuffer.create(buffer.context, 0, 0));
		}
		return drawCalls;
	}

	// ── Phase A: build ────────────────────────────────────────────────────────

	/**
	 * Recursively build render instructions for the display subtree rooted at
	 * `displayObject`, appending leaf/effect/group instructions into `set`.
	 *
	 * A `cacheAsBitmap` object is treated as a single opaque leaf: a synthetic
	 * `BitmapInstruction` backed by its DisplayList cache is emitted via
	 * `addLeaf` (not `add`), so an ancestor's later transform/alpha/tint
	 * change can still refresh this instruction's snapshot through the same
	 * `renderableIndex` path as ordinary leaves; the cache itself is refreshed
	 * lazily during the execute phase if dirty.
	 *
	 * A child with `isRenderGroup` is built into its own `InstructionSet` and
	 * emitted as a single `renderGroup` instruction in the parent set, rather
	 * than being inlined here.
	 */
	private _buildInstructions(
		displayObject: DisplayObject,
		set: InstructionSet,
		buffer: WebGLRenderBuffer,
		offsetX: number,
		offsetY: number,
		options?: InstructionBuildOptions,
	): void {
		const $displayList = displayObject.$displayList;
		if ($displayList && !options?.isStage) {
			const inst = this._makeCacheInstruction(displayObject, offsetX, offsetY, buffer);
			if (inst) set.addLeaf(inst);
			return;
		}
		const childOptions = options?.isStage
			? options.inlineRenderGroups
				? MASK_BUILD_OPTIONS
				: undefined
			: options;

		// Emit self instruction (Bitmap / Shape / Sprite / Mesh).
		this._buildLeaf(displayObject, set, buffer, offsetX, offsetY);

		const $children = displayObject.$children;
		if (!$children || $children.length === 0) return;

		for (const child of $children) {
			if (child.$renderMode === RenderMode.NONE) continue;

			// Compute child transform.
			let ox: number, oy: number;
			let savedMatrix: Matrix | undefined;

			if (child.$useTranslate) {
				const m = child.$getMatrix();
				ox = offsetX + child.$x;
				oy = offsetY + child.$y;
				savedMatrix = Matrix.create();
				savedMatrix.copyFrom(buffer.globalMatrix);
				buffer.transform(m.a, m.b, m.c, m.d, ox, oy);
				ox = -child.$anchorOffsetX;
				oy = -child.$anchorOffsetY;
			} else {
				ox = offsetX + child.$x - child.$anchorOffsetX;
				oy = offsetY + child.$y - child.$anchorOffsetY;
			}

			const prevAlpha = buffer.globalAlpha;
			if (child.$alpha !== 1) buffer.globalAlpha *= child.$alpha;

			const prevTint = buffer.globalTintColor;
			if (child.$tintRGB !== 0xffffff) buffer.globalTintColor = child.$tintRGB;

			// Emit effect wrappers then recurse.
			if (!childOptions?.inlineRenderGroups && child instanceof DisplayObjectContainer && child.isRenderGroup) {
				this._buildRenderGroup(child, set, buffer, ox, oy);
			} else {
				switch (child.$renderMode) {
					case RenderMode.FILTER:
						this._buildFilter(child, set, buffer, ox, oy, childOptions);
						break;
					case RenderMode.CLIP:
						this._buildClip(child, set, buffer, ox, oy, childOptions);
						break;
					case RenderMode.SCROLLRECT:
						this._buildScrollRect(child, set, buffer, ox, oy, childOptions);
						break;
					default:
						this._buildInstructions(child, set, buffer, ox, oy, childOptions);
				}
			}
			buffer.globalAlpha = prevAlpha;
			buffer.globalTintColor = prevTint;

			if (savedMatrix) {
				buffer.globalMatrix.copyFrom(savedMatrix);
				Matrix.release(savedMatrix);
			}
		}
	}

	/**
	 * Emit a leaf instruction (bitmap/mesh/shape/text/particle) for a single
	 * DisplayObject, based on its `$renderObjectType`. No-op for object types
	 * that don't map to a render pipe (e.g. plain containers).
	 */
	private _buildLeaf(
		obj: DisplayObject,
		set: InstructionSet,
		buffer: WebGLRenderBuffer,
		offsetX: number,
		offsetY: number,
	): void {
		const instruction = this._createLeafInstruction(obj, offsetX, offsetY);
		if (!instruction) return;
		const transform = this._snapshotTransform(buffer, offsetX, offsetY);
		set.addLeaf(Object.assign(instruction, { transform }) as LeafInstruction);
	}

	/**
	 * Map one renderable DisplayObject to its pipe-specific leaf instruction.
	 * Returns undefined for plain containers and empty Sprite graphics.
	 */
	private _createLeafInstruction(
		obj: DisplayObject,
		offsetX: number,
		offsetY: number,
	): BaseLeafInstruction | undefined {
		switch (obj.$renderObjectType) {
			case RenderObjectType.MESH:
				return {
					renderPipeId: 'mesh',
					renderable: obj as Mesh,
					offsetX,
					offsetY,
				};
			case RenderObjectType.BITMAP:
				return {
					renderPipeId: 'bitmap',
					renderable: obj as Bitmap,
					offsetX,
					offsetY,
				};
			case RenderObjectType.SHAPE:
				return {
					renderPipeId: 'graphics',
					renderable: obj,
					graphics: (obj as Shape).graphics,
					offsetX,
					offsetY,
				};
			case RenderObjectType.TEXT:
				return {
					renderPipeId: 'text',
					renderable: obj as TextField,
					offsetX,
					offsetY,
				};
			case RenderObjectType.SPRITE: {
				const sprite = obj as Sprite;
				if (sprite.graphics.commands.length === 0) return undefined;
				return {
					renderPipeId: 'graphics',
					renderable: obj,
					graphics: sprite.graphics,
					offsetX,
					offsetY,
				};
			}
			case RenderObjectType.PARTICLE:
				return {
					renderPipeId: 'particle',
					renderable: obj,
					offsetX,
					offsetY,
				};
			default:
				return undefined;
		}
	}

	/**
	 * Wrap `obj`'s subtree with filter push/pop instructions. Skips the
	 * wrapper entirely (falls through to a plain build) if `obj` has no
	 * filters, since an empty push/pop pair would still incur an offscreen
	 * buffer allocation for nothing.
	 */
	private _buildFilter(
		obj: DisplayObject,
		set: InstructionSet,
		buffer: WebGLRenderBuffer,
		offsetX: number,
		offsetY: number,
		options?: InstructionBuildOptions,
	): void {
		const filters = obj.$filters;
		if (!filters.length) {
			this._buildInstructions(obj, set, buffer, offsetX, offsetY, options);
			return;
		}
		const transform = this._snapshotTransform(buffer, offsetX, offsetY);
		const push = Object.assign(FilterPipe.makePush(obj, filters, offsetX, offsetY), {
			transform,
		}) as EffectPushInstruction;
		set.addIndexed(push);
		this._buildInstructions(obj, set, buffer, offsetX, offsetY, options);
		set.add(FilterPipe.makePop(obj, push as FilterPushInstruction));
	}

	/**
	 * Wrap `obj`'s subtree with mask push/pop instructions (`obj.$mask`).
	 */
	private _buildClip(
		obj: DisplayObject,
		set: InstructionSet,
		buffer: WebGLRenderBuffer,
		offsetX: number,
		offsetY: number,
		options?: InstructionBuildOptions,
	): void {
		const transform = this._snapshotTransform(buffer, offsetX, offsetY);
		const push = Object.assign(MaskPipe.makePush(obj, offsetX, offsetY), { transform }) as EffectPushInstruction;
		set.addIndexed(push);
		this._buildInstructions(obj, set, buffer, offsetX, offsetY, options);
		set.add(MaskPipe.makePop(obj, push as MaskPushInstruction));
	}

	/**
	 * Wrap `obj`'s subtree with a mask push/pop pair driven by its
	 * `$scrollRect`/`$maskRect`, using the mask pipe's scrollRect path
	 * (`isScrollRect`) rather than a full clip mask.
	 */
	private _buildScrollRect(
		obj: DisplayObject,
		set: InstructionSet,
		buffer: WebGLRenderBuffer,
		offsetX: number,
		offsetY: number,
		options?: InstructionBuildOptions,
	): void {
		const rect = obj.$scrollRect ?? obj.$maskRect;
		if (!rect || rect.isEmpty()) return;

		let ox = offsetX,
			oy = offsetY;
		if (obj.$scrollRect) {
			ox -= rect.x;
			oy -= rect.y;
		}

		const transform = this._snapshotTransform(buffer, offsetX, offsetY);
		const push = Object.assign(MaskPipe.makePush(obj, offsetX, offsetY), { transform }) as EffectPushInstruction;
		// Tag as scrollRect so execute knows which path to take.
		(push as MaskPushInstruction).isScrollRect = true;
		set.addIndexed(push);
		this._buildInstructions(obj, set, buffer, ox, oy, options);
		set.add(MaskPipe.makePop(obj, push as MaskPushInstruction));
	}

	/**
	 * Build a RenderGroup subtree into its own InstructionSet and emit a
	 * single `renderGroup` instruction into the parent set.
	 *
	 * The child set is rebuilt only when its own `structureDirty` flag is set,
	 * so changes inside the group never force a rebuild of the parent set.
	 */
	private _buildRenderGroup(
		obj: DisplayObjectContainer,
		parentSet: InstructionSet,
		buffer: WebGLRenderBuffer,
		offsetX: number,
		offsetY: number,
	): void {
		let groupSet = this._renderGroupSets.get(obj);
		if (!groupSet) {
			groupSet = new InstructionSet();
			this._renderGroupSets.set(obj, groupSet);
			this._renderGroupSetList.push(new WeakRef(obj));
		}

		if (groupSet.structureDirty) {
			this._releaseInstructions(groupSet);
			groupSet.reset();
			this._buildInstructions(obj, groupSet, buffer, offsetX, offsetY);
			groupSet.structureDirty = false;
		} else {
			this._updateDirtyRenderables(groupSet);
		}

		const transform = this._snapshotTransform(buffer, offsetX, offsetY);
		parentSet.addIndexed({
			renderPipeId: 'renderGroup',
			renderable: obj,
			set: groupSet,
			offsetX,
			offsetY,
			transform,
		} as RenderGroupInstruction);
	}

	/**
	 * Build a `displayListCache` instruction for a `cacheAsBitmap` object.
	 * Returns `undefined` if the object has no `$displayList` cache.
	 */
	private _makeCacheInstruction(
		obj: DisplayObject,
		offsetX: number,
		offsetY: number,
		buffer: WebGLRenderBuffer,
	): DisplayListCacheInstruction | undefined {
		const $displayList = obj.$displayList;
		if (!$displayList) return undefined;
		const transform = this._snapshotTransform(buffer, offsetX, offsetY);
		return {
			renderPipeId: 'displayListCache',
			renderable: obj,
			offsetX,
			offsetY,
			transform,
		};
	}

	// ── Phase A helpers ───────────────────────────────────────────────────────

	private _snapshotTransform(buffer: WebGLRenderBuffer, offsetX: number, offsetY: number): TransformState {
		const m = buffer.globalMatrix;
		return {
			a: m.a,
			b: m.b,
			c: m.c,
			d: m.d,
			tx: m.tx,
			ty: m.ty,
			offsetX,
			offsetY,
			alpha: buffer.globalAlpha,
			tint: buffer.globalTintColor,
		};
	}

	// ── Partial update ────────────────────────────────────────────────────────

	/**
	 * Patch cached transform/alpha/tint snapshots for objects marked dirty
	 * since the last build, without forcing a full instruction rebuild.
	 *
	 * `set.renderableIndex.get(obj)` misses (returns `undefined`) in two
	 * distinct cases, both handled by recursing/flagging rather than
	 * refreshing directly:
	 * 1. `obj` is a plain container (or any non-leaf) whose own
	 *    transform/alpha/tint changed. Containers never get a leaf
	 *    instruction (see `_buildLeaf`'s switch — containers don't match any
	 *    `RenderObjectType` case), so without recursing into descendants here,
	 *    their cached snapshots would never be refreshed: Canvas re-walks the
	 *    tree every frame and picks up new state for free, but WebGL's
	 *    snapshot-based leaves would keep drawing at the old position
	 *    indefinitely.
	 * 2. `obj` is a leaf-type object that was skipped during
	 *    `_buildInstructions` because its graphics commands were empty at
	 *    build time (e.g. a UI component whose Validator fills commands one
	 *    frame later). If it now has graphics content, flag the set for a
	 *    full rebuild so it gets an instruction.
	 *
	 * When a hit is found, the snapshot is rebuilt from the object's current
	 * world transform rather than `buffer.globalMatrix`, since that reflects
	 * the main buffer's current state, not this object's.
	 */
	private _updateDirtyRenderables(set: InstructionSet): void {
		for (let i = 0; i < set.dirtyRenderableCount; i++) {
			const obj = set.dirtyRenderables[i];
			const indices = set.renderableIndex.get(obj);
			if (indices === undefined) {
				if (obj.$children && obj.$children.length > 0) {
					this._refreshDescendantTransforms(obj, set);
				} else if (this._hasGraphicsContent(obj)) {
					set.structureDirty = true;
				}
				continue;
			}
			let isRenderGroupBoundary = false;
			const count = typeof indices === 'number' ? 1 : indices.length;
			for (let index = 0; index < count; index++) {
				const idx = typeof indices === 'number' ? indices : indices[index];
				const inst = set.instructions[idx] as LeafInstruction | EffectPushInstruction | RenderGroupInstruction;
				if (!inst) continue;
				this._refreshInstructionTransform(obj, inst);
				if (inst.renderPipeId === 'renderGroup') isRenderGroupBoundary = true;
			}
			// A Sprite can render its own Graphics and also contain children. Its
			// own indexed leaf must not prevent descendant snapshots from updating.
			// A renderGroup instruction is the boundary in the parent set; its
			// descendants belong to the group's independent set instead.
			if (!isRenderGroupBoundary && obj.$children && obj.$children.length > 0) {
				this._refreshDescendantTransforms(obj, set);
			}
		}
		set.clearDirtyRenderables();
	}

	/**
	 * Process dirty or structurally changed nested RenderGroup sets even when
	 * the root InstructionSet remains stable.
	 */
	private _prepareRenderGroups(set: InstructionSet, buffer: WebGLRenderBuffer): void {
		for (let i = 0; i < set.instructionSize; i++) {
			const inst = set.instructions[i];
			if (inst.renderPipeId !== 'renderGroup') continue;
			const group = inst as RenderGroupInstruction;
			const groupSet = group.set;
			if (groupSet.structureDirty) {
				const savedMatrix = Matrix.create();
				savedMatrix.copyFrom(buffer.globalMatrix);
				const savedAlpha = buffer.globalAlpha;
				const savedTint = buffer.globalTintColor;
				try {
					this._applyTransform(buffer, group.transform);
					this._releaseInstructions(groupSet);
					groupSet.reset();
					this._buildInstructions(group.renderable, groupSet, buffer, 0, 0);
					groupSet.structureDirty = false;
				} finally {
					buffer.globalMatrix.copyFrom(savedMatrix);
					buffer.globalAlpha = savedAlpha;
					buffer.globalTintColor = savedTint;
					Matrix.release(savedMatrix);
				}
			} else {
				this._updateDirtyRenderables(groupSet);
			}
			this._prepareRenderGroups(groupSet, buffer);
		}
	}

	/**
	 * Recursively refresh the transform snapshot of every descendant leaf
	 * instruction under `obj`. Used when an ancestor container's own
	 * transform/alpha/tint changed — the container itself has no instruction,
	 * but its descendants' cached snapshots are now stale and must be patched
	 * without forcing a full structural rebuild.
	 *
	 * Stops descending into a subtree once it hits a nested RenderGroup —
	 * that subtree owns its own InstructionSet and is refreshed independently
	 * (see markRenderableDirty's RenderGroup routing), so walking into it here
	 * would refresh against the wrong InstructionSet.
	 */
	private _refreshDescendantTransforms(obj: DisplayObject, set: InstructionSet): void {
		const children = obj.$children;
		if (!children) return;
		for (const child of children) {
			child.$worldAlpha = obj.$worldAlpha * child.$alpha;
			child.$worldTint = child.$tintRGB !== 0xffffff ? child.$tintRGB : obj.$worldTint;
			const indices = set.renderableIndex.get(child);
			if (indices !== undefined) {
				const count = typeof indices === 'number' ? 1 : indices.length;
				for (let index = 0; index < count; index++) {
					const idx = typeof indices === 'number' ? indices : indices[index];
					const inst = set.instructions[idx] as LeafInstruction | EffectPushInstruction | RenderGroupInstruction;
					if (inst) this._refreshInstructionTransform(child, inst);
				}
			}
			if (child instanceof DisplayObjectContainer && child.isRenderGroup) {
				const groupSet = this._renderGroupSets.get(child);
				if (groupSet && !groupSet.structureDirty) groupSet.markRenderableDirty(child);
				continue;
			}
			if (child.$children && child.$children.length > 0) {
				this._refreshDescendantTransforms(child, set);
			}
		}
	}

	/**
	 * Recompute the transform snapshot for a leaf instruction from the object's
	 * current concatenated matrix and cached world alpha/tint.
	 */
	private _refreshInstructionTransform(
		obj: DisplayObject,
		inst: LeafInstruction | EffectPushInstruction | RenderGroupInstruction,
	): void {
		const cm = obj.$getConcatenatedMatrix();
		const t = inst.transform;
		t.a = cm.a;
		t.b = cm.b;
		t.c = cm.c;
		t.d = cm.d;
		t.tx = cm.tx;
		t.ty = cm.ty;
		t.offsetX = 0;
		t.offsetY = 0;
		t.alpha = obj.$worldAlpha;
		t.tint = obj.$worldTint;
	}

	/**
	 * Check if a display object now has graphics content that warrants an instruction.
	 */
	private _hasGraphicsContent(obj: DisplayObject): boolean {
		const graphics = obj.graphics;
		return graphics != null && graphics.commands.length > 0;
	}

	// ── Phase B: execute ──────────────────────────────────────────────────────

	/**
	 * Walk `set` and dispatch each instruction to its render pipe. No
	 * scene-graph traversal happens here — `renderGroup` instructions recurse
	 * into their own nested `InstructionSet` via this same method.
	 */
	private _executeInstructions(set: InstructionSet, buffer: WebGLRenderBuffer): void {
		// Stack for offscreen buffers opened by filter/mask push instructions.
		const offscreenStack: (WebGLRenderBuffer | undefined)[] = [];
		const scissorStack: boolean[] = [];
		// Track the currently active buffer — leaf instructions draw into this.
		let activeBuffer = buffer;

		for (let i = 0; i < set.instructionSize; i++) {
			const inst = set.instructions[i] as AnyInstruction;

			switch (inst.renderPipeId) {
				// ── Leaf nodes ────────────────────────────────────────────────
				case 'bitmap':
				case 'mesh':
				case 'graphics':
				case 'text':
				case 'particle': {
					const leaf = inst as LeafInstruction;
					this._applyTransform(activeBuffer, leaf.transform);
					this._executeLeafInstruction(leaf, activeBuffer);
					break;
				}

				// ── DisplayList cache ─────────────────────────────────────────
				case 'displayListCache': {
					const cacheInst = inst as DisplayListCacheInstruction;
					this._applyTransform(activeBuffer, cacheInst.transform);
					this._executeDisplayListCache(
						cacheInst.renderable,
						activeBuffer,
						cacheInst.offsetX,
						cacheInst.offsetY,
					);
					break;
				}

				// ── RenderGroup ───────────────────────────────────────────────
				case 'renderGroup': {
					const rgInst = inst as RenderGroupInstruction;
					this._applyTransform(activeBuffer, rgInst.transform);
					this._executeInstructions(rgInst.set, activeBuffer);
					break;
				}

				// ── Filter push/pop ───────────────────────────────────────────
				case 'filterPush': {
					const push = inst as FilterPushInstruction;
					const pushT = (push as EffectPushInstruction).transform;
					this._applyTransform(activeBuffer, pushT);

					const offscreen = this._filterPipe.executePush(push, activeBuffer);
					offscreenStack.push(offscreen);
					if (offscreen) {
						this._configureOffscreenTransform(offscreen, push.renderable.$getOriginalBounds(), pushT);
						activeBuffer = offscreen;
					}
					break;
				}
				case 'filterPop': {
					const pop = inst as FilterPopInstruction;
					const offscreen = offscreenStack.pop();

					if (offscreen)
						activeBuffer =
							offscreenStack.length > 0 ? (offscreenStack[offscreenStack.length - 1] ?? buffer) : buffer;
					this._applyTransform(activeBuffer, (pop.push as EffectPushInstruction).transform);
					this._filterPipe.executePop(pop, activeBuffer, offscreen);
					break;
				}

				// ── Mask / clip push/pop ──────────────────────────────────────
				case 'maskPush': {
					const push = inst as MaskPushInstruction;
					const pushT = (push as EffectPushInstruction).transform;
					this._applyTransform(activeBuffer, pushT);
					if (push.isScrollRect) {
						const usedScissor = this._maskPipe.executeScrollRectPush(push, activeBuffer);
						scissorStack.push(usedScissor);
						offscreenStack.push(undefined);
					} else {
						const displayBuffer = this._maskPipe.executeClipPush(push, activeBuffer);
						offscreenStack.push(displayBuffer);
						if (displayBuffer) {
							this._configureOffscreenTransform(displayBuffer, push.renderable.$getOriginalBounds(), pushT);
							activeBuffer = displayBuffer;
						}
					}
					break;
				}
				case 'maskPop': {
					const pop = inst as MaskPopInstruction;
					if (pop.push.isScrollRect) {
						const usedScissor = scissorStack.pop() ?? false;
						offscreenStack.pop();
						this._maskPipe.executeScrollRectPop(activeBuffer, usedScissor);
					} else {
						const displayBuffer = offscreenStack.pop();
						// Restore the parent buffer before compositing.
						if (displayBuffer)
							activeBuffer =
								offscreenStack.length > 0
									? (offscreenStack[offscreenStack.length - 1] ?? buffer)
									: buffer;
						this._applyTransform(activeBuffer, (pop.push as EffectPushInstruction).transform);
						this._maskPipe.executeClipPop(pop, activeBuffer, displayBuffer);
					}
					break;
				}
			}
		}
	}

	/**
	 * Execute one leaf instruction through its owning render pipe.
	 */
	private _executeLeafInstruction(instruction: BaseLeafInstruction, buffer: WebGLRenderBuffer): void {
		switch (instruction.renderPipeId) {
			case 'bitmap':
				this._bitmapPipe.execute(instruction, buffer);
				break;
			case 'mesh':
				this._meshPipe.execute(instruction, buffer);
				break;
			case 'graphics':
				this._graphicsPipe.execute(instruction, buffer);
				break;
			case 'text':
				this._textPipe.execute(instruction, buffer);
				break;
			case 'particle':
				this._particlePipe.execute(instruction, buffer);
				break;
		}
	}

	/**
	 * Restore `buffer`'s global matrix/alpha/tint from a snapshot, adjusting
	 * for the buffer's offscreen origin if it's a filter/mask offscreen target.
	 */
	private _applyTransform(buffer: WebGLRenderBuffer, t: TransformState): void {
		const m = buffer.globalMatrix;
		const tx = t.tx + t.a * t.offsetX + t.c * t.offsetY;
		const ty = t.ty + t.b * t.offsetX + t.d * t.offsetY;
		if (buffer.hasOffscreenTransform) {
			const inverse = buffer.offscreenInverseTransform;
			m.a = inverse.a * t.a + inverse.c * t.b;
			m.b = inverse.b * t.a + inverse.d * t.b;
			m.c = inverse.a * t.c + inverse.c * t.d;
			m.d = inverse.b * t.c + inverse.d * t.d;
			m.tx = inverse.a * tx + inverse.c * ty + inverse.tx + buffer.offscreenLocalX;
			m.ty = inverse.b * tx + inverse.d * ty + inverse.ty + buffer.offscreenLocalY;
			buffer.globalAlpha = t.alpha;
			buffer.globalTintColor = t.tint;
			return;
		}
		m.a = t.a;
		m.b = t.b;
		m.c = t.c;
		m.d = t.d;
		m.tx = tx - buffer.offscreenOriginX;
		m.ty = ty - buffer.offscreenOriginY;
		buffer.globalAlpha = t.alpha;
		buffer.globalTintColor = t.tint;
	}

	/**
	 * Configure conversion from world-space instruction snapshots into the
	 * effect owner's local offscreen coordinate system. Filter padding shifts
	 * the content bounds origin from (0,0) to (padX,padY).
	 */
	private _configureOffscreenTransform(buf: WebGLRenderBuffer, bounds: Rectangle, t: TransformState): void {
		const padX = buf.filterPadX;
		const padY = buf.filterPadY;
		const det = t.a * t.d - t.b * t.c;
		if (Math.abs(det) <= 1e-12) {
			const tx = t.tx + t.a * t.offsetX + t.c * t.offsetY;
			const ty = t.ty + t.b * t.offsetX + t.d * t.offsetY;
			const worldBX = t.a * bounds.x + t.c * bounds.y + tx;
			const worldBY = t.b * bounds.x + t.d * bounds.y + ty;
			buf.offscreenOriginX = worldBX - padX;
			buf.offscreenOriginY = worldBY - padY;
			buf.hasOffscreenTransform = false;
			return;
		}
		const inverse = buf.offscreenInverseTransform;
		inverse.a = t.d / det;
		inverse.b = -t.b / det;
		inverse.c = -t.c / det;
		inverse.d = t.a / det;
		const tx = t.tx + t.a * t.offsetX + t.c * t.offsetY;
		const ty = t.ty + t.b * t.offsetX + t.d * t.offsetY;
		inverse.tx = (t.c * ty - t.d * tx) / det;
		inverse.ty = (t.b * tx - t.a * ty) / det;
		buf.offscreenLocalX = padX - bounds.x;
		buf.offscreenLocalY = padY - bounds.y;
		buf.hasOffscreenTransform = true;
	}

	/**
	 * Execute a `displayListCache` instruction: refresh the cached bitmap if
	 * dirty (re-rendering `obj`'s subtree via the canvas renderer into an
	 * offscreen surface), then draw that cached bitmap into `buffer`.
	 */
	private _executeDisplayListCache(
		obj: DisplayObject,
		buffer: WebGLRenderBuffer,
		offsetX: number,
		offsetY: number,
	): void {
		const $displayList = obj.$displayList;
		if (!$displayList) return;

		if (obj.$cacheDirty || obj.$renderDirty) {
			if ($displayList.updateSurfaceSize(buffer.context.maxTextureSize)) {
				$displayList.renderBuffer.clear();
				const resolution = $displayList.actualResolution;
				$displayList.renderBuffer.context.setTransform(resolution, 0, 0, resolution, 0, 0);
				this._canvasRenderer.renderToContext(
					obj,
					$displayList.renderBuffer.context,
					$displayList.offsetX,
					$displayList.offsetY,
				);
				$displayList.updateBitmapData();
				// The DisplayList keeps the same BitmapData and canvas identity
				// between cache refreshes. getWebGLTexture() therefore reuses the
				// existing GPU texture, but an offscreen canvas does not upload its
				// changed pixels automatically. Refresh it explicitly so resized or
				// re-rendered cache content is sampled at its current dimensions.
				const bitmapData = $displayList.bitmapData;
				if (bitmapData?.webGLTexture && bitmapData.source) {
					buffer.context.updateTexture(bitmapData.webGLTexture, bitmapData.source as HTMLCanvasElement);
				}
			}
			obj.$cacheDirty = false;
			obj.$renderDirty = false;
			// Structure may have changed inside the cached subtree — mark dirty
			// so next frame rebuilds if the cache is invalidated.
		}

		if (!$displayList.bitmapData?.source) return;

		const bd = $displayList.bitmapData;
		const w = $displayList.renderBuffer.width;
		const h = $displayList.renderBuffer.height;
		const resolution = $displayList.actualResolution;
		// offsetX/Y already in globalMatrix via _applyTransform.
		if (offsetX !== 0 || offsetY !== 0) {
			buffer.globalMatrix.append(1, 0, 0, 1, offsetX, offsetY);
		}
		buffer.context.drawImage(
			bd,
			0,
			0,
			w,
			h,
			-$displayList.offsetX,
			-$displayList.offsetY,
			w / resolution,
			h / resolution,
			w,
			h,
			false,
			$displayList.scaleMode === 'linear',
		);
		if (offsetX !== 0 || offsetY !== 0) {
			buffer.globalMatrix.append(1, 0, 0, 1, -offsetX, -offsetY);
		}
	}

	/**
	 * Build and execute a mask object through the regular instruction pipeline.
	 * Scratch sets are separated by nesting depth because a mask subtree may
	 * contain another mask and re-enter this method during execution.
	 */
	private _renderMaskObject(
		obj: DisplayObject,
		buffer: WebGLRenderBuffer,
		offsetX: number,
		offsetY: number,
	): void {
		const depth = this._maskInstructionDepth++;
		let set = this._maskInstructionSets[depth];
		if (!set) {
			set = new InstructionSet();
			this._maskInstructionSets[depth] = set;
		}

		try {
			set.reset();
			buffer.globalAlpha = 1;
			buffer.globalTintColor = 0xffffff;
			// RenderGroups are intentionally inlined into this scratch set. Their
			// persistent sets contain transforms from the main scene coordinate space.
			this._buildInstructions(obj, set, buffer, offsetX, offsetY, MASK_BUILD_OPTIONS);
			this._executeInstructions(set, buffer);
		} finally {
			this._releaseInstructions(set);
			set.reset();
			this._maskInstructionDepth--;
		}
	}

	// ── Structure dirty notification ──────────────────────────────────────────

	/**
	 * Call this when the scene graph structure changes (child added/removed,
	 * visibility toggled, filter added, etc.) to trigger a full rebuild next frame.
	 *
	 * If `owner` is provided and is a RenderGroup, only that group's set is
	 * marked dirty — the parent set is left untouched.
	 */
	public markStructureDirty(owner?: DisplayObjectContainer): void {
		if (owner?.isRenderGroup) {
			const groupSet = this._renderGroupSets.get(owner);
			if (groupSet) {
				groupSet.structureDirty = true;
				return;
			}
		}
		this._instructionSet.structureDirty = true;

		// When no specific owner is given (e.g. context restored), mark ALL
		// RenderGroup sets dirty so they also rebuild with fresh texture refs.
		if (!owner) {
			for (let i = this._renderGroupSetList.length - 1; i >= 0; i--) {
				const container = this._renderGroupSetList[i].deref();
				if (!container) {
					// GC'd — remove dead entry.
					this._renderGroupSetList.splice(i, 1);
					continue;
				}
				const groupSet = this._renderGroupSets.get(container);
				if (groupSet) groupSet.structureDirty = true;
			}
		}
	}

	/**
	 * @internal Called by Player when a DisplayObject's data changes but the
	 * scene structure is stable. Queues the object for a transform-snapshot
	 * update instead of a full rebuild.
	 *
	 * Routes to the RenderGroup's set if the object lives inside one.
	 */
	public markRenderableDirty(obj: DisplayObject): void {
		if (obj instanceof DisplayObjectContainer && obj.isRenderGroup) {
			const groupSet = this._renderGroupSets.get(obj);
			if (groupSet && !groupSet.structureDirty) groupSet.markRenderableDirty(obj);
			this._findOwningSet(obj.$parent).markRenderableDirty(obj);
			return;
		}

		// Walk up to find the nearest RenderGroup ancestor (if any).
		let p = obj.$parent;
		while (p) {
			if (p instanceof DisplayObjectContainer && p.isRenderGroup) {
				const groupSet = this._renderGroupSets.get(p);
				if (groupSet) {
					if (!groupSet.structureDirty) groupSet.markRenderableDirty(obj);
					return;
				}
			}
			p = p.$parent;
		}
		// No RenderGroup ancestor — route to the root set.
		if (!this._instructionSet.structureDirty) this._instructionSet.markRenderableDirty(obj);
	}

	private _findOwningSet(parent: DisplayObjectContainer | undefined): InstructionSet {
		let current = parent;
		while (current) {
			if (current.isRenderGroup) {
				const groupSet = this._renderGroupSets.get(current);
				if (groupSet) return groupSet;
			}
			current = current.$parent;
		}
		return this._instructionSet;
	}
}
