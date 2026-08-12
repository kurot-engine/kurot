import { describe, it, expect, vi } from 'vitest';
import { EventDispatcher } from '../src/blakron/events/EventDispatcher.js';
import { Event, type EventMap } from '../src/blakron/events/Event.js';
import { TouchEvent } from '../src/blakron/events/TouchEvent.js';

// ── Test helpers ─────────────────────────────────────────────────────────

/** A minimal Event subclass with a typed payload for verifying generic inference. */
class TypedPayloadEvent extends Event {
	public value = 0;
	public constructor(type: string, value: number) {
		super(type);
		this.value = value;
	}
}

interface TestEventMap extends EventMap {
	typedPayload: TypedPayloadEvent;
	touch: TouchEvent;
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('EventDispatcher<TMap> — generic overloads', () => {
	describe('type-safe path (overload 1)', () => {
		it('listener receives the declared Event subclass instance', () => {
			const d = new EventDispatcher<TestEventMap>();
			let received: TypedPayloadEvent | undefined;
			d.addEventListener('typedPayload', (e) => {
				received = e;
			});

			const evt = new TypedPayloadEvent('typedPayload', 42);
			d.dispatchEvent(evt);

			expect(received).toBe(evt);
			expect(received?.value).toBe(42);
		});

		it('subclass fields are accessible without as-cast', () => {
			const d = new EventDispatcher<TestEventMap>();
			const values: number[] = [];
			d.addEventListener('typedPayload', (e) => {
				// If TS inferred e as Event, e.value would be a type error.
				values.push(e.value);
			});

			d.dispatchEvent(new TypedPayloadEvent('typedPayload', 1));
			d.dispatchEvent(new TypedPayloadEvent('typedPayload', 2));

			expect(values).toEqual([1, 2]);
		});

		it('TouchEvent fields (stageX, stageY, touchPointID) accessible without as', () => {
			const d = new EventDispatcher<TestEventMap>();
			let stageX = 0;
			let stageY = 0;
			let pointID = -1;
			d.addEventListener('touch', (e) => {
				stageX = e.stageX;
				stageY = e.stageY;
				pointID = e.touchPointID;
			});

			const touch = Event.create(TouchEvent, 'touch');
			(touch as TouchEvent).initTo(100, 200, 5);
			d.dispatchEvent(touch);
			Event.release(touch);

			expect(stageX).toBe(100);
			expect(stageY).toBe(200);
			expect(pointID).toBe(5);
		});

		it('once() also provides correct type inference', () => {
			const d = new EventDispatcher<TestEventMap>();
			let received: TypedPayloadEvent | undefined;
			d.once('typedPayload', (e) => {
				received = e;
			});

			d.dispatchEvent(new TypedPayloadEvent('typedPayload', 99));
			expect(received?.value).toBe(99);

			// Second dispatch should not fire
			received = undefined;
			d.dispatchEvent(new TypedPayloadEvent('typedPayload', 100));
			expect(received).toBeUndefined();
		});

		it('removeEventListener() matches typed listeners correctly', () => {
			const d = new EventDispatcher<TestEventMap>();
			const fn = vi.fn();
			d.addEventListener('typedPayload', fn);
			d.removeEventListener('typedPayload', fn);

			d.dispatchEvent(new TypedPayloadEvent('typedPayload', 1));
			expect(fn).not.toHaveBeenCalled();
		});
	});

	describe('fallback path (overload 2) — backward compatibility', () => {
		it('legacy EventDispatcher() without generic still works', () => {
			const d = new EventDispatcher();
			const fn = vi.fn();
			d.addEventListener('anything', fn);
			d.dispatchEventWith('anything');
			expect(fn).toHaveBeenCalledOnce();
		});

		it('unknown event type falls back to (e: Event) => void', () => {
			const d = new EventDispatcher<TestEventMap>();
			const fn = vi.fn();
			// 'unknownEvent' is not declared in TestEventMap → must match overload 2
			d.addEventListener('unknownEvent', fn);
			d.dispatchEventWith('unknownEvent');
			expect(fn).toHaveBeenCalledOnce();
		});

		it('priority and useCapture still work on typed dispatcher', () => {
			const d = new EventDispatcher<TestEventMap>();
			const order: number[] = [];
			d.addEventListener('typedPayload', () => order.push(1), false, 0);
			d.addEventListener('typedPayload', () => order.push(2), false, 10);
			d.dispatchEvent(new TypedPayloadEvent('typedPayload', 0));
			expect(order).toEqual([2, 1]);
		});

		it('mixing typed and untyped listeners on the same dispatcher', () => {
			const d = new EventDispatcher<TestEventMap>();
			const typed = vi.fn();
			const untyped = vi.fn();

			d.addEventListener('typedPayload', typed);   // overload 1
			d.addEventListener('other', untyped);          // overload 2

			d.dispatchEvent(new TypedPayloadEvent('typedPayload', 1));
			d.dispatchEventWith('other');

			expect(typed).toHaveBeenCalledOnce();
			expect(untyped).toHaveBeenCalledOnce();
		});
	});

	describe('runtime correctness unchanged', () => {
		it('stopImmediatePropagation still works', () => {
			const d = new EventDispatcher<TestEventMap>();
			const fn1 = vi.fn((e: TypedPayloadEvent) => e.stopImmediatePropagation());
			const fn2 = vi.fn();
			d.addEventListener('typedPayload', fn1);
			d.addEventListener('typedPayload', fn2);
			d.dispatchEvent(new TypedPayloadEvent('typedPayload', 0));
			expect(fn1).toHaveBeenCalledOnce();
			expect(fn2).not.toHaveBeenCalled();
		});

		it('duplicate listener is still deduplicated', () => {
			const d = new EventDispatcher<TestEventMap>();
			const fn = vi.fn();
			d.addEventListener('typedPayload', fn);
			d.addEventListener('typedPayload', fn);
			d.dispatchEvent(new TypedPayloadEvent('typedPayload', 0));
			expect(fn).toHaveBeenCalledOnce();
		});

		it('adding listener during dispatch does not affect current round', () => {
			const d = new EventDispatcher<TestEventMap>();
			const late = vi.fn();
			d.addEventListener('typedPayload', () => {
				d.addEventListener('typedPayload', late);
			});
			d.dispatchEvent(new TypedPayloadEvent('typedPayload', 0));
			expect(late).not.toHaveBeenCalled();
			d.dispatchEvent(new TypedPayloadEvent('typedPayload', 0));
			expect(late).toHaveBeenCalledOnce();
		});
	});
});
