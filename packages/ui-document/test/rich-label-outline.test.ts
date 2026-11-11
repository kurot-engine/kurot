import { describe, expect, it } from 'vitest';
import {
	createKurotUIFoundationRegistry,
	matchesUIPropertyDefinition,
	parseUIDocument,
	serializeUIDocument,
	validateUIDocumentComponents,
	UIDocumentHistory,
	findUINode,
} from '../src/index.js';

const registry = createKurotUIFoundationRegistry();
const source = `<Skin xmlns="https://kurot.dev/ui/1" class="Outline" states="compact">
<RichLabel id="rich" outlineLayout="reserve-space" outlineLayout.compact="render-only" size="16" stroke="1">
<textFlow><Span text="inherit"/><Span text="local" stroke="0" italic="false"/></textFlow>
</RichLabel><RichLabel id="old"/></Skin>`;

describe('RichLabel outline layout authoring', () => {
	it('defines a component-only enum without adding it to local Span styles or other text types', () => {
		const definition = registry.resolve('kui.RichLabel')?.properties.outlineLayout;
		expect(definition).toMatchObject({
			valueType: 'string',
			defaultValue: 'render-only',
			enumValues: ['render-only', 'reserve-space'],
		});
		for (const type of ['kui.Label', 'kui.EditableText', 'kui.BitmapLabel']) {
			expect(registry.resolve(type)?.properties.outlineLayout).toBeUndefined();
		}
		expect(() =>
			parseUIDocument(source.replace('stroke="0" italic="false"', 'outlineLayout="reserve-space"')),
		).toThrow();
	});

	it('round-trips explicit base/state choices and retains omitted defaults and sparse runs', () => {
		const document = parseUIDocument(source);
		expect(validateUIDocumentComponents(document, registry)).toEqual([]);
		expect(findUINode(document.root, 'old')?.properties).toEqual({});
		expect(document.contract.states.compact?.overrides).toContainEqual({
			targetId: 'rich',
			property: 'outlineLayout',
			value: 'render-only',
		});
		expect(parseUIDocument(serializeUIDocument(document))).toEqual(document);
	});

	it.each(['auto', '', true, 1, { value: 'reserve-space' }])('rejects invalid enum value %j', value => {
		const definition = registry.resolve('kui.RichLabel')?.properties.outlineLayout;
		expect(definition).toBeDefined();
		expect(matchesUIPropertyDefinition(value, definition!)).toBe(false);
	});

	it('uses ordinary property history to restore omission on undo', () => {
		const document = parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="Old"><RichLabel id="rich"/></Skin>',
		);
		const history = new UIDocumentHistory(document);
		history.commit({
			id: 'outline',
			expectedRevision: 0,
			summary: 'Outline policy',
			operations: [
				{ kind: 'set-node-property', nodeId: 'rich', property: 'outlineLayout', value: 'render-only' },
			],
		});
		expect(serializeUIDocument(history.snapshot.document)).toContain('outlineLayout="render-only"');
		history.undo();
		expect(serializeUIDocument(history.snapshot.document)).not.toContain('outlineLayout');
		history.redo();
		expect(findUINode(history.snapshot.document.root, 'rich')?.properties.outlineLayout).toBe('render-only');
	});
});
