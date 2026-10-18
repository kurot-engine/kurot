import { createHash } from 'node:crypto';
import { DeclarationReflection, Comment } from 'typedoc';
import type { PackageModel } from './model.js';
import type { Files } from './render.js';

export function addExamples(model: PackageModel, files: Files): number {
	const samples = new Map<string, { file: string; owner: string }>();
	for (const reflection of Object.values(model.project.reflections)) {
		if (!reflection.comment || reflection instanceof DeclarationReflection && reflection.inheritedFrom) continue;
		const comment = [Comment.combineDisplayParts(reflection.comment.summary),
			...reflection.comment.blockTags.map(tag => Comment.combineDisplayParts(tag.content))].join('\n');
		for (const match of comment.matchAll(/```(?:ts|typescript)\s*\n([\s\S]*?)```/g)) {
			const code = match[1].trim() + '\n';
			if (samples.has(code)) continue;
			const hash = createHash('sha256').update(code).digest('hex').slice(0, 12);
			const file = `examples/${hash}.ts`;
			samples.set(code, { file, owner: reflection.getFriendlyFullName() });
			files.set(file, code + '\nexport {};\n');
		}
	}
	files.set('examples.json', JSON.stringify({ package: model.name, version: model.version, examples: [...samples.values()] }, undefined, 2) + '\n');
	return samples.size;
}
