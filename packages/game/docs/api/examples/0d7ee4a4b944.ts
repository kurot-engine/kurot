import { Sprite } from '@kurot/core';
import { ScrollView } from '@kurot/game';

const stage = new Sprite();
const myContentSprite = new Sprite();
const sv = new ScrollView();
sv.width = 640;
sv.height = 960;
sv.setContent(myContentSprite);
stage.addChild(sv);

export {};
