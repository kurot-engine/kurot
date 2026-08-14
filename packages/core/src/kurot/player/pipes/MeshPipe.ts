import type { Mesh } from '../../display/Mesh.js';
import type { DisplayObject } from '../../display/DisplayObject.js';
import type { RenderBuffer } from '../RenderBuffer.js';
import type { Instruction } from '../InstructionSet.js';
import type { InstructionSet } from '../InstructionSet.js';
import type { RenderPipe } from '../RenderPipe.js';

export interface MeshInstruction extends Instruction {
	readonly renderPipeId: 'mesh';
	renderable: Mesh;
	offsetX: number;
	offsetY: number;
}

/**
 * Draws textured mesh instructions through a render buffer.
 */
export class MeshPipe implements RenderPipe<Mesh> {

    // ── Static fields ─────────────────────────────────────────────────────────
	public static readonly PIPE_ID = 'mesh';

	private static readonly _pool: MeshInstruction[] = [];

	// ── Public methods ────────────────────────────────────────────────────────

	public static release(inst: MeshInstruction): void {
		MeshPipe._pool.push(inst);
	}

	public addToInstructionSet(mesh: Mesh, set: InstructionSet): void {
		if (!mesh.bitmapData?.source || mesh.vertices.length === 0 || mesh.indices.length === 0) {
			return;
		}
		set.add(MeshPipe._alloc(mesh, 0, 0));
	}

	public updateRenderable(_mesh: Mesh): void {}

	public destroyRenderable(_mesh: Mesh): void {}

	public execute(inst: MeshInstruction, buffer: RenderBuffer): void {
		const mesh = inst.renderable;
		const bd = mesh.bitmapData;
		if (!bd?.source || mesh.vertices.length === 0 || mesh.indices.length === 0) {
			return;
		}

		const destW = !isNaN(mesh.width) ? mesh.width : mesh.textureWidth;
		const destH = !isNaN(mesh.height) ? mesh.height : mesh.textureHeight;

		buffer.offsetX = 0;
		buffer.offsetY = 0;

		buffer.context.drawMesh(
			bd,
			mesh.bitmapX,
			mesh.bitmapY,
			mesh.bitmapWidth,
			mesh.bitmapHeight,
			mesh.bitmapOffsetX,
			mesh.bitmapOffsetY,
			destW,
			destH,
			mesh.sourceWidth,
			mesh.sourceHeight,
			mesh.uvs,
			mesh.vertices,
			mesh.indices,
			mesh.texture?.rotated ?? false,
			mesh.smoothing,
		);

		buffer.offsetX = 0;
		buffer.offsetY = 0;
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private static _alloc(mesh: Mesh, ox: number, oy: number): MeshInstruction {
		const inst = MeshPipe._pool.pop() ?? {
			renderPipeId: 'mesh',
			renderable: mesh,
			offsetX: ox,
			offsetY: oy,
		};
		inst.renderable = mesh;
		inst.offsetX = ox;
		inst.offsetY = oy;
		return inst;
	}
}
