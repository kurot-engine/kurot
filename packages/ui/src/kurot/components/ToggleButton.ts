import { Button } from './Button.js';

/**
 * A Button that automatically toggles its selected state on each click.
 * Sets `toggle = true` by default.
 *
 * States: same as Button (`up`, `down`, `disabled`, `upAndSelected`, `downAndSelected`, `disabledAndSelected`).
 */
export class ToggleButton extends Button {
	public constructor() {
		super();
		this.toggle = true;
	}
}
