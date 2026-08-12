import { Rectangle, Event, DisplayObject } from '@blakron/core';
import { Group } from './Group.js';
import { ItemRenderer } from './ItemRenderer.js';
import { CollectionEvent, CollectionEventKind } from '../events/CollectionEvent.js';
import type { ICollection } from '../collections/ICollection.js';
import { VerticalLayout } from '../layouts/VerticalLayout.js';
import { JustifyAlign } from '../layouts/JustifyAlign.js';
import type { Skin } from './Skin.js';

type SkinName = string | (new () => Skin) | Skin | undefined;

/**
 * DataGroup converts data items into visual elements (item renderers).
 *
 * Provide an {@link ICollection} via `dataProvider` and either set
 * `itemRenderer` to a class or supply `itemRendererFunction` for
 * per-item renderer resolution.
 *
 * Supports virtual layout — only creates renderers for visible items.
 *
 * @defaultProperty dataProvider
 */
export class DataGroup extends Group {
	// ── Instance fields ───────────────────────────────────────────────────────

	private _dataProvider?: ICollection;
	private _dataProviderChanged = false;

	private _itemRenderer?: new () => ItemRenderer;
	private _itemRendererChanged = false;

	private _itemRendererFunction?: (item: unknown) => (new () => ItemRenderer) | undefined;

	private _itemRendererSkinName: SkinName;
	private _itemRendererSkinNameChanged = false;

	private _useVirtualLayout = false;
	private _useVirtualLayoutChanged = false;

	private readonly _rendererToClass = new Map<ItemRenderer, new () => ItemRenderer>();
	private readonly _freeRenderers = new Map<new () => ItemRenderer, ItemRenderer[]>();
	private _renderersBeingUpdated = false;
	private _indexToRenderer: (ItemRenderer | undefined)[] = [];
	private _createNewRendererFlag = false;
	private _typicalLayoutRect?: Rectangle;
	private _typicalItem: unknown;
	private _typicalItemChanged = false;
	private _cleanFreeRenderer = false;

	// ── Getters / Setters ─────────────────────────────────────────────────────

	public get dataProvider(): ICollection | undefined {
		return this._dataProvider;
	}

