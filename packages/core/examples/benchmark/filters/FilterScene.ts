import { Sprite } from '../../../src/index.js';

/** Deterministic pixel geometry shared by both sides of the comparison. */
export function createFilterScene(): { world: Sprite; sparks: Sprite } {
	const world = new Sprite();
	const rect = (x: number, y: number, w: number, h: number, color: number): void => {
		world.graphics.beginFill(color); world.graphics.drawRect(x, y, w, h); world.graphics.endFill();
	};
	rect(0, 0, 440, 280, 0x102031);
	for (let i = 0; i < 42; i++) rect((i * 73 + 13) % 432, (i * 31 + 7) % 110, 2, 2, 0x91a8ad);
	rect(330, 26, 26, 26, 0xffedbc); rect(322, 34, 42, 10, 0xffedbc);
	for (let i = 0; i < 9; i++) {
		const x = i * 57 - 10, y = 93 + (i % 3) * 13;
		rect(x, y, 48, 110, 0x1b3444); rect(x + 8, y - 12, 32, 12, 0x1b3444);
	}
	rect(0, 200, 440, 80, 0x263f4a);
	for (let i = 0; i < 25; i++) rect((i * 67) % 430, 212 + i % 5 * 13, 28, 2, 0x43606a);
	for (let i = 0; i < 3; i++) {
		const x = 32 + i * 132;
		rect(x, 123, 94, 83, 0x405769); rect(x - 8, 115, 110, 12, 0x6d6577);
		rect(x + 8, 105, 78, 10, 0x6d6577); rect(x + 20, 95, 54, 10, 0x6d6577);
		rect(x + 38, 165, 22, 41, 0x192c3a);
		for (let j = 0; j < 2; j++) {
			rect(x + 10 + j * 56, 140, 17, 22, 0xffcb76);
			rect(x + 17 + j * 56, 140, 3, 22, 0x8e654d);
		}
	}
	for (const x of [19, 153, 286, 419]) {
		rect(x, 169, 4, 64, 0x243441); rect(x - 5, 163, 14, 14, 0xfff1ba);
	}
	const sparks = new Sprite();
	for (let i = 0; i < 12; i++) {
		sparks.graphics.beginFill(i % 2 ? 0x8affd3 : 0xffdd90);
		sparks.graphics.drawRect(20 + i * 33, 178 + (i * 17) % 55, 3, 3);
		sparks.graphics.endFill();
	}
	world.addChild(sparks);
	return { world, sparks };
}
