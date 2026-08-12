import { ToggleButton } from './ToggleButton.js';

/**
 * ToggleSwitch — a binary on/off switch.
 *
 * Visually distinct from CheckBox (typically renders as a sliding switch).
 * Inherits toggle behavior from ToggleButton.
 */
export class ToggleSwitch extends ToggleButton {
	// ToggleSwitch is purely a skin variant of ToggleButton.
	// EXML skins will render it as a sliding switch instead of a checkbox.
}
