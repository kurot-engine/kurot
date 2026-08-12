import { DisplayObject, DisplayObjectContainer } from '@blakron/core';
import type { IOverride } from './IOverride.js';
import type { Component } from '../components/Component.js';
import type { Skin } from '../components/Skin.js';

/**
 * Adds a display object to a container when a state becomes active,
 * and removes it when the state is deactivated.
 */
export class AddItems implements IOverride {
	// ── Instance fields ───────────────────────────────────────────────────

	public target: string;
	public destination: string;
	public position: number;
	public propertyName: string;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(target: string, destination: string, position = -1, propertyName = '') {
		this.target = target;
		this.destination = destination;
		this.position = position;
		this.propertyName = propertyName;
	}

	// ── Public methods ────────────────────────────────────────────────────

	public apply(host: Component, skin: Skin): void {
		const item = skin.getPart(this.target);
		const dest = this.destination ? skin.getPart(this.destination) : host;
		if (!(item instanceof DisplayObject) || !(dest instanceof DisplayObjectContainer)) return;

		if (this.position >= 0) {
			dest.addChildAt(item, this.position);
		} else {
			dest.addChild(item);
		}
	}

	public remove(host: Component, skin: Skin): void {
		const item = skin.getPart(this.target);
		const dest = this.destination ? skin.getPart(this.destination) : host;
		if (!(item instanceof DisplayObject) || !(dest instanceof DisplayObjectContainer)) return;
		if (item.parent === dest) {
			dest.removeChild(item);
		}
	}
}
