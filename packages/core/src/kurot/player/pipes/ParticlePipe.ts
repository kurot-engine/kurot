import type { DisplayObject } from '../../display/DisplayObject.js';
import type { RenderBuffer } from '../RenderBuffer.js';
import type { Instruction } from '../InstructionSet.js';
import type { InstructionSet } from '../InstructionSet.js';
import type { RenderPipe } from '../RenderPipe.js';
import type { Texture as TextureClass } from '../../display/texture/Texture.js';
import { Matrix } from '../../geom/Matrix.js';

export interface ParticleInstruction extends Instruction {
	readonly renderPipeId: 'particle';
	renderable: DisplayObject;
	offsetX: number;
	offsetY: number;
}

/**
 * Draws particle systems supplied through the game package's structural contract.
 */
export class ParticlePipe implements RenderPipe<DisplayObject> {

    // ── Static fields ─────────────────────────────────────────────────────────
	public static readonly PIPE_ID = 'particle';

	// ── Public methods ────────────────────────────────────────────────────────

	public addToInstructionSet(_ps: DisplayObject, _set: InstructionSet): void {}

	public updateRenderable(_ps: DisplayObject): void {}

	public destroyRenderable(_ps: DisplayObject): void {}

	public execute(inst: ParticleInstruction, buffer: RenderBuffer): void {
		const ps = inst.renderable as unknown as {
			readonly particles: readonly {
				x: number;
				y: number;
				scale: number;
				rotation: number;
				alpha: number;
				blendMode: number;
				$getMatrix(regX: number, regY: number): Matrix;
			}[];
			texture: TextureClass;
			numParticles: number;
		};

		if (ps.numParticles === 0) return;

		const texture = ps.texture;
		const bd = texture.bitmapData;
		if (!bd?.source) return;

		const texW = texture.textureWidth;
		const texH = texture.textureHeight;
		const regX = texW / 2;
		const regY = texH / 2;

		const savedMatrix = Matrix.create();
		savedMatrix.copyFrom(buffer.globalMatrix);

		const baseAlpha = buffer.globalAlpha;

		for (let i = 0; i < ps.numParticles; i++) {
			const particle = ps.particles[i];
			const matrix = particle.$getMatrix(regX, regY);

			buffer.globalMatrix.copyFrom(savedMatrix);
			buffer.globalMatrix.append(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);

			buffer.globalAlpha = baseAlpha * particle.alpha;

			buffer.context.drawImage(
				bd,
				texture.bitmapX,
				texture.bitmapY,
				texture.bitmapWidth,
				texture.bitmapHeight,
				texture.offsetX,
				texture.offsetY,
				texW,
				texH,
				texture.sourceWidth,
				texture.sourceHeight,
				texture.rotated ?? false,
				false,
			);
		}

		buffer.globalMatrix.copyFrom(savedMatrix);
		buffer.globalAlpha = baseAlpha;
		Matrix.release(savedMatrix);
	}
}
