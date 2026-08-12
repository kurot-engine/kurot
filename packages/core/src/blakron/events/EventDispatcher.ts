import { Event, type EventMap } from './Event.js';
import { EventPhase } from './EventPhase.js';
import type { IEventDispatcher } from './IEventDispatcher.js';

/**
 * Type-erased listener shape for the implementation signatures below.
 * The public overloads declare typed listeners like (e: TMap[K]) => void,
 * but strict-mode parameter contravariance (TS2394) blocks the impl from
 * using (event: Event) => void. `any` here is the intentional escape hatch.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyListener = (event: any) => void;

interface EventBin {
	type: string;
	listener: AnyListener;
	priority: number;
	useCapture: boolean;
	once: boolean;
}

export class EventDispatcher<TMap extends EventMap = Record<string, Event>> implements IEventDispatcher {
	// ── Instance fields ───────────────────────────────────────────────────────

	private _target: IEventDispatcher;
	private _listeners: Map<string, EventBin[]>;
	private _captureListeners: Map<string, EventBin[]>;
	private _notifyLevel = 0;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(target?: IEventDispatcher) {
		this._target = target ?? this;
		this._listeners = new Map();
		this._captureListeners = new Map();
	}

	// ── Public methods ────────────────────────────────────────────────────────

	// Overload 1: type-safe path for classes that declare an EventMap
	public addEventListener<K extends keyof TMap & string>(
		type: K,
		listener: (event: TMap[K]) => void,
		useCapture?: boolean,
		priority?: number,
	): void;
	// Overload 2: fallback for untyped / legacy callers
	public addEventListener(
		type: string,
		listener: (event: Event) => void,
		useCapture?: boolean,
		priority?: number,
	): void;
	public addEventListener(
		type: string,
		listener: AnyListener,
		useCapture?: boolean,
		priority?: number,
	): void {
		this.addListener(type, listener, useCapture, priority, false);
	}

	// Overload 1: type-safe path
	public once<K extends keyof TMap & string>(
		type: K,
		listener: (event: TMap[K]) => void,
		useCapture?: boolean,
		priority?: number,
	): void;
	// Overload 2: fallback
	public once(
		type: string,
		listener: (event: Event) => void,
		useCapture?: boolean,
		priority?: number,
	): void;
	public once(type: string, listener: AnyListener, useCapture?: boolean, priority?: number): void {
		this.addListener(type, listener, useCapture, priority, true);
	}

	// Overload 1: type-safe path
	public removeEventListener<K extends keyof TMap & string>(
		type: K,
		listener: (event: TMap[K]) => void,
		useCapture?: boolean,
	): void;
	// Overload 2: fallback
	public removeEventListener(type: string, listener: (event: Event) => void, useCapture?: boolean): void;
	public removeEventListener(type: string, listener: AnyListener, useCapture?: boolean): void {
		const map = this.getMap(useCapture);
		const list = map.get(type);
		if (!list) return;

		const workList = this._notifyLevel !== 0 ? list.slice() : list;
		if (workList !== list) map.set(type, workList);

		this.removeEntry(workList, listener);
		if (workList.length === 0) map.delete(type);
	}

	public hasEventListener(type: string): boolean {
		return this._listeners.has(type) || this._captureListeners.has(type);
	}

	public willTrigger(type: string): boolean {
		return this.hasEventListener(type);
	}

	public dispatchEvent(event: Event): boolean {
		event.setDispatchContext(this._target, EventPhase.AT_TARGET);
		return this.notifyListener(event, false);
	}

	public dispatchEventWith(type: string, bubbles?: boolean, data?: unknown, cancelable?: boolean): boolean {
		if (!bubbles && !this.hasEventListener(type)) return true;
		const event = Event.create(Event, type, bubbles, cancelable);
		event.data = data;
		const result = this.dispatchEvent(event);
		Event.release(event);
		return result;
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private getMap(useCapture?: boolean): Map<string, EventBin[]> {
		return useCapture ? this._captureListeners : this._listeners;
	}

	private addListener(
		type: string,
		listener: AnyListener,
		useCapture?: boolean,
		priority?: number,
		once?: boolean,
	): void {
		const map = this.getMap(useCapture);
		let list = map.get(type);
		if (!list) {
			list = [];
			map.set(type, list);
		} else if (this._notifyLevel !== 0) {
			list = list.slice();
			map.set(type, list);
		}
		this.insertEntry(list, {
			type,
			listener,
			priority: (priority ?? 0) | 0,
			useCapture: !!useCapture,
			once: !!once,
		});
	}

	private insertEntry(list: EventBin[], entry: EventBin): boolean {
		let insertIndex = -1;
		for (let i = 0; i < list.length; i++) {
			const e = list[i];
			if (e.listener === entry.listener && e.useCapture === entry.useCapture) return false;
			if (insertIndex === -1 && e.priority < entry.priority) insertIndex = i;
		}
		if (insertIndex !== -1) list.splice(insertIndex, 0, entry);
		else list.push(entry);
		return true;
	}

	private removeEntry(list: EventBin[], listener: AnyListener): boolean {
		for (let i = 0; i < list.length; i++) {
			if (list[i].listener === listener) {
				list.splice(i, 1);
				return true;
			}
		}
		return false;
	}

	protected notifyListener(event: Event, capturePhase: boolean): boolean {
		const list = this.getMap(capturePhase).get(event.type);
		if (!list || list.length === 0) return true;

		this._notifyLevel++;
		try {
			for (let i = 0; i < list.length; i++) {
				const entry = list[i];

				// Remove once-listeners before invoking them. The active dispatch keeps
				// its snapshot, while any nested dispatch observes the updated map.
				if (entry.once) this.removeEventListener(entry.type, entry.listener, entry.useCapture);

				entry.listener.call(this, event);
				if (event.isPropagationImmediateStopped) break;
			}
		} finally {
			this._notifyLevel--;
		}

		return !event.isDefaultPrevented();
	}
}
