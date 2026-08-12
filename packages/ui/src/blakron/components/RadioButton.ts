import { EventDispatcher, Event } from '@blakron/core';
import { ToggleButton } from './ToggleButton.js';
import { PropertyEvent } from '../events/PropertyEvent.js';

/**
 * Manages a group of mutually exclusive RadioButtons.
 * Only one radio button in a group can be selected at a time.
 *
 * Dispatches `Event.CHANGE` on interactive selection (via `buttonReleased`),
 * and `PropertyEvent` for `selectedValue` on every selection change.
 */
export class RadioButtonGroup extends EventDispatcher {
	// ── Instance fields ───────────────────────────────────────────────────

	private _radioButtons: RadioButton[] = [];
	private _selectedValue?: string | number;
	private _selection?: RadioButton;
	private _name: string;
	private _enabled = true;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(name = '') {
		super();
		this._name = name;
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get name(): string {
		return this._name;
	}

	public get numRadioButtons(): number {
		return this._radioButtons.length;
	}

	/**
	 * Whether the group (and therefore all its members) is enabled.
	 * Toggling invalidates every member's state so skins re-render.
	 */
	public get enabled(): boolean {
		return this._enabled;
	}

	public set enabled(value: boolean) {
		value = !!value;
		if (this._enabled === value) return;
		this._enabled = value;
		for (const rb of this._radioButtons) {
			rb.invalidateState();
		}
	}

	/**
	 * The value of the selected radio. Falls back to the radio's `label`
	 * when `value` is empty.
	 */
	public get selectedValue(): string | number | undefined {
		if (this._selection) {
			return this._selection.value !== '' ? this._selection.value : this._selection.label;
		}
		return this._selectedValue;
	}

	public set selectedValue(value: string | number | undefined) {
		this._selectedValue = value;
		if (value === undefined) {
			this.$setSelection(undefined, false);
			return;
		}
		for (const rb of this._radioButtons) {
			if (rb.value === value || rb.label === value) {
				this.$setSelection(rb, false);
				this._selectedValue = undefined;
				PropertyEvent.dispatchPropertyEvent(this, 'selectedValue');
				break;
			}
		}
	}

	public get selection(): RadioButton | undefined {
		return this._selection;
	}

	public set selection(value: RadioButton | undefined) {
		if (this._selection === value) return;
		this.$setSelection(value, false);
	}

	// ── Public methods ────────────────────────────────────────────────────

	public addInstance(radioButton: RadioButton): void {
		if (this._radioButtons.indexOf(radioButton) !== -1) return;
		this._radioButtons.push(radioButton);
		// Adopt an already-selected radio as the group's selection.
		if (radioButton.selected) {
			this.$setSelection(radioButton, false);
		} else if (this._selectedValue !== undefined) {
			// A selectedValue was set before this radio joined — re-apply.
			this.selectedValue = this._selectedValue;
		}
	}

	public removeInstance(radioButton: RadioButton): void {
		const idx = this._radioButtons.indexOf(radioButton);
		if (idx === -1) return;
		this._radioButtons.splice(idx, 1);
		if (this._selection === radioButton) {
			this._selection = undefined;
		}
	}

	/**
	 * The single source of truth for changing the selection.
	 *
	 * @param value     The radio to select, or `undefined` to clear.
	 * @param fireChange If `true`, dispatches `Event.CHANGE` — use `true` for
	 *                   interactive changes (tap), `false` for programmatic ones.
	 */
	public $setSelection(value: RadioButton | undefined, fireChange: boolean): boolean {
		if (this._selection === value) return false;
		if (value === undefined) {
			if (this._selection) {
				this._selection.$setSelected(false);
				this._selection = undefined;
				if (fireChange) this.dispatchEventWith(Event.CHANGE);
			}
		} else {
			if (this._selection) this._selection.$setSelected(false);
			this._selection = value;
			this._selection.$setSelected(true);
			if (fireChange) this.dispatchEventWith(Event.CHANGE);
		}
		PropertyEvent.dispatchPropertyEvent(this, 'selectedValue');
		return true;
	}
}

// ── Global registry for named groups ─────────────────────────────────────

const _groups: Record<string, RadioButtonGroup> = {};

function getGroup(name: string): RadioButtonGroup {
	if (!_groups[name]) {
		_groups[name] = new RadioButtonGroup(name);
	}
	return _groups[name];
}

// ── RadioButton Component ────────────────────────────────────────────────

/**
 * RadioButton — a toggle button belonging to a mutually exclusive group.
 * Only one radio per group can be selected at a time.
 *
 * Defaults to `groupName = "radioGroup"` so that radios with no explicit
 * group still get mutual exclusion.
 *
 * States: same as Button (`up`, `down`, `disabled`, `upAndSelected`, `downAndSelected`, `disabledAndSelected`).
 */
export class RadioButton extends ToggleButton {
	// ── Instance fields ───────────────────────────────────────────────────

	private _groupName = '';
	private _group?: RadioButtonGroup;
	private _value: string | number = '';

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor() {
		super();
		this.groupName = 'radioGroup';
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	/** Enabled only if both the radio itself and its group are enabled. */
	public override get enabled(): boolean {
		if (!super.enabled) return false;
		return !this._group || this._group.enabled;
	}

	public override set enabled(value: boolean) {
		super.enabled = value;
	}

	public get group(): RadioButtonGroup | undefined {
		return this._group;
	}

	public set group(value: RadioButtonGroup | undefined) {
		if (this._group === value) return;
		this._group?.removeInstance(this);
		this._group = value;
		this._group?.addInstance(this);
	}

	public get groupName(): string {
		return this._groupName;
	}

	public set groupName(value: string) {
		if (this._groupName === value) return;
		this._groupName = value;
		this.group = value ? getGroup(value) : undefined;
	}

	public get value(): string | number {
		return this._value;
	}

	public set value(val: string | number) {
		if (this._value === val) return;
		this._value = val;
		// If this radio is the current selection, notify the group so
		// selectedValue bindings update.
		if (this.selected && this._group) {
			PropertyEvent.dispatchPropertyEvent(this._group, 'selectedValue');
		}
	}

	public override get selected(): boolean {
		return super.selected;
	}

	/**
	 * Keeps the group's selection in sync. Programmatic changes use
	 * `fireChange=false` (no `Event.CHANGE`); interactive changes go through
	 * `buttonReleased`, which dispatches `CHANGE` separately.
	 */
	public override set selected(value: boolean) {
		if (this.selected === value) return;
		super.selected = value;
		if (!this._group) return;
		if (value) {
			this._group.$setSelection(this, false);
		} else if (this._group.selection === this) {
			this._group.$setSelection(undefined, false);
		}
	}

	/**
	 * @internal Sets `selected` without triggering group sync.
	 * Used by `RadioButtonGroup.$setSelection` to avoid recursion.
	 */
	public $setSelected(value: boolean): void {
		super.selected = value;
	}

	/**
	 * Interactive tap: toggle `selected` (syncs the group with no Change via
	 * the setter), then dispatch `Event.CHANGE` on the group — reserved for
	 * interaction, not programmatic selection.
	 */
	protected override buttonReleased(): void {
		if (!this.enabled || this.selected) return;
		if (!this._group) {
			super.buttonReleased();
			return;
		}
		super.buttonReleased();
		this._group.dispatchEventWith(Event.CHANGE);
	}
}
