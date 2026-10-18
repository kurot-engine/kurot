import { mkdir, readFile, symlink, unlink, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import path from 'node:path';
import { prepareTrial } from '../comparison/context.js';
import type { TaskKind } from './types.js';

function chunk(type: string, data: Buffer): Buffer {
	const body = Buffer.concat([Buffer.from(type), data]);
	let crc = 0xffffffff;
	for (const byte of body) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit++) { crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
	}
	const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
	const checksum = Buffer.alloc(4); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
	return Buffer.concat([length, body, checksum]);
}

export function gemPng(): Buffer {
	const header = Buffer.alloc(13);
	header.writeUInt32BE(64, 0); header.writeUInt32BE(64, 4); header[8] = 8; header[9] = 6;
	const pixels = Buffer.alloc(64 * (64 * 4 + 1));
	for (let y = 0; y < 64; y++) {
		for (let x = 0; x < 64; x++) {
			const i = y * 257 + 1 + x * 4;
			pixels[i] = x < 32 ? 40 : 90; pixels[i + 1] = 220; pixels[i + 2] = 185;
			pixels[i + 3] = Math.abs(x - 32) + Math.abs(y - 32) < 30 ? 255 : 0;
		}
	}
	return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
}

export async function prepareTaskTrial(output: string, arm: 'old' | 'new', id: string, task: TaskKind): Promise<string> {
	const directory = await prepareTrial(output, arm, id);
	await unlink(path.join(directory, 'node_modules'));
	await symlink('../../sdk/node_modules', path.join(directory, 'node_modules'), 'dir');
	const dependencies: Record<string, string> = { '@kurot/core': '2.5.4' };
	if (task === 'tween') { dependencies['@kurot/game'] = '2.0.0'; }
	if (task === 'kui') { dependencies['@kurot/ui'] = '3.1.0'; }
	const pkg = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8')) as Record<string, unknown>;
	pkg.dependencies = dependencies;
	pkg.scripts = {
		build: 'node --import tsx node_modules/@kurot/cli/dist/index.js build',
		typecheck: 'node node_modules/typescript/bin/tsc --noEmit',
	};
	await writeFile(path.join(directory, 'package.json'), JSON.stringify(pkg, undefined, 2));
	if (task === 'resources') {
		await mkdir(path.join(directory, 'resource/assets'), { recursive: true });
		await writeFile(path.join(directory, 'resource/default.res.json'), JSON.stringify({
			resources: [
				{ name: 'gem', type: 'image', url: 'assets/gem.png' },
				{ name: 'rules', type: 'json', url: 'assets/rules.json' },
			], groups: [{ name: 'round', keys: 'gem,rules' }],
		}, undefined, 2));
		await writeFile(path.join(directory, 'resource/assets/gem.png'), gemPng());
		await writeFile(path.join(directory, 'resource/assets/rules.json'), JSON.stringify({ points: 5, goal: 15 }));
	}
	if (task === 'kui') {
		await mkdir(path.join(directory, 'resource/ui'), { recursive: true });
		await writeFile(path.join(directory, 'kurot.config.ts'), (await readFile(path.join(directory, 'kurot.config.ts'), 'utf8')) + "export const ui = { sourceDir: 'resource/ui' };\n");
		const config = JSON.parse(await readFile(path.join(directory, 'tsconfig.json'), 'utf8')) as { include: string[] };
		config.include.push('.kurot/**/*.d.ts');
		await writeFile(path.join(directory, 'tsconfig.json'), JSON.stringify(config, undefined, 2));
	}
	return directory;
}
