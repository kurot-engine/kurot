import type { IOverride } from './IOverride.js';
import type { Component } from '../components/Component.js';
import type { Skin } from '../components/Skin.js';

/**
 * Sets a property on a skin object when a state becomes active,
 * and restores the previous value when the state is deactivated.
 */
export class SetProperty implements IOverride {
	// ── Instance fields ───────────────────────────────────────────────────

	public target: string;
	public name: string;
	public value: unknown;

	private _oldValue: unknown;
	private _applied = false;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(target: string, name: string, value: unknown) {
		this.target = target;
		this.name = name;
		this.value = value;
	}

	// ── Public methods ────────────────────────────────────────────────────

	public apply(_host: Component, skin: Skin): void {
		const obj = this._resolve(skin);
		if (!obj) return;
		this._oldValue = getProp(obj, this.name);
		setProp(obj, this.name, this.value);
		this._applied = true;
	}

	public remove(_host: Component, skin: Skin): void {
		if (!this._applied) return;
		const obj = this._resolve(skin);
		if (!obj) return;
		setProp(obj, this.name, this._oldValue);
		this._applied = false;
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _resolve(skin: Skin): object | undefined {
		if (!this.target) return skin;
		const part = skin.getPart(this.target);
		return part != null && typeof part === 'object' ? part : undefined;
	}
}

function getProp(obj: object, key: string): unknown {
	return (obj as Record<string, unknown>)[key];
}

function setProp(obj: object, key: string, value: unknown): void {
	(obj as Record<string, unknown>)[key] = value;
}
