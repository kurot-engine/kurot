import { Bitmap, BitmapData, Texture } from '@kurot/core';

const canvas = document.createElement('canvas');
canvas.width = 128;
canvas.height = 128;
const texture = new Texture(2);
texture.setBitmapData(new BitmapData(canvas));
const image = new Bitmap(texture);
console.log(texture.textureWidth); // 64 logical units
image.texture = undefined;
texture.dispose();

export {};
