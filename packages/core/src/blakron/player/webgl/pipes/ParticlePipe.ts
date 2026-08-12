import type { DisplayObject } from '../../../display/DisplayObject.js';
import type { WebGLRenderBuffer } from '../WebGLRenderBuffer.js';
import type { Instruction } from '../InstructionSet.js';
import type { InstructionSet } from '../InstructionSet.js';
import type { RenderPipe } from '../../RenderPipe.js';
import type { Texture as TextureClass } from '../../../display/texture/Texture.js';
import { Matrix } from '../../../geom/Matrix.js';

// ── Instruction ───────────────────────────────────────────────────────────────

export interface ParticleInstruction extends Instruction {
	readonly renderPipeId: 'particle';
	renderable: DisplayObject;
	offsetX: number;
	offsetY: number;
}

// ── Pipe ──────────────────────────────────────────────────────────────────────

/**
 * Handles WebGL rendering of ParticleSystem display objects.
 * The ParticleSystem lives in @blakron/game; core accesses it via duck-typing.
 */
export class ParticlePipe implements RenderPipe<DisplayObject> {
	public static readonly PIPE_ID = 'particle';

	// ── RenderPipe impl ───────────────────────────────────────────────────────

	public addToInstructionSet(_ps: DisplayObject, _set: InstructionSet): void {
		/* no-op */
	}

	public updateRenderable(_ps: DisplayObject): void {
		/* no-op */
	}

	public destroyRenderable(_ps: DisplayObject): void {
		/* no-op */
	}

	// ── Execute ───────────────────────────────────────────────────────────────

	public execute(inst: ParticleInstruction, buffer: WebGLRenderBuffer): void {
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
