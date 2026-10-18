import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Application, DeclarationReflection, ReferenceReflection, ReflectionKind } from 'typedoc';
import type { ProjectReflection } from 'typedoc';

export const root = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)), '..');
export const keys = ['core', 'game', 'ui'] as const;
export type PackageKey = typeof keys[number];

export interface PackageModel {
	key: PackageKey;
	name: string;
	version: string;
	directory: string;
	app: Application;
	project: ProjectReflection;
}

export function publicName(name: string): boolean {
	return !/^[_$]/.test(name) && name !== 'prototype';
}

export function target(value: DeclarationReflection): DeclarationReflection {
	if (value instanceof ReferenceReflection) {
		const resolved = value.tryGetTargetReflectionDeep();
		if (resolved instanceof DeclarationReflection) { return resolved; }
	}
	return value;
}

export function children(value: DeclarationReflection): DeclarationReflection[] {
	const resolved = target(value);
	const instance = resolved.type?.type === 'reference' && resolved.type.reflection instanceof DeclarationReflection ? resolved.type.reflection : undefined;
	return (resolved.children ?? (resolved.type?.type === 'reflection' ? resolved.type.declaration.children : instance?.children) ?? [])
		.filter(child => !instance || (!child.flags.isStatic && child.kind !== ReflectionKind.Constructor))
		.filter(child => publicName(child.name) && !child.flags.isPrivate);
}

export function slug(value: DeclarationReflection): string {
	return `${value.name.replace(/[^\w.-]/g, '-')}-${ReflectionKind[value.kind].toLowerCase()}`;
}

export async function loadModels(): Promise<PackageModel[]> {
	const result: PackageModel[] = [];
	for (const key of keys) {
		const directory = path.join(root, 'packages', key);
		const pkg = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8')) as { name: string; version: string };
		const app = await Application.bootstrap({
			entryPoints: [path.join(directory, 'src/index.ts')], tsconfig: path.join(directory, 'tsconfig.json'),
			compilerOptions: { rootDir: root, baseUrl: root, paths: { '@kurot/core': ['packages/core/src/index.ts'] } },
			excludePrivate: true, excludeInternal: true, disableSources: true, disableGit: true,
			readme: 'none', name: `${pkg.name}@${pkg.version}`, logLevel: 'Error',
			validation: { notExported: false, invalidLink: false, notDocumented: false },
		});
		const project = await app.convert();
		if (!project) throw new Error(`Cannot convert ${pkg.name}.`);
		for (const reflection of Object.values(project.reflections)) {
			if (reflection instanceof DeclarationReflection && reflection.kind !== ReflectionKind.TypeLiteral && !publicName(reflection.name)) {
				project.removeReflection(reflection);
			}
		}
		result.push({ key, directory, ...pkg, app, project });
	}
	return result;
}
