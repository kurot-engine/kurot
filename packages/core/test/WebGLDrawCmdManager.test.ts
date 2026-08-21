import { describe, expect, it } from 'vitest';
import { makeMultiCmd } from '../src/kurot/player/webgl/MultiTextureBatcher.js';
import { DrawCmdType, WebGLDrawCmdManager } from '../src/kurot/player/webgl/WebGLDrawCmdManager.js';

describe('WebGLDrawCmdManager multi-texture batching', () => {
	it('keeps an expanding texture-slot set in one draw command', () => {
		const manager = new WebGLDrawCmdManager();
		const textures = Array.from({ length: 8 }, () => ({}) as WebGLTexture);

		for (let textureCount = 1; textureCount <= textures.length; textureCount++) {
			manager.pushDrawMultiTexture(makeMultiCmd(2, textures, textureCount));
		}

		expect(manager.drawDataLen).toBe(1);
		expect(manager.drawData[0].type).toBe(DrawCmdType.MULTI_TEXTURE);
		expect(manager.drawData[0].count).toBe(16);
		expect(manager.drawData[0].multiCmd).toEqual({
			isMulti: true,
			count: 16,
			textures,
			textureCount: 8,
		});
	});

	it('starts a new command when the texture-slot prefix changes', () => {
		const manager = new WebGLDrawCmdManager();
		const first = {} as WebGLTexture;
		const second = {} as WebGLTexture;

		manager.pushDrawMultiTexture(makeMultiCmd(2, [first], 1));
		manager.pushDrawMultiTexture(makeMultiCmd(2, [second], 1));

		expect(manager.drawDataLen).toBe(2);
	});
});
