import { createPlayer, Sprite } from '@kurot/core';

const app = createPlayer({
  canvas: document.getElementById('gameCanvas') as HTMLCanvasElement,
  contentWidth: 640,
  contentHeight: 1136,
  scaleMode: 'showAll',
  frameRate: 60,
});

const root = new Sprite();
app.start(root);

export {};
