/// <reference types="node" />

import { Group } from '@kurot/ui';
import {
	createKurotUIFoundationRegistry,
	createUIDocument,
	createUINode,
	createUIResourceReference,
	UIAssetRegistry,
} from '@kurot/ui-document';
import type { UIResourceType } from '@kurot/ui-document';
import { describe, expect, it } from 'vitest';
import { createKurotUI } from '../src/index.js';

const RESOURCE_TYPES: readonly UIResourceType[] = [
	'animation',
	'font',
	'image',
	'spine',
	'sprite-frame',
];

describe('resource adapters', () => {
	it('dispatches every semantic resource category to its matching adapter', () => {
		const registry = createKurotUIFoundationRegistry();
		registry.register({
			type: 'test.ResourceProbe',
			extends: 'kui.Group',
			children: 'none',
			properties: Object.fromEntries(
				RESOURCE_TYPES.map(type => [
					type,
					{ valueType: 'resource-reference', resourceTypes: [type] },
				]),
			),
		});
		const document = createUIDocument({
			id: 'resource-adapter-probe',
			root: createUINode({
				id: 'probe',
				type: 'test.ResourceProbe',
				properties: Object.fromEntries(
					RESOURCE_TYPES.map(type => [
						type,
						createUIResourceReference(type, `${type}.primary`),
					]),
				),
			}),
		});
		const assets = new UIAssetRegistry();
		for (const type of RESOURCE_TYPES) {
			assets.registerResource({
				key: `${type}.primary`,
				resourceType: type,
			});
		}
		const applied = new Map<string, unknown>();
		const calls: string[] = [];
		const resourceAdapters = Object.fromEntries(
			RESOURCE_TYPES.map(type => [
				type,
				(reference: { readonly key: string }): string => {
					calls.push(type);
					return `resolved:${reference.key}`;
				},
			]),
		);

		createKurotUI(document, {
			adapters: {
				'test.ResourceProbe': {
					create: () => new Group(),
					applyProperty: (_instance, name, value) => {
						applied.set(name, value);
						return true;
					},
				},
			},
			assets,
			registry,
			resourceAdapters,
		});

		expect(calls).toEqual(RESOURCE_TYPES);
		expect(Object.fromEntries(applied)).toEqual(
			Object.fromEntries(
				RESOURCE_TYPES.map(type => [type, `resolved:${type}.primary`]),
			),
		);
	});
});
