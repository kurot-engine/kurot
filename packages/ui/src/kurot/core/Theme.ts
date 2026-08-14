import { EventDispatcher, Event, IOErrorEvent } from '@kurot/core';
import type { IThemeAdapter } from './IThemeAdapter.js';
import type { Component } from '../components/Component.js';

interface ThemeConfig {
	skins?: Record<string, string>;
	styles?: Record<string, unknown>;
	paths?: Record<string, unknown>;
	skinsJs?: string;
}

/**
 * Maps component class names to default skins.
 *
 * @example
 * ```ts
 * const theme = new Theme('resource/default.thm.js');
	 * theme.addEventListener(Event.COMPLETE, handleComplete);
 * ```
 */
export class Theme extends EventDispatcher {
	// ── Instance fields ───────────────────────────────────────────────────

	private _configURL: string;
	private _initialized: boolean;
	private _skinMap: Record<string, string> = {};
	private _styles: Record<string, unknown> = {};
	private _delayList: Component[] = [];
	private _adapter?: IThemeAdapter;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(configURL: string, adapter?: IThemeAdapter) {
		super();
		this._configURL = configURL;
		this._initialized = !configURL;
		this._adapter = adapter;
		setTheme(this);
		if (configURL) this._load(configURL);
	}

	// ── Public methods ────────────────────────────────────────────────────

	/**
	 * Maps a component key to its default skin class name.
	 */
	public mapSkin(hostComponentKey: string, skinName: string): void {
		if (!hostComponentKey || !skinName) return;
		this._skinMap[hostComponentKey] = skinName;
	}

	/**
	 * Resolves a component's skin by host key, class name, then ancestor class.
	 * Returns an empty string while the theme is loading or when no skin is mapped.
	 */
	public getSkinName(client: Component): string {
		if (!this._initialized) {
			if (!this._delayList.includes(client)) this._delayList.push(client);
			return '';
		}
		return this._skinMap[client.hostComponentKey] ?? this._findSkinName(client);
	}

	public getStyleConfig(style: string): unknown {
		return this._styles[style];
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _load(url: string): void {
		const adapter = this._adapter ?? _defaultThemeAdapter;
		adapter.getTheme(
			url,
			data => this._onConfigLoaded(data),
			err => {
				console.error('[Theme] Failed to load theme:', url, err);
				this._onLoadFailed();
			},
		);
	}

	private _onConfigLoaded(raw: unknown): void {
		let data: ThemeConfig;
		if (typeof raw === 'string') {
			try {
				data = JSON.parse(raw);
			} catch {
				console.error('[Theme] Invalid JSON in theme config');
				this._onLoadFailed();
				return;
			}
		} else {
			data = raw as ThemeConfig;
		}

		if (data.skins) {
			for (const [key, val] of Object.entries(data.skins)) {
				if (!this._skinMap[key]) this.mapSkin(key, val);
			}
		}

		if (data.styles) this._styles = data.styles;

		// Compiled skin modules register their factories on globalThis when imported.
		if (data.skinsJs) {
			this._loadSkinsModule(data.skinsJs).then(
				() => this._onLoaded(),
				err => {
					console.error('[Theme] Failed to load skins module:', data.skinsJs, err);
					this._onLoadFailed();
				},
			);
		} else {
			this._onLoaded();
		}
	}

	private async _loadSkinsModule(skinsJs: string): Promise<void> {
		const base = new URL(this._configURL, globalThis.location?.href ?? 'http://localhost/');
		const moduleUrl = new URL(skinsJs, base).href;
		await import(/* @vite-ignore */ moduleUrl);
	}

	private _onLoaded(): void {
		this._initialized = true;
		this._handleDelayList();
		this.dispatchEventWith(Event.COMPLETE);
	}

	private _onLoadFailed(): void {
		if (this._initialized) return;
		this._initialized = true;
		this._handleDelayList();
		IOErrorEvent.dispatchIOErrorEvent(this);
	}

	private _handleDelayList(): void {
		const list = this._delayList;
		for (const client of list) {
			if (!client.skinNameExplicitlySet) {
				const skinName = this.getSkinName(client);
				if (skinName) {
					client._applySkinName(skinName);
				}
			}
		}
		list.length = 0;
	}

	private _findSkinName(proto: unknown): string {
		if (!proto || proto === Object.prototype) return '';
		const ctor = (proto as { constructor?: { name?: string } }).constructor;
		const key = ctor?.name;
		if (!key || key === 'Component') return '';
		const name = this._skinMap[key];
		if (name) return name;
		return this._findSkinName(Object.getPrototypeOf(proto));
	}
}

// ── Default theme adapter (fetch via XHR) ─────────────────────────────────────

const _defaultThemeAdapter: IThemeAdapter = {
	getTheme(url, onSuccess, onError) {
		const xhr = new XMLHttpRequest();
		xhr.open('GET', url);
		xhr.responseType = 'text';
		xhr.onload = () => onSuccess(xhr.responseText);
		xhr.onerror = () => onError(new Error(`Failed to load: ${url}`));
		xhr.send();
	},
};

// ── Global theme registry ─────────────────────────────────────────────────────

let _currentTheme: Theme | undefined;

/**
 * Sets the active theme used by UI components.
 * A Theme instance registers itself during construction.
 */
export function setTheme(theme: Theme): void {
	_currentTheme = theme;
}

/**
 * Returns the active theme, if one has been created or registered.
 */
export function getTheme(): Theme | undefined {
	return _currentTheme;
}
