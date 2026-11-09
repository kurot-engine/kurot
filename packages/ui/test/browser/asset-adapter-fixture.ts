import { Capabilities, Event, Player, resource } from '@kurot/core';
import { ArrayCollection, Image, ItemRenderer, List } from '../../dist/index.js';

class AvatarRow extends ItemRenderer<string, string> {
	public readonly avatar = new Image();

	public constructor() {
		super();
		this.width = this.height = 16;
		this.addChild(this.avatar);
	}

	protected override dataChanged(): void {
		this.avatar.source = this.data;
	}
}

async function rebuildAvatarList(): Promise<{ same: boolean; pixel: number[] }> {
	const canvas = document.querySelector('canvas')!;
	const ctx = canvas.getContext('2d')!;
	Capabilities._init();
	const player = new Player(canvas);
	player.updateStageSize(32, 32, 32, 32);
	const source = 'resource/portrait?variant=small';

	function buildList() {
		const list = new List<string>();
		list.width = list.height = 16;
		list.itemRenderer = AvatarRow;
		list.dataProvider = new ArrayCollection([source]);
		player.stage.addChild(list);
		list.validateNow();
		const row = list.getElementAt(0);
		if (!(row instanceof AvatarRow)) {
			throw new Error('Missing avatar row');
		}
		return { list, avatar: row.avatar };
	}

	try {
		const first = buildList();
		await new Promise<void>(resolve => first.avatar.once(Event.COMPLETE, () => resolve()));
		const loaded = first.avatar.bitmap?.texture;
		player.stage.removeChild(first.list);
		const second = buildList();
		// No animation frame, promise turn or network completion between rebuild and draw.
		player.render(false, 0);
		return {
			same: !!loaded && second.avatar.bitmap?.texture === loaded && resource.get(source) === loaded,
			pixel: Array.from(ctx.getImageData(5, 5, 1, 1).data),
		};
	} finally {
		player.destroy();
		resource.destroy(source);
	}
}

declare global {
	interface Window {
		rebuildAvatarList: typeof rebuildAvatarList;
	}
}
window.rebuildAvatarList = rebuildAvatarList;
