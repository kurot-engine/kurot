import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderHtml } from '../src/core/plugins/generate-html.js';
import type { Project } from '../src/core/project.js';

const testDir = path.dirname(fileURLToPath(import.meta.url));

describe('HTML generation', () => {
	it('renders every placeholder in the game project template', async () => {
		const templatePath = path.resolve(testDir, '../templates/game/template/web/index.html');
		const template = await fs.readFile(templatePath, 'utf-8');
		const project = createProject(templatePath);
		const html = renderHtml(template, project, 'Main.js', {
			'@kurot/core': 'js/kurot.core.js',
		});

		expect(html).toContain('background: #000000');
		expect(html).toContain('data-content-width="1136"');
		expect(html).toContain('data-content-height="640"');
		expect(html).toContain('data-scale-mode="showAll"');
		expect(html).toContain('data-orientation="landscape"');
		expect(html).toContain('data-frame-rate="60"');
		expect(html).toContain('"@kurot/core": "./js/kurot.core.js"');
		expect(html).toContain("import './Main.js';");
		expect(html).not.toContain('{{KUROT_');
	});

	it('rejects a project template with missing placeholders', () => {
		const project = createProject('/project/template/web/index.html');
		expect(() => renderHtml('<html></html>', project, 'Main.js', {})).toThrow(
			'missing required placeholders',
		);
	});
});

function createProject(htmlTemplate: string): Project {
	return {
		root: '/project',
		mode: 'development',
		config: {
			target: 'html5',
			entry: 'src/Main.ts',
			output: { dir: 'bin-debug' },
			html: { template: 'template/web/index.html' },
			stage: {
				width: 1136,
				height: 640,
				scaleMode: 'showAll',
				orientation: 'landscape',
				frameRate: 60,
			},
		},
		entry: '/project/src/Main.ts',
		srcDir: '/project/src',
		outputDir: '/project/bin-debug',
		resourceDir: '/project/resource',
		htmlTemplate,
		enginePackages: ['@kurot/core'],
		customNamespaces: [],
		components: [],
	};
}
