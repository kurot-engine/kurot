import path from 'node:path';
import { DeclarationReflection, ReflectionKind, makeRecursiveVisitor } from 'typedoc';
import type { CommentDisplayPart, Reflection } from 'typedoc';
import { children, slug, target } from './model.js';
import type { PackageModel } from './model.js';
import { declarations, signature } from './signatures.js';

export type Files = Map<string, string>;
export type Locations = Map<Reflection | string, string>;

export function roots(model: PackageModel): DeclarationReflection[] {
	return [...(model.project.children ?? [])].sort((a, b) => slug(a).localeCompare(slug(b), 'en'));
}

export function memberFile(owner: DeclarationReflection, member: DeclarationReflection): string {
	return `${slug(owner)}/${member.flags.isStatic ? 'static-' : ''}${slug(member)}.md`;
}

export function locations(models: PackageModel[]): Locations {
	const result: Locations = new Map();
	for (const model of models) {
		for (const item of roots(model)) {
			result.set(item, `${model.key}/${slug(item)}.md`);
			const key = `${model.name}:${item.name}`;
			if (!result.has(key)) { result.set(key, `${model.key}/${slug(item)}.md`); }
			for (const child of children(item)) { result.set(child, `${model.key}/${memberFile(item, child)}`); }
		}
	}
	return result;
}

function link(from: string, to: string): string {
	const [key, ...parts] = to.split('/');
	const destination = path.posix.join('packages', key, 'docs/api', ...parts);
	return path.posix.relative(path.posix.dirname(from), destination);
}

function partsText(parts: readonly CommentDisplayPart[], from: string, paths: Locations): string {
	return parts.map(part => {
		if (part.kind === 'inline-tag' && part.tag.startsWith('@link')) {
			const destination = typeof part.target === 'string' ? part.target : part.target ? paths.get(part.target as Reflection) : undefined;
			if (destination) { return `[${part.text || 'API'}](${destination.startsWith('http') ? destination : link(from, destination)})`; }
			return `\`${part.text}\``;
		}
		return part.text;
	}).join('');
}

export function hasComment(item: DeclarationReflection): boolean {
	return Boolean(target(item).comment?.hasVisibleComponent() || target(item).getAllSignatures().some(value => value.comment?.hasVisibleComponent()));
}

function comments(item: DeclarationReflection, from: string, paths: Locations): string {
	const resolved = target(item);
	const values = [resolved.comment, ...resolved.getAllSignatures().map(value => value.comment)].filter(value => value !== undefined);
	const rendered = new Set<string>();
	for (const value of values) {
		const body = [partsText(value.summary, from, paths), ...value.blockTags.filter(tag => !['@category', '@group'].includes(tag.tag))
			.map(tag => `**${tag.tag.slice(1)}${tag.name ? ` ${tag.name}` : ''}**\n\n${partsText(tag.content, from, paths)}`)].filter(Boolean).join('\n\n');
		if (body) { rendered.add(body); }
	}
	for (const sig of resolved.getAllSignatures()) {
		for (const parameter of sig.parameters ?? []) {
			if (parameter.comment) { rendered.add(`**Parameter ${parameter.name}:** ${partsText(parameter.comment.summary, from, paths)}`); }
			if (parameter.defaultValue !== undefined) { rendered.add(`**Default ${parameter.name}:** \`${parameter.defaultValue}\``); }
		}
	}
	if (resolved.defaultValue !== undefined && resolved.defaultValue !== '...') { rendered.add(`**Default/initializer:** \`${resolved.defaultValue.replace(/\n/g, ' ')}\``); }
	return [...rendered].join('\n\n');
}

function typeLinks(item: DeclarationReflection, from: string, paths: Locations): string[] {
	const found = new Set<string>();
	const resolved = target(item);
	const values = [resolved.type, ...(resolved.extendedTypes ?? []), ...(resolved.implementedTypes ?? []),
		...resolved.getAllSignatures().flatMap(sig => [sig.type, ...(sig.parameters ?? []).map(parameter => parameter.type)])];
	for (const value of values) {
		value?.visit(makeRecursiveVisitor({ reference: type => {
			const destination = (type.reflection ? paths.get(type.reflection) : undefined) ?? paths.get(`${type.package}:${type.name}`);
			if (destination) { found.add(`[${type.name}](${link(from, destination)})`); }
		} }));
	}
	return [...found];
}

function page(model: PackageModel, item: DeclarationReflection, relative: string, paths: Locations): string {
	const from = `packages/${model.key}/docs/api/${relative}`;
	const contract = comments(item, from, paths);
	const related = typeLinks(item, from, paths);
	return [`# ${item.flags.isStatic ? 'static ' : ''}${item.name}`, '', `Package: \`${model.name}@${model.version}\`. Generated from public declarations and JSDoc.`, '',
		'```ts', ...declarations(item), ...(target(item).indexSignatures ?? []).map(sig => signature(sig, item.name)), '```', '',
		...(item.flags.isProtected ? ['Extension hook: protected; available to subclasses.', ''] : []),
		...(item.inheritedFrom ? [`Inherited from \`${item.inheritedFrom.toString()}\`; shown with this receiver's substituted types.`, ''] : []),
		...(contract ? [contract, ''] : ['The declaration above is the available reference; no additional behavioral JSDoc is present.', '']),
		...(related.length ? [`Related types: ${related.join(', ')}.`, ''] : [])].join('\n');
}

export function renderPackage(model: PackageModel, paths: Locations): Files {
	const files: Files = new Map();
	const index = [`# ${model.name} API`, '', `Version: **${model.version}**. Read the installed package's matching documentation.`, '',
		'Choose a capability in [topics](topics.md), then open a symbol and only the members needed.',
		'Parameter/result helpers are in [supporting types](supporting/index.md); machine lookup is in [api-index.json](api-index.json).',
		'Runtime recipes and lifecycle rules remain in [the package context](../ai-context.md).', '',
		'The reference includes all public exports and their public/protected members, including inherited members.',
		'Private, `@internal`/`@hidden`, `$`-prefixed and `_`-prefixed members are excluded. Protected members are extension hooks.',
		'Coverage of declarations and coverage of behavioral comments are reported separately in [coverage](coverage.md).', '',
		'| Symbol | Kind | Reference |', '| --- | --- | --- |'];
	for (const item of roots(model)) {
		const name = `${slug(item)}.md`;
		index.push(`| \`${item.name}\` | ${ReflectionKind[item.kind]} | [open](${name}) |`);
		let text = page(model, item, name, paths);
		const members = children(item);
		if (members.length) {
			text += '\n## Members\n\n| Member | Scope | Reference |\n| --- | --- | --- |\n';
			for (const member of members) {
				const file = memberFile(item, member);
				text += `| \`${member.flags.isStatic ? 'static ' : ''}${member.name}\` | ${member.flags.isProtected ? 'protected' : 'public'}${member.inheritedFrom ? ', inherited' : ''} | [open](${file}) |\n`;
				files.set(file, page(model, member, file, paths));
			}
		}
		files.set(name, text);
	}
	files.set('index.md', index.join('\n') + '\n');
	return files;
}
