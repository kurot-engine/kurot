import { SoundChannel } from '../../src/kurot/media/SoundChannel.js';
import { Event } from '../../src/kurot/events/Event.js';

export interface AudioLoopResult {
	sampleRate: number;
	bufferFrames: number;
	playedFrames: number;
	sourceCount: number;
	nativeLoop: boolean;
	completions: number;
	position: number;
	maxError: number;
	missingFrames: number;
	trailingPeak: number;
}

async function renderLoop(buffer: AudioBuffer, loops: number, offsetFrames: number): Promise<AudioLoopResult> {
	const count = loops <= 0 ? Infinity : loops > 0 ? Math.ceil(loops) : 1;
	const offset = Math.min(offsetFrames, buffer.length);
	const finite = Number.isFinite(count);
	const playedFrames = (finite ? count : 3) * buffer.length - offset;
	const renderFrames = playedFrames + 128;
	const context = new OfflineAudioContext(buffer.numberOfChannels, renderFrames, buffer.sampleRate);
	const sources: AudioBufferSourceNode[] = [];
	const createSource = context.createBufferSource.bind(context);
	context.createBufferSource = (): AudioBufferSourceNode => {
		const source = createSource();
		sources.push(source);
		return source;
	};
	const channel = new SoundChannel(
		context as unknown as AudioContext,
		buffer,
		undefined,
		offsetFrames / buffer.sampleRate,
		loops,
	);
	const volume = 0.6;
	channel.volume = volume;
	let completions = 0;
	let resolveCompleted: (() => void) | undefined;
	const completed = new Promise<void>(resolve => {
		resolveCompleted = resolve;
	});
	const onCompleted = (): void => {
		completions++;
		resolveCompleted?.();
	};
	channel.addEventListener(Event.SOUND_COMPLETE, onCompleted);
	const rendering = context.startRendering();
	// Audio rendering must not need JavaScript to restart at a loop boundary.
	const busyUntil = performance.now() + 30;
	while (performance.now() < busyUntil) {
		/* Hold the control thread while audio renders. */
	}
	const output = await rendering;
	if (finite) {
		await completed;
	}
	let maxError = 0;
	let missingFrames = 0;
	let trailingPeak = 0;
	for (let c = 0; c < output.numberOfChannels; c++) {
		const original = buffer.getChannelData(c);
		const rendered = output.getChannelData(c);
		for (let i = 0; i < rendered.length; i++) {
			const expected = finite && i >= playedFrames ? 0 : original[(offset + i) % original.length] * volume;
			maxError = Math.max(maxError, Math.abs(rendered[i] - expected));
			if (Math.abs(expected) > 1e-5 && Math.abs(rendered[i]) < 1e-8) {
				missingFrames++;
			}
			if (finite && i >= playedFrames) {
				trailingPeak = Math.max(trailingPeak, Math.abs(rendered[i]));
			}
		}
	}
	const result: AudioLoopResult = {
		sampleRate: buffer.sampleRate,
		bufferFrames: buffer.length,
		playedFrames,
		sourceCount: sources.length,
		nativeLoop: sources[0].loop,
		completions,
		position: channel.position,
		maxError,
		missingFrames,
		trailingPeak,
	};
	channel.stop();
	return result;
}

export async function renderSyntheticLoop(
	loops: number,
	offsetFrames = 0,
	sampleRate = 44100,
): Promise<AudioLoopResult> {
	const context = new OfflineAudioContext(2, 257, sampleRate);
	const buffer = context.createBuffer(2, 257, sampleRate);
	for (let c = 0; c < 2; c++) {
		const data = buffer.getChannelData(c);
		for (let i = 0; i < data.length; i++) {
			data[i] = (c === 0 ? 1 : -1) * (0.2 + (i % 67) / 670);
		}
	}
	return renderLoop(buffer, loops, offsetFrames);
}

export async function renderMP3Loop(loops: number): Promise<AudioLoopResult> {
	const context = new OfflineAudioContext(2, 1, 44100);
	const response = await fetch('/fixture.mp3');
	if (!response.ok) throw new Error('Audio fixture could not be loaded.');
	const buffer = await context.decodeAudioData(await response.arrayBuffer());
	return renderLoop(buffer, loops, 0);
}

declare global {
	interface Window {
		audioLoop: {
			renderSyntheticLoop: typeof renderSyntheticLoop;
			renderMP3Loop: typeof renderMP3Loop;
		};
	}
}

window.audioLoop = { renderSyntheticLoop, renderMP3Loop };
