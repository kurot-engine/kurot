import type { DisplayObject } from '@kurot/core';
import {
	Button,
	EditableText,
	Group,
	Image,
	Label,
	ProgressBar,
	Rect,
	TextInput,
	ToggleButton,
} from '@kurot/ui';

const BUILT_IN_FACTORIES: Readonly<Record<string, () => DisplayObject>> = {
	'kui.Button': () => new Button(),
	'kui.EditableText': () => new EditableText(),
	'kui.Group': () => new Group(),
	'kui.Image': () => new Image(),
	'kui.Label': () => new Label(),
	'kui.ProgressBar': () => new ProgressBar(),
	'kui.Rect': () => new Rect(),
	'kui.TextInput': () => new TextInput(),
	'kui.ToggleButton': () => new ToggleButton(),
};

/**
 * Returns the built-in factory for one canonical Kurot UI component type.
 */
export function getBuiltInFactory(type: string): (() => DisplayObject) | undefined {
	return BUILT_IN_FACTORIES[type];
}
