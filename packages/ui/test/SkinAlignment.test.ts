/**
 * Skin alignment regression tests.
 *
 * Verifies that the skins and component APIs from the my-game / CLI templates
 * are aligned:
 * - skin parts are correctly attached via Component.setSkinPart
 * - state changes apply SetProperty (ToggleSwitch knob slides)
 * - Panel's closeButton / moveArea are recognised
 *
 * The skin factories here are hand-written equivalents of the codegen output.
 * If codegen behavior changes, these tests will fail first.
 */
import { describe, it, expect } from 'vitest';
import {
	Skin,
	SetProperty,
	State,
	Button,
	Rect,
	Label,
	ToggleSwitch,
	RadioButton,
	Panel,
	HSlider,
	ProgressBar,
	Component,
	PropertyEvent,
	Group,
	HorizontalLayout,
	VerticalLayout,
} from '../src/index.js';

/** Replicates the compiled ToggleSwitchSkin.exml factory (key states only). */
function makeToggleSwitchSkin(): Skin {
	const skin = new Skin();
	skin.skinParts = ['knob'];
	skin.width = 52;
	skin.height = 28;

	const track = new Rect();
	track.width = 52;
	track.height = 28;
	track.fillColor = 0x636e72;

	const knob = new Rect();
	knob.x = 4;
	knob.y = 4;
	knob.width = 20;
	knob.height = 20;
	(skin as unknown as Record<string, unknown>).knob = knob;

	skin.elementsContent = [track, knob];
	skin.states = [
		new State('up'),
		new State('down'),
		new State('disabled'),
		new State('upAndSelected', [
			new SetProperty('knob', 'x', 28),
			new SetProperty('knob', 'fillColor', 0xffffff),
		]),
		new State('downAndSelected', [new SetProperty('knob', 'x', 28)]),
		new State('disabledAndSelected', [new SetProperty('knob', 'x', 28)]),
	];
	return skin;
}

/** Replicates the compiled PanelSkin.exml factory (key parts only). */
function makePanelSkin(): Skin {
	const skin = new Skin();
	skin.skinParts = ['moveArea', 'titleDisplay', 'closeButton'];
	skin.width = 300;
	skin.height = 200;

	const bg = new Rect();
	bg.width = 300;
	bg.height = 200;

	const moveArea = new Rect();
	moveArea.width = 300;
	moveArea.height = 36;
	(skin as unknown as Record<string, unknown>).moveArea = moveArea;

	const titleDisplay = new Label();
	(skin as unknown as Record<string, unknown>).titleDisplay = titleDisplay;

	const closeButton = new Button();
	closeButton.label = '×';
	(skin as unknown as Record<string, unknown>).closeButton = closeButton;

	skin.elementsContent = [bg, moveArea, titleDisplay, closeButton];
	return skin;
}

