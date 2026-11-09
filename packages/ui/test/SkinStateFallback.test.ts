import { afterEach, describe, expect, it, vi } from 'vitest';
import { Event, Stage } from '@kurot/core';
import { AddItems, Component, Group, SetProperty, Skin, State } from '../src/index.js';

const cleanups: (() => void)[] = [];
afterEach(() => {
	for (const cleanup of cleanups.splice(0)) {
		cleanup();
	}
});

function fixture(stateless = false) {
	const stage = new Stage();
	const host = new Component();
	const skin = new Skin();
	const icon = new Group();
	const background = new Group();
	const add = new AddItems('icon', '', 0);
	skin.setPart('icon', icon);
	skin.elementsContent = [background];
	skin.states = stateless ? [] : [new State('rest', [add]), new State('inspect', [new SetProperty('', 'minWidth', 40)])];
	host.skinName = skin;
	stage.addChild(host);
	cleanups.push(() => {
		host.skinName = '';
		stage.removeChild(host);
	});
	return { stage, host, skin, icon, background, add };
}

describe('Skin effective state resolution', () => {
	it('resolves unknown names before undoing the first state, preserving identity, order and visibility', () => {
		const { host, skin, icon, background, add } = fixture();
		host.currentState = 'rest';
		host.validateNow();
		icon.visible = false;
		const apply = vi.spyOn(add, 'apply');
		const remove = vi.spyOn(add, 'remove');
		const lifecycle: string[] = [];
		for (const type of [Event.ADDED, Event.REMOVED, Event.ADDED_TO_STAGE, Event.REMOVED_FROM_STAGE]) {
			icon.addEventListener(type, event => lifecycle.push(event.type));
		}
		for (const requested of ['down', 'unknown', 'rest', 'down']) {
			host.currentState = requested;
			host.validateNow();
			expect(host.currentState).toBe(requested);
			expect(skin.currentState).toBe('rest');
			expect(skin.hasState(requested)).toBe(requested === 'rest');
			expect([host.getChildAt(0), host.getChildAt(1)]).toEqual([icon, background]);
			expect(skin.getPart('icon')).toBe(icon);
			expect(icon.visible).toBe(false);
		}
		expect(lifecycle).toEqual([]);
		expect(apply).not.toHaveBeenCalled();
		expect(remove).not.toHaveBeenCalled();
	});

	it('honors an explicit custom state and returns to the first declared state for an unknown name', () => {
		const { host, skin, icon } = fixture();
		host.currentState = 'inspect';
		host.validateNow();
		expect(skin.currentState).toBe('inspect');
		expect(skin.minWidth).toBe(40);
		expect(icon.parent).toBeUndefined();
		host.currentState = 'missing';
		host.validateNow();
		expect(skin.currentState).toBe('rest');
		expect(skin.minWidth).toBe(0);
		expect(icon.parent).toBe(host);
	});

	it('keeps an empty request as the base state and lets Component clear its explicit request', () => {
		const { host, skin, icon, add } = fixture();
		expect(skin.currentState).toBe('');
		expect(icon.parent).toBeUndefined();
		skin.currentState = 'missing';
		expect(icon.parent).toBe(host);
		const remove = vi.spyOn(add, 'remove');
		skin.currentState = '';
		skin.currentState = '';
		expect(skin.currentState).toBe('');
		expect(icon.parent).toBeUndefined();
		expect(remove).toHaveBeenCalledTimes(1);
		host.currentState = 'inspect';
		host.validateNow();
		host.currentState = '';
		host.validateNow();
		expect(skin.currentState).toBe('');
		expect(skin.minWidth).toBe(0);
	});

	it('resolves a deferred request when states are populated before attachment and reapplies on reuse', () => {
		const { host, skin, icon, add } = fixture();
		skin.hostComponent = undefined;
		skin.states = [];
		skin.currentState = 'missing';
		skin.states = [new State('rest', [add])];
		const apply = vi.spyOn(add, 'apply');
		const remove = vi.spyOn(add, 'remove');
		skin.hostComponent = host;
		expect(skin.currentState).toBe('rest');
		expect(icon.parent).toBe(host);
		expect(apply).toHaveBeenCalledTimes(1);
		expect(remove).not.toHaveBeenCalled();
		skin.hostComponent = undefined;
		expect(icon.parent).toBeUndefined();
		skin.hostComponent = host;
		expect(icon.parent).toBe(host);
		expect(apply).toHaveBeenCalledTimes(2);
		expect(remove).toHaveBeenCalledTimes(1);
	});

	it('keeps a stateless skin unchanged for named, disabled and empty requests', () => {
		const { host, skin, background } = fixture(true);
		const removed = vi.fn();
		background.addEventListener(Event.REMOVED, removed);
		for (const requested of ['down', 'custom', 'disabled', '']) {
			host.currentState = requested;
			host.validateNow();
			expect(skin.currentState).toBe(requested);
			expect(background.parent).toBe(host);
		}
		expect(removed).not.toHaveBeenCalled();
	});
});
