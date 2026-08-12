import { Event } from '../events/Event.js';
import { Rectangle, sharedRectangle } from '../geom/Rectangle.js';
import { DisplayObject } from './DisplayObject.js';
import type { Stage } from './Stage.js';

export class DisplayObjectContainer extends DisplayObject {
	// ── Declare fields ─────────────────────────────────────────────────────────

	declare $children: DisplayObject[];

	// ── Instance fields ───────────────────────────────────────────────────────

	private _touchChildren = true;
	/**
	 * When true this container owns an independent InstructionSet.
	 * The renderer will build and execute its subtree separately, so changes
	 * inside this container never trigger a rebuild of the parent set.
	 *
	 * Typical use: mark a static background layer or a rarely-changing UI panel
	 * as a RenderGroup so the parent scene graph traversal skips it entirely.
	 */
	public isRenderGroup = false;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor() {
		super();
		this.$children = [];
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	public get numChildren(): number {
		return this.$children.length;
	}

	public get touchChildren(): boolean {
		return this._touchChildren;
	}
	public set touchChildren(value: boolean) {
		this._touchChildren = !!value;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	public addChild(child: DisplayObject): DisplayObject {
		let index = this.$children.length;
		if (child.$parent === this) index--;
		return this.doAddChild(child, index);
	}

	public addChildAt(child: DisplayObject, index: number): DisplayObject {
		index = +index | 0;
		const len = this.$children.length;
		if (index < 0 || index >= len) {
			index = len;
			if (child.$parent === this) index--;
		}
		return this.doAddChild(child, index);
	}

	public contains(child: DisplayObject): boolean {
		let current: DisplayObject | undefined = child;
		while (current) {
			if (current === this) {
				return true;
			}
			current = current.$parent;
		}
		return false;
	}

	public getChildAt(index: number): DisplayObject | undefined {
		index = +index | 0;
		return this.$children[index];
	}

	public getChildIndex(child: DisplayObject): number {
		return this.$children.indexOf(child);
	}

	public getChildByName(name: string): DisplayObject | undefined {
		return this.$children.find(c => c.name === name);
	}

	public removeChild(child: DisplayObject): DisplayObject | undefined {
		const index = this.$children.indexOf(child);
		if (index >= 0) return this.doRemoveChild(index);
		return undefined;
	}

	public removeChildAt(index: number): DisplayObject | undefined {
		index = +index | 0;
		if (index >= 0 && index < this.$children.length) {
			return this.doRemoveChild(index);
		}
		return undefined;
	}

	public removeChildren(): void {
		for (let i = this.$children.length - 1; i >= 0; i--) {
			this.doRemoveChild(i);
		}
	}

	public setChildIndex(child: DisplayObject, index: number): void {
		index = +index | 0;
		const len = this.$children.length;
		if (index < 0 || index >= len) {
			index = len - 1;
		}
		this.doSetChildIndex(child, index);
	}

	public swapChildren(child1: DisplayObject, child2: DisplayObject): void {
		const i1 = this.$children.indexOf(child1);
		const i2 = this.$children.indexOf(child2);
		if (i1 !== -1 && i2 !== -1) {
			this.doSwapChildrenAt(i1, i2);
		}
	}

	public swapChildrenAt(index1: number, index2: number): void {
		index1 = +index1 | 0;
		index2 = +index2 | 0;
		const len = this.$children.length;
		if (index1 >= 0 && index1 < len && index2 >= 0 && index2 < len) {
			this.doSwapChildrenAt(index1, index2);
		}
	}

	public override sortChildren(): void {
		super.sortChildren();
		this.$sortDirty = false;
		const $children = this.$children;
		let sortRequired = false;
		for (let i = 0; i < $children.length; i++) {
			$children[i].$lastSortedIndex = i;
			if (!sortRequired && $children[i].zIndex !== 0) {
				sortRequired = true;
			}
		}
		if (sortRequired && $children.length > 1) {
			$children.sort(this.sortChildrenFunc);
			// Child order changed — instruction set must be rebuilt.
			DisplayObjectContainer.$onContainerStructureChange?.(this);
		}
	}

	// ── Internal methods ──────────────────────────────────────────────────────

	override $onAddToStage(stage: Stage, $nestLevel: number): void {
		super.$onAddToStage(stage, $nestLevel);
		for (const child of this.$children) {
			child.$onAddToStage(stage, $nestLevel + 1);
			if (child.$maskedObject) {
				child.$maskedObject.$updateRenderMode();
			}
		}
	}

	override $onRemoveFromStage(): void {
		super.$onRemoveFromStage();
		for (const child of this.$children) {
			child.$onRemoveFromStage();
		}
	}

	override $measureChildBounds(bounds: Rectangle): void {
		const $children = this.$children;
		if ($children.length === 0) return;
		let xMin = 0,
			xMax = 0,
			yMin = 0,
			yMax = 0;
		let found = false;
		for (let i = -1; i < $children.length; i++) {
			let childBounds: Rectangle;
			if (i === -1) {
				childBounds = bounds;
			} else {
				$children[i].getBounds(sharedRectangle);
				$children[i].$getMatrix().transformBounds(sharedRectangle);
				childBounds = sharedRectangle;
			}
			if (childBounds.isEmpty()) {
				continue;
			}
			if (found) {
				xMin = Math.min(xMin, childBounds.x);
				xMax = Math.max(xMax, childBounds.x + childBounds.width);
				yMin = Math.min(yMin, childBounds.y);
				yMax = Math.max(yMax, childBounds.y + childBounds.height);
			} else {
				found = true;
				xMin = childBounds.x;
				xMax = xMin + childBounds.width;
				yMin = childBounds.y;
				yMax = yMin + childBounds.height;
			}
		}
		bounds.setTo(xMin, yMin, xMax - xMin, yMax - yMin);
	}

	override $hitTest(stageX: number, stageY: number): DisplayObject | undefined {
		if (!this.$visible) {
			return undefined;
		}
		const m = this.$getInvertedConcatenatedMatrix();
		const localX = m.a * stageX + m.c * stageY + m.tx;
		const localY = m.b * stageX + m.d * stageY + m.ty;
		const rect = this.$scrollRect ?? this.$maskRect;
		if (rect && !rect.contains(localX, localY)) {
			return undefined;
		}
		if (this.$mask && !this.$mask.$hitTest(stageX, stageY)) {
			return undefined;
		}

		const $children = this.$children;
		let found = false;
		let target: DisplayObject | undefined;
		for (let i = $children.length - 1; i >= 0; i--) {
			const child = $children[i];
			if (child.$maskedObject) continue;
			target = child.$hitTest(stageX, stageY);
			if (target) {
				found = true;
				if (target.$touchEnabled) break;
				target = undefined;
			}
		}
		if (target) {
			return this._touchChildren ? target : this;
		}
		if (found) {
			return this;
		}
		return super.$hitTest(stageX, stageY);
	}

	childAdded(_child: DisplayObject, _index: number): void {}
	childRemoved(_child: DisplayObject, _index: number): void {}

	// ── Private methods ───────────────────────────────────────────────────────

	private doAddChild(child: DisplayObject, index: number): DisplayObject {
		const host = child.$parent;
		if (host === this) {
			this.doSetChildIndex(child, index);
			return child;
		}
		if (host) {
			host.removeChild(child);
		}

		this.$children.splice(index, 0, child);
		child.$setParent(this);

		if (this.$stage) {
			child.$onAddToStage(this.$stage, this.$nestLevel + 1);
		}

		child.dispatchEventWith(Event.ADDED, true);

		if (this.$stage) {
			const list = DisplayObject.$eventAddToStageList;
			while (list.length) {
				const added = list.shift()!;
				if (added.$stage) {
					added.dispatchEventWith(Event.ADDED_TO_STAGE);
				}
			}
		}

		if (child.$maskedObject) {
			child.$maskedObject.$updateRenderMode();
		}
		this.markDirtyInternal();
		this.childAdded(child, index);
		return child;
	}

	private doRemoveChild(index: number): DisplayObject {
		const $children = this.$children;
		const child = $children[index];
		this.childRemoved(child, index);
		child.dispatchEventWith(Event.REMOVED, true);

		if (this.$stage) {
			child.$onRemoveFromStage();
			const list = DisplayObject.$eventRemoveFromStageList;
			while (list.length) {
				const removed = list.shift()!;
				if (removed.$hasAddToStage) {
					removed.$hasAddToStage = false;
					removed.dispatchEventWith(Event.REMOVED_FROM_STAGE);
				}
			}
		}

		child.$setParent(undefined);
		const indexNow = $children.indexOf(child);
		if (indexNow !== -1) {
			$children.splice(indexNow, 1);
		}

		if (child.$maskedObject) child.$maskedObject.$updateRenderMode();
		this.markDirtyInternal();
		return child;
	}

	private doSetChildIndex(child: DisplayObject, index: number): void {
		const lastIndex = this.$children.indexOf(child);
		if (lastIndex < 0 || lastIndex === index) {
			return;
		}
		this.childRemoved(child, lastIndex);
		this.$children.splice(lastIndex, 1);
		this.$children.splice(index, 0, child);
		this.childAdded(child, index);
		this.markDirtyInternal();
	}

	private doSwapChildrenAt(index1: number, index2: number): void {
		if (index1 > index2) {
			const t = index1;
			index1 = index2;
			index2 = t;
		}
		if (index1 === index2) {
			return;
		}
		const list = this.$children;
		const child1 = list[index1];
		const child2 = list[index2];
		this.childRemoved(child1, index1);
		this.childRemoved(child2, index2);
		list[index1] = child2;
		list[index2] = child1;
		this.childAdded(child2, index1);
		this.childAdded(child1, index2);
		this.markDirtyInternal();
	}

	private markDirtyInternal(): void {
		this.$markDirty();
		// Notify the renderer that the scene structure changed.
		// Pass `this` as the owner so the renderer can route the dirty signal
		// to the correct InstructionSet (RenderGroup or root).
		DisplayObjectContainer.$onContainerStructureChange?.(this);
	}

	/**
	 * @internal
	 * Injected by Player at startup. Called whenever a child is added, removed,
	 * or reordered so the WebGLRenderer can mark its InstructionSet as dirty.
	 * The `owner` argument is the container that changed — used to route the
	 * dirty signal to a RenderGroup's set when applicable.
	 *
	 * Single-Player engine: Player assigns this directly in its constructor and
	 * clears it in `destroy()`. There is intentionally no registration API.
	 */
	static $onContainerStructureChange?: (owner: DisplayObjectContainer) => void;


	private sortChildrenFunc(a: DisplayObject, b: DisplayObject): number {
		if (a.zIndex === b.zIndex) {
			return a.$lastSortedIndex - b.$lastSortedIndex;
		}
		return a.zIndex - b.zIndex;
	}
}
