/// <reference types="node" />

import { Event, TouchEvent } from '@kurot/core';
import { Button, Group, Label, ToggleButton } from '@kurot/ui';
import {
	createKurotUIFoundationRegistry,
	createUIAssetContract,
	createUIDocument,
	createUINode,
} from '@kurot/ui-document';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createKurotUI } from '../src/index.js';

beforeAll(() => {
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
		font: '',
		measureText: (text: string) => ({ width: text.length * 10 }),
	} as unknown as CanvasRenderingContext2D);
});

describe('runtime data and semantic actions', () => {
	it('applies bounded screen data and emits disposable semantic actions', () => {
		const actions: string[] = [];
		const document = createUIDocument({
			id: 'crash-runtime',
			contract: createUIAssetContract({
				dataFields: {
					multiplierText: { valueType: 'string', defaultValue: '1.00x' },
				},
				dataBindings: {
					multiplier: {
						source: 'multiplierText',
						targetId: 'multiplier',
						property: 'text',
					},
				},
				actions: {
					cashoutRequested: { sourceId: 'cashout', trigger: 'tap' },
					soundChanged: { sourceId: 'sound', trigger: 'change' },
				},
			}),
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				children: [
					createUINode({ id: 'multiplier', type: 'kui.Label' }),
					createUINode({ id: 'cashout', type: 'kui.Button' }),
					createUINode({ id: 'sound', type: 'kui.ToggleButton' }),
				],
			}),
		});
		const result = createKurotUI(document, {
			data: { multiplierText: '2.50x' },
			onAction: action => actions.push(action.action),
		});
		const multiplier = requireInstance(result.instances.get('multiplier'), Label);
		const cashout = requireInstance(result.instances.get('cashout'), Button);
		const sound = requireInstance(result.instances.get('sound'), ToggleButton);

		expect(multiplier.text).toBe('2.50x');
		result.data.setValue('multiplierText', '3.10x');
		expect(result.data.getValue('multiplierText')).toBe('3.10x');
		expect(multiplier.text).toBe('3.10x');
		TouchEvent.dispatchTouchEvent(cashout, TouchEvent.TOUCH_TAP, true);
		sound.dispatchEventWith(Event.CHANGE);
		expect(actions).toEqual(['cashoutRequested', 'soundChanged']);

		result.dispose();
		TouchEvent.dispatchTouchEvent(cashout, TouchEvent.TOUCH_TAP, true);
		sound.dispatchEventWith(Event.CHANGE);
		expect(actions).toEqual(['cashoutRequested', 'soundChanged']);
	});

	it('requires initial values for required data fields', () => {
		const document = createUIDocument({
			id: 'required-data',
			contract: createUIAssetContract({
				dataFields: { title: { valueType: 'string', required: true } },
			}),
			root: createUINode({ id: 'root', type: 'kui.Group' }),
		});

		expect(() => createKurotUI(document)).toThrowError(
			expect.objectContaining({
				code: 'invalid-data',
				path: '$.assets["required-data"].contract.dataFields.title',
			}),
		);
	});

	it('restores all binding targets and the controller value after a failure', () => {
		const registry = createKurotUIFoundationRegistry();
		registry.register({
			type: 'test.Probe',
			extends: 'kui.Group',
			children: 'none',
			properties: { status: { valueType: 'string' } },
		});
		const document = createUIDocument({
			id: 'atomic-data',
			contract: createUIAssetContract({
				dataFields: { status: { valueType: 'string', defaultValue: 'ready' } },
				dataBindings: {
					first: { source: 'status', targetId: 'label', property: 'text' },
					second: { source: 'status', targetId: 'probe', property: 'status' },
				},
			}),
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				children: [
					createUINode({ id: 'label', type: 'kui.Label' }),
					createUINode({ id: 'probe', type: 'test.Probe' }),
				],
			}),
		});
		const adapterState = new WeakMap<object, unknown>();
		const result = createKurotUI(document, {
			registry,
			adapters: {
				'test.Probe': {
					create: () => new Group(),
					applyProperty: (instance, _name, value) => {
						adapterState.set(instance, value);
						if (value === 'failed') {
							throw new Error('Adapter rejected the update.');
						}
						return true;
					},
					captureProperty: instance => adapterState.get(instance),
					restoreProperty: (instance, _name, value) => {
						adapterState.set(instance, value);
					},
				},
			},
		});
		const label = requireInstance(result.instances.get('label'), Label);
		const probe = requireInstance(result.instances.get('probe'), Group);

		expect(() => result.data.setValue('status', 'failed')).toThrow(
			'Adapter rejected the update.',
		);
		expect(result.data.getValue('status')).toBe('ready');
		expect(label.text).toBe('ready');
		expect(adapterState.get(probe)).toBe('ready');
	});
});

function requireInstance<T>(
	value: unknown,
	type: abstract new (...args: never[]) => T,
): T {
	if (value instanceof type) {
		return value;
	}
	throw new Error(`Expected ${type.name} instance.`);
}
