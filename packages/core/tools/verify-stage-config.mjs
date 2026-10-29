import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as http from 'node:http';
import * as net from 'node:net';
import * as os from 'node:os';
import * as path from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const coreRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cliRoot = path.resolve(coreRoot, '../cli');
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-stage-config-'));
const errors = [];
const events = [];
const canvasOnly = process.argv.includes('--canvas');
let child;
let browser;
let releaseServer;
let stderr = '';

async function port() {
	const server = net.createServer();
	await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
	const address = server.address();
	await new Promise(resolve => server.close(resolve));
	return address.port;
}

async function event(after, predicate) {
	const deadline = Date.now() + 15000;
	while (Date.now() < deadline && child.exitCode === null) {
		const found = events.slice(after).find(predicate);
		if (found) {
			return found;
		}
		await new Promise(resolve => setTimeout(resolve, 25));
	}
	throw new Error(`CLI event missing: ${JSON.stringify(events.slice(after))}\n${stderr}`);
}

async function save(stage, success = true) {
	const after = events.length;
	const destination = path.join(root, 'kurot.config.ts');
	await fs.writeFile(`${destination}.next`, `export default { stage: ${JSON.stringify(stage)} };`);
	await fs.rename(`${destination}.next`, destination);
	await event(after, value => value.type === 'build-start' && value.reason === 'config-change');
	const complete = await event(after, value => value.type === 'build-complete');
	assert.equal(complete.success, success);
}

async function state(page) {
	await page.waitForFunction(() => document.querySelector('canvas')?.dataset.stageState);
	return page.locator('canvas').evaluate(canvas => JSON.parse(canvas.dataset.stageState));
}

try {
	await fs.mkdir(path.join(root, 'src'), { recursive: true });
	await fs.mkdir(path.join(root, 'node_modules/@kurot'), { recursive: true });
	await fs.symlink(coreRoot, path.join(root, 'node_modules/@kurot/core'), 'dir');
	await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ type: 'module', dependencies: { '@kurot/core': '*' } }));
	let main = await fs.readFile(path.join(cliRoot, 'templates/empty/src/Main.ts'), 'utf8');
	assert.ok(main.includes('createPlayer({ canvas })'));
	main = main.replace('createPlayer({ canvas })', "createPlayer({ canvas, ...(location.search ? { contentWidth: 800, frameRate: 24 } : {}) })");
	main += `\ncanvas.dataset.stageState = JSON.stringify({ width: app.stage.stageWidth, height: app.stage.stageHeight, scaleMode: app.stage.scaleMode, orientation: app.stage.orientation, frameRate: app.stage.frameRate });\n`;
	await fs.writeFile(path.join(root, 'src/Main.ts'), main);
	await fs.writeFile(path.join(root, 'kurot.config.ts'), 'export default {};');
	const devPort = await port();
	child = spawn(process.execPath, [path.join(cliRoot, 'dist/index.js'), 'dev', '--port', String(devPort), '--diagnostics', 'jsonl'], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] });
	child.stderr.on('data', bytes => { stderr += String(bytes); });
	createInterface({ input: child.stdout }).on('line', line => events.push(JSON.parse(line)));
	await event(0, value => value.type === 'server-ready');
	const pid = child.pid;
	browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
	const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
	page.on('pageerror', error => errors.push(String(error)));
	page.on('console', message => {
		if (message.type() === 'error') {
			errors.push(message.text());
		}
	});
	if (canvasOnly) {
		await page.addInitScript(() => {
			const native = HTMLCanvasElement.prototype.getContext;
			HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
				return ['webgl', 'webgl2', 'experimental-webgl'].includes(kind) ? null : native.call(this, kind, ...args);
			};
		});
	}
	const url = `http://localhost:${devPort}`;
	await page.goto(url);
	assert.deepEqual(await state(page), { width: 640, height: 1136, scaleMode: 'showAll', orientation: 'auto', frameRate: 60 });
	const landscape = { width: 1136, height: 640, scaleMode: 'exactFit', orientation: 'landscape', frameRate: 30 };
	await save(landscape);
	assert.equal((await fetch(url)).headers.get('cache-control'), 'no-store');
	await page.reload();
	assert.deepEqual(await state(page), landscape);
	const portrait = { width: 900, height: 1000, scaleMode: 'showAll', orientation: 'portrait', frameRate: 45 };
	await save(portrait);
	await page.reload();
	assert.deepEqual(await state(page), portrait);
	const validHtml = await (await fetch(url)).text();
	await save({ ...portrait, width: 0 }, false);
	assert.equal(await (await fetch(url)).text(), validHtml);
	await page.reload();
	assert.deepEqual(await state(page), portrait);
	await save(landscape);
	await page.reload();
	assert.deepEqual(await state(page), landscape);
	await page.goto(`${url}?override`);
	assert.deepEqual(await state(page), { ...landscape, width: 800, frameRate: 24 });
	assert.equal(child.pid, pid);
	assert.equal(child.exitCode, null);
	const release = spawn(process.execPath, [path.join(cliRoot, 'dist/index.js'), 'build', '--release', '--diagnostics', 'json'], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] });
	let output = '';
	release.stdout.on('data', bytes => { output += String(bytes); });
	release.stderr.on('data', bytes => { stderr += String(bytes); });
	assert.equal(await new Promise(resolve => release.once('exit', resolve)), 0, stderr);
	const result = JSON.parse(output);
	assert.equal(result.success, true);
	releaseServer = http.createServer(async (request, response) => {
		try {
			const relative = new URL(request.url, 'http://localhost').pathname;
			const file = path.join(result.outputDir, relative === '/' ? 'index.html' : relative);
			response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : 'text/html');
			response.end(await fs.readFile(file));
		} catch {
			response.writeHead(404).end();
		}
	});
	await new Promise(resolve => releaseServer.listen(0, '127.0.0.1', resolve));
	await page.goto(`http://127.0.0.1:${releaseServer.address().port}`);
	assert.deepEqual(await state(page), landscape);
	assert.deepEqual(errors, []);
	console.log(JSON.stringify({ backend: canvasOnly ? 'Canvas 2D' : 'WebGL', checks: ['canvas-only empty template', 'stage save → manual reload on same dev process', 'repeated edits and invalid-config recovery', 'explicit option priority', 'release startup'], errors }, null, 2));
} finally {
	await browser?.close();
	if (child && child.exitCode === null) {
		child.kill('SIGINT');
		await new Promise(resolve => child.once('exit', resolve));
	}
	if (releaseServer) {
		await new Promise(resolve => releaseServer.close(resolve));
	}
	await fs.rm(root, { recursive: true, force: true });
}
