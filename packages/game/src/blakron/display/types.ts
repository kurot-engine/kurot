import type { Texture } from '@blakron/core';

/**
 * One logical runtime frame in MovieClipData.
 *
 * Indices used by MovieClipData are 0-based; MovieClip exposes its public
 * currentFrame value as a 1-based frame number.
 */
export interface MovieClipFrame {
	/** Texture displayed for this logical frame; undefined represents a blank frame. */
	texture?: Texture;
	/**
	 * Timing metadata in milliseconds for an external animation scheduler.
	 * MovieClip does not consume this value when advanceFrame() is called.
	 */
	duration: number;
	/** Optional label that begins at this 0-based runtime frame. */
	label?: string;
	/** Custom event name dispatched after this frame becomes current. */
	event?: string;
}

/**
 * A named, inclusive range of 0-based runtime frames.
 *
 * MovieClip.gotoAndPlay(name) starts at startFrame and loops or completes at
 * endFrame instead of traversing the full data set.
 */
export interface MovieClipLabel {
	name: string;
	/** First frame in the inclusive range. */
	startFrame: number;
	/** Last frame in the inclusive range. */
	endFrame: number;
}

/**
 * A rectangular atlas region in an Egret MovieClip data set's top-level `res` map.
 * x/y are atlas coordinates; w/h are the cropped bitmap dimensions.
 */
export interface EgretMovieClipResourceData {
	x: number;
	y: number;
	w: number;
	h: number;
}

/**
 * A key frame in the Egret MovieClip exporter schema.
 *
 * MovieClipDataFactory expands duration into that many logical runtime frames.
 */
export interface EgretMovieClipFrameData {
	/** Name of an entry in the top-level `res` map; omit it for a blank frame. */
	res?: string;
	/** Horizontal display offset applied to the generated frame texture; defaults to 0. */
	x?: number;
	/** Vertical display offset applied to the generated frame texture; defaults to 0. */
	y?: number;
	/** Positive integer number of logical frames occupied by this key frame; defaults to 1. */
	duration?: number;
}

/**
 * A named Egret playback range.
 *
 * frame and end are 1-based logical frame numbers after key-frame durations
 * have been expanded. end is inclusive and defaults to frame.
 */
export interface EgretMovieClipLabelData {
	name: string;
	/** First 1-based logical frame in the range. */
	frame: number;
	/** Last inclusive 1-based logical frame in the range. */
	end?: number;
}

/**
 * A custom event emitted when an Egret logical frame becomes current.
 * frame is a 1-based logical frame number after duration expansion.
 */
export interface EgretMovieClipEventData {
	frame: number;
	name: string;
}

/**
 * Exported data for one named Egret MovieClip animation.
 *
 * frameRate becomes MovieClipData.frameRate timing metadata; the external
 * scheduler decides when MovieClip.advanceFrame() is called.
 */
export interface EgretMovieClipData {
	frameRate?: number;
	frames?: EgretMovieClipFrameData[];
	labels?: EgretMovieClipLabelData[];
	events?: EgretMovieClipEventData[];
}

/**
 * Egret MovieClip exporter JSON accepted by MovieClipDataFactory.
 * mc maps animation names to timelines; res maps frame resource names to atlas regions.
 */
export interface EgretMovieClipDataSet {
	mc?: Record<string, EgretMovieClipData>;
	res?: Record<string, EgretMovieClipResourceData>;
}

/** Events dispatched by MovieClip during frame changes and playback boundaries. */
export const MovieClipEvent = {
	/** Dispatched after a finite playback session reaches its final frame and stops. */
	COMPLETE: 'complete',
	/** Dispatched after a completed cycle that will continue with another cycle. */
	LOOP_COMPLETE: 'loopComplete',
	/** Dispatched when MovieClip makes a valid logical frame current. */
	FRAME_CHANGE: 'frameChange',
} as const;

/** Union of the built-in MovieClip event names. Custom frame-event names remain strings. */
export type MovieClipEventType = (typeof MovieClipEvent)[keyof typeof MovieClipEvent];
