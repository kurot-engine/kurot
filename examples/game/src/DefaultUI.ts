import { Event, TouchEvent } from '@kurot/core';
import { ArrayCollection, Component } from '@kurot/ui';
import type { Button, ComboBox, HSlider, Label, List, Panel, ProgressBar, TabBar } from '@kurot/ui';

/**
 * Interactive native KUI skin gallery; every visual element is authored in XML.
 */
export class DefaultUI extends Component<'skins.DefaultUISkin'> {
	declare difficulty: ComboBox;
	declare tabs: TabBar;
	declare levels: List;
	declare speed: HSlider;
	declare progress: ProgressBar;
	declare play: Button;
	declare status: Label;
	declare restorePanel: Button;
	declare panel: Panel;

	public constructor() {
		super();
		this.skinName = 'skins.DefaultUISkin';
		this.width = 600;
		this.height = 1080;
	}

	protected override onSkinReady(): void {
		super.onSkinReady();
		this.difficulty.dataProvider = new ArrayCollection(['轻松探索', '标准冒险', '挑战模式']);
		this.difficulty.selectedIndex = 1;
		this.tabs.dataProvider = new ArrayCollection(['常规', '画面', '声音']);
		this.levels.dataProvider = new ArrayCollection(['安静森林', '蓝色海岸', '星空山谷', '晨光小镇', '云间小路', '月影湖泊']);
		this.levels.selectedIndex = 0;
		this.progress.labelFunction = (value: number): string => `${value}%`;
		this.speed.addEventListener(Event.CHANGE, this._onSpeedChange);
		this.play.addEventListener(TouchEvent.TOUCH_TAP, this._onPlay);
		this.restorePanel.addEventListener(TouchEvent.TOUCH_TAP, this._onRestorePanel);
	}

	protected override onSkinRemoved(): void {
		this.speed.removeEventListener(Event.CHANGE, this._onSpeedChange);
		this.play.removeEventListener(TouchEvent.TOUCH_TAP, this._onPlay);
		this.restorePanel.removeEventListener(TouchEvent.TOUCH_TAP, this._onRestorePanel);
		super.onSkinRemoved();
	}

	private readonly _onSpeedChange = (): void => {
		this.progress.value = this.speed.value;
	};

	private readonly _onPlay = (): void => {
		this.status.text = '冒险已准备';
	};

	private readonly _onRestorePanel = (): void => {
		if (!this.panel.parent) {
			this.addChild(this.panel);
		}
	};
}
