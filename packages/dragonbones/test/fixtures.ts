import { BitmapData, Texture } from '@kurot/core';

export function makeTexture(width = 128, height = 128): Texture {
	const source = { width, height } as HTMLCanvasElement;
	const texture = new Texture();
	texture.setBitmapData(new BitmapData(source));
	return texture;
}

export function makeAtlas(): object {
	return {
		name: 'test',
		width: 128,
		height: 128,
		imagePath: 'test.png',
		SubTexture: [
			{ name: 'image', x: 10, y: 20, width: 16, height: 24 },
			{ name: 'rotated', x: 50, y: 20, width: 8, height: 12, rotated: true },
			{ name: 'trimmed', x: 0, y: 64, width: 16, height: 16, frameX: -4, frameY: -6, frameWidth: 32, frameHeight: 32 },
		],
	};
}

interface SkeletonOptions {
	mesh?: boolean;
	weighted?: boolean;
	nested?: boolean;
	texture?: string;
	color?: Record<string, number>;
}

export function makeSkeleton(options: SkeletonOptions = {}): object {
	const name = options.texture ?? 'image';
	const image = { name, type: 'image', pivot: { x: 0.5, y: 0.5 } };
	const mesh = {
		name: 'image',
		type: 'mesh',
		vertices: [0, 0, 16, 0, 16, 24, 0, 24],
		uvs: [0, 0, 1, 0, 1, 1, 0, 1],
		triangles: [0, 1, 2, 0, 2, 3],
		...(options.weighted ? { weights: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1], slotPose: [1, 0, 0, 1, 0, 0], bonePose: [0, 1, 0, 0, 1, 0, 0] } : {}),
	};
	const child = { name: 'child', type: 'armature' };
	const animation = {
		name: 'move',
		duration: 24,
		playTimes: 1,
		bone: [
			{
				name: 'root',
				translateFrame: [
					{ duration: 12, x: 0, y: 0, tweenEasing: 0 },
					{ duration: 12, x: 20, y: 0 },
				],
			},
		],
		frame: [{ duration: 12, event: 'marker', sound: 'sound' }, { duration: 12 }],
	};
	const armature = {
		name: 'main',
		bone: [{ name: 'root', transform: { x: 10, y: 20 } }],
		slot: [{ name: 'slot', parent: 'root', ...(options.color ? { color: options.color } : {}) }],
		skin: [{ name: 'default', slot: [{ name: 'slot', display: [options.nested ? child : options.mesh ? mesh : image] }] }],
		animation: [animation],
	};
	return {
		name: 'test',
		version: '5.5',
		compatibleVersion: '5.5',
		frameRate: 24,
		armature: [armature, ...(options.nested ? [{ ...armature, name: 'child', skin: [{ name: 'default', slot: [{ name: 'slot', display: [image] }] }] }] : [])],
	};
}
