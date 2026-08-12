/**
 * 资源加载进度界面
 *
 * 在资源加载期间显示 "Loading...current/total" 文本。
 * 对应 Egret 的 LoadingUI。
 */
import { Sprite, TextField } from '@blakron/core';

class LoadingUI extends Sprite {
	private textField: TextField;

	public constructor() {
		super();
		this.textField = new TextField();
		this.addChild(this.textField);
		this.textField.y = 300;
		this.textField.width = 480;
		this.textField.height = 100;
		this.textField.textAlign = 'center';
	}

	public onProgress(current: number, total: number): void {
		this.textField.text = `Loading...${current}/${total}`;
	}
}

export { LoadingUI };
