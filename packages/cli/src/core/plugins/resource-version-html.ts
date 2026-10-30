import { defaultTreeAdapter, parse } from 'parse5';
import type { DefaultTreeAdapterTypes } from 'parse5';
import { BuildError } from '../errors.js';
import { versionCssResources } from './resource-version-css.js';
import type { ResourceUrlVersioner } from './resource-version-css.js';

interface Edit {
	readonly start: number;
	readonly end: number;
	readonly text: string;
}

/**
 * Write build metadata and static resource versions without serializing scripts
 * or moving files. Navigation destinations and generated JS URLs remain intact.
 */
export function versionHtmlResources(html: string, file: string, version: string, versionUrl: ResourceUrlVersioner): string {
	const document = parse(html, { sourceCodeLocationInfo: true });
	const pending: DefaultTreeAdapterTypes.ParentNode[] = [document];
	const edits: Edit[] = [];
	let headEnd: number | undefined;
	while (pending.length > 0) {
		const parent = pending.pop()!;
		for (const element of parent.childNodes.filter(defaultTreeAdapter.isElementNode)) {
			pending.push(element);
			if (element.tagName === 'base') {
				throw new BuildError('output.versionedAssets requires document-relative resources; remove the authored base element.');
			}
			if (element.tagName === 'head') {
				headEnd = element.sourceCodeLocation?.startTag?.endOffset;
			}
			if (element.tagName === 'meta' && element.attrs.some(attr => attr.name === 'name' && attr.value === 'kurot-resource-version')) {
				throw new BuildError('output.versionedAssets owns the kurot-resource-version metadata; remove the authored value.');
			}
			for (const attr of element.attrs) {
				const attributeName = attr.prefix ? `${attr.prefix}:${attr.name}` : attr.name;
				const location = element.sourceCodeLocation?.attrs?.[attributeName];
				if (!location) {
					continue;
				}
				const asset = attr.name === 'src' || attr.name === 'poster' ||
					(attr.name === 'href' && ['link', 'image', 'use'].includes(element.tagName)) ||
					(attr.name === 'data' && element.tagName === 'object');
				const next = attr.name === 'style'
					? versionCssResources(attr.value, file, versionUrl)
					: asset ? versionUrl(attr.value, file) : attr.value;
				if (next !== attr.value) {
					edits.push({ start: location.startOffset, end: location.endOffset, text: `${attributeName}="${escapeAttribute(next)}"` });
				}
			}
			if (element.tagName === 'style') {
				for (const text of element.childNodes.filter(defaultTreeAdapter.isTextNode)) {
					const location = text.sourceCodeLocation;
					const next = versionCssResources(text.value, file, versionUrl);
					if (location && next !== text.value) {
						edits.push({ start: location.startOffset, end: location.endOffset, text: next });
					}
				}
			}
		}
	}
	if (headEnd === undefined) {
		throw new BuildError('output.versionedAssets requires an explicit HTML head element.');
	}
	edits.push({ start: headEnd, end: headEnd, text: `\n\t<meta name="kurot-resource-version" content="${escapeAttribute(version)}">` });
	let result = html;
	for (const edit of edits.sort((left, right) => right.start - left.start)) {
		result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
	}
	return result;
}

function escapeAttribute(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
