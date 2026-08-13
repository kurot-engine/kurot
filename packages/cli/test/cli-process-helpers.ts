import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as net from 'node:net';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cliEntry = path.join(packageDir, 'src/index.ts');
const tsxLoader = path.join(packageDir, 'node_modules/tsx/dist/loader.mjs');

export interface ProcessResult {
	readonly exitCode: number;
	readonly stdout: string;
	readonly stderr: string;
}

export async function createCliProject(theme?: string, skin?: string): Promise<string> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-cli-e2e-'));
	await fs.mkdir(path.join(root, 'src'), { recursive: true });
	await fs.mkdir(path.join(root, 'resource/skins'), { recursive: true });
	await fs.writeFile(path.join(root, 'src/Main.ts'), 'export const ready = true;\n');
	await fs.writeFile(
		path.join(root, 'kurot.config.ts'),
		`export default {
	target: 'html5',
	entry: 'src/Main.ts',
	output: { dir: 'bin-debug' },
	stage: { width: 640, height: 480, scaleMode: 'showAll', orientation: 'auto', frameRate: 60 },
	exml: { themeFile: 'resource/default.thm.json' },
};\n`,
	);
	if (theme !== undefined) await fs.writeFile(path.join(root, 'resource/default.thm.json'), theme);
	if (skin !== undefined) await fs.writeFile(path.join(root, 'resource/skins/TestSkin.exml'), skin);
	return root;
}

export async function runCli(root: string, args: readonly string[]): Promise<ProcessResult> {
	const child = startCli(root, args);
	let stdout = '';
	let stderr = '';
	child.stdout.on('data', chunk => (stdout += String(chunk)));
	child.stderr.on('data', chunk => (stderr += String(chunk)));
	const exitCode = await new Promise<number>((resolve, reject) => {
		child.once('error', reject);
		child.once('exit', code => resolve(code ?? 1));
	});
	return { exitCode, stdout, stderr };
}

export function startCli(root: string, args: readonly string[]): ChildProcessWithoutNullStreams {
	return spawn(process.execPath, ['--import', tsxLoader, cliEntry, ...args], {
		cwd: root,
		stdio: ['pipe', 'pipe', 'pipe'],
	});
}

export async function waitForJsonLine<T extends { type: string }>(
	child: ChildProcessWithoutNullStreams,
	predicate: (event: T) => boolean,
	timeoutMs = 10_000,
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		let buffer = '';
		const timeout = setTimeout(() => finish(new Error(`Timed out waiting for CLI event. Buffered: ${buffer}`)), timeoutMs);
		const onData = (chunk: Buffer): void => {
			buffer += chunk.toString();
			const lines = buffer.split('\n');
			buffer = lines.pop() ?? '';
			for (const line of lines) {
				if (!line) continue;
				const event = JSON.parse(line) as T;
				if (predicate(event)) finish(undefined, event);
			}
		};
		const finish = (error?: Error, event?: T): void => {
			clearTimeout(timeout);
			child.stdout.off('data', onData);
			if (error) reject(error);
			else if (event) resolve(event);
		};
		child.stdout.on('data', onData);
	});
}

export async function availablePort(): Promise<number> {
	const server = net.createServer();
	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('Expected a TCP address');
	await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
	return address.port;
}

export async function stopCli(child: ChildProcessWithoutNullStreams): Promise<void> {
	if (child.exitCode !== null) return;
	child.kill('SIGINT');
	await new Promise<void>(resolve => child.once('exit', () => resolve()));
}
