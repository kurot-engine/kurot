import { DIAGNOSTIC_CODES } from '../diagnostics/index.js';
import { generateSkinPartsDeclaration } from './skin-parts-declaration.js';
import { validateSkinPartFields } from './validate-skin-part-fields.js';
import type { Diagnostic } from '../diagnostics/index.js';
import type { Project } from '../project.js';
import type { SkinIR } from './ast.js';

/**
 * Builds editor declarations and validates host fields before installing outputs.
 */
export async function validatePartDeclarations(
	project: Project,
	skins: readonly SkinIR[],
	files: ReadonlyMap<string, string>,
): Promise<{ declaration: string; diagnostics: readonly Diagnostic[] }> {
	const declaration = await generateSkinPartsDeclaration(project, skins);
	const issues = await validateSkinPartFields(project, skins, declaration);
	const diagnostics = issues.map(issue => {
		const file = issue.file ?? files.get(issue.skinName);
		return {
			code: DIAGNOSTIC_CODES.KUI_PART_BINDING_INVALID,
			severity: 'error' as const,
			message: issue.message,
			...(file ? { location: { file, line: issue.line, column: issue.column } } : {}),
		};
	});
	return { declaration, diagnostics };
}
