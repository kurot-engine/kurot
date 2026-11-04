import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Project } from '../../src/core/project.js';

/**
 * Creates source-only SDK declarations for semantic part-field validation.
 */
export async function createPartFieldProject(root: string, source: string): Promise<Project> {
	await writePartFile(root, 'package.json', '{"private":true,"type":"module"}');
	await writePartFile(root, 'tsconfig.json', JSON.stringify({ compilerOptions: {
		target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', strict: true,
		skipLibCheck: false, noEmit: true, types: [],
	}, include: ['src', '.kurot/**/*.d.ts'] }));
	await writePartFile(root, 'node_modules/@kurot/ui/package.json', JSON.stringify({
		name: '@kurot/ui', version: '4.0.0', types: 'index.d.ts', type: 'module',
	}));
	await writePartFile(root, 'node_modules/@kurot/ui/index.d.ts', `
export interface SkinPartsMap {}
export type SkinPartsOf<T extends string> = T extends keyof SkinPartsMap ? SkinPartsMap[T] : Readonly<Record<string, unknown>>;
export declare class Component<T extends string = string> {
  skinName?: string;
  enabled: boolean;
  get skinParts(): Readonly<SkinPartsOf<T>>;
  addChild(child: Component): void;
  protected getSkinPartValidator(name: string): ((value: unknown) => boolean) | undefined;
}
export declare class Label extends Component { text: string; }
export declare class Rect extends Component { fillColor: number; }
export declare class Button extends Component {
  label: string;
  /**
   * @skinPart
   */
  labelDisplay?: Label;
}
`);
	await writePartFile(root, 'src/View.ts', source);
	return {
		root, mode: 'development',
		config: { target: 'html5', entry: 'src/View.ts', output: { dir: 'bin-debug' },
			stage: { width: 640, height: 480, scaleMode: 'showAll', orientation: 'auto', frameRate: 60 } },
		entry: path.join(root, 'src/View.ts'), srcDir: path.join(root, 'src'),
		outputDir: path.join(root, 'bin-debug'), resourceDir: path.join(root, 'resource'),
		enginePackages: ['@kurot/ui'], customNamespaces: [], components: [],
	};
}

/**
 * Writes a fixture source without requiring project installation or execution.
 */
export async function writePartFile(root: string, file: string, source: string): Promise<void> {
	await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
	await fs.writeFile(path.join(root, file), source);
}
