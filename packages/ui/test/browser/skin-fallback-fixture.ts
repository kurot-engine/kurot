import { Capabilities, Event, Player, TouchEvent, TouchHandler } from '@kurot/core';
import { AddItems, ArrayCollection, ItemRenderer, ItemTapEvent, List, Rect, Skin, State } from '../../dist/index.js';

class SparseRow extends ItemRenderer {
	public declare icon: Rect;
	public declare quantity: Rect;

	public constructor() {
		super();
		this.width = this.height = 70;
		const icon = new Rect(70, 70, 0xea3456);
		const quantity = new Rect(20, 10, 0xffffff);
		quantity.x = 48;
		quantity.y = 55;
		quantity.touchEnabled = false;
		const skin = new Skin();
		skin.skinParts = ['icon', 'quantity'];
		skin.setPart('icon', icon);
		skin.setPart('quantity', quantity);
		skin.states = [new State('up', [new AddItems('icon', ''), new AddItems('quantity', '')]), new State('disabled')];
		this.skinName = skin;
	}
}

function mountSparseSkin(backend: 'canvas' | 'webgl1' | 'webgl2') {
	const canvas = document.querySelector('canvas')!;
	const context2d = backend === 'canvas' ? canvas.getContext('2d') : undefined;
	const gl = backend === 'webgl1' ? canvas.getContext('webgl', { preserveDrawingBuffer: true })
		: backend === 'webgl2' ? canvas.getContext('webgl2', { preserveDrawingBuffer: true }) : undefined;
	if (!context2d && !gl) {
		throw new Error(`Missing ${backend} context`);
	}
	Capabilities._init();
	const player = new Player(canvas);
	player.updateStageSize(100, 100, 100, 100);
	const list = new List();
	list.width = list.height = 70;
	list.itemRenderer = SparseRow;
	list.dataProvider = new ArrayCollection([1]);
	player.stage.addChild(list);
	list.validateNow();
	const row = list.getElementAt(0);
	if (!(row instanceof SparseRow)) {
		throw new Error('Missing sparse row');
	}
	const input = new TouchHandler(player.stage, canvas);
	let changes = 0;
	let coreTaps = 0;
	let itemTaps = 0;
	for (const part of [row.icon, row.quantity]) {
		for (const type of [Event.ADDED, Event.REMOVED, Event.ADDED_TO_STAGE, Event.REMOVED_FROM_STAGE]) {
			part.addEventListener(type, () => changes++);
		}
	}
	row.addEventListener(TouchEvent.TOUCH_TAP, () => coreTaps++);
	list.addEventListener(ItemTapEvent.ITEM_TAP, () => itemTaps++);
	function pixel(x: number, y: number): number[] {
		if (context2d) {
			return Array.from(context2d.getImageData(x, y, 1, 1).data);
		}
		const result = new Uint8Array(4);
		// Render cleanup may leave a scratch target bound; inspect the actual canvas.
		gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
		gl!.readPixels(x, canvas.height - 1 - y, 1, 1, gl!.RGBA, gl!.UNSIGNED_BYTE, result);
		return Array.from(result);
	}
	return {
		snapshot() {
			list.validateNow();
			row.validateNow();
			player.render(false, 0);
			return {
				icon: pixel(35, 35), quantity: pixel(50, 60),
				mounted: row.icon.parent === row && row.quantity.parent === row,
				sameHit: player.stage.$hitTest(35, 35) === row.icon,
				requested: row.currentState, applied: row.skin?.currentState,
				selected: row.selected, changes, coreTaps, itemTaps,
			};
		},
		destroy(): void {
			input.dispose();
			player.destroy();
		},
	};
}

declare global {
	interface Window {
		mountSparseSkin: typeof mountSparseSkin;
		sparseSkin: ReturnType<typeof mountSparseSkin>;
	}
}
window.mountSparseSkin = mountSparseSkin;
