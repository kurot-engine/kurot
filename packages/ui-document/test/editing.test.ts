/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	applyUIOperation,
	applyUITransaction,
	createUINode,
	diffUIDocuments,
	findUINode,
	parseUIDocument,
	UIDocumentHistory,
	UIEditError,
} from '../src/index.js';

const ACTION_CARD = readFixture('action-card.component.json');
const LOBBY_SCREEN = readFixture('lobby.screen.json');

describe('semantic UI operations', () => {
	it('applies immutable property edits and exact inverse operations', () => {
		const document = parseUIDocument(LOBBY_SCREEN);
		const result = applyUIOperation(document, {
			kind: 'set-node-property',
			nodeId: 'native-button',
			property: 'label',
			value: 'Support',
		});

		expect(findUINode(document.root, 'native-button')?.properties.label).toBe('Help');
		expect(findUINode(result.document.root, 'native-button')?.properties.label).toBe(
			'Support',
		);
		expect(applyUIOperation(result.document, result.inverse).document).toEqual(document);
	});

	it('inserts and moves nodes through ordinary and Slot child collections', () => {
		const document = parseUIDocument(LOBBY_SCREEN);
		const inserted = createUINode({ id: 'secondary-hint', type: 'kui.Label' });
		const withHint = applyUIOperation(document, {
			kind: 'insert-node',
			target: { collection: 'slot', parentId: 'settings-action', slot: 'content' },
			index: 0,
			node: inserted,
		});
		const moved = applyUIOperation(withHint.document, {
			kind: 'move-node',
			nodeId: 'secondary-hint',
			target: { collection: 'slot', parentId: 'play-action', slot: 'content' },
			index: 1,
		});

		expect(
			findUINode(moved.document.root, 'play-action')?.instance?.slots.content?.map(
				node => node.id,
			),
		).toEqual(['play-hint', 'secondary-hint']);
		expect(applyUIOperation(moved.document, moved.inverse).document).toEqual(
			withHint.document,
		);
	});

	it('edits reusable instance values and contract entries', () => {
		const screen = parseUIDocument(LOBBY_SCREEN);
		const parameter = applyUIOperation(screen, {
			kind: 'set-instance-parameter',
			nodeId: 'settings-action',
			parameter: 'label',
			value: 'Options',
		});
		const component = parseUIDocument(ACTION_CARD);
		const state = applyUIOperation(component, {
			kind: 'set-contract-state',
			name: 'focused',
			definition: { overrides: [] },
		});

		expect(
			findUINode(parameter.document.root, 'settings-action')?.instance?.parameters.label,
		).toBe('Options');
		expect(state.document.contract.states.focused).toEqual({ overrides: [] });
		expect(applyUIOperation(state.document, state.inverse).document).toEqual(component);
	});
});

describe('UI transactions and history', () => {
	it('commits temporarily invalid edits atomically and produces an inverse', () => {
		const document = parseUIDocument(ACTION_CARD);
		const result = applyUITransaction(
			{ document, revision: 4 },
			{
				id: 'remove-background',
				expectedRevision: 4,
				summary: 'Remove the optional background visual',
				operations: [
					{ kind: 'remove-contract-part', name: 'background' },
					{ kind: 'remove-contract-variant', name: 'primary' },
					{ kind: 'remove-node', nodeId: 'background' },
				],
			},
		);

		expect(result.revision).toBe(5);
		expect(findUINode(result.document.root, 'background')).toBeUndefined();
		expect(result.changes.map(change => change.kind)).toContain('node-removed');
		expect(
			applyUITransaction(result, result.inverse).document,
		).toEqual(document);
	});

	it('rejects stale or partially failing transactions without changing input', () => {
		const document = parseUIDocument(LOBBY_SCREEN);
		expect(() =>
			applyUITransaction(
				{ document, revision: 2 },
				{
					id: 'stale',
					expectedRevision: 1,
					summary: 'Stale change',
					operations: [
						{ kind: 'remove-node-property', nodeId: 'native-button', property: 'label' },
					],
				},
			),
		).toThrowError(expect.objectContaining({ code: 'revision-conflict' }));

		expect(() =>
			applyUITransaction(
				{ document, revision: 2 },
				{
					id: 'partial-failure',
					expectedRevision: 2,
					summary: 'Must remain atomic',
					operations: [
						{
							kind: 'set-node-property',
							nodeId: 'native-button',
							property: 'label',
							value: 'Changed',
						},
						{ kind: 'remove-node', nodeId: 'missing' },
					],
				},
			),
		).toThrowError(UIEditError);
		expect(findUINode(document.root, 'native-button')?.properties.label).toBe('Help');
	});

	it('supports monotonic undo and redo revisions', () => {
		const document = parseUIDocument(LOBBY_SCREEN);
		const history = new UIDocumentHistory(document);
		history.commit({
			id: 'rename-help',
			expectedRevision: 0,
			summary: 'Rename the help action',
			operations: [
				{
					kind: 'set-node-property',
					nodeId: 'native-button',
					property: 'label',
					value: 'Support',
				},
			],
		});
		const undone = history.undo();
		const redone = history.redo();

		expect(undone?.revision).toBe(2);
		expect(findUINode(undone!.document.root, 'native-button')?.properties.label).toBe(
			'Help',
		);
		expect(redone?.revision).toBe(3);
		expect(findUINode(redone!.document.root, 'native-button')?.properties.label).toBe(
			'Support',
		);
		expect(history.canUndo).toBe(true);
		expect(history.canRedo).toBe(false);
	});

	it('produces deterministic semantic diffs', () => {
		const before = parseUIDocument(LOBBY_SCREEN);
		const after = applyUIOperation(before, {
			kind: 'set-node-property',
			nodeId: 'native-button',
			property: 'label',
			value: 'Support',
		}).document;

		expect(diffUIDocuments(before, after)).toEqual([
			{
				kind: 'node-property-changed',
				nodeId: 'native-button',
				path: '$.nodes["native-button"].properties.label',
				before: 'Help',
				after: 'Support',
			},
		]);
	});
});

function readFixture(name: string): string {
	return readFileSync(
		fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)),
		'utf8',
	);
}
