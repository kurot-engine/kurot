import { ToggleButton } from './ToggleButton.js';

/**
 * CheckBox component — a toggle button typically rendered with a checkmark.
 * Functionally identical to ToggleButton; the visual difference comes from the skin/theme.
 *
 * States: same as Button (`up`, `down`, `disabled`, `upAndSelected`, `downAndSelected`, `disabledAndSelected`).
 */
export class CheckBox extends ToggleButton {
	public constructor() {
		super();
	}
}
