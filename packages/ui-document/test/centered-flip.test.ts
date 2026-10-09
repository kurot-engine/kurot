import { describe, expect, it } from 'vitest';
import {
	createKurotUIFoundationRegistry,
	parseUIDocument,
	serializeUIDocument,
	UIDocumentHistory,
	validateUIDocumentComponents,
} from '../src/index.js';

const registry = createKurotUIFoundationRegistry();
const xml =
	'<Skin xmlns="https://kurot.dev/ui/1" class="FlipSkin" states="down"><Group id="group" flipX="true"><Image id="image" width="100%" height="100%" flipY="false" flipY.down="true" /></Group></Skin>';

describe('centered flip authoring', () => {
	it('inherits false-default boolean flags on every display component', () => {
		for (const definition of registry.list()) {
			expect(registry.resolve(definition.type)?.properties.flipX).toMatchObject({
				valueType: 'boolean',
				defaultValue: false,
			});
			expect(registry.resolve(definition.type)?.properties.flipY).toMatchObject({
				valueType: 'boolean',
				defaultValue: false,
			});
		}
	});

	it('round-trips percent layout and named state booleans without rewriting negative scales', () => {
		const document = parseUIDocument(xml.replace('flipX="true"', 'flipX="true" scaleX="-1"'));
		expect(validateUIDocumentComponents(document, registry)).toEqual([]);
		expect(document.root.children[0]?.properties).toMatchObject({ flipX: true, scaleX: -1 });
		expect(document.contract.states.down?.overrides).toContainEqual({
			targetId: 'image',
			property: 'flipY',
			value: true,
		});
		expect(parseUIDocument(serializeUIDocument(document))).toEqual(document);
	});

	it('undoes and redoes one flip property transaction', () => {
		const history = new UIDocumentHistory(parseUIDocument(xml));
		history.commit({
			id: 'flip',
			summary: 'Reflect image',
			expectedRevision: 0,
			operations: [{ kind: 'set-node-property', nodeId: 'image', property: 'flipY', value: true }],
		});
		expect(history.snapshot.document.root.children[0]?.children[0]?.properties.flipY).toBe(true);
		history.undo();
		expect(history.snapshot.document.root.children[0]?.children[0]?.properties.flipY).toBe(false);
		history.redo();
		expect(history.snapshot.document.root.children[0]?.children[0]?.properties.flipY).toBe(true);
	});

	it.each(['1', 'yes', '-1'])('rejects nonboolean flip values %s', value => {
		const document = parseUIDocument(xml.replace('flipX="true"', `flipX="${value}"`));
		expect(validateUIDocumentComponents(document, registry).length).toBeGreaterThan(0);
	});
});
