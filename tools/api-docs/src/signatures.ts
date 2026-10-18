import { ReflectionKind } from 'typedoc';
import type { DeclarationReflection, SignatureReflection, SomeType, TypeParameterReflection } from 'typedoc';
import { target } from './model.js';

function typeText(type: SomeType | undefined): string {
	return type?.toString() ?? 'unknown';
}

function generics(parameters: TypeParameterReflection[] | undefined): string {
	if (!parameters?.length) return '';
	return `<${parameters.map(parameter => parameter.name +
		(parameter.type ? ` extends ${typeText(parameter.type)}` : '') +
		(parameter.default ? ` = ${typeText(parameter.default)}` : '')).join(', ')}>`;
}

export function signature(value: SignatureReflection, name: string): string {
	const parameters = (value.parameters ?? []).map(parameter =>
		`${parameter.flags.isRest ? '...' : ''}${parameter.name}${parameter.flags.isOptional ? '?' : ''}: ${typeText(parameter.type)}`);
	const prefix = value.kind === ReflectionKind.GetSignature ? 'get ' : value.kind === ReflectionKind.SetSignature ? 'set ' : '';
	if (value.kind === ReflectionKind.ConstructorSignature) { return `constructor(${parameters.join(', ')});`; }
	const label = value.kind === ReflectionKind.IndexSignature ? `[${parameters.join(', ')}]` :
		`${prefix}${name}${generics(value.typeParameters)}(${parameters.join(', ')})`;
	return `${label}${value.kind === ReflectionKind.SetSignature ? '' : `: ${typeText(value.type)}`};`;
}

export function declarations(value: DeclarationReflection): string[] {
	const resolved = target(value);
	const flags = `${resolved.flags.isProtected ? 'protected ' : ''}${resolved.flags.isStatic ? 'static ' : ''}`;
	const all = resolved.getAllSignatures();
	if (all.length && !resolved.kindOf(ReflectionKind.Class | ReflectionKind.Interface)) { return all.map(item => flags + signature(item, value.name)); }
	if (resolved.kindOf(ReflectionKind.Class | ReflectionKind.Interface)) {
		return [`${resolved.flags.isAbstract ? 'abstract ' : ''}${ReflectionKind[resolved.kind].toLowerCase()} ${value.name}${generics(resolved.typeParameters)}` +
			(resolved.extendedTypes?.length ? ` extends ${resolved.extendedTypes.map(typeText).join(', ')}` : '') +
			(resolved.implementedTypes?.length ? ` implements ${resolved.implementedTypes.map(typeText).join(', ')}` : '')];
	}
	if (resolved.kindOf(ReflectionKind.Namespace | ReflectionKind.Enum)) { return [`${ReflectionKind[resolved.kind].toLowerCase()} ${value.name}`]; }
	return [`${flags}${resolved.flags.isReadonly ? 'readonly ' : ''}${resolved.kind === ReflectionKind.TypeAlias ? 'type ' : ''}${value.name}` +
		`${generics(resolved.typeParameters)}${resolved.flags.isOptional ? '?' : ''}${resolved.kind === ReflectionKind.TypeAlias ? ' = ' : ': '}${typeText(resolved.type)};`];
}
