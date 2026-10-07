import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve, sep } from 'node:path';
import { decodePNG, packPNGAtlas } from '../src/png/index.js';
import { checkFrame, checkOverlap, parseSheet } from './reference-checks.js';

const args = process.argv.slice(2).filter(arg => arg !== '--');
assert(args.length === 2, 'Usage: pnpm verify:reference <sample-project-root> <new-output-directory>');
const project = resolve(args[0]!);
const output = resolve(args[1]!);
assert(output !== project && !output.startsWith(project + sep), 'Output must be outside the read-only sample.');
await mkdir(output, { recursive: false });
const reports = [];
for (const group of ['basis', 'basis_icon']) {
	const file = `r_${group}.png`;
	const sourceDir = join(project, 'ui-tps', 'src', group);
	const exportDir = join(project, 'ui-tps', 'export');
	const runtimeDir = join(project, 'resource', 'assets', 'ui', 'app');
	const paths = (await readdir(sourceDir)).filter(name => name.endsWith('.png')).sort();
	const sources = await Promise.all(paths.map(async name => ({
		name: basename(name, '.png'), png: await readFile(join(sourceDir, name)),
	})));
	const referencePNG = await readFile(join(exportDir, file));
	const referenceJSON = await readFile(join(exportDir, `r_${group}.json`));
	assert.equal(referencePNG[24], 8, 'Reference PNG bit depth');
	assert.equal(referencePNG[25], 6, 'Reference PNG RGBA');
	assert.deepEqual(await readFile(join(runtimeDir, file)), referencePNG, 'Runtime PNG differs from export');
	assert.deepEqual(await readFile(join(runtimeDir, `r_${group}.json`)), referenceJSON, 'Runtime JSON differs from export');
	const reference = parseSheet(referenceJSON.toString('utf8'), file);
	assert.deepEqual(Object.keys(reference.frames).sort(), sources.map(source => source.name));
	const result = packPNGAtlas(sources, { file });
	assert.equal(result.png[24], 8);
	assert.equal(result.png[25], 6);
	const generatedJSON = JSON.stringify(result.data, undefined, 2) + '\n';
	const generated = parseSheet(generatedJSON, file);
	assert.deepEqual(Object.keys(generated.frames).sort(), Object.keys(reference.frames).sort());
	const referenceImage = decodePNG(referencePNG);
	const generatedImage = decodePNG(result.png);
	assert.deepEqual([result.width, result.height], [referenceImage.width, referenceImage.height]);
	checkOverlap(reference);
	checkOverlap(generated);
	let trimmed = 0;
	let retainedPixels = 0;
	let moved = 0;
	for (const source of sources) {
		const original = decodePNG(source.png);
		const expected = reference.frames[source.name]!;
		const actual = generated.frames[source.name]!;
		checkFrame(referenceImage, expected, original, `reference/${source.name}`);
		retainedPixels += checkFrame(generatedImage, actual, original, `generated/${source.name}`);
		const { x: expectedX, y: expectedY, ...expectedGeometry } = expected;
		const { x: actualX, y: actualY, ...actualGeometry } = actual;
		assert.deepEqual(actualGeometry, expectedGeometry, `${source.name}: frame field presence and geometry`);
		if (actual.sourceW !== undefined) trimmed++;
		if (actualX !== expectedX || actualY !== expectedY) moved++;
	}
	const reversed = packPNGAtlas([...sources].reverse(), { file });
	assert.deepEqual(reversed.data, result.data, 'Input order changed JSON');
	assert.deepEqual(reversed.png, result.png, 'Input order changed PNG');
	await writeFile(join(output, file), result.png, { flag: 'wx' });
	await writeFile(join(output, `r_${group}.json`), generatedJSON, { flag: 'wx' });
	reports.push({
		group, frames: sources.length, trimmed, retainedPixels, moved,
		referenceSize: [referenceImage.width, referenceImage.height], generatedSize: [result.width, result.height],
		referencePNGBytes: referencePNG.length, generatedPNGBytes: result.png.length,
		referencePNGHash: hash(referencePNG), referenceJSONHash: hash(referenceJSON), generatedPNGHash: hash(result.png),
		sourceHashes: Object.fromEntries(sources.map(source => [source.name, hash(source.png)])),
	});
}
const report = JSON.stringify({ verifiedAt: new Date().toISOString(), project, output, reports }, undefined, 2) + '\n';
await writeFile(join(output, 'report.json'), report, { flag: 'wx' });
process.stdout.write(report);

function hash(bytes: Uint8Array): string {
	return createHash('sha256').update(bytes).digest('hex');
}
