import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, realpath, symlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = new URL('../../../', import.meta.url);
const source = new URL('examples/game/', root);
const internal = new URL('docs-internal/', root);
await mkdir(internal, { recursive: true });
const directory = await mkdtemp(fileURLToPath(new URL('default-ui-preview-', internal)));
for (const name of ['src', 'resource', 'template', 'kurot.config.ts', 'package.json']) {
	await cp(new URL(name, source), `${directory}/${name}`, { recursive: true });
}
await mkdir(`${directory}/node_modules/@kurot`, { recursive: true });
// The trial owns these links; application installations and registry locks stay intact.
for (const name of ['core', 'ui', 'game', 'ui-document']) {
	const target = name === 'core'
		? fileURLToPath(new URL('packages/core/', root))
		: await realpath(new URL(`node_modules/@kurot/${name}`, source));
	await symlink(target, `${directory}/node_modules/@kurot/${name}`, 'dir');
}
const cli = fileURLToPath(new URL('packages/cli/dist/index.js', root));
for (const args of [['build', '--strict'], ['build', '--release', '--strict']]) {
	const result = await run(process.execPath, [cli, ...args], { cwd: directory });
	process.stdout.write(result.stdout);
	process.stderr.write(result.stderr);
}
process.stdout.write(`\nLocal trial (unreleased checkout Core): ${directory}\n`);
process.stdout.write(`Run the repository CLI dev command in this directory and open ?ui=1.\n`);
