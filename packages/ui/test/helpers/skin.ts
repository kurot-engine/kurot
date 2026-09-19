import { DisplayObject } from '@kurot/core';
import { Component, Skin } from '../../src/index.js';

/**
 * Attach a programmatic skin with a complete set of named parts.
 */
export function attachSkin(
	component: Component,
	parts: Readonly<Record<string, DisplayObject>>,
	elementsContent?: DisplayObject[],
): Skin {
	const skin = new Skin();
	skin.skinParts = Object.keys(parts);
	for (const [name, part] of Object.entries(parts)) {
		skin.setPart(name, part);
	}
	skin.elementsContent = elementsContent ?? Object.values(parts);
	(component as unknown as { _setSkin: (value: Skin) => void })._setSkin(skin);
	return skin;
}

/**
 * Detach the complete skin from a component.
 */
export function detachSkin(component: Component): void {
	(component as unknown as { _setSkin: (value: undefined) => void })._setSkin(undefined);
}
