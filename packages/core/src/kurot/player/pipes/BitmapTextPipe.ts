import { textureScaleFactor } from '../../display/texture/Texture.js';
import type { BitmapText } from '../../text/BitmapText.js';
import type { Instruction, InstructionSet } from '../InstructionSet.js';
import type { RenderBuffer } from '../RenderBuffer.js';
import type { RenderPipe } from '../RenderPipe.js';

export interface BitmapTextInstruction extends Instruction {
	readonly renderPipeId: 'bitmapText';
	renderable: BitmapText;
	offsetX: number;
	offsetY: number;
}

/**
 * Glyph images share the backend's ordinary texture batching and tint state.
 * No rasterized text cache or glyph DisplayObjects are allocated.
 */
export class BitmapTextPipe implements RenderPipe<BitmapText> {
	public addToInstructionSet(text: BitmapText, set: InstructionSet): void {
		set.add({ renderPipeId: 'bitmapText', renderable: text, offsetX: 0, offsetY: 0 } as BitmapTextInstruction);
	}
	public updateRenderable(_text: BitmapText): void {}
	public execute(instruction: BitmapTextInstruction, buffer: RenderBuffer): void {
		const text = instruction.renderable;
		const font = text.font;
		if (!font) return;
		buffer.offsetX = 0;
		buffer.offsetY = 0;
		for (const position of text.getGlyphs()) {
			const texture = font.getTexture(position.character);
			const bitmap = texture?.bitmapData;
			if (!texture || !bitmap?.source || texture.bitmapWidth === 0 || texture.bitmapHeight === 0) continue;
			buffer.context.drawImage(
				bitmap,
				texture.bitmapX,
				texture.bitmapY,
				texture.bitmapWidth,
				texture.bitmapHeight,
				position.x + texture.offsetX,
				position.y + texture.offsetY,
				texture.bitmapWidth * textureScaleFactor,
				texture.bitmapHeight * textureScaleFactor,
				texture.sourceWidth,
				texture.sourceHeight,
				false,
				text.smoothing,
			);
		}
	}
}
