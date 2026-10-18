import path from 'node:path';
import { writeOrCheck, checkLinks } from './files.js';
import { loadModels, root } from './model.js';
import { locations, renderPackage } from './render.js';
import { catalog } from './catalog.js';
import { addExamples } from './samples.js';
import { supportingTypes } from './support.js';
import { checkCommentCoverage } from './policy.js';

const mode = process.argv[2];
if (!['generate', 'check', 'html'].includes(mode)) throw new Error('Expected generate, check or html.');
const models = await loadModels();
const paths = locations(models);
const supporting = await supportingTypes(models, paths);
const output = new Map<string, string>();
for (const model of models) {
	const files = renderPackage(model, paths);
	for (const [file, text] of supporting.get(model.key) ?? []) { files.set(file, text); }
	const support = [...files.keys()].filter(file => file.startsWith('supporting/'));
	files.set('supporting/index.md', [`# Supporting types`, '',
		'Referenced declarations that are not package-root imports. Browser and standard TypeScript types retain their platform definitions.', '',
		...support.map(file => `- [${path.basename(file, '.md')}](${path.basename(file)})`), ''].join('\n'));
	const coverage = catalog(model, files);
	await checkCommentCoverage(coverage);
	const examples = addExamples(model, files);
	if (coverage.missing.length) throw new Error(`${model.name} API coverage missing: ${coverage.missing.join(', ')}`);
	for (const [file, text] of files) { output.set(`packages/${model.key}/docs/api/${file}`, text); }
	await writeOrCheck(path.join(model.directory, 'docs/api'), files, mode === 'check');
	if (mode === 'html') { await model.app.generateDocs(model.project, path.join(root, 'tools/api-docs/site', model.key, model.version)); }
	process.stdout.write(`${model.name}@${model.version}: ${coverage.exports} exports, ${coverage.members} members, ${coverage.missing.length} missing; ${examples} examples; ${coverage.withoutComment.length} without behavioral JSDoc.\n`);
}
checkLinks(output);
