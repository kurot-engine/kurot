import type { DisplayObject } from '@kurot/core';
import {
	Button,
	Component,
	EditableText,
	Group,
	Image,
	Label,
	ProgressBar,
	Rect,
	TextInput,
	isUIComponent,
} from '@kurot/ui';
import { applyButtonProperty } from './applyButtonProperties.js';
import { applyComponentProperty } from './applyComponentProperties.js';
import { applyEditableTextProperty } from './applyEditableTextProperties.js';
import { applyDisplayObjectProperty } from './applyDisplayObjectProperties.js';
import { applyGroupProperty } from './applyGroupProperties.js';
import { applyImageProperty } from './applyImageProperties.js';
import { applyLabelProperty } from './applyLabelProperties.js';
import { applyProgressBarProperty } from './applyProgressBarProperties.js';
import { applyRectProperty } from './applyRectProperties.js';
import { applyTextInputProperty } from './applyTextInputProperties.js';
import { applyUIComponentProperty } from './applyUIComponentProperties.js';

/**
 * Routes one property to the matching built-in component layer.
 */
export function applyBuiltInProperty(
	target: DisplayObject,
	name: string,
	value: unknown,
	path: string,
): boolean {
	if (applyDisplayObjectProperty(target, name, value, path)) return true;
	if (isUIComponent(target)) {
		if (applyUIComponentProperty(target, name, value, path)) return true;
	}
	if (target instanceof Component) {
		if (applyComponentProperty(target, name, value, path)) return true;
	}
	if (target instanceof Group) {
		if (applyGroupProperty(target, name, value, path)) return true;
	}
	if (target instanceof Label) {
		if (applyLabelProperty(target, name, value, path)) return true;
	}
	if (target instanceof EditableText) {
		if (applyEditableTextProperty(target, name, value, path)) return true;
	}
	if (target instanceof TextInput) {
		if (applyTextInputProperty(target, name, value, path)) return true;
	}
	if (target instanceof Image) {
		if (applyImageProperty(target, name, value, path)) return true;
	}
	if (target instanceof Rect) {
		if (applyRectProperty(target, name, value, path)) return true;
	}
	if (target instanceof Button) {
		if (applyButtonProperty(target, name, value, path)) return true;
	}
	if (target instanceof ProgressBar) {
		if (applyProgressBarProperty(target, name, value, path)) return true;
	}
	return false;
}
