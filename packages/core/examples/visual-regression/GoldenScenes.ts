import {
	Bitmap,
	BitmapData,
	BlendMode,
	BlurFilter,
	ColorMatrixFilter,
	Mesh,
	Rectangle,
	RenderTexture,
	Shape,
	Sprite,
	TextField,
	Texture,
} from '../../src/index.js';

export function buildGoldenScene(): Sprite {
	const root = new Sprite();
	root.addChild(makeBackdrop());
	root.addChild(makeGraphicsAndTransforms());
	root.addChild(makeBlendAndAlpha());
	root.addChild(makeMultiTextureStrip());
	root.addChild(makeMaskScene());
	root.addChild(makeFilterScene());
	root.addChild(makeTextScene());
	root.addChild(makeCachedScene());
	root.addChild(makeMeshScene());
	root.addChild(makeRenderTextureScene());
	return root;
}

function makeBackdrop(): Shape {
	const shape = new Shape();
	shape.graphics.beginFill(0x162033, 1);
	shape.graphics.drawRect(0, 0, 640, 480);
	shape.graphics.endFill();
	return shape;
}

function makeGraphicsAndTransforms(): Sprite {
	const holder = new Sprite();
	holder.x = 24;
	holder.y = 22;
	const rect = makeRect(0x35a7ff, 72, 54);
	rect.rotation = -8;
	rect.anchorOffsetX = 36;
	rect.anchorOffsetY = 27;
	rect.x = 42;
	rect.y = 34;
	holder.addChild(rect);
	const circle = new Shape();
	circle.graphics.beginFill(0xffc857, 1);
	circle.graphics.drawCircle(28, 28, 26);
	circle.graphics.endFill();
	circle.x = 92;
	circle.scaleX = 1.2;
	circle.scaleY = 0.75;
	holder.addChild(circle);
	const line = new Shape();
	line.graphics.lineStyle(4, 0xf5f7ff, 1);
	line.graphics.moveTo(0, 0);
	line.graphics.curveTo(35, -26, 72, 8);
	line.graphics.lineTo(94, 38);
	line.x = 164;
	line.y = 34;
	holder.addChild(line);
	return holder;
}

function makeBlendAndAlpha(): Sprite {
	const holder = new Sprite();
	holder.x = 300;
	holder.y = 18;
	holder.addChild(makeRect(0xff3d71, 74, 62));
	const overlay = makeRect(0x38e6a7, 74, 62);
	overlay.x = 34;
	overlay.y = 20;
	overlay.alpha = 0.72;
	overlay.blendMode = BlendMode.ADD;
	holder.addChild(overlay);
	const tinted = makeRect(0xffffff, 64, 42);
	tinted.x = 142;
	tinted.y = 10;
	tinted.tint = 0xa86cff;
	holder.addChild(tinted);
	return holder;
}

function makeMultiTextureStrip(): Sprite {
	const holder = new Sprite();
	holder.x = 22;
	holder.y = 108;
	const textures = Array.from({ length: 8 }, (_, index) => makeTexture(index));
	for (let index = 0; index < 16; index++) {
		const bitmap = new Bitmap(textures[index % textures.length]);
		bitmap.x = index * 36;
		bitmap.y = index % 2 === 0 ? 0 : 12;
		holder.addChild(bitmap);
	}
	return holder;
}

function makeMaskScene(): Sprite {
	const wrapper = new Sprite();
	wrapper.x = 24;
	wrapper.y = 182;
	const holder = new Sprite();
	const content = new Shape();
	content.graphics.beginFill(0xff6b35, 1);
	content.graphics.drawRect(0, 0, 118, 82);
	content.graphics.endFill();
	content.graphics.lineStyle(7, 0x4cc9f0, 1);
	content.graphics.moveTo(0, 0);
	content.graphics.lineTo(118, 82);
	content.graphics.moveTo(118, 0);
	content.graphics.lineTo(0, 82);
	holder.addChild(content);
	wrapper.addChild(holder);
	const mask = new Shape();
	mask.graphics.beginFill(0xffffff, 1);
	mask.graphics.drawCircle(59, 41, 37);
	mask.graphics.endFill();
	wrapper.addChild(mask);
	holder.mask = mask;
	return wrapper;
}

