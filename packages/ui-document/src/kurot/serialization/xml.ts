import { createKurotUIFoundationRegistry } from '../catalog/kurot-ui-foundation.js';
import { createUIAssetContract } from '../document/create-asset-contract.js';
import { UI_DOCUMENT_KIND } from '../model/UIDocument.js';
import type { UIDocument } from '../model/UIDocument.js';
import { UI_DOCUMENT_FORMAT_VERSION } from '../version.js';
import type { UIDiagnostic } from '../validation/UIDiagnostic.js';
import { isUIDocument, validateUIDocument } from '../validation/validateUIDocument.js';
import { UIDocumentParseError } from './UIDocumentParseError.js';
import { UIDocumentValidationError } from './UIDocumentValidationError.js';
import { collectNodePrefixes, parseSkinRoot, serializeSkinRoot } from './xml/xml-node.js';
import { parseXML } from './xml/xml-parser.js';
import { escapeXML } from './xml/xml-values.js';

/**
 * Default namespace of canonical KUI XML documents.
 */
export const KUI_XML_NAMESPACE = 'https://kurot.dev/ui/1';

/**
 * Serializes a semantic document as canonical KUI XML.
 */
export function serializeUIDocument(document: UIDocument): string {
	const diagnostics = validateUIDocument(document);
	if (diagnostics.length > 0) {
		throw new UIDocumentValidationError(diagnostics);
	}

	if (document.assetKind !== 'appearance') {
		throw new Error('KUI XML serializes Skin documents only.');
	}
	if (document.contract.targetType !== undefined) {
		throw new Error('Skin XML does not serialize runtime target metadata.');
	}
	if (Object.values(document.contract.states).some(state => state.description !== undefined)) {
		throw new Error('Skin XML does not serialize state descriptions.');
	}
	if (hasUnsupportedContractContent(document)) {
		throw new Error('Skin XML supports state definitions only; other asset contracts are programmatic.');
	}

	const prefixes = new Set<string>();
	collectNodePrefixes(document.root, prefixes);
	const namespaces = [...prefixes]
		.sort()
		.map(prefix => ` xmlns:${prefix}="https://kurot.dev/components/${escapeXML(prefix)}"`)
		.join('');
	const stateNames = Object.keys(document.contract.states);
	validateStateNames(stateNames);
	const stateAttribute = stateNames.length === 0 ? '' : ` states="${escapeXML(stateNames.join(','))}"`;
	const root = serializeSkinRoot(document.root, document.contract.states);
	const rootAttributes = root.attributes.length === 0 ? '' : ` ${root.attributes.join(' ')}`;
	const lines = [
		'<?xml version="1.0" encoding="utf-8"?>',
		`<Skin xmlns="${KUI_XML_NAMESPACE}"${namespaces} class="${escapeXML(document.id)}"${stateAttribute}${rootAttributes}>`,
	];
	lines.push(...root.contents);
	lines.push('</Skin>');
	return `${lines.join('\n')}\n`;
}

/**
 * Parses and validates one canonical KUI XML document.
 */
export function parseUIDocument(source: string): UIDocument {
	try {
		const element = parseXML(source);
		if (element.name !== 'Skin') {
			throw new Error(`KUI skin root must be <Skin>; received <${element.name}>.`);
		}
		if (element.attributes.xmlns !== KUI_XML_NAMESPACE) {
			throw new Error(`KUI XML root must declare xmlns="${KUI_XML_NAMESPACE}".`);
		}
		validateRootAttributes(element.attributes);
		if (element.children.some(child => child.name === 'contract')) {
			throw new Error('Unexpected <contract> inside <Skin>.');
		}
		const prefixes = Object.fromEntries(
			Object.entries(element.attributes)
				.filter(([name]) => name.startsWith('xmlns:'))
				.map(([name, value]) => [name.slice('xmlns:'.length), value]),
		);
		const stateNames = parseStateNames(element.attributes.states);
		const stateOverrides = new Map(stateNames.map(name => [name, []]));
		const root = parseSkinRoot(element, {
			prefixes,
			states: new Set(stateNames),
			stateOverrides,
		});
		const states = Object.fromEntries(
			stateNames.map(name => [
				name,
				{
					overrides: stateOverrides.get(name) ?? [],
				},
			]),
		);
		const value: UIDocument = {
			kind: UI_DOCUMENT_KIND,
			formatVersion: UI_DOCUMENT_FORMAT_VERSION,
			id: requiredAttribute(element.name, element.attributes, 'class'),
			assetKind: 'appearance',
			contract: createUIAssetContract({ states }),
			root,
		};
		if (!isUIDocument(value)) {
			throw new UIDocumentParseError(validateUIDocument(value));
		}
		return value;
	} catch (error) {
		if (error instanceof UIDocumentParseError) {
			throw error;
		}
		const message = error instanceof Error ? error.message : 'Input is not valid KUI XML.';
		const diagnostics: UIDiagnostic[] = [
			{
				code: 'invalid-xml',
				severity: 'error',
				path: '$',
				message,
			},
		];
		throw new UIDocumentParseError(diagnostics, error instanceof Error ? error : undefined);
	}
}

function validateRootAttributes(attributes: Readonly<Record<string, string>>): void {
	const allowed = new Set(['class', 'states', 'xmlns']);
	const groupProperties = createKurotUIFoundationRegistry().resolve('kui.Group')?.properties ?? {};
	for (const name of Object.keys(attributes)) {
		const property = name.split('.')[0] ?? name;
		if (!allowed.has(name) && !name.startsWith('xmlns:') && !Object.hasOwn(groupProperties, property)) {
			throw new Error(`Unexpected attribute "${name}" on <Skin>.`);
		}
	}
}

function parseStateNames(value: string | undefined): string[] {
	if (value === undefined || value.trim().length === 0) {
		return [];
	}
	const names = value.split(',').map(name => name.trim());
	if (names.some(name => name.length === 0)) {
		throw new Error('<Skin> states must be a comma-separated list of names.');
	}
	if (new Set(names).size !== names.length) {
		throw new Error('<Skin> states must not contain duplicate names.');
	}
	validateStateNames(names);
	return names;
}

function validateStateNames(names: readonly string[]): void {
	for (const name of names) {
		if (!/^[A-Za-z_][\w-]*$/.test(name)) {
			throw new Error(`Skin state name "${name}" is not valid in a property.state attribute.`);
		}
	}
}

function hasUnsupportedContractContent(document: UIDocument): boolean {
	const contract = document.contract;
	return (
		Object.keys(contract.parameters).length > 0 ||
		Object.keys(contract.parts).length > 0 ||
		Object.keys(contract.slots).length > 0 ||
		Object.keys(contract.variants).length > 0 ||
		Object.keys(contract.dataFields ?? {}).length > 0 ||
		Object.keys(contract.dataBindings ?? {}).length > 0 ||
		Object.keys(contract.actions ?? {}).length > 0 ||
		contract.componentType !== undefined
	);
}

function requiredAttribute(tag: string, attributes: Readonly<Record<string, string>>, name: string): string {
	const value = attributes[name];
	if (value === undefined || value.length === 0) {
		throw new Error(`<${tag}> requires ${name}.`);
	}
	return value;
}