	public set dataProvider(value: ICollection | undefined) {
		if (this._dataProvider === value) return;
		this._removeDataProviderListener();
		this._dataProvider = value;
		this._dataProviderChanged = true;
		this._cleanFreeRenderer = true;
		this.invalidateProperties();
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	public get itemRenderer(): (new () => ItemRenderer) | undefined {
		return this._itemRenderer;
	}

	public set itemRenderer(value: (new () => ItemRenderer) | undefined) {
		if (this._itemRenderer === value) return;
		this._itemRenderer = value;
		this._itemRendererChanged = true;
		this._typicalItemChanged = true;
		this._cleanFreeRenderer = true;
		this._removeDataProviderListener();
		this.invalidateProperties();
	}

	public get itemRendererFunction(): ((item: unknown) => (new () => ItemRenderer) | undefined) | undefined {
		return this._itemRendererFunction;
	}

	public set itemRendererFunction(value: ((item: unknown) => (new () => ItemRenderer) | undefined) | undefined) {
		if (this._itemRendererFunction === value) return;
		this._itemRendererFunction = value;
		this._itemRendererChanged = true;
		this._typicalItemChanged = true;
		this._removeDataProviderListener();
		this.invalidateProperties();
	}

	public get itemRendererSkinName(): SkinName {
		return this._itemRendererSkinName;
	}

	public set itemRendererSkinName(value: SkinName) {
		if (this._itemRendererSkinName === value) return;
		this._itemRendererSkinName = value;
		this._itemRendererSkinNameChanged = true;
		this.invalidateProperties();
	}

	public get useVirtualLayout(): boolean {
		const layout = this.layout;
		if (layout) return layout.useVirtualLayout;
		return this._useVirtualLayout;
	}

	public set useVirtualLayout(value: boolean) {
		if (this._useVirtualLayout === value) return;
		this._useVirtualLayout = value;
		const layout = this.layout;
		if (layout) layout.useVirtualLayout = value;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Update a renderer's itemIndex and data. Called by the layout system.
	 */
	public updateRenderer(renderer: ItemRenderer, itemIndex: number, data: unknown): ItemRenderer {
		this._renderersBeingUpdated = true;
		renderer.itemIndex = itemIndex;
		if (renderer.parent === this) {
			this.setChildIndex(renderer, itemIndex);
		}
		renderer.data = data;
		this._renderersBeingUpdated = false;
		return renderer;
	}

	// ── Override methods ──────────────────────────────────────────────────────

	public override get numElements(): number {
		if (!this._dataProvider) return 0;
		return this._dataProvider.length;
	}

	public override getElementAt(index: number): DisplayObject | undefined {
		return this._indexToRenderer[index] ?? undefined;
	}

	public override getVirtualElementAt(index: number): DisplayObject | undefined {
		index = index | 0;
		if (!this._dataProvider || index < 0 || index >= this._dataProvider.length) return undefined;
		let renderer = this._indexToRenderer[index];
		if (!renderer) {
			const item = this._dataProvider.getItemAt(index);
			renderer = this._createVirtualRenderer(item);
			this._indexToRenderer[index] = renderer;
			this.updateRenderer(renderer, index, item);
			if (this._createNewRendererFlag) {
				renderer.validateNow();
				this._createNewRendererFlag = false;
				this.rendererAdded(renderer, index, item);
			}
		}
		return renderer;
	}

	public override setVirtualElementIndicesInView(startIndex: number, endIndex: number): void {
		const layout = this.layout;
		if (!layout?.useVirtualLayout) return;
		const map = this._indexToRenderer;
		for (let i = 0; i < map.length; i++) {
			if (map[i] && (i < startIndex || i > endIndex)) {
				this._freeRendererByIndex(i);
			}
		}
	}

	public override createChildren(): void {
		if (!this.layout) {
			const vl = new VerticalLayout();
			vl.gap = 0;
			vl.horizontalAlign = JustifyAlign.CONTENT_JUSTIFY;
			if (this._useVirtualLayout) {
				vl.useVirtualLayout = true;
			}
			this.layout = vl;
		}
		super.createChildren();
	}

	public override commitProperties(): void {
		if (this._itemRendererChanged || this._dataProviderChanged || this._useVirtualLayoutChanged) {
			this._removeAllRenderers();
			const layout = this.layout;
			if (layout) layout.clearVirtualLayoutCache();
			this._setTypicalLayoutRect(undefined);
			this._useVirtualLayoutChanged = false;
			this._itemRendererChanged = false;

			if (this._dataProvider) {
				this._dataProvider.addEventListener(CollectionEvent.COLLECTION_CHANGE, this._onCollectionChange);
			}

			const useVirtual = layout ? layout.useVirtualLayout : this._useVirtualLayout;
			if (useVirtual) {
				this.invalidateSize();
				this.invalidateDisplayList();
			} else {
				this._createRenderers();
			}

			if (this._dataProviderChanged) {
				this._dataProviderChanged = false;
				this.scrollH = 0;
				this.scrollV = 0;
			}
		}

		super.commitProperties();

		if (this._typicalItemChanged) {
			this._typicalItemChanged = false;
			if (this._dataProvider && this._dataProvider.length > 0) {
				this._typicalItem = this._dataProvider.getItemAt(0);
				this._measureRendererSize();
			}
		}

		if (this._itemRendererSkinNameChanged) {
			this._itemRendererSkinNameChanged = false;
			this._applyItemRendererSkinName();
		}
	}

	public override measure(): void {
		if (this.layout?.useVirtualLayout) this._ensureTypicalLayoutElement();
		super.measure();
	}

	public override updateDisplayList(unscaledWidth: number, unscaledHeight: number): void {
		const useVirtual = this.layout?.useVirtualLayout;
		if (useVirtual) this._ensureTypicalLayoutElement();
		super.updateDisplayList(unscaledWidth, unscaledHeight);
		if (useVirtual && this._typicalLayoutRect) {
			const r0 = this._indexToRenderer[0];
			if (r0) {
				const b = new Rectangle();
				r0.getPreferredBounds(b);
				if (b.width !== this._typicalLayoutRect.width || b.height !== this._typicalLayoutRect.height) {
					this._typicalLayoutRect = undefined;
				}
			}
		}
	}

	// ── Protected methods (subclass hooks) ────────────────────────────────────

	protected itemAdded(item: unknown, index: number): void {
		this.layout?.elementAdded(index);
		if (this.layout?.useVirtualLayout) {
			this._indexToRenderer.splice(index, 0, undefined);
			return;
		}
		const renderer = this._createVirtualRenderer(item);
		this._indexToRenderer.splice(index, 0, renderer);
		if (renderer) {
			this.updateRenderer(renderer, index, item);
			if (this._createNewRendererFlag) {
				this._createNewRendererFlag = false;
				this.rendererAdded(renderer, index, item);
			}
		}
	}

	protected itemRemoved(item: unknown, index: number): void {
		this.layout?.elementRemoved(index);
		const oldRenderer = this._indexToRenderer[index];
		if (this._indexToRenderer.length > index) {
			this._indexToRenderer.splice(index, 1);
		}
		if (oldRenderer) {
			if (this.layout?.useVirtualLayout) {
				this._doFreeRenderer(oldRenderer);
			} else {
				this.rendererRemoved(oldRenderer, index, item);
				this.removeChild(oldRenderer);
			}
		}
	}

	protected onCollectionChange(event: CollectionEvent): void {
		switch (event.kind) {
			case CollectionEventKind.ADD:
				this._itemAddedHandler(event.items, event.location);
				break;
			case CollectionEventKind.REMOVE:
				this._itemRemovedHandler(event.items, event.location);
				break;
			case CollectionEventKind.UPDATE:
			case CollectionEventKind.REPLACE:
				this._itemUpdatedHandler(event.items[0], event.location);
				break;
			case CollectionEventKind.RESET:
			case CollectionEventKind.REFRESH: {
				if (this.layout?.useVirtualLayout) {
					for (let i = this._indexToRenderer.length - 1; i >= 0; i--) {
						if (this._indexToRenderer[i]) this._freeRendererByIndex(i);
					}
				}
				this._dataProviderChanged = true;
				this.invalidateProperties();
				break;
			}
			default:
				break;
		}
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	protected rendererAdded(_renderer: ItemRenderer, _index: number, _item: unknown): void {}

	protected rendererRemoved(_renderer: ItemRenderer, _index: number, _item: unknown): void {}

	/**
	 * Get the renderer at the given index, if one exists.
	 * Used by subclasses (e.g. ListBase) to update renderer state.
	 */
	protected getRendererAt(index: number): ItemRenderer | undefined {
		return this._indexToRenderer[index];
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private _removeDataProviderListener(): void {
		if (this._dataProvider) {
			this._dataProvider.removeEventListener(CollectionEvent.COLLECTION_CHANGE, this._onCollectionChange);
		}
	}

	private _onCollectionChange = (e: Event): void => {
		this.onCollectionChange(e as CollectionEvent);
	};

	private _itemAddedHandler(items: unknown[], index: number): void {
		for (let i = 0; i < items.length; i++) {
			this.itemAdded(items[i], index + i);
		}
		this._resetRenderersIndices();
	}

	private _itemRemovedHandler(items: unknown[], location: number): void {
		for (let i = items.length - 1; i >= 0; i--) {
			this.itemRemoved(items[i], location + i);
		}
		this._resetRenderersIndices();
	}

	private _itemUpdatedHandler(item: unknown, location: number): void {
		if (this._renderersBeingUpdated) return;
		const renderer = this._indexToRenderer[location];
		if (renderer) {
			this.updateRenderer(renderer, location, item);
		}
	}

	private _createVirtualRenderer(item: unknown): ItemRenderer {
		const rendererClass = this._itemToRendererClass(item);
		const pool = this._freeRenderers.get(rendererClass);
		if (pool && pool.length > 0) {
			const renderer = pool.pop()!;
			renderer.visible = true;
			this.invalidateDisplayList();
			return renderer;
		}
		this._createNewRendererFlag = true;
		return this._createOneRenderer(rendererClass);
	}

	private _createOneRenderer(rendererClass: new () => ItemRenderer): ItemRenderer {
		const renderer = new rendererClass();
		this._rendererToClass.set(renderer, rendererClass);
		if (this._itemRendererSkinName) {
			this._setItemRendererSkinName(renderer, this._itemRendererSkinName);
		}
		this.addChild(renderer);
		return renderer;
	}

	private _doFreeRenderer(renderer: ItemRenderer): void {
		const cls = this._rendererToClass.get(renderer);
		if (!cls) return;
		let pool = this._freeRenderers.get(cls);
		if (!pool) {
			pool = [];
			this._freeRenderers.set(cls, pool);
		}
		pool.push(renderer);
		renderer.visible = false;
	}

	private _freeRendererByIndex(index: number): void {
		const renderer = this._indexToRenderer[index];
		if (renderer) {
			delete this._indexToRenderer[index];
			this._doFreeRenderer(renderer);
		}
	}

	private _itemToRendererClass(item: unknown): new () => ItemRenderer {
		let cls: (new () => ItemRenderer) | undefined;
		if (this._itemRendererFunction) {
			cls = this._itemRendererFunction(item);
		}
		if (!cls) cls = this._itemRenderer;
		if (!cls) cls = ItemRenderer;
		return cls;
	}

	private _createRenderers(): void {
		if (!this._dataProvider) return;
		const len = this._dataProvider.length;
		for (let i = 0; i < len; i++) {
			const item = this._dataProvider.getItemAt(i);
			const cls = this._itemToRendererClass(item);
			const renderer = this._createOneRenderer(cls);
			this._indexToRenderer[i] = renderer;
			this.updateRenderer(renderer, i, item);
			this.rendererAdded(renderer, i, item);
		}
	}

	private _removeAllRenderers(): void {
		for (let i = 0; i < this._indexToRenderer.length; i++) {
			const renderer = this._indexToRenderer[i];
			if (renderer) {
				this.rendererRemoved(renderer, renderer.itemIndex, renderer.data);
				this.removeChild(renderer);
			}
		}
		this._indexToRenderer = [];
		if (this._cleanFreeRenderer) {
			for (const pool of this._freeRenderers.values()) {
				for (const renderer of pool) {
					this.rendererRemoved(renderer, renderer.itemIndex, renderer.data);
					this.removeChild(renderer);
				}
			}
			this._freeRenderers.clear();
			this._rendererToClass.clear();
			this._cleanFreeRenderer = false;
		}
	}

	private _resetRenderersIndices(): void {
		const map = this._indexToRenderer;
		if (map.length === 0) return;
		for (let i = 0; i < map.length; i++) {
			if (map[i]) map[i]!.itemIndex = i;
		}
	}

	private _ensureTypicalLayoutElement(): void {
		if (this._typicalLayoutRect) return;
		if (this._dataProvider && this._dataProvider.length > 0) {
			this._typicalItem = this._dataProvider.getItemAt(0);
			this._measureRendererSize();
		}
	}

	private _measureRendererSize(): void {
		if (this._typicalItem === undefined) {
			this._setTypicalLayoutRect(undefined);
			return;
		}
		const renderer = this._createVirtualRenderer(this._typicalItem);
		this.updateRenderer(renderer, 0, this._typicalItem);
		renderer.validateNow();
		const b = new Rectangle();
		renderer.getPreferredBounds(b);
		const rect = new Rectangle(0, 0, b.width, b.height);
		if (this.layout?.useVirtualLayout) {
			if (this._createNewRendererFlag) {
				this.rendererAdded(renderer, 0, this._typicalItem);
			}
			this._doFreeRenderer(renderer);
		} else {
			this.removeChild(renderer);
		}
		this._setTypicalLayoutRect(rect);
		this._createNewRendererFlag = false;
	}

	private _setTypicalLayoutRect(rect: Rectangle | undefined): void {
		this._typicalLayoutRect = rect;
		if (this.layout) {
			if (rect) {
				this.layout.setTypicalSize(rect.width, rect.height);
			} else {
				this.layout.setTypicalSize(0, 0);
			}
		}
	}

	private _setItemRendererSkinName(renderer: ItemRenderer, skinName: SkinName): void {
		if (!renderer.skinNameExplicitlySet) {
			renderer.skinName = skinName;
			renderer.skinNameExplicitlySet = false;
		}
	}

	private _applyItemRendererSkinName(): void {
		const skinName = this._itemRendererSkinName;
		for (const renderer of this._indexToRenderer) {
			if (renderer) {
				this._setItemRendererSkinName(renderer, skinName);
			}
		}
		for (const pool of this._freeRenderers.values()) {
			for (const renderer of pool) {
				this._setItemRendererSkinName(renderer, skinName);
			}
		}
	}
}
