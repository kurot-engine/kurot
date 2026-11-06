import { BitmapData, Texture } from '@kurot/core';

const canvas = document.createElement('canvas');
canvas.width = canvas.height = 1;
const pixels = canvas.getContext('2d');
if (!pixels) {
    throw new Error('Canvas 2D is required');
}
pixels.fillRect(0, 0, 1, 1);
const texture = new Texture();
texture.setBitmapData(new BitmapData(canvas));
console.log(texture.hitTestAlpha(0, 0)); // true
texture.dispose();

export {};
