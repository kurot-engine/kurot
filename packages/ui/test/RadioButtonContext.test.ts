import { afterEach, describe, expect, it } from 'vitest';
import { Event, Sprite, Stage } from '@kurot/core';
import { Group, RadioButton, RadioButtonGroup, UIContext, UIEvent, getUIContext } from '../src/index.js';

const radios: RadioButton[] = [];
const owners: UIContext[] = [];

function owner(): UIContext {
	const value = new UIContext({
		skins: {},
		assetAdapter: { getAsset: (key, callback) => callback(undefined, key) },
	});
	owners.push(value);
	return value;
}

function radio(name: string): RadioButton {
	const value = new RadioButton();
	value.groupName = name;
	radios.push(value);
	return value;
}

afterEach(() => {
	for (const value of radios) {
		if (value.group) {
			value.group.enabled = true;
		}
		value.group = undefined;
	}
	radios.length = 0;
	for (const value of owners) {
		value.dispose();
	}
	owners.length = 0;
});

describe('automatic RadioButton context binding', () => {
	for (const mode of ['bind-tree', 'bind-before-add', 'bind-radio', 'plain-sprite-tree']) {
		it(`isolates named groups immediately through ${mode}`, () => {
			const a = owner();
			const b = owner();
			const roots = mode === 'plain-sprite-tree' ? [new Sprite(), new Sprite()] : [new Group(), new Group()];
			const name = `context-${mode}`;
			const global = radio(name);
			const globalGroup = global.group!;
			if (mode === 'bind-before-add') {
				a.bind(roots[0]);
				b.bind(roots[1]);
			}
			const first = radio(name);
			const peer = radio(name);
			const other = radio(name);
			roots[0].addChild(first);
			roots[0].addChild(peer);
			roots[1].addChild(other);
			if (mode === 'bind-radio') {
				a.bind(first);
				a.bind(peer);
				b.bind(other);
			} else if (mode !== 'bind-before-add') {
				a.bind(roots[0]);
				b.bind(roots[1]);
			}
			// Query the old group before touching a local radio: migration must be
			// proactive, rather than a getter repair that leaves global retention.
			expect(globalGroup.numRadioButtons).toBe(1);
			expect(getUIContext(first)).toBe(a);
			expect(getUIContext(other)).toBe(b);
			expect(first.group).toBe(peer.group);
			expect(first.group).not.toBe(other.group);
			first.selected = true;
			other.selected = true;
			peer.selected = true;
			expect([first.selected, peer.selected, other.selected]).toEqual([false, true, true]);
			first.group!.enabled = false;
			expect([first.enabled, peer.enabled, other.enabled, global.enabled]).toEqual([false, false, true, true]);
		});
	}

	it('handles plain Sprite insertion below a bound ancestor before target ADDED handlers', () => {
		const scope = owner();
		const root = new Sprite();
		scope.bind(root);
		const nested = new Sprite();
		const first = radio('context-insert');
		const global = radio('context-insert');
		const globalGroup = global.group!;
		nested.addChild(first);
		let membersOnAdded = 0;
		nested.addEventListener(Event.ADDED, () => {
			membersOnAdded = globalGroup.numRadioButtons;
		});
		root.addChild(nested);
		expect(membersOnAdded).toBe(1);
		expect(first.group).not.toBe(globalGroup);
	});

	for (const nested of [false, true]) {
		it(`resolves the group before creation-complete callbacks (nested=${nested})`, () => {
			const scope = owner();
			const root = new Group();
			const stage = new Stage();
			scope.bind(root);
			stage.addChild(root);
			const name = `context-before-creation-${nested}`;
			const first = radio(name);
			const global = radio(name);
			let isolatedOnCreation = false;
			first.addEventListener(UIEvent.CREATION_COMPLETE, () => {
				isolatedOnCreation = first.group !== global.group;
			});
			if (nested) {
				const branch = new Sprite();
				branch.addChild(first);
				root.addChild(branch);
			} else {
				root.addChild(first);
			}
			expect(isolatedOnCreation).toBe(true);
			stage.removeChildren();
		});
	}

	it('keeps a captured child context when a different owner binds its ancestor', () => {
		const a = owner();
		const b = owner();
		const root = new Group();
		const first = a.run(() => radio('context-nested'));
		const peer = b.run(() => radio('context-nested'));
		root.addChild(first);
		b.bind(root);
		expect(getUIContext(first)).toBe(a);
		expect(first.group).not.toBe(peer.group);
	});

	it('moves an inherited subtree between bound roots without joining a global group in between', () => {
		const a = owner();
		const b = owner();
		const firstRoot = new Sprite();
		const secondRoot = new Sprite();
		a.bind(firstRoot);
		b.bind(secondRoot);
		const branch = new Sprite();
		const first = radio('context-move');
		const global = radio('context-move');
		branch.addChild(first);
		firstRoot.addChild(branch);
		const old = first.group!;
		first.selected = true;
		global.selected = true;
		const peer = b.run(() => radio('context-move'));
		secondRoot.addChild(branch);
		expect(old.numRadioButtons).toBe(0);
		expect(first.group).toBe(peer.group);
		expect(first.selected).toBe(true);
		expect(global.selected).toBe(true);
	});

	it('preserves explicit groups and explicit opt-out across binding and insertion', () => {
		const scope = owner();
		const root = new Group();
		const first = radio('context-explicit');
		const other = radio('context-explicit');
		const manual = new RadioButtonGroup('author-owned');
		first.group = manual;
		other.group = undefined;
		root.addChild(first);
		root.addChild(other);
		scope.bind(root);
		expect(first.group).toBe(manual);
		expect(other.group).toBeUndefined();
		other.groupName = 'context-resume-automatic';
		expect(other.group).toBeDefined();
		expect(other.group).not.toBe(manual);
	});

	it('transfers the selected radio out of its old global group', () => {
		const scope = owner();
		const first = radio('context-selected');
		const old = first.group!;
		first.selected = true;
		scope.bind(first);
		expect(old.numRadioButtons).toBe(0);
		expect(old.selection).toBeUndefined();
		expect(first.selected).toBe(true);
		expect(first.group!.selection).toBe(first);
	});
});
