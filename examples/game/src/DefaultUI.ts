import { Event, TouchEvent } from '@kurot/core';
import { ArrayCollection, Button, ComboBox, Component, HSlider, Label, List, Panel, ProgressBar, TabBar } from '@kurot/ui';

/**
 * Interactive native KUI skin gallery; every visual element is authored in XML.
 */
export class DefaultUI extends Component<'skins.DefaultUISkin'> {
	public constructor() {
		super();
		this.skinName = 'skins.DefaultUISkin';
		this.width = 600;
		this.height = 1080;
	}

	protected override onSkinReady(): void {
		super.onSkinReady();
		const parts = this.skinParts as Readonly<Record<string, unknown>>;
		const combo = parts.difficulty;
		const tabs = parts.tabs;
		const list = parts.levels;
		if (combo instanceof ComboBox) {
			combo.dataProvider = new ArrayCollection(['轻松探索', '标准冒险', '挑战模式']);
			combo.selectedIndex = 1;
		}
		if (tabs instanceof TabBar) {
			tabs.dataProvider = new ArrayCollection(['常规', '画面', '声音']);
		}
		if (list instanceof List) {
			list.dataProvider = new ArrayCollection(['安静森林', '蓝色海岸', '星空山谷', '晨光小镇', '云间小路', '月影湖泊']);
			list.selectedIndex = 0;
		}
		const slider = parts.speed;
		const progress = parts.progress;
		if (slider instanceof HSlider && progress instanceof ProgressBar) {
			progress.labelFunction = (value: number): string => `${value}%`;
			slider.addEventListener(Event.CHANGE, () => { progress.value = slider.value; });
		}
		const play = parts.play;
		const status = parts.status;
		const restore = parts.restorePanel;
		const panel = parts.panel;
		if (play instanceof Button && status instanceof Label) {
			play.addEventListener(TouchEvent.TOUCH_TAP, () => { status.text = '冒险已准备'; });
		}
		if (restore instanceof Button && panel instanceof Panel) {
			restore.addEventListener(TouchEvent.TOUCH_TAP, () => {
				if (!panel.parent) this.addChild(panel);
			});
		}
	}
}
