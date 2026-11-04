import { describe, expect, it } from 'vitest';
import { Event, Stage, TouchEvent } from '@kurot/core';
import type { DisplayObject } from '@kurot/core';
import { Button, Component, HSlider, Label, Skin } from '../src/index.js';

function skin(parts: Readonly<Record<string, DisplayObject>>): Skin {
	const result = new Skin();
	result.skinParts = Object.keys(parts);
	for (const [name, value] of Object.entries(parts)) {
		result.setPart(name, value);
	}
	return result;
}

class View extends Component {
	declare btnClose: Button;
	declare caption: Label;
	public readonly snapshots: unknown[][] = [];

	protected override onSkinReady(): void {
		this.snapshots.push(['ready', this.btnClose, this.caption]);
	}

	protected override onSkinRemoved(): void {
		this.snapshots.push(['removed', this.btnClose, this.caption]);
	}
}

describe('skin part fields', () => {
	it('installs declared fields before ready and COMPLETE and removes them after the cleanup hook', () => {
		const view = new View();
		const btnClose = new Button();
		const caption = new Label();
		view.addEventListener(Event.COMPLETE, () => {
			if (view.skin) {
				expect(view.btnClose).toBe(btnClose);
				expect(view.caption).toBe(caption);
			}
		});
		view.skinName = skin({ btnClose, caption });
		expect(view.btnClose).toBe(btnClose);
		expect(view.skinParts.btnClose).toBe(btnClose);
		view.skinName = undefined;
		expect(view.snapshots).toEqual([['ready', btnClose, caption], ['removed', btnClose, caption]]);
		expect(Object.hasOwn(view, 'btnClose')).toBe(false);
		expect(Object.hasOwn(view, 'caption')).toBe(false);
	});

	it('replaces all fields and clears parts omitted by the next skin', () => {
		const view = new View();
		const first = new Button();
		const second = new Button();
		const caption = new Label();
		view.skinName = skin({ btnClose: first, caption });
		view.skinName = skin({ btnClose: second });
		expect(view.btnClose).toBe(second);
		expect(Object.hasOwn(view, 'caption')).toBe(false);
		expect(view.snapshots).toEqual([
			['ready', first, caption], ['removed', first, caption], ['ready', second, undefined],
		]);
	});

	it('retains skin fields across stage removal and reattachment', () => {
		const stage = new Stage();
		const view = new View();
		const button = new Button();
		view.skinName = skin({ btnClose: button });
		stage.addChild(view);
		stage.removeChild(view);
		expect(view.btnClose).toBe(button);
		stage.addChild(view);
		expect(view.btnClose).toBe(button);
		stage.removeChildren();
	});

	it.each(['enabled', 'skinName', 'onSkinReady', 'addChild', 'constructor', '_skin', '$stage'])(
		'rejects reserved host member %s before removing the old skin', name => {
			const view = new View();
			const button = new Button();
			const previous = skin({ btnClose: button });
			view.skinName = previous;
			expect(() => { view.skinName = skin({ [name]: new Label() }); }).toThrow(/skin part/i);
			expect(view.skin).toBe(previous);
			expect(view.skinName).toBe(previous);
			expect(view.btnClose).toBe(button);
			expect(view.snapshots).toHaveLength(1);
		},
	);

	it('rejects an initialized business field and an application accessor without invoking it', () => {
		class StatefulView extends Component {
			public caption = 'business state';
			public setterCalls = 0;
			public set custom(_value: unknown) {
				this.setterCalls++;
			}
		}
		const view = new StatefulView();
		expect(() => { view.skinName = skin({ caption: new Label() }); }).toThrow(/skin part/i);
		expect(() => { view.skinName = skin({ custom: new Label() }); }).toThrow(/skin part/i);
		expect(view.caption).toBe('business state');
		expect(view.setterCalls).toBe(0);
	});

	it('preserves a field reassigned by application cleanup', () => {
		const view = new View();
		view.skinName = skin({ btnClose: new Button() });
		const replacement = new Button();
		view.btnClose = replacement;
		view.skinName = undefined;
		expect(view.btnClose).toBe(replacement);
	});

	it('restores an existing empty field descriptor after detachment', () => {
		class OptionalView extends Component {
			public caption?: Label;
		}
		const view = new OptionalView();
		const original = Object.getOwnPropertyDescriptor(view, 'caption');
		const label = new Label();
		view.skinName = skin({ caption: label });
		expect(view.caption).toBe(label);
		view.skinName = undefined;
		expect(Object.getOwnPropertyDescriptor(view, 'caption')).toEqual(original);
	});

	it('uses native slider setters and cleans listeners without replacing the accessors', () => {
		const slider = new HSlider();
		const thumb = new Component();
		const track = new Component();
		slider.skinName = skin({ thumb, track });
		expect(slider.thumb).toBe(thumb);
		expect(Object.hasOwn(slider, 'thumb')).toBe(false);
		expect(thumb.hasEventListener(TouchEvent.TOUCH_BEGIN)).toBe(true);
		expect(track.hasEventListener(TouchEvent.TOUCH_BEGIN)).toBe(true);
		slider.skinName = undefined;
		expect(slider.thumb).toBeUndefined();
		expect(thumb.hasEventListener(TouchEvent.TOUCH_BEGIN)).toBe(false);
		expect(track.hasEventListener(TouchEvent.TOUCH_BEGIN)).toBe(false);
	});

	it('rejects an invalid native part before losing the existing valid skin', () => {
		const button = new Button();
		const label = new Label();
		const previous = skin({ labelDisplay: label });
		button.skinName = previous;
		expect(() => { button.skinName = skin({ labelDisplay: new Component() }); }).toThrow(/skin part/i);
		expect(button.skin).toBe(previous);
		expect(button.labelDisplay).toBe(label);
	});

	it('keeps fields installed by a base constructor when derived declarations emit no initialization', () => {
		const button = new Button();
		class Base extends Component {
			public constructor() {
				super();
				this.skinName = skin({ btnClose: button });
			}
		}
		class Derived extends Base {
			declare btnClose: Button;
		}
		expect(new Derived().btnClose).toBe(button);
	});

	it('keeps native fields available throughout subclass cleanup, including after super', () => {
		class NativeView extends Button {
			public removedLabel?: Label;
			protected override onSkinRemoved(): void {
				super.onSkinRemoved();
				this.removedLabel = this.labelDisplay;
			}
		}
		const button = new NativeView();
		const label = new Label();
		button.skinName = skin({ labelDisplay: label });
		button.skinName = undefined;
		expect(button.removedLabel).toBe(label);
		expect(button.labelDisplay).toBeUndefined();
	});

	it('rejects a getter-only native slot before detaching an existing skin', () => {
		class ReadonlySlider extends HSlider {
			public override get thumb(): DisplayObject | undefined {
				return super.thumb;
			}
		}
		const slider = new ReadonlySlider();
		const previous = skin({ caption: new Label() });
		slider.skinName = previous;
		expect(() => { slider.skinName = skin({ thumb: new Component() }); }).toThrow(/not writable/);
		expect(slider.skin).toBe(previous);
	});

	it('does not overwrite application fields changed by the removal hook', () => {
		const replacement = new Button();
		class ChangedView extends View {
			protected override onSkinRemoved(): void {
				this.btnClose = replacement;
			}
		}
		const view = new ChangedView();
		view.skinName = skin({ btnClose: new Button() });
		expect(() => { view.skinName = skin({ btnClose: new Button() }); }).toThrow(/conflict/);
		expect(view.btnClose).toBe(replacement);
		expect(view.skin).toBeUndefined();
	});
});
