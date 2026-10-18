import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';
import { parseToIR } from '../src/core/kui/index.js';
import { generateSkinPartsDeclaration } from '../src/core/kui/skin-parts-declaration.js';
import type { Project } from '../src/core/project.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(temporaryDirectories.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});

describe('generated skin-part declaration type checking', () => {
	it('preserves inherited getters and exact read-only parts with skipLibCheck=false', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-skin-types-'));
		temporaryDirectories.push(root);
		await write(root, 'package.json', '{"private":true,"type":"module"}\n');
		await write(root, 'node_modules/@kurot/ui/package.json', '{"name":"@kurot/ui","type":"module","types":"index.d.ts"}\n');
		// Keep CLI tests independent of runtime dependencies while matching UI's accessor contract.
		await write(root, 'node_modules/@kurot/ui/index.d.ts', "export * from './Component.js';\n");
		await write(root, 'node_modules/@kurot/ui/Component.d.ts', `
export interface SkinPartsMap {}
export type SkinPartsOf<TSkin extends string> = TSkin extends keyof SkinPartsMap
	? SkinPartsMap[TSkin] : Readonly<Record<string, unknown>>;
export declare class Component<TSkin extends string = string> {
	skinName?: string;
	get skinParts(): Readonly<SkinPartsOf<TSkin>>;
}
export declare class Label { text: string; }
`);
		await write(root, 'src/ScoreHUD.ts', `
import { Component } from '@kurot/ui';
export class ScoreHUD extends Component<'skins.ScoreHUDSkin'> {
	private _score = 0;
	public updateScore(): void { this.skinParts.score.text = String(this._score); }
}
`);
		await write(root, 'src/AssignedHUD.ts', `
import { Component } from '@kurot/ui';
export class AssignedHUD extends Component {
	public constructor() { super(); this.skinName = 'skins.AssignedSkin'; }
}
`);
		await write(root, 'src/ConventionHUD.ts', `
import { Component } from '@kurot/ui';
export class ConventionHUD extends Component {}
`);
		await write(root, 'src/components/PairedHUD.ts', `
import { Component } from '@kurot/ui';
export class PairedHUD extends Component {}
`);
		const project = createProject(root);
		const skins = ['skins.ScoreHUDSkin', 'skins.AssignedSkin', 'skins.ConventionHUDSkin', 'appearance.SharedSkin']
			.map(name => parseToIR(`<Skin xmlns="https://kurot.dev/ui/1" class="${name}"><Label id="score" /></Skin>`));
		const declaration = await generateSkinPartsDeclaration(project, skins);
		await write(root, '.kurot/skin-parts.d.ts', declaration);
		const validConsumer = `
import { Label } from '@kurot/ui';
import { ScoreHUD } from './ScoreHUD.js';
import { AssignedHUD } from './AssignedHUD.js';
import { ConventionHUD } from './ConventionHUD.js';
import { PairedHUD } from './components/PairedHUD.js';
const hud = new ScoreHUD();
const score: Label = hud.skinParts.score;
score.text = '10';
new AssignedHUD().skinParts.score.text = '20';
new ConventionHUD().skinParts.score.text = '30';
new PairedHUD().skinParts.score.text = '40';
`;
		await write(root, 'src/consumer.ts', validConsumer);
		const diagnostics = typecheck(root);
		expect(formatDiagnostics(root, diagnostics)).toEqual([]);

		await write(root, 'src/consumer.ts', validConsumer + `
hud.skinParts.score.text = 123;
hud.skinParts.missing;
hud.skinParts = { score: new Label() };
hud.skinParts.score = new Label();
`);
		expect(typecheck(root).map(diagnostic => diagnostic.code).sort()).toEqual([2322, 2339, 2540, 2540]);
	});
});

function createProject(root: string): Project {
	const source = path.join(root, 'src/components/PairedHUD.ts');
	const skin = path.join(root, 'resource/ui/components/PairedHUDSkin.kui.xml');
	return {
		root,
		mode: 'development',
		config: {
			target: 'html5', entry: 'src/consumer.ts', output: { dir: 'bin-debug' },
			stage: { width: 640, height: 400, scaleMode: 'showAll', orientation: 'auto', frameRate: 60 },
		},
		entry: path.join(root, 'src/consumer.ts'),
		srcDir: path.join(root, 'src'),
		outputDir: path.join(root, 'bin-debug'),
		resourceDir: path.join(root, 'resource'),
		enginePackages: [],
		customNamespaces: [],
		components: [{
			name: 'PairedHUD', tag: 'game:PairedHUD', namespace: 'game', specifier: '#ns/game',
			source, sourceRelative: 'src/components/PairedHUD.ts',
			skin, skinRelative: 'resource/ui/components/PairedHUDSkin.kui.xml',
			skinClass: 'appearance.SharedSkin',
		}],
	};
}

function typecheck(root: string): readonly ts.Diagnostic[] {
	// Match the template's source-before-generated include order; reversing it can hide TS2610.
	const program = ts.createProgram([
		path.join(root, 'src/consumer.ts'), path.join(root, '.kurot/skin-parts.d.ts'),
	], {
		target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
		moduleResolution: ts.ModuleResolutionKind.Bundler,
		strict: true, noEmit: true, skipLibCheck: false, types: [],
	});
	return ts.getPreEmitDiagnostics(program);
}

function formatDiagnostics(root: string, diagnostics: readonly ts.Diagnostic[]): string[] {
	return diagnostics.map(diagnostic => {
		const file = diagnostic.file ? path.relative(root, diagnostic.file.fileName) : 'compiler';
		return `${file}: TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
	});
}

async function write(root: string, relative: string, text: string): Promise<void> {
	const file = path.join(root, relative);
	await fs.mkdir(path.dirname(file), { recursive: true });
	await fs.writeFile(file, text);
}