function makeFilterScene(): Sprite {
	const holder = new Sprite();
	holder.x = 182;
	holder.y = 180;
	const blur = makeRect(0xf7f7ff, 72, 58);
	blur.filters = [new BlurFilter(4, 4)];
	holder.addChild(blur);
	const grayscale = makeRect(0xff3d71, 72, 58);
	grayscale.x = 112;
	grayscale.filters = [
		new ColorMatrixFilter([0.3, 0.6, 0.1, 0, 0, 0.3, 0.6, 0.1, 0, 0, 0.3, 0.6, 0.1, 0, 0, 0, 0, 0, 1, 0]),
	];
	holder.addChild(grayscale);
	return holder;
}

function makeTextScene(): TextField {
	const text = new TextField();
	text.x = 416;
	text.y = 186;
	text.width = 196;
	text.height = 68;
	text.fontFamily = 'Arial';
	text.size = 24;
	text.bold = true;
	text.textColor = 0xf4f7ff;
	text.stroke = 2;
	text.strokeColor = 0x304ffe;
	text.text = 'Kurot 2D\nGolden 03';
	text.multiline = true;
	return text;
}

function makeCachedScene(): Sprite {
	const wrapper = new Sprite();
	wrapper.x = 24;
	wrapper.y = 312;
	const holder = new Sprite();
	for (let index = 0; index < 4; index++) {
		const child = makeRect(0x2dd4bf + index * 0x120700, 42, 42);
		child.x = index * 28;
		child.y = index * 10;
		holder.addChild(child);
	}
	holder.cacheAsBitmap = true;
	wrapper.addChild(holder);
	return wrapper;
}

function makeMeshScene(): Mesh {
	const mesh = new Mesh(makeTexture(5));
	mesh.x = 196;
	mesh.y = 314;
	mesh.vertices = [0, 0, 112, 12, 94, 82, 12, 68];
	mesh.uvs = [0, 0, 1, 0, 1, 1, 0, 1];
	mesh.indices = [0, 1, 2, 0, 2, 3];
	mesh.updateVertices();
	return mesh;
}

function makeRenderTextureScene(): Bitmap {
	const source = new Sprite();
	source.addChild(makeRect(0x6c63ff, 92, 72));
	const mark = new Shape();
	mark.graphics.beginFill(0xffdd57, 1);
	mark.graphics.drawCircle(46, 36, 24);
	mark.graphics.endFill();
	source.addChild(mark);
	const texture = new RenderTexture();
	if (!texture.drawToTexture(source, new Rectangle(0, 0, 92, 72))) {
		throw new Error('Failed to build the RenderTexture golden scene.');
	}
	const bitmap = new Bitmap(texture);
	bitmap.x = 358;
	bitmap.y = 318;
	bitmap.rotation = 6;
	return bitmap;
}

function makeRect(color: number, width: number, height: number): Shape {
	const shape = new Shape();
	shape.graphics.beginFill(color, 1);
	shape.graphics.drawRect(0, 0, width, height);
	shape.graphics.endFill();
	return shape;
}

function makeTexture(index: number): Texture {
	const source = document.createElement('canvas');
	source.width = 32;
	source.height = 32;
	const context = source.getContext('2d');
	if (!context) throw new Error('Failed to create a golden texture.');
	context.fillStyle = `hsl(${index * 45}, 78%, 58%)`;
	context.fillRect(0, 0, 32, 32);
	context.fillStyle = index % 2 === 0 ? '#ffffff' : '#152033';
	context.fillRect(4 + (index % 3) * 3, 4, 8, 24);
	const texture = new Texture();
	texture.setBitmapData(new BitmapData(source));
	return texture;
}
