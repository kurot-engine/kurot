import { createPlayer } from '@kurot/core';
import type { UIDocument } from '@kurot/ui-document';
import { createUIDocument, createUINode } from '@kurot/ui-document';
import { createKurotUI } from '@kurot/ui-runtime';

const canvas = requireElement('#game', HTMLCanvasElement);
const status = requireElement('#status', HTMLElement);
const summary = requireElement('#summary', HTMLPreElement);

try {
	const document = createPreviewDocument();
	const result = createKurotUI(document);
	const app = createPlayer({
		canvas,
		contentWidth: 800,
		contentHeight: 450,
		frameRate: 60,
		scaleMode: 'showAll',
	});
	app.start(result.root);
	status.textContent = 'Rendered';
	summary.textContent = [
		`document: ${document.id}`,
		`root: ${result.root.constructor.name}`,
		`instances: ${result.instances.size}`,
		...Array.from(result.instances, ([id, instance]) =>
			`  ${id.padEnd(12)} → ${instance.constructor.name}`,
		),
	].join('\n');
} catch (error) {
	status.textContent = 'Failed';
	summary.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
}

function createPreviewDocument(): UIDocument {
	return createUIDocument({
		id: 'ui-runtime-preview',
		root: createUINode({
			id: 'screen',
			type: 'kui.Group',
			properties: { height: 450, width: 800 },
			children: [
				createUINode({
					id: 'background',
					type: 'kui.Rect',
					properties: {
						fillColor: 0x0f172a,
						height: 450,
						width: 800,
					},
				}),
				createUINode({
					id: 'accent',
					type: 'kui.Rect',
					properties: {
						ellipseHeight: 24,
						ellipseWidth: 24,
						fillColor: 0x1d4ed8,
						height: 120,
						width: 680,
						x: 60,
						y: 72,
					},
				}),
				createUINode({
					id: 'title',
					type: 'kui.Label',
					properties: {
						bold: true,
						size: 38,
						text: 'UIDocument → live Kurot UI',
						textColor: 0xffffff,
						x: 92,
						y: 102,
					},
				}),
				createUINode({
					id: 'description',
					type: 'kui.Label',
					properties: {
						lineSpacing: 9,
						multiline: true,
						size: 22,
						text: 'This display tree was created from semantic data.\nNo EXML parser participates in this preview.',
						textColor: 0xcbd5e1,
						width: 620,
						wordWrap: true,
						x: 92,
						y: 238,
					},
				}),
				createUINode({
					id: 'button-model',
					type: 'kui.Button',
					properties: { label: 'Semantic Button', name: 'previewAction' },
				}),
			],
		}),
	});
}

function requireElement<T extends Element>(
	selector: string,
	type: { new (): T },
): T {
	const element = document.querySelector(selector);
	if (element instanceof type) return element;
	throw new Error(`Required preview element "${selector}" is missing.`);
}
