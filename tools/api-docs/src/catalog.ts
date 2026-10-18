import { ReflectionKind } from 'typedoc';
import { children, slug, target } from './model.js';
import type { PackageModel } from './model.js';
import { hasComment, memberFile, roots } from './render.js';
import type { Files } from './render.js';
import { inventory } from './inventory.js';

export interface Coverage {
	package: string;
	version: string;
	exports: number;
	members: number;
	missing: string[];
	withoutComment: string[];
}

export function catalog(model: PackageModel, files: Files): Coverage {
	const rows = roots(model).map(item => ({
		name: item.name, kind: ReflectionKind[item.kind], file: `${slug(item)}.md`,
		topic: (model.project.getSymbolIdFromReflection(target(item))?.packagePath ?? 'other').split('/')[2] ?? 'other',
		members: children(item).map(member => ({
			name: `${member.flags.isStatic ? 'static ' : ''}${member.name}`, file: memberFile(item, member),
			protected: member.flags.isProtected, inherited: Boolean(member.inheritedFrom),
		})),
	}));
	const expected = inventory(model);
	const missing: string[] = [];
	for (const row of rows) {
		if (!files.has(row.file)) { missing.push(`file:${row.file}`); }
		for (const member of row.members) {
			if (!files.has(member.file)) { missing.push(`file:${member.file}`); }
		}
	}
	for (const item of expected) {
		const found = rows.filter(row => row.name === item.name);
		if (!found.length) { missing.push(item.name); }
		for (const member of item.members) {
			if (!found.some(row => row.members.some(value => value.name === member))) { missing.push(`${item.name}.${member}`); }
		}
	}
	const withoutComment: string[] = [];
	for (const item of roots(model)) {
		if (!hasComment(item)) { withoutComment.push(item.name); }
		for (const member of children(item)) {
			if (!member.inheritedFrom && member.name !== 'constructor' && !hasComment(member)) {
				withoutComment.push(`${item.name}.${member.flags.isStatic ? 'static ' : ''}${member.name}`);
			}
		}
	}
	const coverage: Coverage = { package: model.name, version: model.version, exports: expected.length,
		members: expected.reduce((sum, item) => sum + item.members.length, 0), missing, withoutComment: [...new Set(withoutComment)].sort() };
	files.set('api-index.json', JSON.stringify({ format: 'kurot-api-index-v1', package: model.name, version: model.version, symbols: rows,
		supportingTypes: [...files.keys()].filter(file => file.startsWith('supporting/') && file !== 'supporting/index.md'),
	}, undefined, 2) + '\n');
	files.set('coverage.json', JSON.stringify(coverage, undefined, 2) + '\n');
	files.set('coverage.md', [`# ${model.name} API coverage`, '',
		`Version: ${model.version}. Public export names: ${coverage.exports}. Public/protected member entries: ${coverage.members}.`, '',
		`Missing declaration references: **${missing.length}**. Inventory is independently read through the TypeScript checker.`, '',
		`Entries without additional behavioral JSDoc: **${coverage.withoutComment.length}** (see [machine report](coverage.json)).`, '',
		'Complete declaration coverage does not imply every behavior has prose documentation.',
		'Simple declarations may be self-explanatory; the comment inventory keeps remaining gaps explicit.',
		'Checked behavioral contracts and recipes are linked from [the package context](../ai-context.md).', ''].join('\n'));
	const groups = new Map<string, typeof rows>();
	for (const row of rows) {
		const list = groups.get(row.topic) ?? []; list.push(row); groups.set(row.topic, list);
	}
	const topics = [`# ${model.name} capability index`, '', 'Read one capability list, then only the required symbol/member pages.', ''];
	for (const [topic, list] of [...groups].sort(([a], [b]) => a.localeCompare(b, 'en'))) {
		const file = `topics/${topic}.md`;
		topics.push(`- [${topic}](${file}) — ${list.length} declarations`);
		files.set(file, [`# ${topic}`, '', ...list.map(row => `- [${row.name}](../${row.file}) — ${row.kind}`), ''].join('\n'));
	}
	files.set('topics.md', topics.join('\n') + '\n');
	return coverage;
}
