import { EventPhase } from './EventPhase.js';
import type { IEventDispatcher } from './IEventDispatcher.js';

/** Event type string → Event subclass mapping. Each event source declares its own. */
export type EventMap = Record<string, Event>;

type EventConstructor<T extends Event> = new (type: string, bubbles?: boolean, cancelable?: boolean) => T;

const eventPools = new WeakMap<EventConstructor<Event>, Event[]>();

function getPool<T extends Event>(EventClass: EventConstructor<T>): T[] {
	let pool = eventPools.get(EventClass) as T[] | undefined;
	if (!pool) {
		pool = [];
		eventPools.set(EventClass, pool);
	}
	return pool;
}

export class Event {
	// ── Static constants ──────────────────────────────────────────────────────

	static readonly ADDED_TO_STAGE = 'addedToStage';
	static readonly REMOVED_FROM_STAGE = 'removedFromStage';
	static readonly ADDED = 'added';
	static readonly REMOVED = 'removed';
	static readonly ENTER_FRAME = 'enterFrame';
	static readonly RENDER = 'render';
	static readonly RESIZE = 'resize';
	static readonly CHANGE = 'change';
	static readonly CHANGING = 'changing';
	static readonly COMPLETE = 'complete';
	static readonly LOOP_COMPLETE = 'loopComplete';
	static readonly FOCUS_IN = 'focusIn';
	static readonly FOCUS_OUT = 'focusOut';
	static readonly ENDED = 'ended';
	static readonly ACTIVATE = 'activate';
	static readonly DEACTIVATE = 'deactivate';
	static readonly CLOSE = 'close';
	static readonly CONNECT = 'connect';
	static readonly LEAVE_STAGE = 'leaveStage';
	static readonly SOUND_COMPLETE = 'soundComplete';

	// ── Static methods ────────────────────────────────────────────────────────

	public static create<T extends Event>(
		EventClass: EventConstructor<T>,
		type: string,
		bubbles?: boolean,
		cancelable?: boolean,
	): T {
		const pool = getPool(EventClass);
		if (pool.length) {
			const event = pool.pop() as T;
			event.resetForPool(type, bubbles, cancelable);
			return event;
		}
		return new EventClass(type, bubbles, cancelable);
	}

	public static release(event: Event): void {
		event.clean();
		getPool(event.constructor as EventConstructor<Event>).push(event);
	}

	public static dispatch(target: IEventDispatcher, type: string, bubbles = false, data?: unknown): boolean {
		const event = Event.create(Event, type, bubbles);
		event.data = data;
		const result = target.dispatchEvent(event);
		Event.release(event);
		return result;
	}

	// ── Instance fields ───────────────────────────────────────────────────────

	public data: unknown;

	private _type: string;
	private _bubbles: boolean;
	private _cancelable: boolean;
	private _eventPhase: number = EventPhase.AT_TARGET;
	private _currentTarget?: IEventDispatcher;
	private _target?: IEventDispatcher;
	private _isDefaultPrevented = false;
	private _isPropagationStopped = false;
	private _isPropagationImmediateStopped = false;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(type: string, bubbles?: boolean, cancelable?: boolean, data?: unknown) {
		this._type = type;
		this._bubbles = !!bubbles;
		this._cancelable = !!cancelable;
		this.data = data;
	}

	// ── Getters ───────────────────────────────────────────────────────────────

	public get type(): string {
		return this._type;
	}

	public get bubbles(): boolean {
		return this._bubbles;
	}

	public get cancelable(): boolean {
		return this._cancelable;
	}

	public get eventPhase(): number {
		return this._eventPhase;
	}

	public get currentTarget(): IEventDispatcher | undefined {
		return this._currentTarget;
	}

	public get target(): IEventDispatcher | undefined {
		return this._target;
	}

	public get isPropagationStopped(): boolean {
		return this._isPropagationStopped;
	}

	public get isPropagationImmediateStopped(): boolean {
		return this._isPropagationImmediateStopped;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	public isDefaultPrevented(): boolean {
		return this._isDefaultPrevented;
	}

	public preventDefault(): void {
		if (this._cancelable) this._isDefaultPrevented = true;
	}

	public stopPropagation(): void {
		this._isPropagationStopped = true;
	}

	public stopImmediatePropagation(): void {
		this._isPropagationImmediateStopped = true;
	}

	// ── Internal methods (used by EventDispatcher) ────────────────────────────

	setDispatchContext(target: IEventDispatcher, phase: number): void {
		// _target is the original dispatch target and must not change during bubbling/capturing.
		// Only set it at AT_TARGET phase (or when it hasn't been set yet).
		if (phase === EventPhase.AT_TARGET || this._target === undefined) {
			this._target = target;
		}
		this._currentTarget = target;
		this._eventPhase = phase;
	}

	setCurrentTarget(target: IEventDispatcher): void {
		this._currentTarget = target;
	}

	resetForPool(type: string, bubbles?: boolean, cancelable?: boolean): void {
	    this.data = undefined;
		this._type = type;
		this._bubbles = !!bubbles;
		this._cancelable = !!cancelable;
		this._isDefaultPrevented = false;
		this._isPropagationStopped = false;
		this._isPropagationImmediateStopped = false;
		this._eventPhase = EventPhase.AT_TARGET;
		this._currentTarget = undefined;
		this._target = undefined;
	}

	// ── Protected methods ─────────────────────────────────────────────────────

	protected clean(): void {
		this.data = undefined;
		this._currentTarget = undefined;
		this._target = undefined;
	}
}
