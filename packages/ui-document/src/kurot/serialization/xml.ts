import type { UIAssetContract } from '../model/UIAssetContract.js';
import type { UIAssetKind } from '../model/UIAssetKind.js';
import { UI_DOCUMENT_KIND } from '../model/UIDocument.js';
import type { UIDocument } from '../model/UIDocument.js';
import type { UIDiagnostic } from '../validation/UIDiagnostic.js';
import { isUIDocument, validateUIDocument } from '../validation/validateUIDocument.js';
import { UIDocumentParseError } from './UIDocumentParseError.js';
import { UIDocumentValidationError } from './UIDocumentValidationError.js';
import { parseContract } from './xml/xml-contract-parser.js';
import { serializeContract } from './xml/xml-contract-serializer.js';
import { collectNodePrefixes, parseNode, serializeNode } from './xml/xml-node.js';
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
	if (diagnostics.length > 0) throw new UIDocumentValidationError(diagnostics);

	const prefixes = new Set<string>();
	collectNodePrefixes(document.root, prefixes);
	const namespaces = [...prefixes]
		.sort()
		.map(prefix => ` xmlns:${prefix}="https://kurot.dev/components/${escapeXML(prefix)}"`)
		.join('');
	const tag = rootTag(document.assetKind);
	const lines = [
		'<?xml version="1.0" encoding="utf-8"?>',
		`<${tag} xmlns="${KUI_XML_NAMESPACE}"${namespaces} id="${escapeXML(document.id)}" version="${document.formatVersion}"${rootContractAttributes(document.assetKind, document.contract)}>`
	];
	if (hasContractBody(document.contract)) lines.push(...serializeContract(document.contract, 1));
	lines.push(...serializeNode(document.root, 1));
	lines.push(`</${tag}>`);
	return `${lines.join('\n')}\n`;
}

/**
 * Parses and validates one canonical KUI XML document.
 */
export function parseUIDocument(source: string): UIDocument {
	try {
		const element = parseXML(source);
		const assetKind = assetKindFromRoot(element.name);
		if (element.attributes.xmlns !== KUI_XML_NAMESPACE) {
			throw new Error(`KUI XML root must declare xmlns="${KUI_XML_NAMESPACE}".`);
		}
		validateRootAttributes(assetKind, element.attributes);
		const contractElements = element.children.filter(child => child.name === 'contract');
		if (contractElements.length > 1) {
			throw new Error(`<${element.name}> cannot contain more than one <contract>.`);
		}
		const contractElement = contractElements[0];
		if (contractElement !== undefined && element.children[0] !== contractElement) {
			throw new Error(`<contract> must precede the root component in <${element.name}>.`);
		}
		const componentElements = element.children.filter(child => child.name !== 'contract');
		if (componentElements.length !== 1 || componentElements[0] === undefined) {
			throw new Error(`<${element.name}> must contain exactly one root component.`);
		}
		const prefixes = Object.fromEntries(
			Object.entries(element.attributes)
				.filter(([name]) => name.startsWith('xmlns:'))
				.map(([name, value]) => [name.slice('xmlns:'.length), value]),
		);
		const parsedContract = parseContract(contractElement);
		const contract = applyRootContractAttributes(assetKind, parsedContract, element.attributes);
		const value: UIDocument = {
			kind: UI_DOCUMENT_KIND,
			formatVersion: Number(requiredAttribute(element.name, element.attributes, 'version')),
			id: requiredAttribute(element.name, element.attributes, 'id'),
			assetKind,
			contract,
			root: parseNode(componentElements[0], { prefixes }),
		};
		if (!isUIDocument(value)) throw new UIDocumentParseError(validateUIDocument(value));
		return value;
	} catch (error) {
		if (error instanceof UIDocumentParseError) throw error;
		const message = error instanceof Error ? error.message : 'Input is not valid KUI XML.';
		const diagnostics: UIDiagnostic[] = [{
			code: 'invalid-xml',
			severity: 'error',
			path: '$',
			message,
		}];
		throw new UIDocumentParseError(diagnostics, error instanceof Error ? error : undefined);
	}
}

function validateRootAttributes(
	assetKind: UIAssetKind,
	attributes: Readonly<Record<string, string>>,
): void {
	const allowed = new Set(['id', 'version', 'xmlns']);
	if (assetKind === 'component') {
		allowed.add('type');
	}
	if (assetKind === 'appearance') {
		allowed.add('target');
		allowed.add('default');
	}
	for (const name of Object.keys(attributes)) {
		if (!allowed.has(name) && !name.startsWith('xmlns:')) {
			throw new Error(`Unexpected attribute "${name}" on <${rootTag(assetKind)}>.`);
		}
	}
}

function rootTag(assetKind: UIAssetKind): 'Component' | 'Screen' | 'Skin' {
	switch (assetKind) {
		case 'appearance': return 'Skin';
		case 'component': return 'Component';
		case 'screen': return 'Screen';
	}
}

function assetKindFromRoot(name: string): UIAssetKind {
	switch (name) {
		case 'Component': return 'component';
		case 'Screen': return 'screen';
		case 'Skin': return 'appearance';
		default: throw new Error(`KUI XML root must be <Screen>, <Component>, or <Skin>; received <${name}>.`);
	}
}

function rootContractAttributes(assetKind: UIAssetKind, contract: UIAssetContract): string {
	if (assetKind === 'component' && contract.componentType !== undefined) {
		return ` type="${escapeXML(contract.componentType)}"`;
	}
	if (assetKind === 'appearance' && contract.targetType !== undefined) {
		return ` target="${escapeXML(contract.targetType)}"${contract.isDefault === undefined ? '' : ` default="${contract.isDefault}"`}`;
	}
	return '';
}

function applyRootContractAttributes(
	assetKind: UIAssetKind,
	contract: UIAssetContract,
	attributes: Readonly<Record<string, string>>,
): UIAssetContract {
	const isDefault = attributes.default === undefined
		? undefined
		: parseBooleanAttribute(rootTag(assetKind), 'default', attributes.default);
	return {
		...contract,
		...(assetKind === 'component' && attributes.type !== undefined ? { componentType: attributes.type } : {}),
		...(assetKind === 'appearance' && attributes.target !== undefined ? { targetType: attributes.target } : {}),
		...(assetKind === 'appearance' && isDefault !== undefined ? { isDefault } : {}),
	};
}

function parseBooleanAttribute(tag: string, name: string, value: string): boolean {
	if (value === 'true') return true;
	if (value === 'false') return false;
	throw new Error(`<${tag}> attribute ${name} must be true or false.`);
}

function hasContractBody(contract: UIAssetContract): boolean {
	return Object.keys(contract.parameters).length > 0
		|| Object.keys(contract.parts).length > 0
		|| Object.keys(contract.slots).length > 0
		|| Object.keys(contract.states).length > 0
		|| Object.keys(contract.variants).length > 0
		|| Object.keys(contract.dataFields ?? {}).length > 0
		|| Object.keys(contract.dataBindings ?? {}).length > 0
		|| Object.keys(contract.actions ?? {}).length > 0;
}

function requiredAttribute(tag: string, attributes: Readonly<Record<string, string>>, name: string): string {
	const value = attributes[name];
	if (value === undefined || value.length === 0) throw new Error(`<${tag}> requires ${name}.`);
	return value;
}
