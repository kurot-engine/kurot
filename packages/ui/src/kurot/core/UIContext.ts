import { DisplayObject, DisplayObjectContainer, Event } from '@kurot/core';
import type { Resource } from '@kurot/core';
import type { Component } from '../components/Component.js';
import type { Skin } from '../components/Skin.js';
import type { IAssetAdapter } from './IAssetAdapter.js';

/**
 * A compiled factory or authored Skin constructor, local to one UI context.
 */
export type SkinFactory = (new () => Skin) | ((this: Component) => Skin);

/**
 * Borrowed providers. The application retains resource/font/adapter ownership.
 */
export interface UIContextOptions {
	/**
	 * Factories keyed by complete Skin names; copied when the context is created.
	 */
	readonly skins: Readonly<Record<string, SkinFactory>>;
	/**
	 * Optional host/class keys mapped to local Skin names; copied at construction.
	 */
	readonly defaults?: Readonly<Record<string, string>>;
	/**
	 * Borrowed image resolver. The context does not dispose its assets.
	 */
	readonly assetAdapter: IAssetAdapter;
	/**
	 * Default family for UI text. Load the font before constructing views.
	 */
	readonly fontFamily?: string;
	/**
	 * Borrowed bitmap-font/resource provider; absence disables scoped font lookup.
	 */
	readonly resource?: Resource;
}

const contexts = new WeakMap<DisplayObject, UIContext>();
const contextObservers = new WeakMap<DisplayObject, () => void>();
let constructing: UIContext | undefined;

/**
 * Isolates default skins, explicit skin names, images and default UI fonts.
 * Construct a subtree inside run(), or bind its root before stage attachment.
 * A local miss never falls back to the global Theme/skin/asset registries.
 *
 * run() only scopes synchronous construction; it restores the previous context
 * before a returned Promise settles. Captured nodes retain their own context.
 * dispose() revokes late UI work; it does not release borrowed resources.
 */
export class UIContext {
	private readonly _skins: Readonly<Record<string, SkinFactory>>;
	private readonly _defaults: Readonly<Record<string, string>>;
	private _disposed = false;

	/**
	 * Copies the local registry and borrows the supplied providers without loading
	 * resources or changing the global Theme, asset adapter or default font.
	 */
	public constructor(
		/**
		 * Borrowed providers and local registry inputs. The context owns only its
		 * copied factory/default maps; callers retain provider and font lifetimes.
		 */
		public readonly options: UIContextOptions,
	) {
		this._skins = Object.freeze({ ...options.skins });
		this._defaults = Object.freeze({ ...options.defaults });
	}

	/**
	 * Whether construction and local Skin resolution have been revoked.
	 */
	public get disposed(): boolean {
		return this._disposed;
	}

	/**
	 * Scopes synchronous UI construction and restores the previous owner on exit,
	 * including exceptions. Scope ends before any returned Promise settles.
	 * Throws after disposal; captured nodes retain this context for their lifetime.
	 */
	public run<T>(create: () => T): T {
		if (this._disposed) {
			throw new Error('UIContext is disposed.');
		}
		const previous = constructing;
		constructing = this;
		try {
			return create();
		} finally {
			constructing = previous;
		}
	}

	/**
	 * Binds a root before attachment and synchronizes automatic radio groups in
	 * its subtree. Captured descendants retain their own contexts. Existing Skin
	 * or asset work performed outside a context is not undone by binding.
	 * Rebinding the same owner is allowed; a different captured owner or a disposed
	 * context throws. Uncaptured descendants inherit through their parent chain.
	 */
	public bind(root: DisplayObject): void {
		if (this._disposed) {
			throw new Error('UIContext is disposed.');
		}
		const existing = contexts.get(root);
		if (existing && existing !== this) {
			throw new Error('A UI node cannot change context; create a new subtree.');
		}
		contexts.set(root, this);
		if (!existing) {
			// Capture before target ADDED handlers observe the inserted subtree.
			root.addEventListener(Event.ADDED, onContextSubtreeAdded, true);
		}
		notifyContextSubtree(root);
	}

	/**
	 * Returns a local factory, or undefined after disposal or for an unknown name.
	 * Resolution never falls back to global Skin registration.
	 */
	public resolveSkin(name: string): SkinFactory | undefined {
		return this._disposed ? undefined : this._skins[name];
	}

	/**
	 * Finds a default by host key, class name, then ancestor class name.
	 * Returns an empty string for a missing mapping or after disposal.
	 */
	public getSkinName(client: Component): string {
		if (this._disposed) {
			return '';
		}
		const explicit = this._defaults[client.hostComponentKey];
		if (explicit) {
			return explicit;
		}
		let prototype: object | undefined = client;
		while (prototype && prototype !== Object.prototype) {
			const name = prototype.constructor.name;
			if (name === 'Component') {
				break;
			}
			if (this._defaults[name]) {
				return this._defaults[name];
			}
			prototype = Object.getPrototypeOf(prototype) as object | undefined;
		}
		return '';
	}

	/**
	 * Revokes new scoped construction and late image/font results. Views and
	 * borrowed resources/fonts remain the caller's responsibility. Repeated calls
	 * are harmless; imported modules and the shared Player remain loaded.
	 */
	public dispose(): void {
		this._disposed = true;
	}
}

/**
 * Resolves a captured context first, then the closest bound ancestor.
 */
export function getUIContext(node: DisplayObject): UIContext | undefined {
	let current: DisplayObject | undefined = node;
	while (current) {
		const context = contexts.get(current);
		if (context) {
			return context;
		}
		current = current.parent;
	}
	return undefined;
}

/**
 * Captures synchronous construction for native UI constructors.
 */
export function captureUIContext(node: DisplayObject): void {
	constructing?.bind(node);
}

/**
 * @internal
 * Register only after subclass initialization; bind() can run in a base
 * constructor. Weak keys do not root a detached view or its borrowed providers.
 */
export function observeUIContext(node: DisplayObject, changed: () => void): void {
	contextObservers.set(node, changed);
}

function notifyContextSubtree(root: DisplayObject): void {
	contextObservers.get(root)?.();
	if (root instanceof DisplayObjectContainer) {
		for (let i = 0; i < root.numChildren; i++) {
			const child = root.getChildAt(i);
			if (child) {
				notifyContextSubtree(child);
			}
		}
	}
}

function onContextSubtreeAdded(event: Event): void {
	const root = event.target;
	if (!(root instanceof DisplayObject)) {
		return;
	}
	// A captured descendant may introduce another context. Notify once at the
	// nearest boundary; resolving each observer preserves those nested owners.
	let boundary: DisplayObject | undefined = root;
	while (boundary && !contexts.has(boundary)) {
		boundary = boundary.parent;
	}
	if (boundary === event.currentTarget) {
		notifyContextSubtree(root);
	}
}