describe('skin alignment (my-game / cli template)', () => {
	it('ToggleSwitch knob slides to x=28 when selected', () => {
		const ts = new ToggleSwitch();
		const skin = makeToggleSwitchSkin();
		// Use the internal skin-attach path (equivalent to the protected setSkin).
		(ts as unknown as { _setSkin: (s: Skin) => void })._setSkin(skin);

		const knob = skin.getPart('knob') as Rect;
		expect(knob).toBeInstanceOf(Rect);

		// Initial: not selected, knob at x=4.
		ts.currentState = 'up';
		(skin as unknown as { currentState: string }).currentState = 'up';
		expect(knob.x).toBe(4);

		// Selected: currentState switches to upAndSelected, knob should slide to x=28.
		ts.selected = true;
		// Simulate commitProperties syncing skin.currentState.
		(skin as unknown as { currentState: string }).currentState = 'upAndSelected';
		expect(knob.x).toBe(28);
	});

	it('Panel skin exposes closeButton + moveArea + titleDisplay parts', () => {
		const panel = new Panel();
		const skin = makePanelSkin();
		(panel as unknown as { _setSkin: (s: Skin) => void })._setSkin(skin);

		expect(panel.closeButton).toBeInstanceOf(Button);
		expect(panel.moveArea).toBeInstanceOf(Rect);
		expect(panel.titleDisplay).toBeInstanceOf(Label);

		// closeButton skinParts are registered in skin.skinParts.
		expect(skin.skinParts).toContain('closeButton');
		expect(skin.skinParts).toContain('moveArea');
		expect(skin.skinParts).toContain('titleDisplay');
	});

	it('Panel title flows through titleDisplay part', () => {
		const panel = new Panel();
		panel.title = 'Hello';
		const skin = makePanelSkin();
		// partAdded writes the title after binding titleDisplay.
		(panel as unknown as { _setSkin: (s: Skin) => void })._setSkin(skin);

		expect(panel.titleDisplay?.text).toBe('Hello');
	});

	// ── Composite skin: custom component + multiple nested skin parts ──────
	describe('composite skin (settings-screen pattern)', () => {
		/** A minimal custom component declaring multiple skin parts, recording partAdded calls. */
		class FakeSettingsScreen extends Component {
			public titleDisplay?: Label;
			public closeButton?: Button;
			public soundToggle?: ToggleSwitch;
			public volumeSlider?: HSlider;
			public readonly added: string[] = [];

			public override partAdded(partName: string, instance: unknown): void {
				super.partAdded(partName, instance);
				this.added.push(partName);
				if (partName === 'titleDisplay' && instance instanceof Label) this.titleDisplay = instance;
				if (partName === 'closeButton' && instance instanceof Button) this.closeButton = instance;
				if (partName === 'soundToggle' && instance instanceof ToggleSwitch) this.soundToggle = instance;
				if (partName === 'volumeSlider' && instance instanceof HSlider) this.volumeSlider = instance;
			}
		}

		function makeSettingsSkin(): Skin {
			const skin = new Skin();
			const title = new Label();
			const closeBtn = new Button();
			const sound = new ToggleSwitch();
			const slider = new HSlider();
			(skin as unknown as Record<string, unknown>).titleDisplay = title;
			(skin as unknown as Record<string, unknown>).closeButton = closeBtn;
			(skin as unknown as Record<string, unknown>).soundToggle = sound;
			(skin as unknown as Record<string, unknown>).volumeSlider = slider;
			skin.skinParts = ['titleDisplay', 'closeButton', 'soundToggle', 'volumeSlider'];
			skin.elementsContent = [title, closeBtn, sound, slider];
			return skin;
		}

		it('binds every named skin part onto the custom component', () => {
			const screen = new FakeSettingsScreen();
			(screen as unknown as { _setSkin: (s: Skin) => void })._setSkin(makeSettingsSkin());

			expect(screen.titleDisplay).toBeInstanceOf(Label);
			expect(screen.closeButton).toBeInstanceOf(Button);
			expect(screen.soundToggle).toBeInstanceOf(ToggleSwitch);
			expect(screen.volumeSlider).toBeInstanceOf(HSlider);
			expect(screen.added.sort()).toEqual(['closeButton', 'soundToggle', 'titleDisplay', 'volumeSlider']);
		});

		it('HSlider: programmatic value set dispatches propertyChange, not CHANGE', () => {
			// CHANGE is reserved for interaction (thumb drag / track tap).
			// Programmatic value changes only dispatch propertyChange.
			const slider = new HSlider();
			slider.maximum = 100;
			slider.minimum = 0;

			const changeCalls: unknown[] = [];
			const propCalls: string[] = [];
			slider.addEventListener('change', () => changeCalls.push(true));
			slider.addEventListener(PropertyEvent.PROPERTY_CHANGE, e => propCalls.push((e as PropertyEvent).property));

			slider.value = 42;
			// value goes through invalidateProperties; without a stage the validation
			// cycle won't run on its own — call commitProperties() to flush and trigger
			// setValue → propertyChange.
			slider.commitProperties();

			// Programmatic set does not dispatch CHANGE.
			expect(changeCalls).toHaveLength(0);
			// Only dispatches propertyChange with property === 'value'.
			expect(propCalls).toContain('value');
		});
	});

	// ── Group layout: horizontal / vertical arrangement ───────────────────
	describe('Group layout (HorizontalLayout / VerticalLayout)', () => {
		it('HorizontalLayout arranges children left-to-right with gap spacing', () => {
			// Replicates the quality row from SettingsScreenSkin: Group + HorizontalLayout.
			const group = new Group();
			group.width = 528;
			group.height = 48;

			const layout = new HorizontalLayout();
			layout.gap = 16;
			layout.verticalAlign = 'middle';
			group.layout = layout;

			const a = new Rect();
			a.width = 120;
			a.height = 48;
			const b = new Rect();
			b.width = 96;
			b.height = 32;
			const c = new Rect();
			c.width = 96;
			c.height = 32;
			group.elementsContent = [a, b, c];

			// No stage — layout won't run on its own; call updateDisplayList to flush.
			group.updateDisplayList(528, 48);

			// a at 0; b after a + gap; c after b + gap.
			expect(a.x).toBe(0);
			expect(b.x).toBe(120 + 16);
			expect(c.x).toBe(120 + 16 + 96 + 16);
		});

		it('VerticalLayout arranges children top-to-bottom with gap spacing', () => {
			const group = new Group();
			group.width = 100;
			group.height = 200;

			const layout = new VerticalLayout();
			layout.gap = 8;
			group.layout = layout;

			const a = new Rect();
			a.width = 100;
			a.height = 40;
			const b = new Rect();
			b.width = 100;
			b.height = 40;
			group.elementsContent = [a, b];

			group.updateDisplayList(100, 200);

			expect(a.y).toBe(0);
			expect(b.y).toBe(40 + 8);
		});
	});

	// ── RadioButton group mutual exclusion ────────────────────────────────
	describe('RadioButton groupName mutual exclusion', () => {
		it('setting selected=true after groupName still triggers mutual exclusion', () => {
			// Replicates the codegen order: groupName set first, then selected.
			const rb1 = new RadioButton();
			rb1.groupName = 'quality';
			rb1.value = 'low';

			const rb2 = new RadioButton();
			rb2.groupName = 'quality';
			rb2.value = 'mid';
			// selected is set after groupName (same order as EXML selected="true").
			rb2.selected = true;

			const rb3 = new RadioButton();
			rb3.groupName = 'quality';
			rb3.value = 'high';

			expect(rb1.selected).toBe(false);
			expect(rb2.selected).toBe(true); // EXML-set default selection
			expect(rb3.selected).toBe(false);

			// Select rb1.
			rb1.selected = !rb1.selected;
			expect(rb1.selected).toBe(true);
			expect(rb2.selected).toBe(false);
			expect(rb3.selected).toBe(false);
		});

		it('buttonReleased click path triggers mutual exclusion + CHANGE dispatch', () => {
			// Calls buttonReleased() directly — specifically covers the old bug where
			// buttonReleased wrote `this._selected = !this._selected` directly to the
			// private field, bypassing the RadioButton selected setter so group
			// mutual exclusion was never triggered.
			const rb1 = new RadioButton();
			rb1.groupName = 'quality';
			rb1.value = 'low';

			const rb2 = new RadioButton();
			rb2.groupName = 'quality';
			rb2.value = 'mid';

			// Initially all unselected.
			expect(rb1.selected).toBe(false);
			expect(rb2.selected).toBe(false);

			// Click rb1 (via the real buttonReleased path, not the setter directly).
			(rb1 as any).buttonReleased();
			expect(rb1.selected).toBe(true);

			// Click rb2 — must deselect rb1, otherwise mutual exclusion failed.
			(rb2 as any).buttonReleased();
			expect(rb1.selected).toBe(false);
			expect(rb2.selected).toBe(true);
		});

		it('clicking an already-selected radio does not deselect it (cannot empty the group)', () => {
			const rb1 = new RadioButton();
			rb1.groupName = 'quality';
			rb1.value = 'low';

			const rb2 = new RadioButton();
			rb2.groupName = 'quality';
			rb2.value = 'mid';

			// Select rb1 first.
			(rb1 as any).buttonReleased();
			expect(rb1.selected).toBe(true);

			// Click the already-selected rb1 — should stay selected.
			(rb1 as any).buttonReleased();
			expect(rb1.selected).toBe(true);
			expect(rb2.selected).toBe(false);

			// Must click a different radio to switch.
			(rb2 as any).buttonReleased();
			expect(rb1.selected).toBe(false);
			expect(rb2.selected).toBe(true);
		});
	});
});
