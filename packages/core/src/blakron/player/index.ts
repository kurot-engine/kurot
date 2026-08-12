// ── Core ──────────────────────────────────────────────────────────────────────
export { Player } from './Player.js';
export { createPlayer, type BlakronApp } from './createPlayer.js';
export type { BlakronOptions } from './BlakronOptions.js';

// ── Ticker ────────────────────────────────────────────────────────────────────
export {
	SystemTicker,
	ticker,
	getTimer,
	setupLifecycle,
	START_TIME,
	invalidateRenderFlag,
	setInvalidateRenderFlag,
	requestRenderingFlag,
	setRequestRenderingFlag,
	type Renderable,
} from './SystemTicker.js';

// ── Rendering ─────────────────────────────────────────────────────────────────
export { InstructionSet, type Instruction } from './webgl/InstructionSet.js';
export type { RenderPipe } from './RenderPipe.js';
export { RenderBuffer, hitTestBuffer, CanvasRenderer, DisplayList } from './canvas/index.js';

// ── Input & Layout ────────────────────────────────────────────────────────────
export { TouchHandler } from './TouchHandler.js';
export { ScreenAdapter, type StageDisplaySize } from './ScreenAdapter.js';

// ── WebGL ─────────────────────────────────────────────────────────────────────
export {
	WebGLRenderer,
	WebGLRenderContext,
	WebGLRenderBuffer,
	WebGLRenderTarget,
	WebGLVertexArrayObject,
	WebGLDrawCmdManager,
	WebGLProgram,
	ShaderLib,
	checkWebGLSupport,
	MultiTextureBatcher,
} from './webgl/index.js';
