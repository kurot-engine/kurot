import { createPlayer, Shape, Sprite, TextField } from '@kurot/core';

export function makePage(title: string, ids: readonly string[]): {
	app: ReturnType<typeof createPlayer>; root: Sprite; buttons: Record<string, HTMLButtonElement>;
	mirror: (phase: string, score: number, values?: Record<string, string>) => void;
} {
	const canvas = document.getElementById('gameCanvas');
	if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing canvas.');
	document.body.style.cssText = 'margin:0;padding:12px;box-sizing:border-box;background:#091d25;color:white;font:16px Arial';
	const parent = canvas.parentElement;
	if (!parent) throw new Error('Missing canvas parent.');
	parent.style.cssText = 'width:min(100%,480px);aspect-ratio:4/5;margin:auto';
	const bar = document.createElement('nav');
	bar.style.cssText = 'display:flex;gap:8px;max-width:480px;margin:12px auto';
	const buttons: Record<string, HTMLButtonElement> = {};
	for (const id of ids) {
		const button = document.createElement('button'); button.id = id;
		button.textContent = id[0].toUpperCase() + id.slice(1);
		button.style.cssText = 'flex:1;padding:12px 4px;min-width:0';
		buttons[id] = button; bar.append(button);
	}
	document.body.append(bar);
	const status = document.createElement('output'); status.id = 'status';
	status.style.cssText = 'display:block;max-width:480px;margin:auto'; document.body.append(status);
	const app = createPlayer({ canvas, contentWidth: 640, contentHeight: 800 });
	const root = new Sprite();
	const background = new Shape(); background.graphics.beginFill(0x14343d);
	background.graphics.drawRect(0, 0, 640, 800); background.graphics.endFill();
	root.addChild(background);
	const hud = new TextField(); hud.x = 24; hud.y = 30; hud.width = 590; hud.size = 28; hud.textColor = 0xffffff;
	root.addChild(hud); app.start(root);
	return {
		app, root, buttons,
		mirror: (phase, score, values = {}): void => {
			Object.assign(status.dataset, { phase, score: String(score), ...values });
			status.textContent = `${title}: ${phase}; score ${score}`;
			hud.text = `${title}\n${phase} · Score ${score}`;
		},
	};
}
