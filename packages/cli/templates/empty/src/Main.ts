/**
 * Blakron 空白项目模板
 *
 * 最小化入口，只依赖 @blakron/core，不含 UI 组件。
 * 适用于纯 Canvas 渲染、自定义绘制、动画实验等场景。
 *
 * 生命周期：constructor → ADDED_TO_STAGE → $onAddToStage
 */
import { createPlayer, Sprite, Event } from '@blakron/core';

class Main extends Sprite {
	public constructor() {
		super();
		this.addEventListener(Event.ADDED_TO_STAGE, this.onAddedToStage);
	}

	private onAddedToStage(_event: Event): void {
		// 在这里编写你的游戏逻辑
		console.log('Blakron game started');
	}
}

// ── 启动 ──────────────────────────────────────────────────────────────────
const app = createPlayer({
	canvas: document.getElementById('gameCanvas') as HTMLCanvasElement,
	contentWidth: 640,
	contentHeight: 1136,
	scaleMode: 'showAll',
	frameRate: 60,
});

app.start(new Main());
