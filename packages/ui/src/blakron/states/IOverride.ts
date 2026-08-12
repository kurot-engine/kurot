import type { Component } from '../components/Component.js';
import type { Skin } from '../components/Skin.js';

/**
 * Interface for view-state override operations.
 * Each override knows how to apply itself when entering a state
 * and remove itself when leaving.
 */
export interface IOverride {
	apply(host: Component, skin: Skin): void;
	remove(host: Component, skin: Skin): void;
}
