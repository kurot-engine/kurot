/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	createUIAssetReference,
	createUIResourceReference,
	parseUIDocument,
	serializeUIDocument,
	UIAssetRegistry,
	validateUIAssetRegistry,
} from '../src/index.js';

const ACTION_CARD = readFixture('action-card.component.json');
const BUTTON_APPEARANCE = readFixture('button.appearance.json');
const LOBBY_SCREEN = readFixture('lobby.screen.json');

describe('UI asset registry', () => {
	it('round-trips all authoring asset kinds with stable golden output', () => {
		for (const source of [ACTION_CARD, BUTTON_APPEARANCE, LOBBY_SCREEN]) {
			const document = parseUIDocument(source);
			expect(serializeUIDocument(document)).toBe(source.trimEnd());
		}
	});

	it('keeps two reusable instances compact and validates their project graph', () => {
		const registry = createFixtureRegistry();
		const screenSource = serializeUIDocument(registry.getAsset('lobby-screen')!);

		expect(validateUIAssetRegistry(registry)).toEqual([]);
		expect(screenSource.match(/"assetId": "action-card"/g)).toHaveLength(2);
		expect(screenSource).not.toContain('"id": "background"');
		expect(screenSource).not.toContain('"id": "content-slot"');
	});

	it('reports invalid instance contracts', () => {
		const registry = createFixtureRegistry();
		const screen = registry.getAsset('lobby-screen')!;
		const invalid = {
			...screen,
			root: {
				...screen.root,
				children: [
					{
						...screen.root.children[0]!,
						instance: {
							...screen.root.children[0]!.instance!,
							parameters: { unknown: true },
							variant: 'missing',
							overrides: [
								{
									...screen.root.children[0]!.instance!.overrides[0]!,
									property: 'textColour',
								},
							],
							slots: {
								content: [
									screen.root.children[0]!.instance!.slots.content![0]!,
									{
										...screen.root.children[0]!.instance!.slots.content![0]!,
										id: 'play-hint-2',
									},
								],
							},
						},
					},
				],
			},
		};
		const invalidRegistry = new UIAssetRegistry();
		const component = parseUIDocument(ACTION_CARD);
		invalidRegistry.registerAsset({
			...component,
			contract: {
				...component.contract,
				slots: {
					content: {
						...component.contract.slots.content!,
						capacity: 'single',
					},
				},
			},
		});
		invalidRegistry.registerAsset(invalid);
		const codes = validateUIAssetRegistry(invalidRegistry).map(item => item.code);

		expect(codes).toContain('missing-instance-parameter');
		expect(codes).toContain('unknown-instance-parameter');
		expect(codes).toContain('unknown-variant');
		expect(codes).toContain('invalid-slot-content');
		expect(codes).toContain('unknown-component-property');
	});

	it('detects circular reusable asset dependencies', () => {
		const component = parseUIDocument(ACTION_CARD);
		const circular = {
			...component,
			root: {
				...component.root,
				children: [
					...component.root.children,
					{
						id: 'recursive',
						type: 'game.ActionCard',
						properties: {},
						instance: {
							source: createUIAssetReference('action-card'),
							parameters: { label: 'Recursive' },
							overrides: [],
							slots: {},
						},
						children: [],
					},
				],
			},
		};
		const registry = new UIAssetRegistry();
		registry.registerAsset(circular);

		expect(validateUIAssetRegistry(registry).map(item => item.code)).toContain(
			'circular-ui-asset-dependency',
		);
	});

	it('validates appearance variant selection against the referenced asset', () => {
		const registry = createFixtureRegistry();
		const screen = registry.getAsset('lobby-screen')!;
		const nativeButton = screen.root.children[2]!;
		const invalid = {
			...screen,
			root: {
				...screen.root,
				children: [
					...screen.root.children.slice(0, 2),
					{
						...nativeButton,
						appearance: {
							...nativeButton.appearance!,
							variant: 'missing',
						},
					},
				],
			},
		};
		const invalidRegistry = new UIAssetRegistry();
		invalidRegistry.registerAsset(registry.getAsset('action-card')!);
		invalidRegistry.registerAsset(
			registry.getAsset('primary-button-appearance')!,
		);
		invalidRegistry.registerAsset(invalid);
		for (const token of registry.listTokens()) {
			invalidRegistry.registerToken(token);
		}
		expect(validateUIAssetRegistry(invalidRegistry)).toContainEqual({
			code: 'unknown-variant',
			severity: 'error',
			path: '$.assets["lobby-screen"].root.children[2].appearance.variant',
			message:
				'Variant "missing" is not published by appearance asset "primary-button-appearance".',
		});
	});

	it('checks registered resource and token categories', () => {
		const screen = parseUIDocument(LOBBY_SCREEN);
		const nativeButton = screen.root.children[2]!;
		const withIcon = {
			...screen,
			root: {
				...screen.root,
				children: [
					...screen.root.children.slice(0, 2),
					{
						...nativeButton,
						properties: {
							...nativeButton.properties,
							icon: createUIResourceReference('image', 'font.main'),
						},
					},
				],
			},
		};
		const registry = new UIAssetRegistry();
		registry.registerAsset(parseUIDocument(ACTION_CARD));
		registry.registerAsset(parseUIDocument(BUTTON_APPEARANCE));
		registry.registerAsset(withIcon);
		registry.registerResource({ key: 'font.main', resourceType: 'font' });
		registry.registerToken({
			key: 'color.action.primary',
			tokenType: 'string',
			value: '#3366ff',
		});
		const codes = validateUIAssetRegistry(registry).map(item => item.code);

		expect(codes).toContain('resource-type-mismatch');
		expect(codes).toContain('token-type-mismatch');
	});
});

function createFixtureRegistry(): UIAssetRegistry {
	const registry = new UIAssetRegistry();
	registry.registerAsset(parseUIDocument(ACTION_CARD));
	registry.registerAsset(parseUIDocument(BUTTON_APPEARANCE));
	registry.registerAsset(parseUIDocument(LOBBY_SCREEN));
	registry.registerToken({
		key: 'color.action.primary',
		tokenType: 'color',
		value: 0x3366ff,
	});
	return registry;
}

function readFixture(name: string): string {
	return readFileSync(
		fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)),
		'utf8',
	);
}
