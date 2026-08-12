import {
  LoadingUI
} from "./chunk-K5JFKKX5.js";

// src/Main.ts
import { createPlayer, TextField, Shape, Event, resource } from "@blakron/core";
import { Button, DefaultAssetAdapter, Theme, UILayer, setAssetAdapter } from "@blakron/ui";
import { Tween } from "@blakron/game";
var Main = class extends UILayer {
  createChildren() {
    super.createChildren();
    const stage = this.stage;
    if (!stage) return;
    this.runGame(stage).catch((e) => {
      console.log(e);
    });
  }
  async runGame(stage) {
    await this.loadResource(stage);
    this.installResourceAssetAdapter();
    await this.loadTheme();
    this.createGameScene(stage);
    this.startAnimation();
  }
  /**
   * 让 EXML 中的 source="button_up_png" 优先解析为预加载图集的子纹理，
   * 普通 URL 图片仍交给默认适配器加载。
   */
  installResourceAssetAdapter() {
    const fallback = new DefaultAssetAdapter();
    setAssetAdapter({
      getAsset: (source, callback) => {
        const texture = resource.get(source);
        if (texture) {
          callback(texture, source);
          return;
        }
        fallback.getAsset(source, callback);
      }
    });
  }
  async loadResource(stage) {
    const loadingView = new LoadingUI();
    stage.addChild(loadingView);
    try {
      await resource.loadConfig("resource/default.res.json", "resource/");
      if (resource.hasGroup("preload")) {
        await resource.loadGroup("preload", 0, (loaded, total) => {
          loadingView.onProgress(loaded, total);
        });
      }
    } catch {
    }
    stage.removeChild(loadingView);
  }
  async loadTheme() {
    const theme = new Theme("resource/default.thm.json");
    await new Promise((resolve) => theme.addEventListener(Event.COMPLETE, () => resolve()));
  }
  textfield;
  /**
   * 创建游戏场景
   *
   * 使用 Shape（矢量绘制）和 TextField（文本）等基础显示对象搭建画面。
   */
  createGameScene(stage) {
    const stageW = stage.stageWidth;
    const stageH = stage.stageHeight;
    const sky = new Shape();
    sky.graphics.beginFill(2962486, 1);
    sky.graphics.drawRect(0, 0, stageW, stageH);
    sky.graphics.endFill();
    this.addChild(sky);
    const topMask = new Shape();
    topMask.graphics.beginFill(0, 0.5);
    topMask.graphics.drawRect(0, 0, stageW, 172);
    topMask.graphics.endFill();
    topMask.y = 33;
    this.addChild(topMask);
    const colorLabel = new TextField();
    colorLabel.textColor = 16777215;
    colorLabel.width = stageW;
    colorLabel.textAlign = "center";
    colorLabel.text = "Hello Blakron";
    colorLabel.size = 36;
    colorLabel.x = 0;
    colorLabel.y = 80;
    this.addChild(colorLabel);
    const textfield = new TextField();
    this.addChild(textfield);
    textfield.alpha = 0;
    textfield.width = stageW;
    textfield.textAlign = "center";
    textfield.size = 24;
    textfield.textColor = 16777215;
    textfield.x = 0;
    textfield.y = 135;
    this.textfield = textfield;
    const button = new Button();
    button.label = "Click Me";
    button.x = (stageW - 200) / 2;
    button.y = 200;
    button.width = 200;
    this.addChild(button);
  }
  /**
   * 播放文本淡入淡出动画
   */
  startAnimation() {
    const texts = ["Open-source, Free, Multi-platform", "Push Game Forward", "HTML5 Game Engine"];
    let count = -1;
    const change = () => {
      count++;
      if (count >= texts.length) {
        count = 0;
      }
      this.textfield.text = texts[count];
      const tw = Tween.get(this.textfield);
      tw.to({ alpha: 1 }, 200);
      tw.wait(2e3);
      tw.to({ alpha: 0 }, 200);
      tw.call(change, this);
    };
    change();
  }
};
var app = createPlayer({
  canvas: document.getElementById("gameCanvas"),
  contentWidth: 640,
  contentHeight: 1136,
  scaleMode: "showAll",
  frameRate: 60
});
app.start(new Main());
