// src/LoadingUI.ts
import { Sprite, TextField } from "@blakron/core";
var LoadingUI = class extends Sprite {
  textField;
  constructor() {
    super();
    this.textField = new TextField();
    this.addChild(this.textField);
    this.textField.y = 300;
    this.textField.width = 480;
    this.textField.height = 100;
    this.textField.textAlign = "center";
  }
  onProgress(current, total) {
    this.textField.text = `Loading...${current}/${total}`;
  }
};

export {
  LoadingUI
};
