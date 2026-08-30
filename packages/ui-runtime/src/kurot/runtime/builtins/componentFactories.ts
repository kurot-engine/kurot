import type { DisplayObject } from '@kurot/core';
import {
	Button,
	Group,
	Image,
	Label,
	ProgressBar,
	Rect,
	ToggleButton,
} from '@kurot/ui';

const BUILT_IN_FACTORIES: Readonly<Record<string, () => DisplayObject>> = {
	'kui.Button': () => new Button(),
	'kui.Group': () => new Group(),
	'kui.Image': () => new Image(),
	'kui.Label': () => new Label(),
	'kui.ProgressBar': () => new ProgressBar(),
	'kui.Rect': () => new Rect(),
	'kui.ToggleButton': () => new ToggleButton(),
};

/**
 * Returns the built-in factory for one canonical Kurot UI component type.
 */
export function getBuiltInFactory(type: string): (() => DisplayObject) | undefined {
	return BUILT_IN_FACTORIES[type];
}
