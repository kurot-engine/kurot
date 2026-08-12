import type { IOverride } from './IOverride.js';
import type { Component } from '../components/Component.js';
import type { Skin } from '../components/Skin.js';

/**
 * Sets a property on the host component (not the skin) when a state becomes active.
 * Restores the previous value when the state is deactivated.
 */
export class SetStateProperty implements IOverride {
	// ── Instance fields ───────────────────────────────────────────────────

	public name: string;
	public value: unknown;

	private _oldValue: unknown;
	private _applied = false;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(name: string, value: unknown) {
		this.name = name;
		this.value = value;
	}

	// ── Public methods ────────────────────────────────────────────────────

	public apply(host: Component, _skin: Skin): void {
		this._oldValue = getProp(host, this.name);
		setProp(host, this.name, this.value);
		this._applied = true;
	}

	public remove(host: Component, _skin: Skin): void {
		if (!this._applied) return;
		setProp(host, this.name, this._oldValue);
		this._applied = false;
	}
}

function getProp(obj: object, key: string): unknown {
	return (obj as Record<string, unknown>)[key];
}

function setProp(obj: object, key: string, value: unknown): void {
	(obj as Record<string, unknown>)[key] = value;
}
