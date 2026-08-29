import type { UIDocument } from '../model/UIDocument.js';
import type { UINode } from '../model/UINode.js';
import type { UIPropertyObject, UIPropertyValue } from '../model/UIPropertyValue.js';
import type { UIDiagnostic } from '../validation/UIDiagnostic.js';
import { isUIDocument, validateUIDocument } from '../validation/validateUIDocument.js';
import { UIDocumentParseError } from './UIDocumentParseError.js';
import { UIDocumentValidationError } from './UIDocumentValidationError.js';

/**
 * Serializes a document with stable schema and property-key ordering.
 */
export function serializeUIDocument(document: UIDocument, space = 2): string {
	const diagnostics = validateUIDocument(document);
	if (diagnostics.length > 0) {
		throw new UIDocumentValidationError(diagnostics);
	}
	return JSON.stringify(normalizeDocument(document), undefined, space);
}

/**
 * Parses and validates a current-format semantic UI document.
 */
export function parseUIDocument(source: string): UIDocument {
	let value: unknown;
	try {
		value = JSON.parse(source) as unknown;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Input is not valid JSON.';
		const diagnostics: UIDiagnostic[] = [
			{
				code: 'invalid-json',
				severity: 'error',
				path: '$',
				message,
			},
		];
		throw new UIDocumentParseError(
			diagnostics,
			error instanceof Error ? error : undefined,
		);
	}

	if (!isUIDocument(value)) {
		throw new UIDocumentParseError(validateUIDocument(value));
	}
	return value;
}

function normalizeDocument(document: UIDocument): UIDocument {
	return {
		kind: document.kind,
		formatVersion: document.formatVersion,
		id: document.id,
		root: normalizeNode(document.root),
	};
}

function normalizeNode(node: UINode): UINode {
	const entries = Object.keys(node.properties)
		.sort()
		.map<[string, UIPropertyValue]>((key) => [
			key,
			normalizePropertyValue(node.properties[key]!),
		]);
	const properties: Record<string, UIPropertyValue> = Object.fromEntries(entries);

	return {
		id: node.id,
		type: node.type,
		properties,
		children: node.children.map(normalizeNode),
	};
}

function normalizePropertyValue(value: UIPropertyValue): UIPropertyValue {
	if (Array.isArray(value)) {
		return value.map(normalizePropertyValue);
	}
	if (typeof value === 'object') {
		const objectValue = value as UIPropertyObject;
		const entries = Object.keys(objectValue)
			.sort()
			.map<[string, UIPropertyValue]>((key) => [
				key,
				normalizePropertyValue(objectValue[key]!),
			]);
		return Object.fromEntries(entries);
	}
	return value;
}
