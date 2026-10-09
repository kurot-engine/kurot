import { describe, expect, it } from 'vitest';
import { generateCode, parseKUISkin } from '../src/core/kui/index.js';

function compile(body: string): string {
	return generateCode(
		parseKUISkin(`<Skin xmlns="https://kurot.dev/ui/1" class="FlipSkin" states="down">${body}</Skin>`),
	);
}

describe('centered flip compilation', () => {
	it('emits inherited flags and named state overrides while preserving negative scale', () => {
		const script = compile(
			'<Group id="group" flipX="true" scaleX="-1"><Image id="image" width="100%" height="100%" flipY="false" flipY.down="true" /></Group>',
		);
		expect(script).toContain('group.flipX = true;');
		expect(script).toContain('group.scaleX = -1;');
		expect(script).toContain('image.percentWidth = 100;');
		expect(script).toContain('image.flipY = false;');
		expect(script).toContain('new SetProperty("image", "flipY", true)');
	});

	it('supports controls outside the foundation subset', () => {
		expect(compile('<HSlider id="slider" flipX="true" />')).toContain('slider.flipX = true;');
	});

	it.each(['<Image flipX="1" />', '<Group flipY="yes" />', '<Button flipX.down="wrong" />'])(
		'rejects malformed flags %s',
		body => {
			expect(() => compile(body)).toThrow(/flip|boolean/);
		},
	);

	it('rejects flags on a nonvisual Skin root', () => {
		expect(() => parseKUISkin('<Skin xmlns="https://kurot.dev/ui/1" class="FlipSkin" flipX="true" />')).toThrow(
			/Skin root/,
		);
	});
});
