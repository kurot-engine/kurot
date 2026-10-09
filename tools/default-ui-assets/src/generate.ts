import { copyFile, cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { packPNGAtlas } from '@kurot/atlas/png';
import { createFrames, palette } from './frames.js';

const root = new URL('../../../', import.meta.url);
const frames = createFrames();
const resolution = 2;
const atlas = packPNGAtlas(frames.map(frame => ({
	name: frame.name,
	png: new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${frame.width * resolution}" height="${frame.height * resolution}" viewBox="0 0 ${frame.width} ${frame.height}">${frame.body}</svg>`).render().asPng(),
})), { file: 'kui.png', trim: false, extrude: resolution, shapePadding: 2 * resolution, borderPadding: 2 * resolution });

// Untrimmed, nonrotated frames keep nine-slice corners in their authored coordinates.
const subkeys = Object.fromEntries(frames.map(frame => [frame.name, frame.grid ? { scale9grid: frame.grid } : {}]));
for (const project of ['packages/cli/templates/game/', 'examples/game/']) {
	const projectRoot = new URL(project, root);
	const directory = new URL('resource/assets/ui/kui/', projectRoot);
	await mkdir(directory, { recursive: true });
	await writeFile(new URL('kui.png', directory), atlas.png);
	await writeFile(new URL('kui.json', directory), JSON.stringify({ ...atlas.data, resolution }, undefined, '\t') + '\n');
	const manifestPath = new URL('resource/default.res.json', projectRoot);
	const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
		groups: Array<{ name: string; keys: string }>;
		resources: Array<{ name: string; type: string; url: string; subkeys?: typeof subkeys }>;
	};
	const resource = manifest.resources.find(entry => entry.name === 'kui');
	if (!resource) throw new Error(`Missing kui resource in ${project}`);
	Object.assign(resource, { type: 'sheet', url: 'assets/ui/kui/kui.json', subkeys });
	await writeFile(manifestPath, JSON.stringify(manifest, undefined, '\t') + '\n');
}

const stylePath = new URL('packages/cli/templates/game/resource/config/style.json', root);
const style = JSON.parse(await readFile(stylePath, 'utf8')) as { colors: Record<string, string> };
style.colors = { ...style.colors, ...palette };
await writeFile(stylePath, JSON.stringify(style, undefined, '\t') + '\n');
const exampleResource = new URL('examples/game/resource/', root);
await mkdir(new URL('config/', exampleResource), { recursive: true });
await copyFile(stylePath, new URL('config/style.json', exampleResource));
await cp(new URL('packages/cli/templates/game/resource/assets/fonts/', root), new URL('assets/fonts/', exampleResource), { recursive: true });
const skins = new URL('packages/cli/templates/game/resource/ui/skins/', root);
for (const filename of await readdir(skins)) {
	await copyFile(new URL(filename, skins), new URL(`ui/skins/${filename}`, exampleResource));
}
process.stdout.write(`Generated ${frames.length} KUI frames (${atlas.width} × ${atlas.height}, ${resolution}x) in ${fileURLToPath(root)}\n`);
