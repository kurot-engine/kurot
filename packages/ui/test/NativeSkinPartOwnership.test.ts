import { afterEach, describe, expect, it, vi } from 'vitest';
import { Event, Stage, TouchEvent } from '@kurot/core';
import type { DisplayObject } from '@kurot/core';
import { Button, ComboBox, EditableText, Group, Label, List, Panel, Scroller, SetProperty, Skin, State, TextInput, VScrollBar } from '../src/index.js';

afterEach(() => {
	vi.restoreAllMocks();
});

function skin(parts: Readonly<Record<string, DisplayObject>>): Skin {
	const result = new Skin();
	result.skinParts = Object.keys(parts);
	for (const [name, value] of Object.entries(parts)) {
		result.setPart(name, value);
	}
	return result;
}

describe('native part lifecycle', () => {
	it('applies a cached Panel title after initial on-stage state overrides', () => {
		const stage = new Stage();
		const panel = new Panel();
		stage.addChild(panel);
		panel.title = 'cached title';
		panel.currentState = 'normal';
		const titleDisplay = new Label();
		const appearance = skin({ titleDisplay });
		appearance.states = [new State('normal', [new SetProperty('titleDisplay', 'text', 'state title')])];
		panel.skinName = appearance;
		expect(titleDisplay.text).toBe('cached title');
		stage.removeChildren();
	});

	it('removes Panel listeners from old parts while preserving reassigned slots', () => {
		const panel = new Panel();
		const closeButton = new Button();
		panel.skinName = skin({ closeButton });
		const replacement = new Button();
		panel.closeButton = replacement;
		panel.skinName = undefined;
		expect(closeButton.hasEventListener(TouchEvent.TOUCH_TAP)).toBe(false);
		expect(panel.closeButton).toBe(replacement);
	});

	it('removes focus listeners from the old input rather than its replacement', () => {
		const input = new TextInput();
		const textDisplay = new EditableText();
		input.skinName = skin({ textDisplay });
		const oldRemove = vi.spyOn(textDisplay, 'removeEventListener');
		const replacement = new EditableText();
		const newRemove = vi.spyOn(replacement, 'removeEventListener');
		input.textDisplay = replacement;
		input.skinName = undefined;
		expect(oldRemove).toHaveBeenCalledWith(Event.FOCUS_IN, expect.any(Function));
		expect(oldRemove).toHaveBeenCalledWith(Event.FOCUS_OUT, expect.any(Function));
		expect(newRemove).not.toHaveBeenCalled();
		expect(input.textDisplay).toBe(replacement);
	});

	it('releases the old scrollbar viewport without mutating an application scrollbar', () => {
		const scroller = new Scroller();
		const viewport = new Group();
		const verticalScrollBar = new VScrollBar();
		scroller.viewport = viewport;
		scroller.skinName = skin({ verticalScrollBar });
		const replacement = new VScrollBar();
		const otherViewport = new Group();
		replacement.viewport = otherViewport;
		scroller.verticalScrollBar = replacement;
		scroller.skinName = undefined;
		expect(verticalScrollBar.viewport).toBeUndefined();
		expect(replacement.viewport).toBe(otherViewport);
		scroller.viewport = undefined;
		replacement.viewport = undefined;
	});

	it('closes the old popup and list even when public slots were replaced', () => {
		const stage = new Stage();
		const combo = new ComboBox();
		const dropDown = new Scroller();
		const list = new List();
		const previous = skin({ dropDown, list });
		previous.elementsContent = [dropDown];
		combo.skinName = previous;
		stage.addChild(combo);
		combo.open();
		expect(dropDown.parent).toBe(stage);
		const replacement = new Scroller();
		combo.dropDown = replacement;
		combo.list = new List();
		combo.skinName = undefined;
		expect(dropDown.parent).toBeUndefined();
		expect(list.hasEventListener(Event.CHANGE)).toBe(false);
		expect(combo.dropDown).toBe(replacement);
		expect(replacement.visible).toBe(true);
		stage.removeChildren();
	});
});
