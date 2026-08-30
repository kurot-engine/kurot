import type { Component, IOverride, Skin } from '@kurot/ui';
import { Animation } from '@kurot/ui';
import type { UIPropertyTransition } from '@kurot/ui-document';

/**
 * Applies one numeric skin-state property through a bounded transition.
 */
export class TransitionSetProperty implements IOverride {
	private readonly _target: string;
	private readonly _name: string;
	private readonly _value: unknown;
	private readonly _transition: UIPropertyTransition;
	private _animation?: Animation;
	private _oldValue: unknown;
	private _applied = false;

	public constructor(
		target: string,
		name: string,
		value: unknown,
		transition: UIPropertyTransition,
	) {
		this._target = target;
		this._name = name;
		this._value = value;
		this._transition = transition;
	}

	public apply(_host: Component, skin: Skin): void {
		const target = this.resolveTarget(skin);
		if (target === undefined) {
			return;
		}
		this.stopAnimation();
		this._oldValue = Reflect.get(target, this._name);
		this._applied = true;
		if (typeof this._oldValue !== 'number' || typeof this._value !== 'number') {
			Reflect.set(target, this._name, this._value);
			return;
		}
		this.animate(target, this._oldValue, this._value);
	}

	public remove(_host: Component, skin: Skin): void {
		if (!this._applied) {
			return;
		}
		const target = this.resolveTarget(skin);
		this.stopAnimation();
		if (target !== undefined) {
			Reflect.set(target, this._name, this._oldValue);
		}
		this._applied = false;
	}

	private animate(target: object, from: number, to: number): void {
		const delay = this._transition.delay ?? 0;
		const duration = this._transition.duration;
		const total = delay + duration;
		if (total === 0) {
			Reflect.set(target, this._name, to);
			return;
		}
		const animation = new Animation((): void => {
			const elapsed = animation.currentValue * total;
			const fraction = duration === 0
				? elapsed >= delay ? 1 : 0
				: Math.max(0, Math.min(1, (elapsed - delay) / duration));
			const eased = ease(fraction, this._transition.easing ?? 'linear');
			Reflect.set(target, this._name, from + (to - from) * eased);
		}, this);
		animation.duration = total;
		animation.from = 0;
		animation.to = 1;
		animation.easerFunction = value => value;
		this._animation = animation;
		animation.play();
	}

	private resolveTarget(skin: Skin): object | undefined {
		const target = this._target.length === 0 ? skin : skin.getPart(this._target);
		if (target === null || typeof target !== 'object') {
			return undefined;
		}
		return target;
	}

	private stopAnimation(): void {
		this._animation?.stop();
		this._animation = undefined;
	}
}

function ease(
	value: number,
	type: NonNullable<UIPropertyTransition['easing']>,
): number {
	switch (type) {
		case 'ease-in':
			return value * value;
		case 'ease-in-out':
			return value < 0.5
				? 2 * value * value
				: 1 - Math.pow(-2 * value + 2, 2) / 2;
		case 'ease-out':
			return 1 - (1 - value) * (1 - value);
		case 'linear':
			return value;
	}
}
