import { describe, expect, it } from 'vitest';
import {
	createUIDocument,
	createUINode,
	parseUIDocument,
	serializeUIDocument,
	UIDocumentParseError,
	UIDocumentValidationError,
} from '../src/index.js';

describe('UI document JSON serialization', () => {
	it('uses stable property-key ordering and round-trips documents', () => {
		const document = createUIDocument({
			id: 'main-screen',
			root: createUINode({
				id: 'root',
				type: 'eui.Group',
				properties: {
					zIndex: 2,
					layout: { verticalGap: 8, horizontalGap: 4 },
					alpha: 1,
				},
			}),
		});

		const source = serializeUIDocument(document);

		expect(source.indexOf('"alpha"')).toBeLessThan(source.indexOf('"layout"'));
		expect(source.indexOf('"horizontalGap"')).toBeLessThan(
			source.indexOf('"verticalGap"'),
		);
		expect(parseUIDocument(source)).toEqual(document);
	});

	it('returns structured diagnostics for invalid JSON and schema input', () => {
		expect(() => parseUIDocument('{')).toThrow(UIDocumentParseError);

		try {
			parseUIDocument('{');
		} catch (error) {
			expect(error).toBeInstanceOf(UIDocumentParseError);
			if (!(error instanceof UIDocumentParseError)) throw error;
			expect(error.diagnostics[0]?.code).toBe('invalid-json');
		}

		expect(() => parseUIDocument('{"kind":"other"}')).toThrow(UIDocumentParseError);
	});

	it('refuses to silently serialize invalid runtime values', () => {
		const document = createUIDocument({
			id: 'main-screen',
			root: createUINode({ id: 'root', type: 'eui.Group' }),
		});
		const unsafe = {
			...document,
			root: { ...document.root, properties: { width: Number.NaN } },
		};

		expect(() => serializeUIDocument(unsafe)).toThrow(UIDocumentValidationError);
	});
});
