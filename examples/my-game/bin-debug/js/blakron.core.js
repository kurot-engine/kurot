var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/events/Event.js
var eventPools = /* @__PURE__ */ new WeakMap();
function getPool(EventClass) {
  let pool = eventPools.get(EventClass);
  if (!pool) {
    pool = [];
    eventPools.set(EventClass, pool);
  }
  return pool;
}
var Event = class _Event {
  // ── Static constants ──────────────────────────────────────────────────────
  static ADDED_TO_STAGE = "addedToStage";
  static REMOVED_FROM_STAGE = "removedFromStage";
  static ADDED = "added";
  static REMOVED = "removed";
  static ENTER_FRAME = "enterFrame";
  static RENDER = "render";
  static RESIZE = "resize";
  static CHANGE = "change";
  static CHANGING = "changing";
  static COMPLETE = "complete";
  static LOOP_COMPLETE = "loopComplete";
  static FOCUS_IN = "focusIn";
  static FOCUS_OUT = "focusOut";
  static ENDED = "ended";
  static ACTIVATE = "activate";
  static DEACTIVATE = "deactivate";
  static CLOSE = "close";
  static CONNECT = "connect";
  static LEAVE_STAGE = "leaveStage";
  static SOUND_COMPLETE = "soundComplete";
  // ── Static methods ────────────────────────────────────────────────────────
  static create(EventClass, type, bubbles, cancelable) {
    const pool = getPool(EventClass);
    if (pool.length) {
      const event = pool.pop();
      event.resetForPool(type, bubbles, cancelable);
      return event;
    }
    return new EventClass(type, bubbles, cancelable);
  }
  static release(event) {
    event.clean();
    getPool(event.constructor).push(event);
  }
  static dispatch(target, type, bubbles = false, data) {
    const event = _Event.create(_Event, type, bubbles);
    event.data = data;
    const result = target.dispatchEvent(event);
    _Event.release(event);
    return result;
  }
  // ── Instance fields ───────────────────────────────────────────────────────
  data;
  _type;
  _bubbles;
  _cancelable;
  _eventPhase = 2;
  _currentTarget;
  _target;
  _isDefaultPrevented = false;
  _isPropagationStopped = false;
  _isPropagationImmediateStopped = false;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(type, bubbles, cancelable, data) {
    this._type = type;
    this._bubbles = !!bubbles;
    this._cancelable = !!cancelable;
    this.data = data;
  }
  // ── Getters ───────────────────────────────────────────────────────────────
  get type() {
    return this._type;
  }
  get bubbles() {
    return this._bubbles;
  }
  get cancelable() {
    return this._cancelable;
  }
  get eventPhase() {
    return this._eventPhase;
  }
  get currentTarget() {
    return this._currentTarget;
  }
  get target() {
    return this._target;
  }
  get isPropagationStopped() {
    return this._isPropagationStopped;
  }
  get isPropagationImmediateStopped() {
    return this._isPropagationImmediateStopped;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  isDefaultPrevented() {
    return this._isDefaultPrevented;
  }
  preventDefault() {
    if (this._cancelable)
      this._isDefaultPrevented = true;
  }
  stopPropagation() {
    this._isPropagationStopped = true;
  }
  stopImmediatePropagation() {
    this._isPropagationImmediateStopped = true;
  }
  // ── Internal methods (used by EventDispatcher) ────────────────────────────
  setDispatchContext(target, phase) {
    if (phase === 2 || this._target === void 0) {
      this._target = target;
    }
    this._currentTarget = target;
    this._eventPhase = phase;
  }
  setCurrentTarget(target) {
    this._currentTarget = target;
  }
  resetForPool(type, bubbles, cancelable) {
    this.data = void 0;
    this._type = type;
    this._bubbles = !!bubbles;
    this._cancelable = !!cancelable;
    this._isDefaultPrevented = false;
    this._isPropagationStopped = false;
    this._isPropagationImmediateStopped = false;
    this._eventPhase = 2;
    this._currentTarget = void 0;
    this._target = void 0;
  }
  // ── Protected methods ─────────────────────────────────────────────────────
  clean() {
    this.data = void 0;
    this._currentTarget = void 0;
    this._target = void 0;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/events/EventDispatcher.js
var EventDispatcher = class {
  // ── Instance fields ───────────────────────────────────────────────────────
  _target;
  _listeners;
  _captureListeners;
  _notifyLevel = 0;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(target) {
    this._target = target ?? this;
    this._listeners = /* @__PURE__ */ new Map();
    this._captureListeners = /* @__PURE__ */ new Map();
  }
  addEventListener(type, listener, useCapture, priority) {
    this.addListener(type, listener, useCapture, priority, false);
  }
  once(type, listener, useCapture, priority) {
    this.addListener(type, listener, useCapture, priority, true);
  }
  removeEventListener(type, listener, useCapture) {
    const map = this.getMap(useCapture);
    const list = map.get(type);
    if (!list)
      return;
    const workList = this._notifyLevel !== 0 ? list.slice() : list;
    if (workList !== list)
      map.set(type, workList);
    this.removeEntry(workList, listener);
    if (workList.length === 0)
      map.delete(type);
  }
  hasEventListener(type) {
    return this._listeners.has(type) || this._captureListeners.has(type);
  }
  willTrigger(type) {
    return this.hasEventListener(type);
  }
  dispatchEvent(event) {
    event.setDispatchContext(
      this._target,
      2
      /* EventPhase.AT_TARGET */
    );
    return this.notifyListener(event, false);
  }
  dispatchEventWith(type, bubbles, data, cancelable) {
    if (!bubbles && !this.hasEventListener(type))
      return true;
    const event = Event.create(Event, type, bubbles, cancelable);
    event.data = data;
    const result = this.dispatchEvent(event);
    Event.release(event);
    return result;
  }
  // ── Private methods ───────────────────────────────────────────────────────
  getMap(useCapture) {
    return useCapture ? this._captureListeners : this._listeners;
  }
  addListener(type, listener, useCapture, priority, once) {
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
      once: !!once
    });
  }
  insertEntry(list, entry) {
    let insertIndex = -1;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.listener === entry.listener && e.useCapture === entry.useCapture)
        return false;
      if (insertIndex === -1 && e.priority < entry.priority)
        insertIndex = i;
    }
    if (insertIndex !== -1)
      list.splice(insertIndex, 0, entry);
    else
      list.push(entry);
    return true;
  }
  removeEntry(list, listener) {
    for (let i = 0; i < list.length; i++) {
      if (list[i].listener === listener) {
        list.splice(i, 1);
        return true;
      }
    }
    return false;
  }
  notifyListener(event, capturePhase) {
    const list = this.getMap(capturePhase).get(event.type);
    if (!list || list.length === 0)
      return true;
    this._notifyLevel++;
    try {
      for (let i = 0; i < list.length; i++) {
        const entry = list[i];
        if (entry.once)
          this.removeEventListener(entry.type, entry.listener, entry.useCapture);
        entry.listener.call(this, event);
        if (event.isPropagationImmediateStopped)
          break;
      }
    } finally {
      this._notifyLevel--;
    }
    return !event.isDefaultPrevented();
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/events/FocusEvent.js
var FocusEvent = class extends Event {
  // ── Static constants ──────────────────────────────────────────────────────
  static FOCUS_IN = "focusIn";
  static FOCUS_OUT = "focusOut";
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(type, bubbles = false, cancelable = false) {
    super(type, bubbles, cancelable);
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/events/HTTPStatusEvent.js
var HTTPStatusEvent = class _HTTPStatusEvent extends Event {
  // ── Static constants ──────────────────────────────────────────────────────
  static HTTP_STATUS = "httpStatus";
  // ── Static methods ────────────────────────────────────────────────────────
  static dispatchHTTPStatusEvent(target, status) {
    const event = Event.create(_HTTPStatusEvent, _HTTPStatusEvent.HTTP_STATUS);
    event._status = status;
    const result = target.dispatchEvent(event);
    Event.release(event);
    return result;
  }
  // ── Instance fields ───────────────────────────────────────────────────────
  _status = 0;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(type, bubbles = false, cancelable = false) {
    super(type, bubbles, cancelable);
  }
  // ── Getters ───────────────────────────────────────────────────────────────
  get status() {
    return this._status;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/events/IOErrorEvent.js
var IOErrorEvent = class _IOErrorEvent extends Event {
  // ── Static constants ──────────────────────────────────────────────────────
  static IO_ERROR = "ioError";
  // ── Static methods ────────────────────────────────────────────────────────
  static dispatchIOErrorEvent(target) {
    const event = Event.create(_IOErrorEvent, _IOErrorEvent.IO_ERROR);
    const result = target.dispatchEvent(event);
    Event.release(event);
    return result;
  }
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(type, bubbles = false, cancelable = false) {
    super(type, bubbles, cancelable);
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/events/ProgressEvent.js
var ProgressEvent = class _ProgressEvent extends Event {
  // ── Static constants ──────────────────────────────────────────────────────
  static PROGRESS = "progress";
  static SOCKET_DATA = "socketData";
  // ── Static methods ────────────────────────────────────────────────────────
  static dispatchProgressEvent(target, type, bytesLoaded = 0, bytesTotal = 0) {
    const event = Event.create(_ProgressEvent, type);
    event.bytesLoaded = bytesLoaded;
    event.bytesTotal = bytesTotal;
    const result = target.dispatchEvent(event);
    Event.release(event);
    return result;
  }
  // ── Instance fields ───────────────────────────────────────────────────────
  bytesLoaded;
  bytesTotal;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(type, bubbles = false, cancelable = false, bytesLoaded = 0, bytesTotal = 0) {
    super(type, bubbles, cancelable);
    this.bytesLoaded = bytesLoaded;
    this.bytesTotal = bytesTotal;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/events/StageOrientationEvent.js
var StageOrientationEvent = class _StageOrientationEvent extends Event {
  // ── Static constants ──────────────────────────────────────────────────────
  static ORIENTATION_CHANGE = "orientationChange";
  // ── Static methods ────────────────────────────────────────────────────────
  static dispatchStageOrientationEvent(target, type) {
    const event = Event.create(_StageOrientationEvent, type);
    const result = target.dispatchEvent(event);
    Event.release(event);
    return result;
  }
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(type, bubbles = false, cancelable = false) {
    super(type, bubbles, cancelable);
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/events/TextEvent.js
var TextEvent = class _TextEvent extends Event {
  // ── Static constants ──────────────────────────────────────────────────────
  static LINK = "link";
  // ── Static methods ────────────────────────────────────────────────────────
  static dispatchTextEvent(target, type, text) {
    const event = Event.create(_TextEvent, type);
    event.text = text;
    const result = target.dispatchEvent(event);
    Event.release(event);
    return result;
  }
  // ── Instance fields ───────────────────────────────────────────────────────
  text;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(type, bubbles = false, cancelable = false, text = "") {
    super(type, bubbles, cancelable);
    this.text = text;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/events/TouchEvent.js
var TouchEvent = class _TouchEvent extends Event {
  // ── Static constants ──────────────────────────────────────────────────────
  static TOUCH_MOVE = "touchMove";
  static TOUCH_BEGIN = "touchBegin";
  static TOUCH_END = "touchEnd";
  static TOUCH_CANCEL = "touchCancel";
  static TOUCH_TAP = "touchTap";
  static TOUCH_RELEASE_OUTSIDE = "touchReleaseOutside";
  // ── Static methods ────────────────────────────────────────────────────────
  static dispatchTouchEvent(target, type, bubbles, cancelable, stageX, stageY, touchPointID, touchDown = false) {
    if (!bubbles && !target.hasEventListener(type))
      return true;
    const event = Event.create(_TouchEvent, type, bubbles, cancelable);
    event.initTo(stageX ?? 0, stageY ?? 0, touchPointID ?? 0);
    event.touchDown = touchDown;
    const result = target.dispatchEvent(event);
    Event.release(event);
    return result;
  }
  // ── Instance fields ───────────────────────────────────────────────────────
  touchPointID = 0;
  touchDown = false;
  _stageX = 0;
  _stageY = 0;
  _localX = 0;
  _localY = 0;
  _targetChanged = true;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(type, bubbles, cancelable, stageX, stageY, touchPointID) {
    super(type, bubbles, cancelable);
    this.initTo(stageX ?? 0, stageY ?? 0, touchPointID ?? 0);
  }
  // ── Getters ───────────────────────────────────────────────────────────────
  get stageX() {
    return this._stageX;
  }
  get stageY() {
    return this._stageY;
  }
  get localX() {
    if (this._targetChanged)
      this.computeLocalXY();
    return this._localX;
  }
  get localY() {
    if (this._targetChanged)
      this.computeLocalXY();
    return this._localY;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  /**
   * Requests an immediate re-render after this event is processed.
   * Full implementation requires the player/runtime layer.
   */
  updateAfterEvent() {
    setRequestRenderingFlag(true);
  }
  // ── Internal methods ──────────────────────────────────────────────────────
  setDispatchContext(target, phase) {
    super.setDispatchContext(target, phase);
    this._targetChanged = true;
  }
  initTo(stageX, stageY, touchPointID) {
    this._stageX = stageX;
    this._stageY = stageY;
    this.touchPointID = touchPointID;
  }
  // ── Private methods ───────────────────────────────────────────────────────
  computeLocalXY() {
    this._targetChanged = false;
    const target = this.target;
    if (!target?.$getInvertedConcatenatedMatrix) {
      this._localX = this._stageX;
      this._localY = this._stageY;
      return;
    }
    const out = { x: 0, y: 0 };
    target.$getInvertedConcatenatedMatrix().transformPoint(this._stageX, this._stageY, out);
    this._localX = out.x;
    this._localY = out.y;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/utils/NumberUtils.js
var DEG_TO_RAD = Math.PI / 180;
var sinMap = new Float64Array(360);
var cosMap = new Float64Array(360);
for (let i = 0; i < 360; i++) {
  sinMap[i] = Math.sin(i * DEG_TO_RAD);
  cosMap[i] = Math.cos(i * DEG_TO_RAD);
}
sinMap[90] = 1;
cosMap[90] = 0;
sinMap[180] = 0;
cosMap[180] = -1;
sinMap[270] = -1;
cosMap[270] = 0;
var NumberUtils = class _NumberUtils {
  /**
   * Returns approximate sin for the given angle in degrees, using a lookup table with linear interpolation.
   */
  static sin(value) {
    const floor = Math.floor(value);
    const floorResult = _NumberUtils.sinInt(floor);
    if (floor === value)
      return floorResult;
    return (value - floor) * _NumberUtils.sinInt(floor + 1) + (floor + 1 - value) * floorResult;
  }
  /**
   * Returns approximate cos for the given angle in degrees, using a lookup table with linear interpolation.
   */
  static cos(value) {
    const floor = Math.floor(value);
    const floorResult = _NumberUtils.cosInt(floor);
    if (floor === value)
      return floorResult;
    return (value - floor) * _NumberUtils.cosInt(floor + 1) + (floor + 1 - value) * floorResult;
  }
  static isNumber(value) {
    return typeof value === "number" && !isNaN(value);
  }
  static convertStringToHashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
  static sinInt(value) {
    value = value % 360;
    if (value < 0)
      value += 360;
    return sinMap[value];
  }
  static cosInt(value) {
    value = value % 360;
    if (value < 0)
      value += 360;
    return cosMap[value];
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/geom/Point.js
var pointPool = [];
var Point = class _Point {
  // ── Static methods ────────────────────────────────────────────────────────
  static create(x, y) {
    const point = pointPool.pop() ?? new _Point();
    return point.setTo(x, y);
  }
  static release(point) {
    pointPool.push(point);
  }
  static distance(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }
  static interpolate(pt1, pt2, f) {
    const f1 = 1 - f;
    return new _Point(pt1.x * f + pt2.x * f1, pt1.y * f + pt2.y * f1);
  }
  static polar(len, angle) {
    return new _Point(len * NumberUtils.cos(angle), len * NumberUtils.sin(angle));
  }
  // ── Instance fields ───────────────────────────────────────────────────────
  x;
  y;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  // ── Getters ───────────────────────────────────────────────────────────────
  get length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  // ── Public methods ────────────────────────────────────────────────────────
  setTo(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }
  clone() {
    return new _Point(this.x, this.y);
  }
  copyFrom(source) {
    this.x = source.x;
    this.y = source.y;
  }
  equals(toCompare) {
    return this.x === toCompare.x && this.y === toCompare.y;
  }
  add(v) {
    return new _Point(this.x + v.x, this.y + v.y);
  }
  subtract(v) {
    return new _Point(this.x - v.x, this.y - v.y);
  }
  offset(dx, dy) {
    this.x += dx;
    this.y += dy;
  }
  normalize(thickness) {
    if (this.x !== 0 || this.y !== 0) {
      const scale = thickness / this.length;
      this.x *= scale;
      this.y *= scale;
    }
  }
  toString() {
    return `(x=${this.x}, y=${this.y})`;
  }
};
var sharedPoint = new Point();

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/geom/Matrix.js
var DEG_TO_RAD2 = Math.PI / 180;
var TWO_PI = Math.PI * 2;
var matrixPool = [];
var Matrix = class _Matrix {
  // ── Static methods ────────────────────────────────────────────────────────
  static create() {
    return matrixPool.pop() ?? new _Matrix();
  }
  static release(matrix) {
    matrixPool.push(matrix);
  }
  // ── Instance fields ───────────────────────────────────────────────────────
  a;
  b;
  c;
  d;
  tx;
  ty;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(a = 1, b = 0, c = 0, d = 1, tx = 0, ty = 0) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.tx = tx;
    this.ty = ty;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  clone() {
    return new _Matrix(this.a, this.b, this.c, this.d, this.tx, this.ty);
  }
  copyFrom(other) {
    this.a = other.a;
    this.b = other.b;
    this.c = other.c;
    this.d = other.d;
    this.tx = other.tx;
    this.ty = other.ty;
    return this;
  }
  setTo(a, b, c, d, tx, ty) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.tx = tx;
    this.ty = ty;
    return this;
  }
  identity() {
    this.a = this.d = 1;
    this.b = this.c = this.tx = this.ty = 0;
  }
  invert() {
    this.invertInto(this);
  }
  concat(other) {
    let a = this.a * other.a;
    let b = 0;
    let c = 0;
    let d = this.d * other.d;
    let tx = this.tx * other.a + other.tx;
    let ty = this.ty * other.d + other.ty;
    if (this.b !== 0 || this.c !== 0 || other.b !== 0 || other.c !== 0) {
      a += this.b * other.c;
      d += this.c * other.b;
      b += this.a * other.b + this.b * other.d;
      c += this.c * other.a + this.d * other.c;
      tx += this.ty * other.c;
      ty += this.tx * other.b;
    }
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.tx = tx;
    this.ty = ty;
  }
  prepend(a, b, c, d, tx, ty) {
    const tx1 = this.tx;
    if (a !== 1 || b !== 0 || c !== 0 || d !== 1) {
      const a1 = this.a, c1 = this.c;
      this.a = a1 * a + this.b * c;
      this.b = a1 * b + this.b * d;
      this.c = c1 * a + this.d * c;
      this.d = c1 * b + this.d * d;
    }
    this.tx = tx1 * a + this.ty * c + tx;
    this.ty = tx1 * b + this.ty * d + ty;
    return this;
  }
  append(a, b, c, d, tx, ty) {
    const a1 = this.a, b1 = this.b, c1 = this.c, d1 = this.d;
    if (a !== 1 || b !== 0 || c !== 0 || d !== 1) {
      this.a = a * a1 + b * c1;
      this.b = a * b1 + b * d1;
      this.c = c * a1 + d * c1;
      this.d = c * b1 + d * d1;
    }
    this.tx = tx * a1 + ty * c1 + this.tx;
    this.ty = tx * b1 + ty * d1 + this.ty;
    return this;
  }
  rotate(angle) {
    if (angle !== 0) {
      const deg = angle / DEG_TO_RAD2;
      const u = NumberUtils.cos(deg);
      const v = NumberUtils.sin(deg);
      const { a, b, c, d, tx, ty } = this;
      this.a = a * u - b * v;
      this.b = a * v + b * u;
      this.c = c * u - d * v;
      this.d = c * v + d * u;
      this.tx = tx * u - ty * v;
      this.ty = tx * v + ty * u;
    }
  }
  scale(sx, sy) {
    if (sx !== 1) {
      this.a *= sx;
      this.c *= sx;
      this.tx *= sx;
    }
    if (sy !== 1) {
      this.b *= sy;
      this.d *= sy;
      this.ty *= sy;
    }
  }
  translate(dx, dy) {
    this.tx += dx;
    this.ty += dy;
  }
  transformPoint(pointX, pointY, resultPoint) {
    const x = this.a * pointX + this.c * pointY + this.tx;
    const y = this.b * pointX + this.d * pointY + this.ty;
    if (resultPoint) {
      resultPoint.setTo(x, y);
      return resultPoint;
    }
    return new Point(x, y);
  }
  deltaTransformPoint(point) {
    return new Point(this.a * point.x + this.c * point.y, this.b * point.x + this.d * point.y);
  }
  createBox(scaleX, scaleY, rotation = 0, tx = 0, ty = 0) {
    if (rotation !== 0) {
      const deg = rotation / DEG_TO_RAD2;
      const u = NumberUtils.cos(deg);
      const v = NumberUtils.sin(deg);
      this.a = u * scaleX;
      this.b = v * scaleY;
      this.c = -v * scaleX;
      this.d = u * scaleY;
    } else {
      this.a = scaleX;
      this.b = 0;
      this.c = 0;
      this.d = scaleY;
    }
    this.tx = tx;
    this.ty = ty;
  }
  createGradientBox(width, height, rotation = 0, tx = 0, ty = 0) {
    this.createBox(width / 1638.4, height / 1638.4, rotation, tx + width / 2, ty + height / 2);
  }
  equals(other) {
    return this.a === other.a && this.b === other.b && this.c === other.c && this.d === other.d && this.tx === other.tx && this.ty === other.ty;
  }
  toString() {
    return `(a=${this.a}, b=${this.b}, c=${this.c}, d=${this.d}, tx=${this.tx}, ty=${this.ty})`;
  }
  // ── Internal methods ──────────────────────────────────────────────────────
  /** @internal */
  invertInto(target) {
    const { a, b, c, d, tx, ty } = this;
    if (b === 0 && c === 0) {
      target.b = target.c = 0;
      if (a === 0 || d === 0) {
        target.a = target.d = target.tx = target.ty = 0;
      } else {
        const ia = target.a = 1 / a;
        const id = target.d = 1 / d;
        target.tx = -ia * tx;
        target.ty = -id * ty;
      }
      return;
    }
    let det = a * d - b * c;
    if (det === 0) {
      target.identity();
      return;
    }
    det = 1 / det;
    const k = target.a = d * det;
    const nb = target.b = -b * det;
    const nc = target.c = -c * det;
    const nd = target.d = a * det;
    target.tx = -(k * tx + nc * ty);
    target.ty = -(nb * tx + nd * ty);
  }
  /** @internal */
  transformBounds(bounds) {
    const { a, b, c, d, tx, ty } = this;
    const x = bounds.x, y = bounds.y;
    const xMax = x + bounds.width, yMax = y + bounds.height;
    let x0 = a * x + c * y + tx, y0 = b * x + d * y + ty;
    let x1 = a * xMax + c * y + tx, y1 = b * xMax + d * y + ty;
    let x2 = a * xMax + c * yMax + tx, y2 = b * xMax + d * yMax + ty;
    let x3 = a * x + c * yMax + tx, y3 = b * x + d * yMax + ty;
    let tmp;
    if (x0 > x1) {
      tmp = x0;
      x0 = x1;
      x1 = tmp;
    }
    if (x2 > x3) {
      tmp = x2;
      x2 = x3;
      x3 = tmp;
    }
    bounds.x = Math.floor(x0 < x2 ? x0 : x2);
    bounds.width = Math.ceil((x1 > x3 ? x1 : x3) - bounds.x);
    if (y0 > y1) {
      tmp = y0;
      y0 = y1;
      y1 = tmp;
    }
    if (y2 > y3) {
      tmp = y2;
      y2 = y3;
      y3 = tmp;
    }
    bounds.y = Math.floor(y0 < y2 ? y0 : y2);
    bounds.height = Math.ceil((y1 > y3 ? y1 : y3) - bounds.y);
  }
  /** @internal */
  getScaleX() {
    if (this.b === 0)
      return this.a;
    const result = Math.sqrt(this.a * this.a + this.b * this.b);
    return this.getDeterminant() < 0 ? -result : result;
  }
  /** @internal */
  getScaleY() {
    if (this.c === 0)
      return this.d;
    const result = Math.sqrt(this.c * this.c + this.d * this.d);
    return this.getDeterminant() < 0 ? -result : result;
  }
  /** @internal */
  getSkewX() {
    return this.d < 0 ? Math.atan2(this.d, this.c) + Math.PI / 2 : Math.atan2(this.d, this.c) - Math.PI / 2;
  }
  /** @internal */
  getSkewY() {
    return this.a < 0 ? Math.atan2(this.b, this.a) - Math.PI : Math.atan2(this.b, this.a);
  }
  /** @internal */
  updateScaleAndRotation(scaleX, scaleY, skewX, skewY) {
    if ((skewX === 0 || skewX === TWO_PI) && (skewY === 0 || skewY === TWO_PI)) {
      this.a = scaleX;
      this.b = this.c = 0;
      this.d = scaleY;
      return;
    }
    const sx = skewX / DEG_TO_RAD2, sy = skewY / DEG_TO_RAD2;
    const u = NumberUtils.cos(sx), v = NumberUtils.sin(sx);
    this.a = skewX === skewY ? u * scaleX : NumberUtils.cos(sy) * scaleX;
    this.b = skewX === skewY ? v * scaleX : NumberUtils.sin(sy) * scaleX;
    this.c = -v * scaleY;
    this.d = u * scaleY;
  }
  /** @internal target = other * this */
  preMultiplyInto(other, target) {
    let a = other.a * this.a, b = 0, c = 0, d = other.d * this.d;
    let tx = other.tx * this.a + this.tx;
    let ty = other.ty * this.d + this.ty;
    if (other.b !== 0 || other.c !== 0 || this.b !== 0 || this.c !== 0) {
      a += other.b * this.c;
      d += other.c * this.b;
      b += other.a * this.b + other.b * this.d;
      c += other.c * this.a + other.d * this.c;
      tx += other.ty * this.c;
      ty += other.tx * this.b;
    }
    target.a = a;
    target.b = b;
    target.c = c;
    target.d = d;
    target.tx = tx;
    target.ty = ty;
  }
  // ── Private methods ───────────────────────────────────────────────────────
  getDeterminant() {
    return this.a * this.d - this.b * this.c;
  }
};
var sharedMatrix = new Matrix();

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/geom/Rectangle.js
var rectanglePool = [];
var Rectangle = class _Rectangle {
  // ── Static methods ────────────────────────────────────────────────────────
  static create() {
    return rectanglePool.pop() ?? new _Rectangle();
  }
  static release(rect) {
    rectanglePool.push(rect);
  }
  // ── Instance fields ───────────────────────────────────────────────────────
  x;
  y;
  width;
  height;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(x = 0, y = 0, width = 0, height = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
  // ── Getters / Setters ─────────────────────────────────────────────────────
  get right() {
    return this.x + this.width;
  }
  set right(value) {
    this.width = value - this.x;
  }
  get bottom() {
    return this.y + this.height;
  }
  set bottom(value) {
    this.height = value - this.y;
  }
  get left() {
    return this.x;
  }
  set left(value) {
    this.width += this.x - value;
    this.x = value;
  }
  get top() {
    return this.y;
  }
  set top(value) {
    this.height += this.y - value;
    this.y = value;
  }
  get topLeft() {
    return new Point(this.left, this.top);
  }
  set topLeft(value) {
    this.top = value.y;
    this.left = value.x;
  }
  get bottomRight() {
    return new Point(this.right, this.bottom);
  }
  set bottomRight(value) {
    this.bottom = value.y;
    this.right = value.x;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  setTo(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    return this;
  }
  copyFrom(source) {
    this.x = source.x;
    this.y = source.y;
    this.width = source.width;
    this.height = source.height;
    return this;
  }
  clone() {
    return new _Rectangle(this.x, this.y, this.width, this.height);
  }
  isEmpty() {
    return this.width <= 0 || this.height <= 0;
  }
  setEmpty() {
    this.x = this.y = this.width = this.height = 0;
  }
  contains(x, y) {
    return x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height;
  }
  containsPoint(point) {
    return this.contains(point.x, point.y);
  }
  containsRect(rect) {
    const r1 = rect.x + rect.width;
    const b1 = rect.y + rect.height;
    const r2 = this.x + this.width;
    const b2 = this.y + this.height;
    return rect.x >= this.x && rect.x < r2 && rect.y >= this.y && rect.y < b2 && r1 > this.x && r1 <= r2 && b1 > this.y && b1 <= b2;
  }
  intersects(toIntersect) {
    return Math.max(this.x, toIntersect.x) <= Math.min(this.right, toIntersect.right) && Math.max(this.y, toIntersect.y) <= Math.min(this.bottom, toIntersect.bottom);
  }
  intersection(toIntersect) {
    return this.clone().intersectInPlace(toIntersect);
  }
  union(toUnion) {
    const result = this.clone();
    if (toUnion.isEmpty())
      return result;
    if (result.isEmpty())
      return result.copyFrom(toUnion);
    const l = Math.min(result.x, toUnion.x);
    const t = Math.min(result.y, toUnion.y);
    return result.setTo(l, t, Math.max(result.right, toUnion.right) - l, Math.max(result.bottom, toUnion.bottom) - t);
  }
  inflate(dx, dy) {
    this.x -= dx;
    this.width += 2 * dx;
    this.y -= dy;
    this.height += 2 * dy;
  }
  inflatePoint(point) {
    this.inflate(point.x, point.y);
  }
  offset(dx, dy) {
    this.x += dx;
    this.y += dy;
  }
  offsetPoint(point) {
    this.offset(point.x, point.y);
  }
  equals(toCompare) {
    return this === toCompare || this.x === toCompare.x && this.y === toCompare.y && this.width === toCompare.width && this.height === toCompare.height;
  }
  toString() {
    return `(x=${this.x}, y=${this.y}, width=${this.width}, height=${this.height})`;
  }
  // ── Internal methods ──────────────────────────────────────────────────────
  intersectInPlace(clip) {
    const l = Math.max(this.x, clip.x);
    const r = Math.min(this.right, clip.right);
    if (l <= r) {
      const t = Math.max(this.y, clip.y);
      const b = Math.min(this.bottom, clip.bottom);
      if (t <= b)
        return this.setTo(l, t, r - l, b - t);
    }
    return this.setTo(0, 0, 0, 0);
  }
  /** @internal */
  getBaseWidth(angle) {
    return Math.abs(Math.cos(angle)) * this.width + Math.abs(Math.sin(angle)) * this.height;
  }
  /** @internal */
  getBaseHeight(angle) {
    return Math.abs(Math.sin(angle)) * this.width + Math.abs(Math.cos(angle)) * this.height;
  }
};
var sharedRectangle = new Rectangle();

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/utils/Base64Util.js
var Base64Util = class {
  /**
   * Encode an `ArrayBuffer` to a base64 string.
   * Converts bytes to a binary string in chunks (to avoid launching a
   * single `String.fromCharCode` apply with tens of thousands of args) and
   * hands the result to native `btoa`.
   */
  static encode(buffer) {
    const bytes = new Uint8Array(buffer);
    const len = bytes.length;
    if (len === 0)
      return "";
    const CHUNK = 8192;
    let binary = "";
    for (let i = 0; i < len; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
  }
  /**
   * Decode a base64 string into an `ArrayBuffer`. Uses native `atob` and
   * char-code expansion.
   */
  static decode(base64) {
    if (base64.length === 0)
      return new ArrayBuffer(0);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/display/texture/BitmapData.js
var CompressedTextureData = class {
  glInternalFormat = 0;
  width = 0;
  height = 0;
  byteArray = new Uint8Array(0);
  face = 0;
  level = 0;
};
var BitmapData = class _BitmapData {
  // ── Static fields ─────────────────────────────────────────────────────────
  static _displayList = /* @__PURE__ */ new WeakMap();
  static create(type, data, callback) {
    const base64 = type === "arraybuffer" ? Base64Util.encode(data) : data;
    let imageType = "image/png";
    if (base64.charAt(0) === "/") {
      imageType = "image/jpeg";
    } else if (base64.charAt(0) === "R") {
      imageType = "image/gif";
    }
    const img = new Image();
    img.src = `data:${imageType};base64,${base64}`;
    img.crossOrigin = "*";
    const bitmapData = new _BitmapData(img);
    img.onload = () => {
      img.onload = null;
      bitmapData.source = img;
      bitmapData.width = img.width;
      bitmapData.height = img.height;
      callback?.(bitmapData);
    };
    return bitmapData;
  }
  static addDisplayObject(displayObject, bitmapData) {
    if (!bitmapData) {
      return;
    }
    let list = _BitmapData._displayList.get(bitmapData);
    if (!list) {
      list = /* @__PURE__ */ new Set();
      _BitmapData._displayList.set(bitmapData, list);
    }
    list.add(displayObject);
  }
  static removeDisplayObject(displayObject, bitmapData) {
    if (!bitmapData) {
      return;
    }
    _BitmapData._displayList.get(bitmapData)?.delete(displayObject);
  }
  static invalidate(bitmapData) {
    if (!bitmapData) {
      return;
    }
    const list = _BitmapData._displayList.get(bitmapData);
    if (!list) {
      return;
    }
    for (const node of list) {
      node.$renderDirty = true;
      node.$markDirty();
    }
  }
  static dispose(bitmapData) {
    if (!bitmapData) {
      return;
    }
    const list = _BitmapData._displayList.get(bitmapData);
    if (!list) {
      return;
    }
    for (const node of list) {
      node.$renderDirty = true;
      node.$markDirty();
    }
    _BitmapData._displayList.delete(bitmapData);
  }
  // ── Instance fields ───────────────────────────────────────────────────────
  width = 0;
  height = 0;
  format = "image";
  deleteSource = true;
  compressedTextureData = [];
  debugCompressedTextureURL = "";
  etcAlphaMask;
  webGLTexture;
  _source;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(source) {
    if (source) {
      this._source = source;
      if (!(source instanceof ArrayBuffer)) {
        this.width = source.width ?? 0;
        this.height = source.height ?? 0;
      }
    }
  }
  // ── Getters / Setters ─────────────────────────────────────────────────────
  get source() {
    return this._source;
  }
  set source(value) {
    this._source = value;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  dispose() {
    if (this._source && "src" in this._source) {
      this._source.src = "";
    }
    this._source = void 0;
    this.clearCompressedTextureData();
    this.etcAlphaMask = void 0;
    _BitmapData.dispose(this);
  }
  getCompressed2dTextureData() {
    return this.compressedTextureData[0]?.[0];
  }
  setCompressed2dTextureData(levelData) {
    this.compressedTextureData.push(levelData);
  }
  hasCompressed2d() {
    return !!this.getCompressed2dTextureData();
  }
  clearCompressedTextureData() {
    this.compressedTextureData.length = 0;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/canvas/RenderBuffer.js
var RenderBuffer = class {
  // ── Instance fields ───────────────────────────────────────────────────────
  surface;
  context;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(width = 0, height = 0) {
    this.surface = document.createElement("canvas");
    const ctx = this.surface.getContext("2d", { willReadFrequently: true });
    if (!ctx)
      throw new Error("Failed to create Canvas 2D context");
    this.context = ctx;
    if (width > 0 && height > 0)
      this.resize(width, height);
  }
  // ── Getters ───────────────────────────────────────────────────────────────
  get width() {
    return this.surface.width;
  }
  get height() {
    return this.surface.height;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  /**
   * Resizes the buffer and clears its contents.
   * @param useMaxSize If true, keeps the larger of the current and new dimensions.
   */
  resize(width, height, useMaxSize = false) {
    const w = Math.ceil(Math.max(width, 1));
    const h = Math.ceil(Math.max(height, 1));
    if (useMaxSize) {
      if (this.surface.width < w)
        this.surface.width = w;
      if (this.surface.height < h)
        this.surface.height = h;
    } else {
      this.surface.width = w;
      this.surface.height = h;
    }
  }
  /**
   * Returns pixel data for the specified region.
   */
  getPixels(x, y, width = 1, height = 1) {
    const data = this.context.getImageData(x, y, width, height).data;
    return Array.from(data);
  }
  /**
   * Converts the buffer to a base64 data URL.
   */
  toDataURL(type = "image/png", quality) {
    return this.surface.toDataURL(type, quality);
  }
  /**
   * Clears the entire buffer.
   */
  clear() {
    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.clearRect(0, 0, this.surface.width, this.surface.height);
  }
  /**
   * Destroys the buffer, releasing the canvas memory.
   */
  destroy() {
    this.surface.width = 0;
    this.surface.height = 0;
  }
};
var _hitTestBuffer;
function hitTestBuffer() {
  if (!_hitTestBuffer)
    _hitTestBuffer = new RenderBuffer(3, 3);
  return _hitTestBuffer;
}

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/canvas/DisplayList.js
var DisplayList = class _DisplayList {
  // ── Static fields ─────────────────────────────────────────────────────────
  static _pool = [];
  // ── Instance fields ───────────────────────────────────────────────────────
  root;
  offsetX = 0;
  offsetY = 0;
  renderBuffer;
  bitmapData;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(root) {
    this.root = root;
    this.renderBuffer = new RenderBuffer();
  }
  // ── Public methods ────────────────────────────────────────────────────────
  static create(target) {
    try {
      const dl = _DisplayList._pool.pop() ?? new _DisplayList(target);
      dl._reset(target);
      return dl;
    } catch {
      return void 0;
    }
  }
  static release(dl) {
    dl.renderBuffer.resize(0, 0);
    dl.bitmapData = void 0;
    if (_DisplayList._pool.length < 8)
      _DisplayList._pool.push(dl);
  }
  // ── Private methods ───────────────────────────────────────────────────────
  _reset(root) {
    this.root = root;
    this.offsetX = 0;
    this.offsetY = 0;
  }
  /**
   * Resizes the offscreen buffer to fit the root object's bounds.
   * Returns false if the object has zero size.
   */
  updateSurfaceSize() {
    const bounds = this.root.$getOriginalBounds();
    const w = Math.max(1, Math.ceil(bounds.width));
    const h = Math.max(1, Math.ceil(bounds.height));
    this.offsetX = -bounds.x;
    this.offsetY = -bounds.y;
    if (this.renderBuffer.width !== w || this.renderBuffer.height !== h) {
      this.renderBuffer.resize(w, h);
    }
    return w > 0 && h > 0;
  }
  /**
   * Updates the BitmapData reference after rendering into the buffer.
   */
  updateBitmapData() {
    const surface = this.renderBuffer.surface;
    if (!this.bitmapData) {
      this.bitmapData = new BitmapData(surface);
      this.bitmapData.deleteSource = false;
    } else {
      this.bitmapData.source = surface;
      this.bitmapData.width = surface.width;
      this.bitmapData.height = surface.height;
    }
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/display/enums/BlendMode.js
var BlendMode = {
  // ── 所有浏览器支持 ────────────────────────────────────────────────────────
  NORMAL: "source-over",
  ADD: "lighter",
  ERASE: "destination-out",
  // ── 主流浏览器支持（iOS/Android 部分支持）────────────────────────────────
  MULTIPLY: "multiply",
  SCREEN: "screen",
  LIGHTEN: "lighten",
  DARKEN: "darken",
  DIFFERENCE: "difference",
  OVERLAY: "overlay",
  HARD_LIGHT: "hard-light",
  SOFT_LIGHT: "soft-light",
  COLOR_DODGE: "color-dodge",
  COLOR_BURN: "color-burn",
  EXCLUSION: "exclusion",
  HUE: "hue",
  SATURATION: "saturation",
  COLOR: "color",
  LUMINOSITY: "luminosity"
};
var blendModeList = Object.values(BlendMode);
var blendModeIndex = Object.fromEntries(blendModeList.map((v, i) => [v, i]));
function blendModeToNumber(blendMode) {
  return blendModeIndex[blendMode] ?? 0;
}
function numberToBlendMode(index) {
  return blendModeList[index] ?? "source-over";
}

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/display/DisplayObject.js
function clampRotation(value) {
  value %= 360;
  if (value > 180) {
    value -= 360;
  } else if (value < -180) {
    value += 360;
  }
  return value;
}
var DisplayObject = class _DisplayObject extends EventDispatcher {
  // ── Static fields ─────────────────────────────────────────────────────────
  static defaultTouchEnabled = false;
  static $enterFrameCallBackList = [];
  static $renderCallBackList = [];
  static $eventAddToStageList = [];
  static $eventRemoveFromStageList = [];
  /**
   * @internal
   * Injected by Player at startup. Called when $renderMode changes (visible,
   * filters, mask, blendMode) so the WebGLRenderer can mark its InstructionSet dirty.
   *
   * Single-Player engine: Player assigns this directly in its constructor and
   * clears it in `destroy()`. There is intentionally no registration API.
   */
  static $onStructureChange;
  /**
   * @internal
   * Injected by Player at startup. Called when a DisplayObject's visual data
   * changes (position, texture, alpha, tint) but the scene structure is unchanged.
   * The renderer uses this to update the transform snapshot in the InstructionSet
   * without doing a full rebuild.
   *
   * Single-Player engine: Player assigns this directly in its constructor and
   * clears it in `destroy()`. There is intentionally no registration API.
   */
  static $onRenderableDirty;
  // ── Instance fields ───────────────────────────────────────────────────────
  // 场景图
  $hasAddToStage = false;
  $children;
  $parent;
  $stage;
  $nestLevel = 0;
  // 变换
  $x = 0;
  $y = 0;
  $anchorOffsetX = 0;
  $anchorOffsetY = 0;
  $explicitWidth = NaN;
  $explicitHeight = NaN;
  $useTranslate = false;
  // 外观
  $visible = true;
  $alpha = 1;
  $blendMode = 0;
  $filters = [];
  $cacheAsBitmap = false;
  $touchEnabled = _DisplayObject.defaultTouchEnabled;
  // 遮罩
  $mask;
  $maskRect;
  $scrollRect;
  $maskedObject;
  // 渲染状态
  $renderMode;
  $renderObjectType = 0;
  $renderDirty = false;
  $cacheDirty = false;
  $displayList;
  // 世界缓存（$markDirty 更新，O(1) 读取）
  $worldAlpha = 1;
  $worldTint = 16777215;
  $tintRGB = 0;
  // 排序
  $sortDirty = false;
  $lastSortedIndex = 0;
  // bounds 缓存
  _boundsDirty = true;
  _cachedBounds = new Rectangle();
  // 私有
  _name = "";
  _matrix = new Matrix();
  _matrixDirty = false;
  _concatenatedMatrix;
  _invertedConcatenatedMatrix;
  _scaleX = 1;
  _scaleY = 1;
  _rotation = 0;
  _skewX = 0;
  _skewXdeg = 0;
  _skewY = 0;
  _skewYdeg = 0;
  _tint = 16777215;
  _zIndex = 0;
  _sortableChildren = false;
  _graphics;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor() {
    super();
    this.tint = 16777215;
  }
  // ── Getters / Setters ─────────────────────────────────────────────────────
  get graphics() {
    return this._graphics;
  }
  get name() {
    return this._name;
  }
  set name(value) {
    this._name = value;
  }
  get parent() {
    return this.$parent;
  }
  get stage() {
    return this.$stage;
  }
  get matrix() {
    return this.$getMatrix().clone();
  }
  set matrix(value) {
    this.$setMatrix(value);
  }
  get x() {
    return this.$x;
  }
  set x(value) {
    this.$setX(value);
  }
  get y() {
    return this.$y;
  }
  set y(value) {
    this.$setY(value);
  }
  get scaleX() {
    return this._scaleX;
  }
  set scaleX(value) {
    this.$setScaleX(value);
  }
  get scaleY() {
    return this._scaleY;
  }
  set scaleY(value) {
    this.$setScaleY(value);
  }
  get rotation() {
    return this._rotation;
  }
  set rotation(value) {
    this.$setRotation(value);
  }
  get skewX() {
    return this._skewXdeg;
  }
  set skewX(value) {
    this.$setSkewX(value);
  }
  get skewY() {
    return this._skewYdeg;
  }
  set skewY(value) {
    this.$setSkewY(value);
  }
  get width() {
    return isNaN(this.$explicitWidth) ? this.$getOriginalBounds().width : this.$explicitWidth;
  }
  set width(value) {
    this.$explicitWidth = isNaN(value) ? NaN : value;
  }
  get height() {
    return isNaN(this.$explicitHeight) ? this.$getOriginalBounds().height : this.$explicitHeight;
  }
  set height(value) {
    this.$explicitHeight = isNaN(value) ? NaN : value;
  }
  get measuredWidth() {
    return this.$getOriginalBounds().width;
  }
  get measuredHeight() {
    return this.$getOriginalBounds().height;
  }
  get anchorOffsetX() {
    return this.$anchorOffsetX;
  }
  set anchorOffsetX(value) {
    this.$setAnchorOffsetX(value);
  }
  get anchorOffsetY() {
    return this.$anchorOffsetY;
  }
  set anchorOffsetY(value) {
    this.$setAnchorOffsetY(value);
  }
  get visible() {
    return this.$visible;
  }
  set visible(value) {
    this.$setVisible(value);
  }
  get cacheAsBitmap() {
    return this.$cacheAsBitmap;
  }
  set cacheAsBitmap(value) {
    this.$cacheAsBitmap = value;
    this.$setHasDisplayList(value);
  }
  get filters() {
    return this.$filters;
  }
  set filters(value) {
    this.$filters = value ? [...value] : [];
    this.$updateRenderMode();
    this.$markDirty();
  }
  get alpha() {
    return this.$alpha;
  }
  set alpha(value) {
    this.$setAlpha(value);
  }
  get touchEnabled() {
    return this.$touchEnabled;
  }
  set touchEnabled(value) {
    this.$touchEnabled = !!value;
  }
  get scrollRect() {
    return this.$scrollRect;
  }
  set scrollRect(value) {
    this.$setScrollRect(value);
  }
  get blendMode() {
    return numberToBlendMode(this.$blendMode);
  }
  set blendMode(value) {
    const mode = blendModeToNumber(value);
    if (this.$blendMode === mode) {
      return;
    }
    this.$blendMode = mode;
    this.$updateRenderMode();
    this.$markDirty();
  }
  get mask() {
    return this.$mask ?? this.$maskRect;
  }
  set mask(value) {
    this.$setMask(value);
  }
  get tint() {
    return this._tint;
  }
  set tint(value) {
    this._tint = typeof value === "number" && value >= 0 && value <= 16777215 ? value : 16777215;
    this.$tintRGB = (this._tint >> 16) + (this._tint & 65280) + ((this._tint & 255) << 16);
    this.$markDirty();
  }
  get zIndex() {
    return this._zIndex;
  }
  set zIndex(value) {
    this._zIndex = value;
    if (this.parent) {
      this.parent.$sortDirty = true;
    }
  }
  get sortableChildren() {
    return this._sortableChildren;
  }
  set sortableChildren(value) {
    this._sortableChildren = value;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  getBounds(resultRect, calculateAnchor = true) {
    resultRect = this.$getTransformedBoundsInternal(this, resultRect);
    if (calculateAnchor) {
      if (this.$anchorOffsetX !== 0) {
        resultRect.x -= this.$anchorOffsetX;
      }
      if (this.$anchorOffsetY !== 0) {
        resultRect.y -= this.$anchorOffsetY;
      }
    }
    return resultRect;
  }
  getTransformedBounds(targetCoordinateSpace, resultRect) {
    return this.$getTransformedBoundsInternal(targetCoordinateSpace ?? this, resultRect);
  }
  globalToLocal(stageX = 0, stageY = 0, resultPoint) {
    return this.$getInvertedConcatenatedMatrix().transformPoint(stageX, stageY, resultPoint);
  }
  localToGlobal(localX = 0, localY = 0, resultPoint) {
    return this.$getConcatenatedMatrix().transformPoint(localX, localY, resultPoint);
  }
  hitTestPoint(x, y, shapeFlag) {
    if (this._scaleX === 0 || this._scaleY === 0) {
      return false;
    }
    const m = this.$getInvertedConcatenatedMatrix();
    const bounds = this.getBounds(void 0, false);
    const localX = m.a * x + m.c * y + m.tx;
    const localY = m.b * x + m.d * y + m.ty;
    if (!bounds.contains(localX, localY)) {
      return false;
    }
    const rect = this.$scrollRect ?? this.$maskRect;
    if (rect && !rect.contains(localX, localY)) {
      return false;
    }
    if (!shapeFlag) {
      return true;
    }
    return this.$hitTest(x, y) !== void 0;
  }
  sortChildren() {
    this.$sortDirty = false;
  }
  dispatchEvent(event) {
    if (!event.bubbles) {
      return super.dispatchEvent(event);
    }
    const list = this.$getPropagationList(this);
    const targetIndex = list.length * 0.5;
    event.setDispatchContext(
      this,
      2
      /* EventPhase.AT_TARGET */
    );
    this.$dispatchPropagationEvent(event, list, targetIndex);
    return !event.isDefaultPrevented();
  }
  willTrigger(type) {
    let node = this;
    while (node) {
      if (node.hasEventListener(type)) {
        return true;
      }
      node = node.$parent;
    }
    return false;
  }
  // Impl: type-erased to satisfy both overloads (see AnyListener in EventDispatcher)
  addEventListener(type, listener, useCapture, priority) {
    super.addEventListener(type, listener, useCapture, priority);
    if (type === Event.ENTER_FRAME || type === Event.RENDER) {
      const list = type === Event.ENTER_FRAME ? _DisplayObject.$enterFrameCallBackList : _DisplayObject.$renderCallBackList;
      if (!list.includes(this)) {
        list.push(this);
      }
    }
  }
  removeEventListener(type, listener, useCapture) {
    super.removeEventListener(type, listener, useCapture);
    if ((type === Event.ENTER_FRAME || type === Event.RENDER) && !this.hasEventListener(type)) {
      const list = type === Event.ENTER_FRAME ? _DisplayObject.$enterFrameCallBackList : _DisplayObject.$renderCallBackList;
      const index = list.indexOf(this);
      if (index !== -1) {
        list.splice(index, 1);
      }
    }
  }
  // ── Internal methods (used by subclasses and framework) ───────────────────
  $setParent(parent) {
    this.$parent = parent;
  }
  $onAddToStage(stage, $nestLevel) {
    this.$stage = stage;
    this.$nestLevel = $nestLevel;
    this.$hasAddToStage = true;
    _DisplayObject.$eventAddToStageList.push(this);
  }
  $onRemoveFromStage() {
    this.$nestLevel = 0;
    this.$stage = void 0;
    _DisplayObject.$eventRemoveFromStageList.push(this);
  }
  $getMatrix() {
    if (this._matrixDirty) {
      this._matrixDirty = false;
      this._matrix.updateScaleAndRotation(this._scaleX, this._scaleY, this._skewX, this._skewY);
    }
    this._matrix.tx = this.$x;
    this._matrix.ty = this.$y;
    return this._matrix;
  }
  $setMatrix(matrix, needUpdateProperties = true) {
    const m = this._matrix;
    m.a = matrix.a;
    m.b = matrix.b;
    m.c = matrix.c;
    m.d = matrix.d;
    this.$x = matrix.tx;
    this.$y = matrix.ty;
    this._matrixDirty = false;
    this.$useTranslate = !(m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1);
    if (needUpdateProperties) {
      this._scaleX = m.getScaleX();
      this._scaleY = m.getScaleY();
      this._skewX = matrix.getSkewX();
      this._skewY = matrix.getSkewY();
      this._skewXdeg = clampRotation(this._skewX * 180 / Math.PI);
      this._skewYdeg = clampRotation(this._skewY * 180 / Math.PI);
      this._rotation = clampRotation(this._skewY * 180 / Math.PI);
    }
    this.$markDirty();
  }
  $getConcatenatedMatrix() {
    if (!this._concatenatedMatrix) {
      this._concatenatedMatrix = new Matrix();
    }
    const matrix = this._concatenatedMatrix;
    if (this.$parent) {
      this.$parent.$getConcatenatedMatrix().preMultiplyInto(this.$getMatrix(), matrix);
    } else {
      matrix.copyFrom(this.$getMatrix());
    }
    const ox = this.$anchorOffsetX;
    const oy = this.$anchorOffsetY;
    const rect = this.$scrollRect;
    if (rect) {
      matrix.preMultiplyInto(sharedMatrix.setTo(1, 0, 0, 1, -rect.x - ox, -rect.y - oy), matrix);
    } else if (ox !== 0 || oy !== 0) {
      matrix.preMultiplyInto(sharedMatrix.setTo(1, 0, 0, 1, -ox, -oy), matrix);
    }
    return matrix;
  }
  $getInvertedConcatenatedMatrix() {
    if (!this._invertedConcatenatedMatrix) {
      this._invertedConcatenatedMatrix = new Matrix();
    }
    this.$getConcatenatedMatrix().invertInto(this._invertedConcatenatedMatrix);
    return this._invertedConcatenatedMatrix;
  }
  $setX(value) {
    if (this.$x === value) {
      return false;
    }
    this.$x = value;
    this.$markDirty();
    return true;
  }
  $setY(value) {
    if (this.$y === value) {
      return false;
    }
    this.$y = value;
    this.$markDirty();
    return true;
  }
  $setScaleX(value) {
    if (this._scaleX === value) {
      return;
    }
    this._scaleX = value;
    this._matrixDirty = true;
    this.$updateUseTransform();
    this.$markDirty();
  }
  $setScaleY(value) {
    if (this._scaleY === value) {
      return;
    }
    this._scaleY = value;
    this._matrixDirty = true;
    this.$updateUseTransform();
    this.$markDirty();
  }
  $setRotation(value) {
    value = clampRotation(value);
    if (value === this._rotation) {
      return;
    }
    const delta = (value - this._rotation) / 180 * Math.PI;
    this._skewX += delta;
    this._skewY += delta;
    this._rotation = value;
    this._matrixDirty = true;
    this.$updateUseTransform();
    this.$markDirty();
  }
  $setSkewX(value) {
    if (value === this._skewXdeg) {
      return;
    }
    this._skewXdeg = value;
    this._skewX = clampRotation(value) / 180 * Math.PI;
    this._matrixDirty = true;
    this.$updateUseTransform();
    this.$markDirty();
  }
  $setSkewY(value) {
    if (value === this._skewYdeg) {
      return;
    }
    this._skewYdeg = value;
    this._skewY = (clampRotation(value) + this._rotation) / 180 * Math.PI;
    this._matrixDirty = true;
    this.$updateUseTransform();
    this.$markDirty();
  }
  $setAnchorOffsetX(value) {
    if (this.$anchorOffsetX === value) {
      return;
    }
    this.$anchorOffsetX = value;
    this.$markDirty();
  }
  $setAnchorOffsetY(value) {
    if (this.$anchorOffsetY === value) {
      return;
    }
    this.$anchorOffsetY = value;
    this.$markDirty();
  }
  $setVisible(value) {
    if (this.$visible === value) {
      return;
    }
    this.$visible = value;
    this.$updateRenderMode();
    this.$markDirty();
  }
  $setAlpha(value) {
    if (this.$alpha === value) {
      return;
    }
    this.$alpha = value;
    this.$updateRenderMode();
    this.$markDirty();
  }
  $setScrollRect(value) {
    if (!value && !this.$scrollRect) {
      return;
    }
    if (value) {
      if (!this.$scrollRect) {
        this.$scrollRect = new Rectangle();
      }
      this.$scrollRect.copyFrom(value);
    } else {
      this.$scrollRect = void 0;
    }
    this.$updateRenderMode();
    this.$markDirty();
  }
  $setHasDisplayList(value) {
    const hasDisplayList = !!this.$displayList;
    if (hasDisplayList === value) {
      return;
    }
    if (value) {
      const dl = DisplayList.create(this);
      if (dl) {
        this.$displayList = dl;
        this.$cacheDirty = true;
      }
    } else {
      if (this.$displayList) {
        DisplayList.release(this.$displayList);
        this.$displayList = void 0;
      }
    }
    _DisplayObject.$onStructureChange?.();
    this.$markDirty();
  }
  $cacheDirtyUp() {
    const p = this.$parent;
    if (p && !p.$cacheDirty) {
      p.$cacheDirty = true;
      p._boundsDirty = true;
      p.$cacheDirtyUp();
    }
  }
  $renderDirtyUp() {
    const p = this.$parent;
    if (p && !p.$renderDirty) {
      p.$renderDirty = true;
      p.$renderDirtyUp();
    }
  }
  $updateUseTransform() {
    this.$useTranslate = !(this._scaleX === 1 && this._scaleY === 1 && this._skewX === 0 && this._skewY === 0);
  }
  $updateRenderMode() {
    if (!this.$visible || this.$alpha <= 0 || this.$maskedObject) {
      this.$renderMode = 1;
    } else if (this.$filters.length > 0) {
      this.$renderMode = 2;
    } else if (this.$blendMode !== 0 || this.$mask && this.$mask.$stage) {
      this.$renderMode = 3;
    } else if (this.$scrollRect || this.$maskRect) {
      this.$renderMode = 4;
    } else {
      this.$renderMode = void 0;
    }
    _DisplayObject.$onStructureChange?.();
  }
  $getOriginalBounds() {
    if (!this._boundsDirty) {
      return this._cachedBounds;
    }
    const bounds = this.$getContentBounds();
    this.$measureChildBounds(bounds);
    this._cachedBounds.copyFrom(bounds);
    this._boundsDirty = false;
    return this._cachedBounds;
  }
  $measureChildBounds(_bounds) {
  }
  $getContentBounds() {
    const bounds = sharedRectangle;
    bounds.setEmpty();
    this.$measureContentBounds(bounds);
    return bounds;
  }
  $measureContentBounds(_bounds) {
  }
  $getTransformedBoundsInternal(targetCoordinateSpace, resultRect) {
    const bounds = this.$getOriginalBounds();
    if (!resultRect) {
      resultRect = new Rectangle();
    }
    resultRect.copyFrom(bounds);
    if (targetCoordinateSpace === this) {
      return resultRect;
    }
    const m = sharedMatrix;
    targetCoordinateSpace.$getInvertedConcatenatedMatrix().preMultiplyInto(this.$getConcatenatedMatrix(), m);
    m.transformBounds(resultRect);
    return resultRect;
  }
  $getConcatenatedMatrixAt(root, matrix) {
    const invertMatrix = root.$getInvertedConcatenatedMatrix();
    if ((invertMatrix.a === 0 || invertMatrix.d === 0) && (invertMatrix.b === 0 || invertMatrix.c === 0)) {
      let target = this;
      const rootLevel = root.$nestLevel;
      matrix.identity();
      while (target.$nestLevel > rootLevel) {
        const rect = target.$scrollRect;
        if (rect)
          matrix.concat(sharedMatrix.setTo(1, 0, 0, 1, -rect.x, -rect.y));
        matrix.concat(target.$getMatrix());
        target = target.$parent;
      }
    } else {
      invertMatrix.preMultiplyInto(matrix, matrix);
    }
  }
  $hitTest(stageX, stageY) {
    if (!this.$visible || this._scaleX === 0 || this._scaleY === 0) {
      return void 0;
    }
    const m = this.$getInvertedConcatenatedMatrix();
    if (m.a === 0 && m.b === 0 && m.c === 0 && m.d === 0) {
      return void 0;
    }
    const bounds = this.$getContentBounds();
    const localX = m.a * stageX + m.c * stageY + m.tx;
    const localY = m.b * stageX + m.d * stageY + m.ty;
    if (bounds.contains(localX, localY)) {
      if (!this.$children) {
        const rect = this.$scrollRect ?? this.$maskRect;
        if (rect && !rect.contains(localX, localY)) {
          return void 0;
        }
        if (this.$mask && !this.$mask.$hitTest(stageX, stageY)) {
          return void 0;
        }
      }
      return this;
    }
    return void 0;
  }
  $updateRenderNode() {
  }
  $getPropagationList(target) {
    const list = [];
    let current = target;
    while (current) {
      list.push(current);
      current = current.$parent;
    }
    return [...[...list].reverse(), ...list];
  }
  $dispatchPropagationEvent(event, list, targetIndex) {
    for (let i = 0; i < list.length; i++) {
      const currentTarget = list[i];
      let phase;
      if (i < targetIndex - 1) {
        phase = 1;
      } else if (i > targetIndex) {
        phase = 3;
      } else {
        phase = 2;
      }
      event.setCurrentTarget(currentTarget);
      event.setDispatchContext(currentTarget, phase);
      currentTarget.notifyListener(event, i < targetIndex);
      if (event.isPropagationStopped || event.isPropagationImmediateStopped) {
        return;
      }
    }
  }
  // ── Private methods ───────────────────────────────────────────────────────
  $setMask(value) {
    if (value === this) {
      return;
    }
    if (value instanceof _DisplayObject) {
      if (value === this.$mask) {
        return;
      }
      if (value.$maskedObject) {
        value.$maskedObject.mask = void 0;
      }
      value.$maskedObject = this;
      this.$mask = value;
      this.$maskRect = void 0;
    } else if (value instanceof Rectangle) {
      if (!this.$maskRect) {
        this.$maskRect = new Rectangle();
      }
      this.$maskRect.copyFrom(value);
      if (this.$mask) {
        this.$mask.$maskedObject = void 0;
        this.$mask = void 0;
      }
    } else {
      if (this.$mask) {
        this.$mask.$maskedObject = void 0;
        this.$mask = void 0;
      }
      this.$maskRect = void 0;
    }
    this.$updateRenderMode();
    this.$markDirty();
  }
  $markDirty() {
    this.$renderDirty = true;
    this._boundsDirty = true;
    let alpha = this.$alpha;
    let tint = this.$tintRGB;
    let p = this.$parent;
    while (p) {
      alpha *= p.$alpha;
      if (p.$tintRGB !== 16777215) {
        tint = p.$tintRGB;
      }
      p = p.$parent;
    }
    this.$worldAlpha = alpha;
    this.$worldTint = tint;
    _DisplayObject.$onRenderableDirty?.(this);
    const parent = this.$parent;
    if (parent && !parent.$cacheDirty) {
      parent.$cacheDirty = true;
      parent.$cacheDirtyUp();
    }
    if (parent && !parent.$renderDirty) {
      parent.$renderDirty = true;
      parent.$renderDirtyUp();
    }
    const masked = this.$maskedObject;
    if (masked && !masked.$cacheDirty) {
      masked.$cacheDirty = true;
      masked.$cacheDirtyUp();
    }
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/SystemTicker.js
var START_TIME = Date.now();
var invalidateRenderFlag = false;
function setInvalidateRenderFlag(value) {
  invalidateRenderFlag = value;
}
var requestRenderingFlag = false;
function setRequestRenderingFlag(value) {
  requestRenderingFlag = value;
}
var SystemTicker = class {
  // ── Instance fields ───────────────────────────────────────────────────────
  _players = [];
  _ticks = [];
  _frameRate = 30;
  _frameDeltaTime;
  _frameInterval;
  _lastCount;
  _lastTimeStamp = 0;
  _costEnterFrame = 0;
  _isPaused = false;
  _rafId = 0;
  _running = false;
  // Deferred calls (equivalent to egret.callLater)
  _callLaterList = [];
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor() {
    this._frameDeltaTime = 1e3 / this._frameRate;
    this._lastCount = this._frameInterval = Math.round(6e4 / this._frameRate);
  }
  // ── Getters / Setters ─────────────────────────────────────────────────────
  get frameRate() {
    return this._frameRate;
  }
  setFrameRate(value) {
    if (value <= 0 || this._frameRate === value)
      return false;
    this._frameRate = value;
    const capped = Math.min(value, 60);
    this._frameDeltaTime = 1e3 / capped;
    this._lastCount = this._frameInterval = Math.round(6e4 / capped);
    return true;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  addPlayer(player) {
    if (!this._players.includes(player))
      this._players.push(player);
  }
  removePlayer(player) {
    const i = this._players.indexOf(player);
    if (i !== -1)
      this._players.splice(i, 1);
  }
  startTick(callback, thisObject) {
    if (this.getTickIndex(callback, thisObject) !== -1)
      return;
    this._ticks.push({ callback, thisObject });
  }
  stopTick(callback, thisObject) {
    const i = this.getTickIndex(callback, thisObject);
    if (i !== -1)
      this._ticks.splice(i, 1);
  }
  callLater(fn, ...args) {
    this._callLaterList.push({ fn, args });
  }
  start() {
    if (this._running)
      return;
    this._running = true;
    this._lastTimeStamp = getTimer();
    this._rafId = requestAnimationFrame(this.onFrame);
  }
  stop() {
    this._running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = 0;
    }
  }
  pause() {
    this._isPaused = true;
  }
  resume() {
    this._isPaused = false;
  }
  /** Force a single update (useful for testing). */
  update(forceUpdate = false) {
    this.tick(forceUpdate);
  }
  // ── Private methods ───────────────────────────────────────────────────────
  onFrame = () => {
    if (!this._running)
      return;
    this.tick(false);
    this._rafId = requestAnimationFrame(this.onFrame);
  };
  tick(forceUpdate) {
    const t1 = Date.now();
    const timeStamp = getTimer();
    if (this._isPaused) {
      this._lastTimeStamp = timeStamp;
      return;
    }
    let needRender = requestRenderingFlag;
    const ticks = [...this._ticks];
    for (const entry of ticks) {
      if (entry.callback.call(entry.thisObject, timeStamp))
        needRender = true;
    }
    const t2 = Date.now();
    const deltaTime = timeStamp - this._lastTimeStamp;
    this._lastTimeStamp = timeStamp;
    if (deltaTime >= this._frameDeltaTime || forceUpdate) {
      this._lastCount = this._frameInterval;
    } else {
      this._lastCount -= 1e3;
      if (this._lastCount > 0) {
        if (needRender)
          this.render(false, this._costEnterFrame + t2 - t1);
        return;
      }
      this._lastCount += this._frameInterval;
    }
    this.render(true, this._costEnterFrame + t2 - t1);
    const t3 = Date.now();
    this.broadcastEnterFrame();
    this._costEnterFrame = Date.now() - t3;
  }
  render(triggerByFrame, costTicker) {
    if (this._players.length === 0)
      return;
    this.flushCallLaters();
    if (invalidateRenderFlag) {
      this.broadcastRender();
      invalidateRenderFlag = false;
    }
    for (const player of this._players) {
      player.render(triggerByFrame, costTicker);
    }
    requestRenderingFlag = false;
  }
  broadcastEnterFrame() {
    const list = [...DisplayObject.$enterFrameCallBackList];
    for (const obj of list) {
      obj.dispatchEventWith(Event.ENTER_FRAME);
    }
  }
  broadcastRender() {
    const list = [...DisplayObject.$renderCallBackList];
    for (const obj of list) {
      obj.dispatchEventWith(Event.RENDER);
    }
  }
  flushCallLaters() {
    if (this._callLaterList.length === 0)
      return;
    const list = this._callLaterList;
    this._callLaterList = [];
    for (const entry of list) {
      entry.fn(...entry.args);
    }
  }
  getTickIndex(callback, thisObject) {
    for (let i = this._ticks.length - 1; i >= 0; i--) {
      if (this._ticks[i].callback === callback && this._ticks[i].thisObject === thisObject)
        return i;
    }
    return -1;
  }
};
var ticker = new SystemTicker();
function getTimer() {
  return Date.now() - START_TIME;
}
function setupLifecycle(stage) {
  const onVisibilityChange = () => {
    if (document.hidden) {
      ticker.pause();
      stage.dispatchEventWith(Event.DEACTIVATE);
    } else {
      ticker.resume();
      stage.dispatchEventWith(Event.ACTIVATE);
    }
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => document.removeEventListener("visibilitychange", onVisibilityChange);
}

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/events/TimerEvent.js
var TimerEvent = class _TimerEvent extends Event {
  // ── Static constants ──────────────────────────────────────────────────────
  static TIMER = "timer";
  static TIMER_COMPLETE = "timerComplete";
  // ── Static methods ────────────────────────────────────────────────────────
  static dispatchTimerEvent(target, type, bubbles, cancelable) {
    const event = Event.create(_TimerEvent, type, bubbles, cancelable);
    const result = target.dispatchEvent(event);
    Event.release(event);
    return result;
  }
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(type, bubbles, cancelable) {
    super(type, bubbles, cancelable);
  }
  // ── Public methods ────────────────────────────────────────────────────────
  /**
   * Requests an immediate re-render after this event is processed.
   * Full implementation requires the player/runtime layer.
   */
  updateAfterEvent() {
    setRequestRenderingFlag(true);
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/utils/toColorString.js
function toColorString(value) {
  const clamped = Math.max(0, Math.min(16777215, value || 0));
  return "#" + clamped.toString(16).toUpperCase().padStart(6, "0");
}

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/utils/Logger.js
var currentLevel = 0;
var Logger = {
  get logLevel() {
    return currentLevel;
  },
  set logLevel(level) {
    currentLevel = level;
  },
  debug(...args) {
    if (currentLevel <= 1)
      console.debug(...args);
  },
  info(...args) {
    if (currentLevel <= 2)
      console.info(...args);
  },
  warn(...args) {
    if (currentLevel <= 3)
      console.warn(...args);
  },
  error(...args) {
    if (currentLevel <= 4)
      console.error(...args);
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/utils/Timer.js
var Timer = class extends EventDispatcher {
  repeatCount;
  _delay = 0;
  _currentCount = 0;
  _running = false;
  _lastTimeStamp = 0;
  constructor(delay, repeatCount = 0) {
    super();
    this.delay = delay;
    this.repeatCount = repeatCount | 0;
  }
  get delay() {
    return this._delay;
  }
  set delay(value) {
    if (value < 1)
      value = 1;
    this._delay = value;
  }
  get currentCount() {
    return this._currentCount;
  }
  get running() {
    return this._running;
  }
  reset() {
    this.stop();
    this._currentCount = 0;
  }
  start() {
    if (this._running)
      return;
    this._lastTimeStamp = getTimer();
    ticker.startTick(this._update, this);
    this._running = true;
  }
  stop() {
    if (!this._running)
      return;
    ticker.stopTick(this._update, this);
    this._running = false;
  }
  _update = (timeStamp) => {
    const deltaTime = timeStamp - this._lastTimeStamp;
    if (deltaTime < this._delay)
      return false;
    this._lastTimeStamp = timeStamp;
    this._currentCount++;
    const complete = this.repeatCount > 0 && this._currentCount >= this.repeatCount;
    if (this.repeatCount === 0 || this._currentCount <= this.repeatCount) {
      TimerEvent.dispatchTimerEvent(this, TimerEvent.TIMER);
    }
    if (complete) {
      this.stop();
      TimerEvent.dispatchTimerEvent(this, TimerEvent.TIMER_COMPLETE);
    }
    return false;
  };
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/utils/ByteArray.js
var Endian = {
  LITTLE_ENDIAN: "littleEndian",
  BIG_ENDIAN: "bigEndian"
};
var SIZE_OF_BOOLEAN = 1;
var SIZE_OF_INT8 = 1;
var SIZE_OF_INT16 = 2;
var SIZE_OF_INT32 = 4;
var SIZE_OF_UINT8 = 1;
var SIZE_OF_UINT16 = 2;
var SIZE_OF_UINT32 = 4;
var SIZE_OF_FLOAT32 = 4;
var SIZE_OF_FLOAT64 = 8;
var _encoder = new TextEncoder();
var _decoder = new TextDecoder("utf-8");
var ByteArray = class {
  _bufferExtSize;
  _data;
  _bytes;
  _position = 0;
  _writePosition = 0;
  _littleEndian = false;
  constructor(buffer, bufferExtSize = 0) {
    this._bufferExtSize = bufferExtSize < 0 ? 0 : bufferExtSize;
    let bytes;
    let wpos = 0;
    if (buffer) {
      const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
      wpos = uint8.length;
      bytes = this._allocate(wpos);
      bytes.set(uint8);
    } else {
      bytes = new Uint8Array(Math.max(bufferExtSize, 0));
    }
    this._writePosition = wpos;
    this._bytes = bytes;
    this._data = new DataView(bytes.buffer);
  }
  // ── Endian ────────────────────────────────────────────────────────────────
  get endian() {
    return this._littleEndian ? Endian.LITTLE_ENDIAN : Endian.BIG_ENDIAN;
  }
  set endian(value) {
    this._littleEndian = value === Endian.LITTLE_ENDIAN;
  }
  // ── Buffer access ─────────────────────────────────────────────────────────
  get buffer() {
    return this._data.buffer.slice(0, this._writePosition);
  }
  set buffer(value) {
    const uint8 = new Uint8Array(value);
    const bytes = this._allocate(value.byteLength);
    bytes.set(uint8);
    this._writePosition = value.byteLength;
    this._bytes = bytes;
    this._data = new DataView(bytes.buffer);
  }
  get rawBuffer() {
    return this._data.buffer;
  }
  get bytes() {
    return this._bytes;
  }
  get dataView() {
    return this._data;
  }
  set dataView(value) {
    this.buffer = value.buffer;
  }
  get bufferOffset() {
    return this._data.byteOffset;
  }
  // ── Position / Length ─────────────────────────────────────────────────────
  get position() {
    return this._position;
  }
  set position(value) {
    this._position = value;
    if (value > this._writePosition)
      this._writePosition = value;
  }
  get length() {
    return this._writePosition;
  }
  set length(value) {
    this._writePosition = value;
    if (this._data.byteLength > value)
      this._position = value;
    this._validateBuffer(value);
  }
  get bytesAvailable() {
    return this._writePosition - this._position;
  }
  // ── Core ──────────────────────────────────────────────────────────────────
  clear() {
    const buf = new ArrayBuffer(this._bufferExtSize);
    this._data = new DataView(buf);
    this._bytes = new Uint8Array(buf);
    this._position = 0;
    this._writePosition = 0;
  }
  // ── Read ──────────────────────────────────────────────────────────────────
  readBoolean() {
    this._validate(SIZE_OF_BOOLEAN);
    return !!this._bytes[this._position++];
  }
  readByte() {
    this._validate(SIZE_OF_INT8);
    return this._data.getInt8(this._position++);
  }
  readUnsignedByte() {
    this._validate(SIZE_OF_UINT8);
    return this._bytes[this._position++];
  }
  readShort() {
    this._validate(SIZE_OF_INT16);
    const v = this._data.getInt16(this._position, this._littleEndian);
    this._position += SIZE_OF_INT16;
    return v;
  }
  readUnsignedShort() {
    this._validate(SIZE_OF_UINT16);
    const v = this._data.getUint16(this._position, this._littleEndian);
    this._position += SIZE_OF_UINT16;
    return v;
  }
  readInt() {
    this._validate(SIZE_OF_INT32);
    const v = this._data.getInt32(this._position, this._littleEndian);
    this._position += SIZE_OF_INT32;
    return v;
  }
  readUnsignedInt() {
    this._validate(SIZE_OF_UINT32);
    const v = this._data.getUint32(this._position, this._littleEndian);
    this._position += SIZE_OF_UINT32;
    return v;
  }
  readFloat() {
    this._validate(SIZE_OF_FLOAT32);
    const v = this._data.getFloat32(this._position, this._littleEndian);
    this._position += SIZE_OF_FLOAT32;
    return v;
  }
  readDouble() {
    this._validate(SIZE_OF_FLOAT64);
    const v = this._data.getFloat64(this._position, this._littleEndian);
    this._position += SIZE_OF_FLOAT64;
    return v;
  }
  readBytes(bytes, offset = 0, length = 0) {
    const available = this._writePosition - this._position;
    if (available < 0)
      throw new RangeError("ByteArray: read past end");
    if (length === 0)
      length = available;
    else if (length > available)
      throw new RangeError("ByteArray: read past end");
    const pos = bytes._position;
    bytes._position = 0;
    bytes._ensureWrite(offset + length);
    bytes._position = pos;
    bytes._bytes.set(this._bytes.subarray(this._position, this._position + length), offset);
    this._position += length;
  }
  readUTF() {
    const length = this.readUnsignedShort();
    return length > 0 ? this.readUTFBytes(length) : "";
  }
  readUTFBytes(length) {
    this._validate(length);
    const slice = new Uint8Array(this._data.buffer, this._data.byteOffset + this._position, length);
    this._position += length;
    return _decoder.decode(slice);
  }
  // ── Write ─────────────────────────────────────────────────────────────────
  writeBoolean(value) {
    this._ensureWrite(SIZE_OF_BOOLEAN);
    this._bytes[this._position++] = value ? 1 : 0;
  }
  writeByte(value) {
    this._ensureWrite(SIZE_OF_INT8);
    this._bytes[this._position++] = value & 255;
  }
  writeUnsignedByte(value) {
    this._ensureWrite(SIZE_OF_UINT8);
    this._bytes[this._position++] = value & 255;
  }
  writeShort(value) {
    this._ensureWrite(SIZE_OF_INT16);
    this._data.setInt16(this._position, value, this._littleEndian);
    this._position += SIZE_OF_INT16;
  }
  writeUnsignedShort(value) {
    this._ensureWrite(SIZE_OF_UINT16);
    this._data.setUint16(this._position, value, this._littleEndian);
    this._position += SIZE_OF_UINT16;
  }
  writeInt(value) {
    this._ensureWrite(SIZE_OF_INT32);
    this._data.setInt32(this._position, value, this._littleEndian);
    this._position += SIZE_OF_INT32;
  }
  writeUnsignedInt(value) {
    this._ensureWrite(SIZE_OF_UINT32);
    this._data.setUint32(this._position, value, this._littleEndian);
    this._position += SIZE_OF_UINT32;
  }
  writeFloat(value) {
    this._ensureWrite(SIZE_OF_FLOAT32);
    this._data.setFloat32(this._position, value, this._littleEndian);
    this._position += SIZE_OF_FLOAT32;
  }
  writeDouble(value) {
    this._ensureWrite(SIZE_OF_FLOAT64);
    this._data.setFloat64(this._position, value, this._littleEndian);
    this._position += SIZE_OF_FLOAT64;
  }
  writeBytes(bytes, offset = 0, length = 0) {
    if (offset < 0 || length < 0)
      return;
    const writeLen = length === 0 ? bytes.length - offset : Math.min(bytes.length - offset, length);
    if (writeLen <= 0)
      return;
    this._ensureWrite(writeLen);
    this._bytes.set(bytes._bytes.subarray(offset, offset + writeLen), this._position);
    this._position += writeLen;
  }
  writeUTF(value) {
    const utf8 = _encoder.encode(value);
    this._ensureWrite(SIZE_OF_UINT16 + utf8.length);
    this._data.setUint16(this._position, utf8.length, this._littleEndian);
    this._position += SIZE_OF_UINT16;
    this._bytes.set(utf8, this._position);
    this._position += utf8.length;
    if (this._position > this._writePosition)
      this._writePosition = this._position;
  }
  writeUTFBytes(value) {
    const utf8 = _encoder.encode(value);
    this._ensureWrite(utf8.length);
    this._bytes.set(utf8, this._position);
    this._position += utf8.length;
  }
  _writeUint8Array(bytes, validate = true) {
    const pos = this._position;
    const npos = pos + bytes.length;
    if (validate)
      this._ensureWrite(bytes.length);
    this._bytes.set(bytes, pos);
    this._position = npos;
    if (npos > this._writePosition)
      this._writePosition = npos;
  }
  toString() {
    return `[ByteArray] length:${this.length}, bytesAvailable:${this.bytesAvailable}`;
  }
  // ── Internal ──────────────────────────────────────────────────────────────
  validate(len) {
    if (this._writePosition > 0 && this._position + len <= this._writePosition)
      return true;
    throw new RangeError("ByteArray: read past end");
  }
  validateBuffer(len) {
    this._writePosition = len > this._writePosition ? len : this._writePosition;
    this._validateBuffer(len + this._position);
  }
  _validateBuffer(value) {
    if (this._data.byteLength < value) {
      const be = this._bufferExtSize;
      const nLen = be === 0 ? value : (Math.floor(value / be) + 1) * be;
      const tmp = new Uint8Array(nLen);
      tmp.set(this._bytes);
      this._bytes = tmp;
      this._data = new DataView(tmp.buffer);
    }
  }
  _validate(len) {
    if (this._position + len > this._writePosition) {
      throw new RangeError("ByteArray: read past end");
    }
  }
  _ensureWrite(len) {
    const needed = this._position + len;
    this._validateBuffer(needed);
    if (needed > this._writePosition)
      this._writePosition = needed;
  }
  _allocate(size) {
    const be = this._bufferExtSize;
    if (be === 0)
      return new Uint8Array(size);
    return new Uint8Array((Math.floor(size / be) + 1) * be);
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/utils/FontManager.js
var fontResourceCache = {};
function cacheFontResource(url, buffer) {
  fontResourceCache[url] = buffer;
}
function registerFontMapping(name, path) {
  if ("FontFace" in window) {
    _loadByFontFace(name, path);
  } else {
    _loadByStyleElement(name, path);
  }
}
function _loadByFontFace(name, path) {
  const cached = fontResourceCache[path];
  if (!cached) {
    console.warn(`registerFontMapping: font file not cached for path "${path}". Load it first.`);
    return;
  }
  const fontFace = new FontFace(name, cached);
  document.fonts.add(fontFace);
  fontFace.load().catch((err) => {
    console.error("registerFontMapping load error:", err);
  });
}
function _loadByStyleElement(name, path) {
  const style = document.createElement("style");
  style.textContent = `@font-face { font-family: "${name}"; src: url("${path}"); }`;
  document.head.appendChild(style);
}

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/utils/DebugLog.js
var DebugLog = class _DebugLog {
  static _enabled = false;
  static _frameCount = 0;
  static _maxFrames = 3;
  static enable() {
    _DebugLog._enabled = true;
    _DebugLog._frameCount = 0;
  }
  static get active() {
    if (!_DebugLog._enabled)
      return false;
    return _DebugLog._frameCount < _DebugLog._maxFrames;
  }
  static tickFrame() {
    if (_DebugLog._enabled) {
      _DebugLog._frameCount++;
      if (_DebugLog._frameCount >= _DebugLog._maxFrames) {
        _DebugLog._enabled = false;
      }
    }
  }
};
globalThis.DebugLog = DebugLog;

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/display/enums/BitmapFillMode.js
var BitmapFillMode = {
  REPEAT: "repeat",
  SCALE: "scale",
  CLIP: "clip"
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/display/enums/CapsStyle.js
var CapsStyle = {
  NONE: "none",
  ROUND: "round",
  SQUARE: "square"
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/display/enums/GradientType.js
var GradientType = {
  LINEAR: "linear",
  RADIAL: "radial"
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/display/enums/JointStyle.js
var JointStyle = {
  BEVEL: "bevel",
  MITER: "miter",
  ROUND: "round"
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/display/enums/OrientationMode.js
var OrientationMode = {
  AUTO: "auto",
  PORTRAIT: "portrait",
  LANDSCAPE: "landscape",
  LANDSCAPE_FLIPPED: "landscapeFlipped"
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/display/enums/StageScaleMode.js
var StageScaleMode = {
  EXACT_FIT: "exactFit",
  SHOW_ALL: "showAll",
  NO_SCALE: "noScale",
  NO_BORDER: "noBorder",
  FIXED_WIDTH: "fixedWidth",
  FIXED_HEIGHT: "fixedHeight",
  FIXED_NARROW: "fixedNarrow",
  FIXED_WIDE: "fixedWide"
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/display/DisplayObjectContainer.js
var DisplayObjectContainer = class _DisplayObjectContainer extends DisplayObject {
  // ── Instance fields ───────────────────────────────────────────────────────
  _touchChildren = true;
  /**
   * When true this container owns an independent InstructionSet.
   * The renderer will build and execute its subtree separately, so changes
   * inside this container never trigger a rebuild of the parent set.
   *
   * Typical use: mark a static background layer or a rarely-changing UI panel
   * as a RenderGroup so the parent scene graph traversal skips it entirely.
   */
  isRenderGroup = false;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor() {
    super();
    this.$children = [];
  }
  // ── Getters / Setters ─────────────────────────────────────────────────────
  get numChildren() {
    return this.$children.length;
  }
  get touchChildren() {
    return this._touchChildren;
  }
  set touchChildren(value) {
    this._touchChildren = !!value;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  addChild(child) {
    let index = this.$children.length;
    if (child.$parent === this)
      index--;
    return this.doAddChild(child, index);
  }
  addChildAt(child, index) {
    index = +index | 0;
    const len = this.$children.length;
    if (index < 0 || index >= len) {
      index = len;
      if (child.$parent === this)
        index--;
    }
    return this.doAddChild(child, index);
  }
  contains(child) {
    let current = child;
    while (current) {
      if (current === this) {
        return true;
      }
      current = current.$parent;
    }
    return false;
  }
  getChildAt(index) {
    index = +index | 0;
    return this.$children[index];
  }
  getChildIndex(child) {
    return this.$children.indexOf(child);
  }
  getChildByName(name) {
    return this.$children.find((c) => c.name === name);
  }
  removeChild(child) {
    const index = this.$children.indexOf(child);
    if (index >= 0)
      return this.doRemoveChild(index);
    return void 0;
  }
  removeChildAt(index) {
    index = +index | 0;
    if (index >= 0 && index < this.$children.length) {
      return this.doRemoveChild(index);
    }
    return void 0;
  }
  removeChildren() {
    for (let i = this.$children.length - 1; i >= 0; i--) {
      this.doRemoveChild(i);
    }
  }
  setChildIndex(child, index) {
    index = +index | 0;
    const len = this.$children.length;
    if (index < 0 || index >= len) {
      index = len - 1;
    }
    this.doSetChildIndex(child, index);
  }
  swapChildren(child1, child2) {
    const i1 = this.$children.indexOf(child1);
    const i2 = this.$children.indexOf(child2);
    if (i1 !== -1 && i2 !== -1) {
      this.doSwapChildrenAt(i1, i2);
    }
  }
  swapChildrenAt(index1, index2) {
    index1 = +index1 | 0;
    index2 = +index2 | 0;
    const len = this.$children.length;
    if (index1 >= 0 && index1 < len && index2 >= 0 && index2 < len) {
      this.doSwapChildrenAt(index1, index2);
    }
  }
  sortChildren() {
    super.sortChildren();
    this.$sortDirty = false;
    const $children = this.$children;
    let sortRequired = false;
    for (let i = 0; i < $children.length; i++) {
      $children[i].$lastSortedIndex = i;
      if (!sortRequired && $children[i].zIndex !== 0) {
        sortRequired = true;
      }
    }
    if (sortRequired && $children.length > 1) {
      $children.sort(this.sortChildrenFunc);
      _DisplayObjectContainer.$onContainerStructureChange?.(this);
    }
  }
  // ── Internal methods ──────────────────────────────────────────────────────
  $onAddToStage(stage, $nestLevel) {
    super.$onAddToStage(stage, $nestLevel);
    for (const child of this.$children) {
      child.$onAddToStage(stage, $nestLevel + 1);
      if (child.$maskedObject) {
        child.$maskedObject.$updateRenderMode();
      }
    }
  }
  $onRemoveFromStage() {
    super.$onRemoveFromStage();
    for (const child of this.$children) {
      child.$onRemoveFromStage();
    }
  }
  $measureChildBounds(bounds) {
    const $children = this.$children;
    if ($children.length === 0)
      return;
    let xMin = 0, xMax = 0, yMin = 0, yMax = 0;
    let found = false;
    for (let i = -1; i < $children.length; i++) {
      let childBounds;
      if (i === -1) {
        childBounds = bounds;
      } else {
        $children[i].getBounds(sharedRectangle);
        $children[i].$getMatrix().transformBounds(sharedRectangle);
        childBounds = sharedRectangle;
      }
      if (childBounds.isEmpty()) {
        continue;
      }
      if (found) {
        xMin = Math.min(xMin, childBounds.x);
        xMax = Math.max(xMax, childBounds.x + childBounds.width);
        yMin = Math.min(yMin, childBounds.y);
        yMax = Math.max(yMax, childBounds.y + childBounds.height);
      } else {
        found = true;
        xMin = childBounds.x;
        xMax = xMin + childBounds.width;
        yMin = childBounds.y;
        yMax = yMin + childBounds.height;
      }
    }
    bounds.setTo(xMin, yMin, xMax - xMin, yMax - yMin);
  }
  $hitTest(stageX, stageY) {
    if (!this.$visible) {
      return void 0;
    }
    const m = this.$getInvertedConcatenatedMatrix();
    const localX = m.a * stageX + m.c * stageY + m.tx;
    const localY = m.b * stageX + m.d * stageY + m.ty;
    const rect = this.$scrollRect ?? this.$maskRect;
    if (rect && !rect.contains(localX, localY)) {
      return void 0;
    }
    if (this.$mask && !this.$mask.$hitTest(stageX, stageY)) {
      return void 0;
    }
    const $children = this.$children;
    let found = false;
    let target;
    for (let i = $children.length - 1; i >= 0; i--) {
      const child = $children[i];
      if (child.$maskedObject)
        continue;
      target = child.$hitTest(stageX, stageY);
      if (target) {
        found = true;
        if (target.$touchEnabled)
          break;
        target = void 0;
      }
    }
    if (target) {
      return this._touchChildren ? target : this;
    }
    if (found) {
      return this;
    }
    return super.$hitTest(stageX, stageY);
  }
  childAdded(_child, _index) {
  }
  childRemoved(_child, _index) {
  }
  // ── Private methods ───────────────────────────────────────────────────────
  doAddChild(child, index) {
    const host = child.$parent;
    if (host === this) {
      this.doSetChildIndex(child, index);
      return child;
    }
    if (host) {
      host.removeChild(child);
    }
    this.$children.splice(index, 0, child);
    child.$setParent(this);
    if (this.$stage) {
      child.$onAddToStage(this.$stage, this.$nestLevel + 1);
    }
    child.dispatchEventWith(Event.ADDED, true);
    if (this.$stage) {
      const list = DisplayObject.$eventAddToStageList;
      while (list.length) {
        const added = list.shift();
        if (added.$stage) {
          added.dispatchEventWith(Event.ADDED_TO_STAGE);
        }
      }
    }
    if (child.$maskedObject) {
      child.$maskedObject.$updateRenderMode();
    }
    this.markDirtyInternal();
    this.childAdded(child, index);
    return child;
  }
  doRemoveChild(index) {
    const $children = this.$children;
    const child = $children[index];
    this.childRemoved(child, index);
    child.dispatchEventWith(Event.REMOVED, true);
    if (this.$stage) {
      child.$onRemoveFromStage();
      const list = DisplayObject.$eventRemoveFromStageList;
      while (list.length) {
        const removed = list.shift();
        if (removed.$hasAddToStage) {
          removed.$hasAddToStage = false;
          removed.dispatchEventWith(Event.REMOVED_FROM_STAGE);
        }
      }
    }
    child.$setParent(void 0);
    const indexNow = $children.indexOf(child);
    if (indexNow !== -1) {
      $children.splice(indexNow, 1);
    }
    if (child.$maskedObject)
      child.$maskedObject.$updateRenderMode();
    this.markDirtyInternal();
    return child;
  }
  doSetChildIndex(child, index) {
    const lastIndex = this.$children.indexOf(child);
    if (lastIndex < 0 || lastIndex === index) {
      return;
    }
    this.childRemoved(child, lastIndex);
    this.$children.splice(lastIndex, 1);
    this.$children.splice(index, 0, child);
    this.childAdded(child, index);
    this.markDirtyInternal();
  }
  doSwapChildrenAt(index1, index2) {
    if (index1 > index2) {
      const t = index1;
      index1 = index2;
      index2 = t;
    }
    if (index1 === index2) {
      return;
    }
    const list = this.$children;
    const child1 = list[index1];
    const child2 = list[index2];
    this.childRemoved(child1, index1);
    this.childRemoved(child2, index2);
    list[index1] = child2;
    list[index2] = child1;
    this.childAdded(child2, index1);
    this.childAdded(child1, index2);
    this.markDirtyInternal();
  }
  markDirtyInternal() {
    this.$markDirty();
    _DisplayObjectContainer.$onContainerStructureChange?.(this);
  }
  /**
   * @internal
   * Injected by Player at startup. Called whenever a child is added, removed,
   * or reordered so the WebGLRenderer can mark its InstructionSet as dirty.
   * The `owner` argument is the container that changed — used to route the
   * dirty signal to a RenderGroup's set when applicable.
   *
   * Single-Player engine: Player assigns this directly in its constructor and
   * clears it in `destroy()`. There is intentionally no registration API.
   */
  static $onContainerStructureChange;
  sortChildrenFunc(a, b) {
    if (a.zIndex === b.zIndex) {
      return a.$lastSortedIndex - b.$lastSortedIndex;
    }
    return a.zIndex - b.zIndex;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/display/Stage.js
var Stage = class extends DisplayObjectContainer {
  // ── Instance fields ───────────────────────────────────────────────────────
  _stageWidth = 0;
  _stageHeight = 0;
  _scaleMode = StageScaleMode.SHOW_ALL;
  _orientation = OrientationMode.AUTO;
  _maxTouches = 99;
  _textureScaleFactor = 1;
  _screenAdapter;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor() {
    super();
    this.$stage = this;
    this.$nestLevel = 1;
  }
  // ── Getters / Setters ─────────────────────────────────────────────────────
  get stageWidth() {
    return this._stageWidth;
  }
  get stageHeight() {
    return this._stageHeight;
  }
  get frameRate() {
    return ticker.frameRate;
  }
  set frameRate(value) {
    ticker.setFrameRate(value);
  }
  get scaleMode() {
    return this._scaleMode;
  }
  set scaleMode(value) {
    if (this._scaleMode === value) {
      return;
    }
    this._scaleMode = value;
    this.onScreenSizeChanged();
  }
  get orientation() {
    return this._orientation;
  }
  set orientation(value) {
    if (this._orientation === value) {
      return;
    }
    this._orientation = value;
    this.onScreenSizeChanged();
  }
  get maxTouches() {
    return this._maxTouches;
  }
  set maxTouches(value) {
    if (this._maxTouches === value) {
      return;
    }
    this._maxTouches = value;
    this.onMaxTouchesChanged();
  }
  get textureScaleFactor() {
    return this._textureScaleFactor;
  }
  set textureScaleFactor(value) {
    this._textureScaleFactor = value;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  /**
   * Marks the display list as needing a re-render.
   * Triggers Event.RENDER to be dispatched on the next frame.
   */
  invalidate() {
    setInvalidateRenderFlag(true);
  }
  /**
   * Sets the logical content size of the stage.
   * Called by the player/screen adapter when the viewport changes.
   */
  setContentSize(width, height) {
    this.onScreenSizeChanged();
    this.resize(width, height);
  }
  // ── Internal methods (called by player/renderer) ──────────────────────────
  /**
   * Called by the renderer when the canvas/viewport is resized.
   */
  resize(width, height) {
    this._stageWidth = width;
    this._stageHeight = height;
    this.dispatchEventWith(Event.RESIZE);
  }
  // ── Protected hooks (override in platform adapters) ───────────────────────
  /** @internal Called by ScreenAdapter to register itself. */
  setScreenAdapter(adapter) {
    this._screenAdapter = adapter;
  }
  onScreenSizeChanged() {
    this._screenAdapter?.updateScreenSize();
  }
  onMaxTouchesChanged() {
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/display/Graphics.js
var graphicsHitTest;
function setGraphicsHitTest(fn) {
  graphicsHitTest = fn;
}
function clampAngle(value) {
  value %= Math.PI * 2;
  if (value < 0) {
    value += Math.PI * 2;
  }
  return value;
}
function getCurvePoint(v0, v1, v2, t) {
  return (1 - t) ** 2 * v0 + 2 * t * (1 - t) * v1 + t ** 2 * v2;
}
function getCubicCurvePoint(v0, v1, v2, v3, t) {
  return (1 - t) ** 3 * v0 + 3 * t * (1 - t) ** 2 * v1 + 3 * (1 - t) * t ** 2 * v2 + t ** 3 * v3;
}
function createBezierPoints(data, count) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const t = i / count;
    let x = 0, y = 0;
    if (data.length === 6) {
      x = getCurvePoint(data[0], data[2], data[4], t);
      y = getCurvePoint(data[1], data[3], data[5], t);
    } else if (data.length === 8) {
      x = getCubicCurvePoint(data[0], data[2], data[4], data[6], t);
      y = getCubicCurvePoint(data[1], data[3], data[5], data[7], t);
    }
    points.push(Point.create(x, y));
  }
  return points;
}
var Graphics = class {
  // ── Instance fields ───────────────────────────────────────────────────────
  targetDisplay;
  commands = [];
  canvasCacheDirty = true;
  offscreenCanvas;
  offscreenCtx;
  offscreenBoundsX = 0;
  offscreenBoundsY = 0;
  _lastX = 0;
  _lastY = 0;
  _minX = Infinity;
  _minY = Infinity;
  _maxX = -Infinity;
  _maxY = -Infinity;
  _topLeftStrokeWidth = 0;
  _bottomRightStrokeWidth = 0;
  _includeLastPosition = true;
  // ── Public methods ────────────────────────────────────────────────────────
  beginFill(color, alpha = 1) {
    this.commands.push({ type: 9, color: +color || 0, alpha: +alpha || 0 });
    this.dirty();
  }
  beginGradientFill(gradientType, colors, alphas, ratios, matrix) {
    this.commands.push({ type: 10, gradientType, colors, alphas, ratios, matrix });
    this.dirty();
  }
  endFill() {
    this.commands.push({
      type: 11
      /* PathCommandType.EndFill */
    });
    this.dirty();
  }
  lineStyle(thickness = NaN, color = 0, alpha = 1, _pixelHinting = false, _scaleMode = "normal", caps, joints, miterLimit = 3, lineDash) {
    thickness = +thickness || 0;
    if (thickness <= 0) {
      this.setStrokeWidth(0);
    } else {
      this.setStrokeWidth(thickness);
      this.commands.push({
        type: 12,
        thickness,
        color: +color || 0,
        alpha: +alpha || 0,
        caps,
        joints,
        miterLimit: +miterLimit || 0,
        lineDash
      });
    }
    this.dirty();
  }
  drawRect(x, y, width, height) {
    x = +x || 0;
    y = +y || 0;
    width = +width || 0;
    height = +height || 0;
    this.commands.push({ type: 4, x, y, w: width, h: height });
    this.extendBoundsByPoint(x + width, y + height);
    this.updatePosition(x, y);
    this.dirty();
  }
  drawRoundRect(x, y, width, height, ellipseWidth, ellipseHeight) {
    x = +x || 0;
    y = +y || 0;
    width = +width || 0;
    height = +height || 0;
    ellipseWidth = +ellipseWidth || 0;
    const eh = ellipseHeight !== void 0 ? +ellipseHeight || 0 : ellipseWidth;
    this.commands.push({ type: 5, x, y, w: width, h: height, ew: ellipseWidth, eh });
    this.extendBoundsByPoint(x, y);
    this.extendBoundsByPoint(x + width, y + height);
    this.updatePosition(x + width, y + height - (eh * 0.5 | 0));
    this.dirty();
  }
  drawCircle(x, y, radius) {
    x = +x || 0;
    y = +y || 0;
    radius = +radius || 0;
    this.commands.push({ type: 6, x, y, r: radius });
    this.extendBoundsByPoint(x - radius - 1, y - radius - 1);
    this.extendBoundsByPoint(x + radius + 2, y + radius + 2);
    this.updatePosition(x + radius, y);
    this.dirty();
  }
  drawEllipse(x, y, width, height) {
    x = +x || 0;
    y = +y || 0;
    width = +width || 0;
    height = +height || 0;
    this.commands.push({ type: 7, x, y, w: width, h: height });
    this.extendBoundsByPoint(x - 1, y - 1);
    this.extendBoundsByPoint(x + width + 2, y + height + 2);
    this.updatePosition(x + width, y + height * 0.5);
    this.dirty();
  }
  moveTo(x, y) {
    x = +x || 0;
    y = +y || 0;
    this.commands.push({ type: 0, x, y });
    this._includeLastPosition = false;
    this._lastX = x;
    this._lastY = y;
    this.dirty();
  }
  lineTo(x, y) {
    x = +x || 0;
    y = +y || 0;
    this.commands.push({ type: 1, x, y });
    this.updatePosition(x, y);
    this.dirty();
  }
  curveTo(controlX, controlY, anchorX, anchorY) {
    controlX = +controlX || 0;
    controlY = +controlY || 0;
    anchorX = +anchorX || 0;
    anchorY = +anchorY || 0;
    this.commands.push({ type: 2, cx: controlX, cy: controlY, ax: anchorX, ay: anchorY });
    const pts = createBezierPoints([this._lastX, this._lastY, controlX, controlY, anchorX, anchorY], 50);
    for (const p of pts) {
      this.extendBoundsByPoint(p.x, p.y);
      Point.release(p);
    }
    this.extendBoundsByPoint(anchorX, anchorY);
    this.updatePosition(anchorX, anchorY);
    this.dirty();
  }
  cubicCurveTo(cx1, cy1, cx2, cy2, ax, ay) {
    cx1 = +cx1 || 0;
    cy1 = +cy1 || 0;
    cx2 = +cx2 || 0;
    cy2 = +cy2 || 0;
    ax = +ax || 0;
    ay = +ay || 0;
    this.commands.push({ type: 3, cx1, cy1, cx2, cy2, ax, ay });
    const pts = createBezierPoints([this._lastX, this._lastY, cx1, cy1, cx2, cy2, ax, ay], 50);
    for (const p of pts) {
      this.extendBoundsByPoint(p.x, p.y);
      Point.release(p);
    }
    this.extendBoundsByPoint(ax, ay);
    this.updatePosition(ax, ay);
    this.dirty();
  }
  drawArc(x, y, radius, startAngle, endAngle, anticlockwise = false) {
    if (radius < 0 || startAngle === endAngle) {
      return;
    }
    x = +x || 0;
    y = +y || 0;
    radius = +radius || 0;
    startAngle = clampAngle(+startAngle || 0);
    endAngle = clampAngle(+endAngle || 0);
    this.commands.push({
      type: 8,
      x,
      y,
      r: radius,
      start: startAngle,
      end: endAngle,
      ccw: anticlockwise
    });
    if (anticlockwise) {
      this.arcBounds(x, y, radius, endAngle, startAngle);
    } else {
      this.arcBounds(x, y, radius, startAngle, endAngle);
    }
    this.updatePosition(x + Math.cos(endAngle) * radius, y + Math.sin(endAngle) * radius);
    this.dirty();
  }
  clear() {
    this.commands.length = 0;
    this._lastX = 0;
    this._lastY = 0;
    this._minX = Infinity;
    this._minY = Infinity;
    this._maxX = -Infinity;
    this._maxY = -Infinity;
    if (this.offscreenCanvas) {
      this.offscreenCanvas.width = 0;
      this.offscreenCanvas.height = 0;
    }
    this.canvasCacheDirty = true;
    this.dirty();
  }
  // ── Internal methods ──────────────────────────────────────────────────────
  $measureContentBounds(bounds) {
    if (this._minX === Infinity) {
      bounds.setEmpty();
    } else {
      bounds.setTo(this._minX, this._minY, this._maxX - this._minX, this._maxY - this._minY);
    }
  }
  $hitTest(localX, localY) {
    if (!graphicsHitTest || this.commands.length === 0) {
      return false;
    }
    return graphicsHitTest(this, localX, localY);
  }
  $onRemoveFromStage() {
  }
  // ── Private methods ───────────────────────────────────────────────────────
  setStrokeWidth(width) {
    if (width === 1) {
      this._topLeftStrokeWidth = 0;
      this._bottomRightStrokeWidth = 1;
    } else if (width === 3) {
      this._topLeftStrokeWidth = 1;
      this._bottomRightStrokeWidth = 2;
    } else {
      const half = Math.ceil(width * 0.5) | 0;
      this._topLeftStrokeWidth = half;
      this._bottomRightStrokeWidth = half;
    }
  }
  dirty() {
    this.canvasCacheDirty = true;
    if (!this.targetDisplay) {
      return;
    }
    this.targetDisplay.$cacheDirty = true;
    this.targetDisplay.$renderDirty = true;
    this.targetDisplay.$markDirty();
  }
  extendBoundsByPoint(x, y) {
    this._minX = Math.min(this._minX, x - this._topLeftStrokeWidth);
    this._maxX = Math.max(this._maxX, x + this._bottomRightStrokeWidth);
    this._minY = Math.min(this._minY, y - this._topLeftStrokeWidth);
    this._maxY = Math.max(this._maxY, y + this._bottomRightStrokeWidth);
  }
  updatePosition(x, y) {
    if (!this._includeLastPosition) {
      this.extendBoundsByPoint(this._lastX, this._lastY);
      this._includeLastPosition = true;
    }
    this._lastX = x;
    this._lastY = y;
    this.extendBoundsByPoint(x, y);
  }
  arcBounds(x, y, radius, startAngle, endAngle) {
    const PI = Math.PI;
    if (Math.abs(startAngle - endAngle) < 0.01) {
      this.extendBoundsByPoint(x - radius, y - radius);
      this.extendBoundsByPoint(x + radius, y + radius);
      return;
    }
    if (startAngle > endAngle) {
      endAngle += PI * 2;
    }
    let xMin = Math.min(Math.cos(startAngle), Math.cos(endAngle)) * radius;
    let xMax = Math.max(Math.cos(startAngle), Math.cos(endAngle)) * radius;
    let yMin = Math.min(Math.sin(startAngle), Math.sin(endAngle)) * radius;
    let yMax = Math.max(Math.sin(startAngle), Math.sin(endAngle)) * radius;
    for (let i = Math.ceil(startAngle / (PI * 0.5)); i <= endAngle / (PI * 0.5); i++) {
      switch (i % 4) {
        case 0:
          xMax = radius;
          break;
        case 1:
          yMax = radius;
          break;
        case 2:
          xMin = -radius;
          break;
        case 3:
          yMin = -radius;
          break;
      }
    }
    this.extendBoundsByPoint(Math.floor(xMin) + x, Math.floor(yMin) + y);
    this.extendBoundsByPoint(Math.ceil(xMax) + x, Math.ceil(yMax) + y);
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/display/Shape.js
var Shape = class extends DisplayObject {
  // ── Instance fields ───────────────────────────────────────────────────────
  _graphics;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor() {
    super();
    this.$renderObjectType = 3;
    this._graphics = new Graphics();
    this._graphics.targetDisplay = this;
  }
  // ── Getters ───────────────────────────────────────────────────────────────
  get graphics() {
    return this._graphics;
  }
  // ── Internal methods ──────────────────────────────────────────────────────
  $measureContentBounds(bounds) {
    this.graphics.$measureContentBounds(bounds);
  }
  $hitTest(stageX, stageY) {
    const target = super.$hitTest(stageX, stageY);
    if (target !== this)
      return target;
    const m = this.$getInvertedConcatenatedMatrix();
    const localX = m.a * stageX + m.c * stageY + m.tx;
    const localY = m.b * stageX + m.d * stageY + m.ty;
    return this.graphics.$hitTest(localX, localY) ? this : void 0;
  }
  $onRemoveFromStage() {
    super.$onRemoveFromStage();
    this.graphics.$onRemoveFromStage();
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/display/Sprite.js
var Sprite = class extends DisplayObjectContainer {
  // ── Instance fields ───────────────────────────────────────────────────────
  _graphics;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor() {
    super();
    this.$renderObjectType = 4;
    this._graphics = new Graphics();
    this._graphics.targetDisplay = this;
  }
  // ── Getters ───────────────────────────────────────────────────────────────
  get graphics() {
    return this._graphics;
  }
  // ── Internal methods ──────────────────────────────────────────────────────
  $measureContentBounds(bounds) {
    this.graphics.$measureContentBounds(bounds);
  }
  $hitTest(stageX, stageY) {
    const target = super.$hitTest(stageX, stageY);
    if (target !== this)
      return target;
    if (this.graphics.commands.length === 0) {
      return this;
    }
    const m = this.$getInvertedConcatenatedMatrix();
    const localX = m.a * stageX + m.c * stageY + m.tx;
    const localY = m.b * stageX + m.d * stageY + m.ty;
    return this.graphics.$hitTest(localX, localY) ? this : void 0;
  }
  $onRemoveFromStage() {
    super.$onRemoveFromStage();
    this.graphics.$onRemoveFromStage();
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/display/texture/Texture.js
var textureScaleFactor = 1;
var Texture = class {
  // ── Instance fields ───────────────────────────────────────────────────────
  bitmapX = 0;
  bitmapY = 0;
  bitmapWidth = 0;
  bitmapHeight = 0;
  offsetX = 0;
  offsetY = 0;
  sourceWidth = 0;
  sourceHeight = 0;
  rotated = false;
  bitmapData;
  disposeBitmapData = true;
  _textureWidth = 0;
  _textureHeight = 0;
  // ── Getters / Setters ─────────────────────────────────────────────────────
  get textureWidth() {
    return this._textureWidth;
  }
  get textureHeight() {
    return this._textureHeight;
  }
  get scaleBitmapWidth() {
    return this.bitmapWidth * textureScaleFactor;
  }
  get scaleBitmapHeight() {
    return this.bitmapHeight * textureScaleFactor;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  setBitmapData(value) {
    this.bitmapData = value;
    const scale = textureScaleFactor;
    const w = value.width * scale;
    const h = value.height * scale;
    this.initData(0, 0, w, h, 0, 0, w, h, value.width, value.height);
  }
  dispose() {
    if (this.bitmapData) {
      if (this.disposeBitmapData) {
        this.bitmapData.dispose();
      }
      this.bitmapData = void 0;
    }
  }
  /** @deprecated Use setBitmapData instead. */
  getPixel32(_x, _y) {
    throw new Error("getPixel32 is not supported");
  }
  /** @deprecated Requires renderer implementation. */
  getPixels(_x, _y, _width = 1, _height = 1) {
    throw new Error("getPixels requires renderer implementation");
  }
  /** @deprecated Requires renderer implementation. */
  toDataURL(_type, _rect) {
    throw new Error("toDataURL requires renderer implementation");
  }
  // ── Internal methods ──────────────────────────────────────────────────────
  initData(bitmapX, bitmapY, bitmapWidth, bitmapHeight, offsetX, offsetY, textureWidth, textureHeight, sourceWidth, sourceHeight, rotated = false) {
    const scale = textureScaleFactor;
    this.bitmapX = bitmapX / scale;
    this.bitmapY = bitmapY / scale;
    this.bitmapWidth = bitmapWidth / scale;
    this.bitmapHeight = bitmapHeight / scale;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this._textureWidth = textureWidth;
    this._textureHeight = textureHeight;
    this.sourceWidth = sourceWidth;
    this.sourceHeight = sourceHeight;
    this.rotated = rotated;
    BitmapData.invalidate(this.bitmapData);
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/display/texture/RenderTexture.js
var RenderTexture = class _RenderTexture extends Texture {
  // ── Static fields ─────────────────────────────────────────────────────────
  static renderer;
  // ── Instance fields ───────────────────────────────────────────────────────
  _canvas;
  /** Cached context created with willReadFrequently so getPixel32 doesn't trigger warnings. */
  _ctx;
  // ── Public methods ────────────────────────────────────────────────────────
  drawToTexture(displayObject, clipBounds, scale = 1) {
    if (clipBounds && (clipBounds.width === 0 || clipBounds.height === 0)) {
      return false;
    }
    const bounds = clipBounds ?? displayObject.$getOriginalBounds();
    if (bounds.width === 0 || bounds.height === 0) {
      return false;
    }
    if (!_RenderTexture.renderer) {
      return false;
    }
    const s = scale / textureScaleFactor;
    const width = clipBounds ? bounds.width * s : (bounds.x + bounds.width) * s;
    const height = clipBounds ? bounds.height * s : (bounds.y + bounds.height) * s;
    const offsetX = clipBounds ? -clipBounds.x : 0;
    const offsetY = clipBounds ? -clipBounds.y : 0;
    this._canvas = _RenderTexture.renderer(displayObject, width, height, offsetX * s, offsetY * s);
    this._ctx = this._canvas.getContext("2d", { willReadFrequently: true }) ?? void 0;
    const bitmapData = new BitmapData(this._canvas);
    bitmapData.deleteSource = false;
    bitmapData.width = width;
    bitmapData.height = height;
    this.setBitmapData(bitmapData);
    this.initData(0, 0, width, height, 0, 0, width, height, width, height);
    return true;
  }
  getPixel32(x, y) {
    if (!this._canvas) {
      return [];
    }
    const scale = textureScaleFactor;
    const ctx = this._ctx ?? this._canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return [];
    }
    const data = ctx.getImageData(Math.round(x / scale), Math.round(y / scale), 1, 1).data;
    return [data[0], data[1], data[2], data[3]];
  }
  dispose() {
    super.dispose();
    this._canvas = void 0;
    this._ctx = void 0;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/display/texture/SpriteSheet.js
var SpriteSheet = class {
  // ── Instance fields ───────────────────────────────────────────────────────
  _texture;
  _bitmapX;
  _bitmapY;
  _textureMap = /* @__PURE__ */ new Map();
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(texture) {
    this._texture = texture;
    this._bitmapX = texture.bitmapX - texture.offsetX;
    this._bitmapY = texture.bitmapY - texture.offsetY;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  getTexture(name) {
    return this._textureMap.get(name);
  }
  createTexture(name, bitmapX, bitmapY, bitmapWidth, bitmapHeight, offsetX = 0, offsetY = 0, textureWidth, textureHeight) {
    const tw = textureWidth ?? offsetX + bitmapWidth;
    const th = textureHeight ?? offsetY + bitmapHeight;
    const texture = new Texture();
    texture.disposeBitmapData = false;
    texture.bitmapData = this._texture.bitmapData;
    texture.initData(this._bitmapX + bitmapX, this._bitmapY + bitmapY, bitmapWidth, bitmapHeight, offsetX, offsetY, tw, th, this._texture.sourceWidth, this._texture.sourceHeight);
    this._textureMap.set(name, texture);
    return texture;
  }
  dispose() {
    this._texture.dispose();
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/display/Bitmap.js
var bitmapPixelHitTest;
function setBitmapPixelHitTest(fn) {
  bitmapPixelHitTest = fn;
}
var Bitmap = class _Bitmap extends DisplayObject {
  // ── Static fields ─────────────────────────────────────────────────────────
  static defaultSmoothing = true;
  // ── Instance fields ───────────────────────────────────────────────────────
  _texture;
  _smoothing = _Bitmap.defaultSmoothing;
  _fillMode = BitmapFillMode.SCALE;
  _scale9Grid;
  _pixelHitTest = false;
  _explicitBitmapWidth = NaN;
  _explicitBitmapHeight = NaN;
  // Cached texture region data (updated when texture changes)
  bitmapData;
  bitmapX = 0;
  bitmapY = 0;
  bitmapWidth = 0;
  bitmapHeight = 0;
  bitmapOffsetX = 0;
  bitmapOffsetY = 0;
  textureWidth = 0;
  textureHeight = 0;
  sourceWidth = 0;
  sourceHeight = 0;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(value) {
    super();
    this.$renderObjectType = 1;
    if (value) {
      this.setTexture(value);
    }
  }
  // ── Getters / Setters ─────────────────────────────────────────────────────
  get texture() {
    return this._texture;
  }
  set texture(value) {
    this.setTexture(value);
  }
  get smoothing() {
    return this._smoothing;
  }
  set smoothing(value) {
    if (value === this._smoothing) {
      return;
    }
    this._smoothing = value;
    this.$markDirty();
  }
  get fillMode() {
    return this._fillMode;
  }
  set fillMode(value) {
    if (value === this._fillMode) {
      return;
    }
    this._fillMode = value;
    this.$renderDirty = true;
    this.$markDirty();
  }
  get scale9Grid() {
    return this._scale9Grid;
  }
  set scale9Grid(value) {
    this._scale9Grid = value;
    this.$renderDirty = true;
    this.$markDirty();
  }
  get pixelHitTest() {
    return this._pixelHitTest;
  }
  set pixelHitTest(value) {
    this._pixelHitTest = !!value;
  }
  get width() {
    return isNaN(this._explicitBitmapWidth) ? this.$getContentBounds().width : this._explicitBitmapWidth;
  }
  set width(value) {
    if (value < 0 || value === this._explicitBitmapWidth) {
      return;
    }
    this._explicitBitmapWidth = value;
    this.$renderDirty = true;
    this.$markDirty();
  }
  get height() {
    return isNaN(this._explicitBitmapHeight) ? this.$getContentBounds().height : this._explicitBitmapHeight;
  }
  set height(value) {
    if (value < 0 || value === this._explicitBitmapHeight) {
      return;
    }
    this._explicitBitmapHeight = value;
    this.$renderDirty = true;
    this.$markDirty();
  }
  // ── Internal methods ──────────────────────────────────────────────────────
  $onAddToStage(stage, $nestLevel) {
    super.$onAddToStage(stage, $nestLevel);
    if (this._texture?.bitmapData) {
      BitmapData.addDisplayObject(this, this._texture.bitmapData);
    }
  }
  $onRemoveFromStage() {
    super.$onRemoveFromStage();
    if (this._texture?.bitmapData) {
      BitmapData.removeDisplayObject(this, this._texture.bitmapData);
    }
  }
  $measureContentBounds(bounds) {
    const w = !isNaN(this._explicitBitmapWidth) ? this._explicitBitmapWidth : this.textureWidth;
    const h = !isNaN(this._explicitBitmapHeight) ? this._explicitBitmapHeight : this.textureHeight;
    bounds.setTo(0, 0, w, h);
  }
  $hitTest(stageX, stageY) {
    const target = super.$hitTest(stageX, stageY);
    if (!target || !this._pixelHitTest) {
      return target;
    }
    const m = this.$getInvertedConcatenatedMatrix();
    const localX = m.a * stageX + m.c * stageY + m.tx;
    const localY = m.b * stageX + m.d * stageY + m.ty;
    return bitmapPixelHitTest?.(this, localX, localY) === false ? void 0 : target;
  }
  // ── Private methods ───────────────────────────────────────────────────────
  setTexture(value) {
    const old = this._texture;
    if (value === old) {
      return;
    }
    this._texture = value;
    if (value) {
      this.refreshImageData();
      if (this.$stage) {
        if (old?.bitmapData && old.bitmapData !== value.bitmapData) {
          BitmapData.removeDisplayObject(this, old.bitmapData);
        }
        if (value.bitmapData) {
          BitmapData.addDisplayObject(this, value.bitmapData);
        }
      }
    } else {
      if (old?.bitmapData) {
        BitmapData.removeDisplayObject(this, old.bitmapData);
      }
      this.clearImageData();
    }
    this.$renderDirty = true;
    this.$markDirty();
  }
  refreshImageData() {
    const t = this._texture;
    if (!t) {
      return;
    }
    this.bitmapData = t.bitmapData;
    this.bitmapX = t.bitmapX;
    this.bitmapY = t.bitmapY;
    this.bitmapWidth = t.bitmapWidth;
    this.bitmapHeight = t.bitmapHeight;
    this.bitmapOffsetX = t.offsetX;
    this.bitmapOffsetY = t.offsetY;
    this.textureWidth = t.textureWidth;
    this.textureHeight = t.textureHeight;
    this.sourceWidth = t.sourceWidth;
    this.sourceHeight = t.sourceHeight;
  }
  clearImageData() {
    this.bitmapData = void 0;
    this.bitmapX = this.bitmapY = this.bitmapWidth = this.bitmapHeight = 0;
    this.bitmapOffsetX = this.bitmapOffsetY = 0;
    this.textureWidth = this.textureHeight = 0;
    this.sourceWidth = this.sourceHeight = 0;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/display/Mesh.js
var Mesh = class extends Bitmap {
  // ── Instance fields ───────────────────────────────────────────────────────
  /** Vertex positions: [x0, y0, x1, y1, ...] */
  vertices = [];
  /** Triangle indices into the vertices array. */
  indices = [];
  /** UV coordinates: [u0, v0, u1, v1, ...] */
  uvs = [];
  _verticesDirty = true;
  _bounds = new Rectangle();
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(value) {
    super(value);
    this.$renderObjectType = 2;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  /**
   * Marks vertices as dirty and triggers a re-render.
   * Call this after modifying `vertices`, `indices`, or `uvs`.
   */
  updateVertices() {
    this._verticesDirty = true;
    this.$renderDirty = true;
    this.$markDirty();
  }
  // ── Internal methods ──────────────────────────────────────────────────────
  $measureContentBounds(bounds) {
    if (this._verticesDirty) {
      this._verticesDirty = false;
      if (this.vertices.length) {
        let minX = Number.MAX_VALUE, minY = Number.MAX_VALUE;
        let maxX = -Number.MAX_VALUE, maxY = -Number.MAX_VALUE;
        for (let i = 0, l = this.vertices.length; i < l; i += 2) {
          const x = this.vertices[i];
          const y = this.vertices[i + 1];
          if (x < minX)
            minX = x;
          if (x > maxX)
            maxX = x;
          if (y < minY)
            minY = y;
          if (y > maxY)
            maxY = y;
        }
        this._bounds.setTo(minX, minY, maxX - minX, maxY - minY);
      } else {
        this._bounds.setTo(0, 0, 0, 0);
      }
    }
    bounds.copyFrom(this._bounds);
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/net/HttpMethod.js
var HttpMethod = {
  GET: "GET",
  POST: "POST"
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/net/HttpResponseType.js
var HttpResponseType = {
  TEXT: "text",
  ARRAY_BUFFER: "arraybuffer"
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/net/HttpRequest.js
var HttpRequest = class extends EventDispatcher {
  // ── Instance fields ───────────────────────────────────────────────────────
  /** Response body representation requested from XMLHttpRequest. */
  responseType = HttpResponseType.TEXT;
  /** Whether cross-origin requests include credentials. */
  withCredentials = false;
  /** Request timeout in milliseconds; 0 disables the browser timeout. */
  timeout = 0;
  _xhr;
  _url = "";
  _method = HttpMethod.GET;
  _pendingHeaders = [];
  // ── Getters ───────────────────────────────────────────────────────────────
  /** Response body from the active or most recently completed request. */
  get response() {
    return this._xhr?.response;
  }
  /**
   * HTTP status code from the active or most recently completed request.
   * Returns 0 before completion, after abort(), or when the browser blocks the
   * request before a response is available (for example, a failed CORS check).
   */
  get status() {
    return this._xhr?.status ?? 0;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  /**
   * Prepare a request URL and method.
   *
   * Aborts an active request and discards headers queued for the prior request.
   */
  open(url, method = HttpMethod.GET) {
    this.abort();
    this._url = url;
    this._method = method;
    this._pendingHeaders = [];
  }
  /**
   * Create and send the underlying XMLHttpRequest.
   *
   * Queued headers are applied after the native request is opened and before
   * its body is sent. Successful responses dispatch HTTP_STATUS followed by
   * COMPLETE; network errors, timeouts, status 0, and status >= 400 dispatch
   * IOErrorEvent.IO_ERROR.
   */
  send(data) {
    const xhr = new XMLHttpRequest();
    this._xhr = xhr;
    xhr.responseType = this.responseType;
    xhr.withCredentials = this.withCredentials;
    if (this.timeout > 0)
      xhr.timeout = this.timeout;
    xhr.onload = () => {
      HTTPStatusEvent.dispatchHTTPStatusEvent(this, xhr.status);
      if (xhr.status === 0 || xhr.status >= 400) {
        IOErrorEvent.dispatchIOErrorEvent(this);
      } else {
        this.dispatchEventWith(Event.COMPLETE);
      }
    };
    xhr.onerror = () => {
      IOErrorEvent.dispatchIOErrorEvent(this);
    };
    xhr.ontimeout = () => {
      IOErrorEvent.dispatchIOErrorEvent(this);
    };
    xhr.onprogress = (e) => {
      ProgressEvent.dispatchProgressEvent(this, ProgressEvent.PROGRESS, e.loaded, e.total);
    };
    xhr.open(this._method, this._url, true);
    for (const header of this._pendingHeaders) {
      xhr.setRequestHeader(header.name, header.value);
    }
    xhr.send(data);
  }
  /** Abort the active native request and clear its response/status accessors. */
  abort() {
    if (this._xhr) {
      this._xhr.abort();
      this._xhr = void 0;
    }
  }
  /** Return all response headers, or an empty string when no response is available. */
  getAllResponseHeaders() {
    return this._xhr?.getAllResponseHeaders() ?? "";
  }
  /**
   * Queue a request header to be sent with the next `send()` call.
   *
   * Must be called after `open()` and before `send()` because the underlying
   * XMLHttpRequest is created lazily by `send()`.
   */
  setRequestHeader(header, value) {
    this._pendingHeaders.push({ name: header, value });
  }
  /** Return a named response header, or an empty string when it is unavailable. */
  getResponseHeader(header) {
    return this._xhr?.getResponseHeader(header) ?? "";
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/net/ImageLoader.js
var ImageLoader = class _ImageLoader extends EventDispatcher {
  // ── Static fields ─────────────────────────────────────────────────────────
  /** Default cross-origin mode applied to newly created loaders. */
  static crossOrigin;
  // ── Instance fields ───────────────────────────────────────────────────────
  /** Bitmap data from the most recently completed image request. */
  data;
  /** Cross-origin mode applied to the next image request, when specified. */
  crossOrigin = _ImageLoader.crossOrigin;
  _img;
  // ── Public methods ────────────────────────────────────────────────────────
  /** Start loading an image URL, cancelling any previous request first. */
  load(url) {
    this.close();
    const img = new Image();
    this._img = img;
    if (this.crossOrigin)
      img.crossOrigin = this.crossOrigin;
    img.onload = () => {
      this.data = new BitmapData(img);
      this.dispatchEventWith(Event.COMPLETE);
    };
    img.onerror = () => {
      IOErrorEvent.dispatchIOErrorEvent(this);
    };
    img.src = url;
  }
  /**
   * Cancel an in-flight image request.
   *
   * The most recently loaded `data` value is retained; only the active browser
   * image element and its pending callbacks are released.
   */
  close() {
    if (this._img) {
      this._img.onload = null;
      this._img.onerror = null;
      this._img.src = "";
      this._img = void 0;
    }
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/filters/Filter.js
var Filter = class {
  // ── Instance fields ─────────────────────────────────────────────────────
  type = "";
  uniforms = {};
  paddingTop = 0;
  paddingBottom = 0;
  paddingLeft = 0;
  paddingRight = 0;
  // ── Public methods ────────────────────────────────────────────────────────
  onPropertyChange() {
    this.updatePadding();
  }
  // ── Internal methods ──────────────────────────────────────────────────────
  updatePadding() {
  }
  getPadding() {
    return { left: this.paddingLeft, right: this.paddingRight, top: this.paddingTop, bottom: this.paddingBottom };
  }
  toJson() {
    return "";
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/filters/BlurFilter.js
var BlurFilter = class extends Filter {
  // ── Instance fields ───────────────────────────────────────────────────────
  _blurX;
  _blurY;
  _quality;
  // ── Constructor ───────────────────────────────────────────────────────────
  // Note: 旧版 Egret 的 BlurFilter 内部创建了 BlurXFilter 和 BlurYFilter 两个子滤镜，
  // 用于 WebGL 渲染器的两 pass 高斯模糊。Blakron 将这个实现细节移到渲染层，
  // Filter 只负责存储参数（blurX/blurY），渲染器读取 uniforms 自行决定 pass 策略。
  constructor(blurX = 4, blurY = 4, quality = 1) {
    super();
    this.type = "blur";
    this._blurX = blurX;
    this._blurY = blurY;
    this._quality = quality;
    this.uniforms = { blurX, blurY };
    this.onPropertyChange();
  }
  // ── Getters / Setters ─────────────────────────────────────────────────────
  get blurX() {
    return this._blurX;
  }
  set blurX(value) {
    if (this._blurX === value)
      return;
    this._blurX = value;
    this.uniforms.blurX = value;
    this.onPropertyChange();
  }
  get blurY() {
    return this._blurY;
  }
  set blurY(value) {
    if (this._blurY === value)
      return;
    this._blurY = value;
    this.uniforms.blurY = value;
    this.onPropertyChange();
  }
  get quality() {
    return this._quality;
  }
  set quality(value) {
    this._quality = value;
  }
  // ── Internal methods ──────────────────────────────────────────────────────
  updatePadding() {
    this.paddingLeft = this.paddingRight = this._blurX;
    this.paddingTop = this.paddingBottom = this._blurY;
  }
  toJson() {
    return `{"blurX":${this._blurX},"blurY":${this._blurY},"quality":${this._quality}}`;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/filters/ColorMatrixFilter.js
var IDENTITY = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
var ColorMatrixFilter = class extends Filter {
  // ── Instance fields ───────────────────────────────────────────────────────
  _matrix = [...IDENTITY];
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(matrix) {
    super();
    this.type = "colorTransform";
    this.uniforms = {
      matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      colorAdd: { x: 0, y: 0, z: 0, w: 0 }
    };
    this.$setMatrix(matrix);
    this.onPropertyChange();
  }
  // ── Getters / Setters ─────────────────────────────────────────────────────
  get matrix() {
    return [...this._matrix];
  }
  set matrix(value) {
    this.$setMatrix(value);
  }
  // ── Internal methods ──────────────────────────────────────────────────────
  toJson() {
    return `{"matrix":[${this._matrix}]}`;
  }
  // ── Private methods ───────────────────────────────────────────────────────
  $setMatrix(value) {
    const src = value ?? IDENTITY;
    for (let i = 0; i < 20; i++)
      this._matrix[i] = src[i] ?? 0;
    const matrix = this.uniforms.matrix;
    const colorAdd = this.uniforms.colorAdd;
    let j = 0;
    for (let i = 0; i < 20; i++) {
      if (i === 4)
        colorAdd.x = this._matrix[i] / 255;
      else if (i === 9)
        colorAdd.y = this._matrix[i] / 255;
      else if (i === 14)
        colorAdd.z = this._matrix[i] / 255;
      else if (i === 19)
        colorAdd.w = this._matrix[i] / 255;
      else
        matrix[j++] = this._matrix[i];
    }
    this.onPropertyChange();
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/filters/GlowFilter.js
var GlowFilter = class extends Filter {
  // ── Instance fields ───────────────────────────────────────────────────────
  _color;
  _red;
  _green;
  _blue;
  _alpha;
  _blurX;
  _blurY;
  _strength;
  _quality;
  _inner;
  _knockout;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(color = 16711680, alpha = 1, blurX = 6, blurY = 6, strength = 2, quality = 1, inner = false, knockout = false) {
    super();
    this.type = "glow";
    this._color = color;
    this._red = color >> 16;
    this._green = (color & 65280) >> 8;
    this._blue = color & 255;
    this._alpha = alpha;
    this._blurX = blurX;
    this._blurY = blurY;
    this._strength = strength;
    this._quality = quality;
    this._inner = inner;
    this._knockout = knockout;
    this.uniforms = {
      color: { x: this._red / 255, y: this._green / 255, z: this._blue / 255, w: 1 },
      alpha,
      blurX,
      blurY,
      strength,
      inner: inner ? 1 : 0,
      knockout: knockout ? 0 : 1,
      dist: 0,
      angle: 0,
      hideObject: 0
    };
    this.onPropertyChange();
  }
  // ── Getters / Setters ─────────────────────────────────────────────────────
  get color() {
    return this._color;
  }
  set color(value) {
    if (this._color === value)
      return;
    this._color = value;
    this._red = value >> 16;
    this._green = (value & 65280) >> 8;
    this._blue = value & 255;
    const c = this.uniforms.color;
    c.x = this._red / 255;
    c.y = this._green / 255;
    c.z = this._blue / 255;
  }
  get alpha() {
    return this._alpha;
  }
  set alpha(value) {
    if (this._alpha === value)
      return;
    this._alpha = value;
    this.uniforms.alpha = value;
  }
  get blurX() {
    return this._blurX;
  }
  set blurX(value) {
    if (this._blurX === value)
      return;
    this._blurX = value;
    this.uniforms.blurX = value;
    this.onPropertyChange();
  }
  get blurY() {
    return this._blurY;
  }
  set blurY(value) {
    if (this._blurY === value)
      return;
    this._blurY = value;
    this.uniforms.blurY = value;
    this.onPropertyChange();
  }
  get strength() {
    return this._strength;
  }
  set strength(value) {
    if (this._strength === value)
      return;
    this._strength = value;
    this.uniforms.strength = value;
  }
  get quality() {
    return this._quality;
  }
  set quality(value) {
    this._quality = value;
  }
  get inner() {
    return this._inner;
  }
  set inner(value) {
    if (this._inner === value)
      return;
    this._inner = value;
    this.uniforms.inner = value ? 1 : 0;
  }
  get knockout() {
    return this._knockout;
  }
  set knockout(value) {
    if (this._knockout === value)
      return;
    this._knockout = value;
    this.uniforms.knockout = value ? 0 : 1;
  }
  // ── Internal methods ──────────────────────────────────────────────────────
  updatePadding() {
    this.paddingLeft = this.paddingRight = this._blurX;
    this.paddingTop = this.paddingBottom = this._blurY;
  }
  toJson() {
    return `{"color":${this._color},"red":${this._red},"green":${this._green},"blue":${this._blue},"alpha":${this._alpha},"blurX":${this._blurX},"blurY":${this._blurY},"strength":${this._strength},"quality":${this._quality},"inner":${this._inner},"knockout":${this._knockout}}`;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/filters/DropShadowFilter.js
var DropShadowFilter = class extends GlowFilter {
  // ── Instance fields ───────────────────────────────────────────────────────
  _distance;
  _angle;
  _hideObject;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(distance = 4, angle = 45, color = 0, alpha = 1, blurX = 4, blurY = 4, strength = 1, quality = 1, inner = false, knockout = false, hideObject = false) {
    super(color, alpha, blurX, blurY, strength, quality, inner, knockout);
    this._distance = distance;
    this._angle = angle;
    this._hideObject = hideObject;
    this.uniforms.dist = distance;
    this.uniforms.angle = angle / 180 * Math.PI;
    this.uniforms.hideObject = hideObject ? 1 : 0;
    this.onPropertyChange();
  }
  // ── Getters / Setters ─────────────────────────────────────────────────────
  get distance() {
    return this._distance;
  }
  set distance(value) {
    if (this._distance === value)
      return;
    this._distance = value;
    this.uniforms.dist = value;
    this.onPropertyChange();
  }
  get angle() {
    return this._angle;
  }
  set angle(value) {
    if (this._angle === value)
      return;
    this._angle = value;
    this.uniforms.angle = value / 180 * Math.PI;
    this.onPropertyChange();
  }
  get hideObject() {
    return this._hideObject;
  }
  set hideObject(value) {
    if (this._hideObject === value)
      return;
    this._hideObject = value;
    this.uniforms.hideObject = value ? 1 : 0;
  }
  // ── Internal methods ──────────────────────────────────────────────────────
  updatePadding() {
    this.paddingLeft = this.paddingRight = this.blurX;
    this.paddingTop = this.paddingBottom = this.blurY;
    if (this._distance !== 0) {
      const dx = this._distance * NumberUtils.cos(this._angle);
      const dy = this._distance * NumberUtils.sin(this._angle);
      if (dx > 0) {
        this.paddingRight += Math.ceil(dx);
      } else {
        this.paddingLeft += Math.ceil(-dx);
      }
      if (dy > 0) {
        this.paddingBottom += Math.ceil(dy);
      } else {
        this.paddingTop += Math.ceil(-dy);
      }
    }
  }
  toJson() {
    return `{"distance":${this._distance},"angle":${this._angle},"color":${this.color},"alpha":${this.alpha},"blurX":${this.blurX},"blurY":${this.blurY},"strength":${this.strength},"quality":${this.quality},"inner":${this.inner},"knockout":${this.knockout},"hideObject":${this._hideObject}}`;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/filters/CustomFilter.js
var sourceKeyMap = /* @__PURE__ */ new Map();
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : r & 3 | 8).toString(16);
  });
}
var CustomFilter = class extends Filter {
  // ── Instance fields ───────────────────────────────────────────────────────
  vertexSrc;
  fragmentSrc;
  shaderKey;
  _padding = 0;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(vertexSrc, fragmentSrc, uniforms = {}) {
    super();
    this.type = "custom";
    this.vertexSrc = vertexSrc;
    this.fragmentSrc = fragmentSrc;
    const tempKey = vertexSrc + fragmentSrc;
    if (!sourceKeyMap.has(tempKey))
      sourceKeyMap.set(tempKey, generateUUID());
    this.shaderKey = sourceKeyMap.get(tempKey);
    this.uniforms = uniforms;
    this.onPropertyChange();
  }
  // ── Getters / Setters ─────────────────────────────────────────────────────
  get padding() {
    return this._padding;
  }
  set padding(value) {
    if (this._padding === value)
      return;
    this._padding = value;
    this.onPropertyChange();
  }
  // ── Internal methods ──────────────────────────────────────────────────────
  updatePadding() {
    this.paddingTop = this.paddingBottom = this.paddingLeft = this.paddingRight = this._padding;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/media/SoundChannel.js
var SoundChannel = class extends EventDispatcher {
  // ── Instance fields ───────────────────────────────────────────────────────
  _loops;
  _loopCount = 0;
  _volume = 1;
  // Web Audio API
  _context;
  _gainNode;
  _bufferSource;
  _audioBuffer;
  _webAudioStartTime = 0;
  _startOffset = 0;
  // HTMLAudioElement fallback
  _audio;
  _stopped = false;
  // ── Constructor (Web Audio) ───────────────────────────────────────────────
  /** @internal Use Sound.play() to create instances. */
  constructor(context, audioBuffer, audio, startTime, loops) {
    super();
    this._loops = loops;
    if (context && audioBuffer) {
      this._context = context;
      this._audioBuffer = audioBuffer;
      this._startOffset = startTime;
      this._gainNode = context.createGain();
      this._gainNode.connect(context.destination);
      this.playWebAudio();
    } else if (audio) {
      this._audio = audio;
      this._audio.currentTime = startTime;
      this._audio.addEventListener("ended", this.onHtmlAudioEnded);
      this._audio.play();
    }
  }
  // ── Getters / Setters ─────────────────────────────────────────────────────
  get volume() {
    return this._volume;
  }
  set volume(value) {
    this._volume = Math.max(0, Math.min(1, value));
    if (this._gainNode)
      this._gainNode.gain.value = this._volume;
    if (this._audio)
      this._audio.volume = this._volume;
  }
  get position() {
    if (this._context && this._bufferSource) {
      return this._context.currentTime - this._webAudioStartTime + this._startOffset;
    }
    return this._audio?.currentTime ?? 0;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  stop() {
    if (this._stopped)
      return;
    this._stopped = true;
    if (this._bufferSource) {
      this._bufferSource.onended = null;
      this._bufferSource.stop();
      this._bufferSource.disconnect();
      this._bufferSource = void 0;
    }
    if (this._audio) {
      this._audio.removeEventListener("ended", this.onHtmlAudioEnded);
      this._audio.pause();
      this._audio.currentTime = 0;
    }
  }
  // ── Private methods ───────────────────────────────────────────────────────
  playWebAudio() {
    if (!this._context || !this._audioBuffer || !this._gainNode)
      return;
    const source = this._context.createBufferSource();
    this._bufferSource = source;
    source.buffer = this._audioBuffer;
    source.connect(this._gainNode);
    this._gainNode.gain.value = this._volume;
    source.onended = this.onWebAudioEnded;
    this._webAudioStartTime = this._context.currentTime;
    source.start(0, this._startOffset);
  }
  onWebAudioEnded = () => {
    if (this._stopped)
      return;
    this._loopCount++;
    if (this._loops <= 0 || this._loopCount < this._loops) {
      this._startOffset = 0;
      this.playWebAudio();
    } else {
      this._stopped = true;
      this.dispatchEventWith(Event.SOUND_COMPLETE);
    }
  };
  onHtmlAudioEnded = () => {
    if (this._stopped)
      return;
    this._loopCount++;
    if (this._loops <= 0 || this._loopCount < this._loops) {
      this._audio.currentTime = 0;
      this._audio.play();
    } else {
      this._audio.removeEventListener("ended", this.onHtmlAudioEnded);
      this._stopped = true;
      this.dispatchEventWith(Event.SOUND_COMPLETE);
    }
  };
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/media/Sound.js
var SoundType = {
  MUSIC: "music",
  EFFECT: "effect"
};
var sharedContext;
function getAudioContext() {
  if (sharedContext)
    return sharedContext;
  try {
    sharedContext = new AudioContext();
    return sharedContext;
  } catch {
    return void 0;
  }
}
var decodeQueue = [];
var isDecoding = false;
function enqueueDecodeTask(task) {
  decodeQueue.push(task);
  processDecodeQueue();
}
function processDecodeQueue() {
  if (isDecoding || decodeQueue.length === 0)
    return;
  const ctx = getAudioContext();
  if (!ctx) {
    while (decodeQueue.length)
      decodeQueue.shift().onError();
    return;
  }
  isDecoding = true;
  const task = decodeQueue.shift();
  ctx.decodeAudioData(task.buffer, (buf) => {
    task.onSuccess(buf);
    isDecoding = false;
    processDecodeQueue();
  }, () => {
    task.onError();
    isDecoding = false;
    processDecodeQueue();
  });
}
var Sound = class extends EventDispatcher {
  // ── Instance fields ───────────────────────────────────────────────────────
  type = SoundType.EFFECT;
  _audioBuffer;
  _audio;
  _url = "";
  _loaded = false;
  // Bumped on every load()/close() call. Async callbacks (xhr.onload, decodeAudioData,
  // canplaythrough) capture the generation at start time and no-op if it's stale by the
  // time they fire, so a cancelled load can't resurrect state after close().
  _generation = 0;
  // ── Getters ───────────────────────────────────────────────────────────────
  get length() {
    if (this._audioBuffer)
      return this._audioBuffer.duration;
    if (this._audio)
      return this._audio.duration || 0;
    return 0;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  load(url) {
    this._url = url;
    this._loaded = false;
    const generation = ++this._generation;
    const ctx = getAudioContext();
    if (ctx) {
      this.loadWebAudio(ctx, url, generation);
    } else {
      this.loadHtmlAudio(url, generation);
    }
  }
  play(startTime = 0, loops = 0) {
    if (!this._loaded) {
      IOErrorEvent.dispatchIOErrorEvent(this);
      return new SoundChannel(void 0, void 0, void 0, 0, 0);
    }
    const ctx = getAudioContext();
    if (this._audioBuffer && ctx) {
      return new SoundChannel(ctx, this._audioBuffer, void 0, startTime, loops);
    }
    const audio = this._audio?.cloneNode(true);
    return new SoundChannel(void 0, void 0, audio, startTime, loops);
  }
  close() {
    this._generation++;
    this._audioBuffer = void 0;
    if (this._audio) {
      this._audio.src = "";
      this._audio = void 0;
    }
    this._loaded = false;
  }
  // ── Private methods ───────────────────────────────────────────────────────
  loadWebAudio(ctx, url, generation) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = () => {
      if (generation !== this._generation)
        return;
      if (xhr.status >= 400) {
        IOErrorEvent.dispatchIOErrorEvent(this);
        return;
      }
      enqueueDecodeTask({
        buffer: xhr.response,
        onSuccess: (buffer) => {
          if (generation !== this._generation)
            return;
          this._audioBuffer = buffer;
          this._loaded = true;
          this.dispatchEventWith(Event.COMPLETE);
        },
        onError: () => {
          if (generation !== this._generation)
            return;
          this.loadHtmlAudio(url, generation);
        }
      });
    };
    xhr.onerror = () => {
      if (generation !== this._generation)
        return;
      IOErrorEvent.dispatchIOErrorEvent(this);
    };
    xhr.send();
  }
  loadHtmlAudio(url, generation) {
    const audio = new Audio();
    this._audio = audio;
    audio.addEventListener("canplaythrough", () => {
      if (generation !== this._generation)
        return;
      this._loaded = true;
      this.dispatchEventWith(Event.COMPLETE);
    }, { once: true });
    audio.addEventListener("error", () => {
      if (generation !== this._generation)
        return;
      IOErrorEvent.dispatchIOErrorEvent(this);
    }, { once: true });
    audio.src = url;
    audio.load();
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/media/Video.js
var Video = class extends DisplayObject {
  // ── Instance fields ───────────────────────────────────────────────────────
  fullscreen = true;
  _video;
  _src = "";
  _poster = "";
  _posterData;
  _loop = false;
  _loaded = false;
  _bitmapData;
  _widthSet = NaN;
  _heightSet = NaN;
  _waiting = false;
  _userPause = false;
  _userPlay = false;
  _isPlayed = false;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(url) {
    super();
    this._video = document.createElement("video");
    this._video.setAttribute("playsinline", "");
    this._video.setAttribute("webkit-playsinline", "true");
    this._video.controls = false;
    this._video.addEventListener("canplaythrough", this.onVideoLoaded);
    this._video.addEventListener("ended", this.onVideoEnded);
    this._video.addEventListener("error", this.onVideoError);
    this._video.addEventListener("waiting", () => {
      this._waiting = true;
    });
    this._video.addEventListener("canplay", () => {
      this._waiting = false;
      if (this._userPause)
        this.pause();
      else if (this._userPlay)
        this.videoPlay();
    });
    if (url)
      this.load(url);
  }
  // ── Getters / Setters ─────────────────────────────────────────────────────
  get src() {
    return this._src;
  }
  set src(value) {
    this._src = value;
    this._video.src = value;
  }
  get poster() {
    return this._poster;
  }
  set poster(value) {
    if (this._poster === value)
      return;
    this._poster = value;
    if (value)
      this.loadPoster(value);
  }
  get volume() {
    return this._video.volume;
  }
  set volume(value) {
    this._video.volume = Math.max(0, Math.min(1, value));
  }
  get position() {
    return this._video.currentTime;
  }
  set position(value) {
    this._video.currentTime = value;
  }
  get paused() {
    return this._video.paused;
  }
  get length() {
    return this._video.duration || 0;
  }
  get bitmapData() {
    if (!this._video || !this._loaded)
      return this._posterData;
    if (!this._bitmapData) {
      this._video.width = this._video.videoWidth;
      this._video.height = this._video.videoHeight;
      this._bitmapData = new BitmapData(this._video);
      this._bitmapData.deleteSource = false;
    }
    BitmapData.invalidate(this._bitmapData);
    return this._bitmapData;
  }
  get width() {
    return isNaN(this._widthSet) ? this.getPlayWidth() : this._widthSet;
  }
  set width(value) {
    this._widthSet = value;
    this.$renderDirty = true;
  }
  get height() {
    return isNaN(this._heightSet) ? this.getPlayHeight() : this._heightSet;
  }
  set height(value) {
    this._heightSet = value;
    this.$renderDirty = true;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  load(url) {
    this._src = url;
    this._loaded = false;
    const video = this._video;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      video.crossOrigin = "anonymous";
    }
    video.src = url;
    video.load();
  }
  play(startTime, loop = false) {
    if (!this._loaded) {
      this.load(this._src);
      this.once(Event.COMPLETE, () => this.play(startTime, loop));
      return;
    }
    this._isPlayed = true;
    this._loop = loop;
    this._video.loop = loop;
    if (startTime !== void 0)
      this._video.currentTime = startTime;
    if (this.fullscreen) {
      this.enterFullscreen();
    } else {
      this.videoPlay();
    }
  }
  pause() {
    this._userPlay = false;
    if (this._waiting) {
      this._userPause = true;
      return;
    }
    this._userPause = false;
    this._video.pause();
  }
  close() {
    this._video.removeEventListener("canplaythrough", this.onVideoLoaded);
    this._video.removeEventListener("ended", this.onVideoEnded);
    this._video.removeEventListener("error", this.onVideoError);
    this._video.pause();
    this._video.src = "";
    this._loaded = false;
    this._bitmapData = void 0;
    this._isPlayed = false;
  }
  // ── Internal methods ──────────────────────────────────────────────────────
  $measureContentBounds(bounds) {
    const w = this.getPlayWidth();
    const h = this.getPlayHeight();
    if (w > 0 && h > 0)
      bounds.setTo(0, 0, w, h);
    else
      bounds.setEmpty();
  }
  // ── Private methods ───────────────────────────────────────────────────────
  videoPlay() {
    this._userPause = false;
    if (this._waiting) {
      this._userPlay = true;
      return;
    }
    this._userPlay = false;
    this._video.play();
  }
  enterFullscreen() {
    const video = this._video;
    if (!video.parentElement)
      document.body.appendChild(video);
    void video.requestFullscreen();
    this.videoPlay();
  }
  exitFullscreen() {
    if (document.fullscreenElement)
      void document.exitFullscreen();
    if (this._video.parentElement) {
      this._video.parentElement.removeChild(this._video);
    }
  }
  loadPoster(url) {
    const loader = new ImageLoader();
    loader.once(Event.COMPLETE, () => {
      if (loader.data) {
        this._posterData = loader.data;
        this._posterData.width = this.getPlayWidth() || loader.data.width;
        this._posterData.height = this.getPlayHeight() || loader.data.height;
        this.$renderDirty = true;
        this.$markDirty();
      }
    });
    loader.load(url);
  }
  getPlayWidth() {
    if (!isNaN(this._widthSet))
      return this._widthSet;
    if (this._bitmapData)
      return this._bitmapData.width;
    if (this._posterData)
      return this._posterData.width;
    if (this._video.videoWidth)
      return this._video.videoWidth;
    return 0;
  }
  getPlayHeight() {
    if (!isNaN(this._heightSet))
      return this._heightSet;
    if (this._bitmapData)
      return this._bitmapData.height;
    if (this._posterData)
      return this._posterData.height;
    if (this._video.videoHeight)
      return this._video.videoHeight;
    return 0;
  }
  onVideoLoaded = () => {
    this._loaded = true;
    this._video.width = this._video.videoWidth;
    this._video.height = this._video.videoHeight;
    this.dispatchEventWith(Event.COMPLETE);
  };
  onVideoEnded = () => {
    this.pause();
    this._isPlayed = false;
    if (this.fullscreen)
      this.exitFullscreen();
    this.dispatchEventWith(Event.ENDED);
  };
  onVideoError = () => {
    IOErrorEvent.dispatchIOErrorEvent(this);
  };
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/text/enums/HorizontalAlign.js
var HorizontalAlign = {
  LEFT: "left",
  RIGHT: "right",
  CENTER: "center",
  JUSTIFY: "justify",
  CONTENT_JUSTIFY: "contentJustify"
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/text/enums/VerticalAlign.js
var VerticalAlign = {
  TOP: "top",
  BOTTOM: "bottom",
  MIDDLE: "middle",
  JUSTIFY: "justify",
  CONTENT_JUSTIFY: "contentJustify"
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/text/enums/TextFieldType.js
var TextFieldType = {
  DYNAMIC: "dynamic",
  INPUT: "input"
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/text/TextMeasurer.js
var sharedCanvas;
var sharedContext2;
function getContext() {
  if (!sharedContext2) {
    sharedCanvas = document.createElement("canvas");
    sharedCanvas.width = 1;
    sharedCanvas.height = 1;
    sharedContext2 = sharedCanvas.getContext("2d");
  }
  return sharedContext2;
}
function buildFontString(fontSize, fontFamily, bold, italic) {
  let font = "";
  if (italic)
    font += "italic ";
  if (bold)
    font += "bold ";
  font += fontSize + "px ";
  font += fontFamily;
  return font;
}
function measureText(text, fontFamily, fontSize, bold, italic) {
  const ctx = getContext();
  ctx.font = buildFontString(fontSize, fontFamily, bold, italic);
  return ctx.measureText(text).width;
}
function getFontString(fontSize, fontFamily, bold, italic) {
  return buildFontString(fontSize, fontFamily, bold, italic);
}

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/canvas/CanvasRenderer.js
var CAPS_MAP = { none: "butt", square: "square", round: "round" };
function colorToString(color) {
  const r = color >> 16 & 255;
  const g = color >> 8 & 255;
  const b = color & 255;
  return `rgb(${r},${g},${b})`;
}
var CanvasRenderer = class {
  // ── Instance fields ───────────────────────────────────────────────────────
  _hasFill = false;
  _hasStroke = false;
  // ── Public methods ────────────────────────────────────────────────────────
  /**
   * Renders a display object tree into the given buffer.
   */
  render(displayObject, buffer, matrix) {
    const ctx = buffer.context;
    if (matrix) {
      ctx.save();
      ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);
    }
    const drawCalls = this.drawDisplayObject(displayObject, ctx, 0, 0, true);
    if (matrix)
      ctx.restore();
    return drawCalls;
  }
  /** @internal Used by WebGLRenderer for offscreen DisplayList rendering. */
  renderToContext(displayObject, ctx, offsetX, offsetY) {
    this.drawDisplayObject(displayObject, ctx, offsetX, offsetY, true);
  }
  /** @internal Used by WebGLRenderer to rasterize a Graphics object into a Canvas 2D context. */
  renderGraphicsToContext(graphics, ctx, offsetX, offsetY, forHitTest = false, skipCache = false) {
    this.renderGraphics(graphics, ctx, offsetX, offsetY, forHitTest, skipCache);
  }
  /** @internal Used by WebGL TextPipe to rasterize a TextField into a Canvas 2D context. */
  renderTextFieldToContext(tf, ctx, offsetX, offsetY) {
    this.renderTextField(tf, ctx, offsetX, offsetY);
  }
  /** @internal Used by Bitmap pixel hit test. */
  renderBitmapToContext(bitmap, ctx, offsetX, offsetY) {
    this.renderBitmap(bitmap, ctx, offsetX, offsetY);
  }
  // ── Private: tree traversal ───────────────────────────────────────────────
  drawDisplayObject(displayObject, ctx, offsetX, offsetY, _isStage = false) {
    let drawCalls = 0;
    const $displayList = displayObject.$displayList;
    if ($displayList && !_isStage) {
      if (displayObject.$cacheDirty || displayObject.$renderDirty) {
        if ($displayList.updateSurfaceSize()) {
          $displayList.renderBuffer.clear();
          this.drawDisplayObject(displayObject, $displayList.renderBuffer.context, $displayList.offsetX, $displayList.offsetY, true);
          $displayList.updateBitmapData();
        }
        displayObject.$cacheDirty = false;
        displayObject.$renderDirty = false;
      }
      if ($displayList.bitmapData?.source) {
        ctx.drawImage($displayList.bitmapData.source, offsetX - $displayList.offsetX, offsetY - $displayList.offsetY);
        drawCalls++;
      }
      return drawCalls;
    }
    drawCalls += this.renderSelf(displayObject, ctx, offsetX, offsetY);
    const $children = displayObject.$children;
    if (!$children)
      return drawCalls;
    for (let i = 0; i < $children.length; i++) {
      const child = $children[i];
      if (child.$renderMode === 1)
        continue;
      let childOffsetX;
      let childOffsetY;
      if (child.$useTranslate) {
        const m = child.$getMatrix();
        childOffsetX = offsetX + child.$x;
        childOffsetY = offsetY + child.$y;
        ctx.save();
        ctx.transform(m.a, m.b, m.c, m.d, childOffsetX, childOffsetY);
        childOffsetX = -child.$anchorOffsetX;
        childOffsetY = -child.$anchorOffsetY;
      } else {
        childOffsetX = offsetX + child.$x - child.$anchorOffsetX;
        childOffsetY = offsetY + child.$y - child.$anchorOffsetY;
      }
      let prevAlpha;
      if (child.$alpha !== 1) {
        prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha *= child.$alpha;
      }
      if (child.$renderMode === 2) {
        drawCalls += this.drawWithFilter(child, ctx, childOffsetX, childOffsetY);
      } else if (child.$renderMode === 4) {
        drawCalls += this.drawWithScrollRect(child, ctx, childOffsetX, childOffsetY);
      } else if (child.$renderMode === 3) {
        drawCalls += this.drawWithClip(child, ctx, childOffsetX, childOffsetY);
      } else {
        drawCalls += this.drawDisplayObject(child, ctx, childOffsetX, childOffsetY);
      }
      if (child.$useTranslate) {
        ctx.restore();
      } else if (prevAlpha !== void 0) {
        ctx.globalAlpha = prevAlpha;
      }
    }
    return drawCalls;
  }
  drawWithScrollRect(displayObject, ctx, offsetX, offsetY) {
    const rect = displayObject.$scrollRect ?? displayObject.$maskRect;
    if (!rect || rect.isEmpty())
      return 0;
    if (displayObject.$scrollRect) {
      offsetX -= rect.x;
      offsetY -= rect.y;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x + offsetX, rect.y + offsetY, rect.width, rect.height);
    ctx.clip();
    const drawCalls = this.drawDisplayObject(displayObject, ctx, offsetX, offsetY);
    ctx.restore();
    return drawCalls;
  }
  drawWithFilter(displayObject, ctx, offsetX, offsetY) {
    const filters = displayObject.$filters;
    if (!filters.length)
      return this.drawDisplayObject(displayObject, ctx, offsetX, offsetY);
    const bounds = displayObject.$getOriginalBounds();
    if (bounds.width <= 0 || bounds.height <= 0)
      return 0;
    const cssFilters = [];
    let hasCpuFilter = false;
    for (const filter of filters) {
      if (filter instanceof BlurFilter) {
        const radius = (filter.blurX + filter.blurY) / 2;
        if (radius > 0)
          cssFilters.push(`blur(${radius}px)`);
      } else if (filter instanceof DropShadowFilter) {
        const angleRad = filter.angle / 180 * Math.PI;
        const dx = Math.round(filter.distance * Math.cos(angleRad));
        const dy = Math.round(filter.distance * Math.sin(angleRad));
        const blur = (filter.blurX + filter.blurY) / 2;
        const r = filter.color >> 16 & 255;
        const g = filter.color >> 8 & 255;
        const b = filter.color & 255;
        const a = Math.round(filter.alpha * 255);
        cssFilters.push(`drop-shadow(${dx}px ${dy}px ${blur}px rgba(${r},${g},${b},${a / 255}))`);
      } else if (filter instanceof GlowFilter) {
        const blur = (filter.blurX + filter.blurY) / 2;
        const r = filter.color >> 16 & 255;
        const g = filter.color >> 8 & 255;
        const b = filter.color & 255;
        const a = Math.round(filter.alpha * filter.strength * 255);
        cssFilters.push(`drop-shadow(0px 0px ${blur}px rgba(${r},${g},${b},${a / 255}))`);
      } else if (filter instanceof ColorMatrixFilter) {
        hasCpuFilter = true;
      }
    }
    const hasBlendMode = displayObject.$blendMode !== 0;
    if (!hasCpuFilter && cssFilters.length > 0) {
      ctx.save();
      ctx.filter = cssFilters.join(" ");
      if (hasBlendMode)
        ctx.globalCompositeOperation = displayObject.blendMode;
      let drawCalls2 = 0;
      if (displayObject.$mask) {
        drawCalls2 += this.drawWithClip(displayObject, ctx, offsetX, offsetY);
      } else if (displayObject.$scrollRect || displayObject.$maskRect) {
        drawCalls2 += this.drawWithScrollRect(displayObject, ctx, offsetX, offsetY);
      } else {
        drawCalls2 += this.drawDisplayObject(displayObject, ctx, offsetX, offsetY);
      }
      ctx.restore();
      return drawCalls2;
    }
    const bufferW = Math.ceil(bounds.width);
    const bufferH = Math.ceil(bounds.height);
    const offscreen = new RenderBuffer(bufferW, bufferH);
    const offCtx = offscreen.context;
    if (cssFilters.length > 0)
      offCtx.filter = cssFilters.join(" ");
    let drawCalls = 0;
    if (displayObject.$mask) {
      drawCalls += this.drawWithClip(displayObject, offCtx, -bounds.x, -bounds.y);
    } else if (displayObject.$scrollRect || displayObject.$maskRect) {
      drawCalls += this.drawWithScrollRect(displayObject, offCtx, -bounds.x, -bounds.y);
    } else {
      drawCalls += this.drawDisplayObject(displayObject, offCtx, -bounds.x, -bounds.y);
    }
    if (drawCalls === 0) {
      offscreen.destroy();
      return 0;
    }
    offCtx.filter = "none";
    const imageData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height);
    const data = imageData.data;
    for (const filter of filters) {
      if (filter instanceof ColorMatrixFilter) {
        applyColorMatrix(data, filter.matrix);
      }
    }
    offCtx.putImageData(imageData, 0, 0);
    if (hasBlendMode)
      ctx.globalCompositeOperation = displayObject.blendMode;
    ctx.drawImage(offscreen.surface, offsetX + bounds.x, offsetY + bounds.y);
    if (hasBlendMode)
      ctx.globalCompositeOperation = "source-over";
    offscreen.destroy();
    return drawCalls + 1;
  }
  drawWithClip(displayObject, ctx, offsetX, offsetY) {
    const scrollRect = displayObject.$scrollRect ?? displayObject.$maskRect;
    const mask = displayObject.$mask;
    const hasBlendMode = displayObject.$blendMode !== 0;
    if (hasBlendMode) {
      ctx.globalCompositeOperation = displayObject.blendMode;
    }
    if (scrollRect) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(scrollRect.x + offsetX, scrollRect.y + offsetY, scrollRect.width, scrollRect.height);
      ctx.clip();
    }
    if (mask) {
      const bounds = displayObject.$getOriginalBounds();
      if (bounds.width <= 0 || bounds.height <= 0) {
        if (scrollRect)
          ctx.restore();
        if (hasBlendMode)
          ctx.globalCompositeOperation = "source-over";
        return 0;
      }
      const bw = Math.ceil(bounds.width);
      const bh = Math.ceil(bounds.height);
      const bx = bounds.x;
      const by = bounds.y;
      const contentBuffer = new RenderBuffer(bw, bh);
      const contentCtx = contentBuffer.context;
      const drawCalls2 = this.drawDisplayObject(displayObject, contentCtx, -bx, -by);
      contentCtx.globalCompositeOperation = "destination-in";
      const maskMatrix = mask.$getConcatenatedMatrix();
      const parentMatrix = displayObject.$getConcatenatedMatrix();
      contentCtx.save();
      const invA = parentMatrix.a, invB = parentMatrix.b, invC = parentMatrix.c, invD = parentMatrix.d;
      const invTx = parentMatrix.tx, invTy = parentMatrix.ty;
      const det = invA * invD - invB * invC;
      if (Math.abs(det) > 1e-6) {
        const ia = invD / det, ib = -invB / det, ic = -invC / det, id = invA / det;
        const itx = (invC * invTy - invD * invTx) / det;
        const ity = (invB * invTx - invA * invTy) / det;
        const ra = ia * maskMatrix.a + ic * maskMatrix.b;
        const rb = ib * maskMatrix.a + id * maskMatrix.b;
        const rc = ia * maskMatrix.c + ic * maskMatrix.d;
        const rd = ib * maskMatrix.c + id * maskMatrix.d;
        const rtx = ia * maskMatrix.tx + ic * maskMatrix.ty + itx - bx;
        const rty = ib * maskMatrix.tx + id * maskMatrix.ty + ity - by;
        contentCtx.setTransform(ra, rb, rc, rd, rtx, rty);
      } else {
        contentCtx.translate(-bx, -by);
      }
      this.drawDisplayObject(mask, contentCtx, 0, 0);
      contentCtx.restore();
      contentCtx.globalCompositeOperation = "source-over";
      ctx.drawImage(contentBuffer.surface, offsetX + bx, offsetY + by);
      contentBuffer.destroy();
      if (scrollRect)
        ctx.restore();
      if (hasBlendMode)
        ctx.globalCompositeOperation = "source-over";
      return drawCalls2 + 1;
    }
    const drawCalls = this.drawDisplayObject(displayObject, ctx, offsetX, offsetY);
    if (scrollRect)
      ctx.restore();
    if (hasBlendMode)
      ctx.globalCompositeOperation = "source-over";
    return drawCalls;
  }
  // ── Private: render individual node types ─────────────────────────────────
  renderSelf(displayObject, ctx, offsetX, offsetY) {
    switch (displayObject.$renderObjectType) {
      case 2:
        return this.renderMesh(displayObject, ctx, offsetX, offsetY);
      case 1:
        return this.renderBitmap(displayObject, ctx, offsetX, offsetY);
      case 3:
        return this.renderGraphics(displayObject.graphics, ctx, offsetX, offsetY);
      case 4:
        return this.renderGraphics(displayObject.graphics, ctx, offsetX, offsetY);
      case 5:
        return this.renderTextField(displayObject, ctx, offsetX, offsetY);
      case 6:
        return this.renderParticleSystem(displayObject, ctx, offsetX, offsetY);
      default:
        return 0;
    }
  }
  renderMesh(mesh, ctx, offsetX, offsetY) {
    const bd = mesh.bitmapData;
    if (!bd?.source || mesh.vertices.length === 0)
      return 0;
    const destW = !isNaN(mesh.width) ? mesh.width : mesh.textureWidth;
    const destH = !isNaN(mesh.height) ? mesh.height : mesh.textureHeight;
    ctx.drawImage(bd.source, mesh.bitmapX, mesh.bitmapY, mesh.bitmapWidth, mesh.bitmapHeight, offsetX + mesh.bitmapOffsetX, offsetY + mesh.bitmapOffsetY, destW, destH);
    return 1;
  }
  renderBitmap(bitmap, ctx, offsetX, offsetY) {
    const bd = bitmap.bitmapData;
    if (!bd?.source)
      return 0;
    const destW = !isNaN(bitmap.width) ? bitmap.width : bitmap.textureWidth;
    const destH = !isNaN(bitmap.height) ? bitmap.height : bitmap.textureHeight;
    if (destW <= 0 || destH <= 0)
      return 0;
    ctx.imageSmoothingEnabled = bitmap.smoothing;
    ctx.drawImage(bd.source, bitmap.bitmapX, bitmap.bitmapY, bitmap.bitmapWidth, bitmap.bitmapHeight, offsetX + bitmap.bitmapOffsetX, offsetY + bitmap.bitmapOffsetY, destW, destH);
    return 1;
  }
  renderGraphics(graphics, ctx, offsetX, offsetY, forHitTest = false, skipCache = false) {
    if (graphics.commands.length === 0)
      return 0;
    if (!forHitTest && !skipCache) {
      if (graphics.canvasCacheDirty || !graphics.offscreenCanvas) {
        const bounds = new Rectangle();
        graphics.$measureContentBounds(bounds);
        const cw = Math.ceil(bounds.width) || 1;
        const ch = Math.ceil(bounds.height) || 1;
        if (!graphics.offscreenCanvas) {
          graphics.offscreenCanvas = document.createElement("canvas");
          graphics.offscreenCtx = graphics.offscreenCanvas.getContext("2d", { willReadFrequently: true });
        }
        const oc = graphics.offscreenCanvas;
        if (oc.width !== cw || oc.height !== ch) {
          oc.width = cw;
          oc.height = ch;
        } else {
          graphics.offscreenCtx.clearRect(0, 0, cw, ch);
        }
        const oc2d = graphics.offscreenCtx;
        oc2d.save();
        oc2d.translate(-bounds.x, -bounds.y);
        this._hasFill = false;
        this._hasStroke = false;
        for (const cmd of graphics.commands) {
          this.executeGraphicsCommand(cmd, oc2d, false);
        }
        this.flushOpenPath(oc2d);
        oc2d.restore();
        graphics.offscreenBoundsX = bounds.x;
        graphics.offscreenBoundsY = bounds.y;
        graphics.canvasCacheDirty = false;
      }
      ctx.drawImage(graphics.offscreenCanvas, offsetX + graphics.offscreenBoundsX, offsetY + graphics.offscreenBoundsY);
      return 1;
    }
    ctx.save();
    ctx.translate(offsetX, offsetY);
    this._hasFill = false;
    this._hasStroke = false;
    for (const cmd of graphics.commands) {
      this.executeGraphicsCommand(cmd, ctx, forHitTest);
    }
    this.flushOpenPath(ctx);
    ctx.restore();
    return 1;
  }
  renderTextField(tf, ctx, offsetX, offsetY) {
    tf.getLinesArr();
    const inputFocused = tf.type === TextFieldType.INPUT && tf.isTyping;
    const width = !isNaN(tf.$explicitWidth) ? tf.$explicitWidth : tf.textWidth;
    const height = !isNaN(tf.$explicitHeight) ? tf.$explicitHeight : tf.textHeight;
    if (width <= 0 || height <= 0)
      return 0;
    ctx.save();
    ctx.translate(offsetX, offsetY);
    if (tf.background) {
      ctx.fillStyle = colorToString(tf.backgroundColor);
      ctx.fillRect(0, 0, width, height);
    }
    if (tf.border) {
      ctx.strokeStyle = colorToString(tf.borderColor);
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, width, height);
    }
    if (inputFocused) {
      ctx.restore();
      return 0;
    }
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    const lines = tf.getLinesArr();
    const lineSpacing = tf.lineSpacing;
    let totalTextHeight = 0;
    for (let i = 0; i < lines.length; i++) {
      totalTextHeight += lines[i].height;
      if (i > 0)
        totalTextHeight += lineSpacing;
    }
    let verticalOffset = 0;
    if (tf.verticalAlign === VerticalAlign.MIDDLE) {
      verticalOffset = Math.max(0, (height - totalTextHeight) / 2);
    } else if (tf.verticalAlign === VerticalAlign.BOTTOM) {
      verticalOffset = Math.max(0, height - totalTextHeight);
    }
    const scrollOffset = tf.getScrollYOffset();
    let drawY = verticalOffset - scrollOffset;
    let drawCalls = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const h = line.height;
      drawY += h / 2;
      if (drawY + h / 2 < 0 || drawY - h / 2 > height) {
        drawY += h / 2 + lineSpacing;
        continue;
      }
      let lineX = 0;
      if (tf.textAlign === HorizontalAlign.RIGHT) {
        lineX = width - line.width;
      } else if (tf.textAlign === HorizontalAlign.CENTER) {
        lineX = (width - line.width) / 2;
      }
      for (const el of line.elements) {
        const style = el.style;
        const fontSize = style?.size ?? tf.size;
        const fontFamily = style?.fontFamily ?? tf.fontFamily;
        const bold = style?.bold ?? tf.bold;
        const italic = style?.italic ?? tf.italic;
        const textColor = style?.textColor ?? tf.textColor;
        const strokeColor = style?.strokeColor ?? tf.strokeColor;
        const stroke = style?.stroke ?? tf.stroke;
        const fontStr = getFontString(fontSize, fontFamily, bold, italic);
        ctx.font = fontStr;
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        const textY = drawY + (h - fontSize) / 2;
        if (stroke > 0) {
          ctx.strokeStyle = colorToString(strokeColor);
          ctx.lineWidth = stroke * 2;
          ctx.lineJoin = "round";
          ctx.strokeText(el.text, lineX, textY);
          drawCalls++;
        }
        ctx.fillStyle = colorToString(textColor);
        ctx.fillText(el.text, lineX, textY);
        drawCalls++;
        lineX += el.width;
      }
      drawY += h / 2 + lineSpacing;
    }
    if (tf.type === TextFieldType.INPUT && tf.isTyping) {
      const caretIndex = tf.caretIndex;
      const fontStr = getFontString(tf.size, tf.fontFamily, tf.bold, tf.italic);
      ctx.font = fontStr;
      ctx.textBaseline = "middle";
      let cursorX = 0;
      let charCount = 0;
      for (const line of lines) {
        for (const el of line.elements) {
          const elLen = el.text.length;
          if (charCount + elLen >= caretIndex) {
            const partial = el.text.substring(0, caretIndex - charCount);
            cursorX += ctx.measureText(partial).width;
            charCount = caretIndex;
            break;
          }
          cursorX += el.width;
          charCount += elLen;
        }
        if (charCount >= caretIndex)
          break;
        cursorX = 0;
      }
      const cursorY = verticalOffset - scrollOffset;
      ctx.fillStyle = colorToString(tf.textColor);
      ctx.fillRect(cursorX, cursorY, 1, tf.size);
      drawCalls++;
    }
    ctx.restore();
    return drawCalls > 0 ? 1 : 0;
  }
  renderParticleSystem(obj, ctx, offsetX, offsetY) {
    const ps = obj;
    if (ps.numParticles === 0)
      return 0;
    const texture = ps.texture;
    const bd = texture.bitmapData;
    if (!bd?.source)
      return 0;
    const source = bd.source;
    const bitmapX = texture.bitmapX;
    const bitmapY = texture.bitmapY;
    const bitmapWidth = texture.bitmapWidth;
    const bitmapHeight = texture.bitmapHeight;
    const texW = texture.textureWidth;
    const texH = texture.textureHeight;
    const regX = texW / 2;
    const regY = texH / 2;
    for (let i = 0; i < ps.numParticles; i++) {
      const particle = ps.particles[i];
      const matrix = particle.$getMatrix(regX, regY);
      ctx.save();
      ctx.globalAlpha *= particle.alpha;
      ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, offsetX + matrix.tx, offsetY + matrix.ty);
      ctx.drawImage(source, bitmapX, bitmapY, bitmapWidth, bitmapHeight, 0, 0, texW, texH);
      ctx.restore();
    }
    return ps.numParticles;
  }
  flushOpenPath(ctx) {
    if (this._hasFill)
      ctx.fill();
    if (this._hasStroke)
      ctx.stroke();
    this._hasFill = false;
    this._hasStroke = false;
  }
  executeGraphicsCommand(cmd, ctx, forHitTest = false) {
    switch (cmd.type) {
      case 9:
        ctx.fillStyle = forHitTest ? "#000" : `rgba(${cmd.color >> 16 & 255},${cmd.color >> 8 & 255},${cmd.color & 255},${cmd.alpha})`;
        ctx.beginPath();
        this._hasFill = true;
        break;
      case 10: {
        if (forHitTest) {
          ctx.fillStyle = "#000";
          ctx.beginPath();
          this._hasFill = true;
          break;
        }
        const GH = 819.2;
        let gradient;
        if (cmd.matrix) {
          const m = cmd.matrix;
          if (cmd.gradientType === "radial") {
            const cx = m.tx;
            const cy = m.ty;
            const rx = Math.sqrt(m.a * m.a + m.b * m.b) * GH;
            const ry = Math.sqrt(m.c * m.c + m.d * m.d) * GH;
            gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
          } else {
            const x0 = m.a * -GH + m.tx;
            const y0 = m.b * -GH + m.ty;
            const x1 = m.a * GH + m.tx;
            const y1 = m.b * GH + m.ty;
            gradient = ctx.createLinearGradient(x0, y0, x1, y1);
          }
        } else {
          if (cmd.gradientType === "radial") {
            gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, GH);
          } else {
            gradient = ctx.createLinearGradient(-GH, 0, GH, 0);
          }
        }
        for (let i = 0; i < cmd.colors.length; i++) {
          const c = cmd.colors[i];
          const a = cmd.alphas[i] ?? 1;
          const r = (cmd.ratios[i] ?? 0) / 255;
          gradient.addColorStop(r, `rgba(${c >> 16 & 255},${c >> 8 & 255},${c & 255},${a})`);
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        this._hasFill = true;
        break;
      }
      case 11:
        if (this._hasFill)
          ctx.fill();
        ctx.closePath();
        if (this._hasStroke)
          ctx.stroke();
        this._hasFill = false;
        break;
      case 12:
        ctx.lineWidth = cmd.thickness;
        ctx.strokeStyle = forHitTest ? "#000" : `rgba(${cmd.color >> 16 & 255},${cmd.color >> 8 & 255},${cmd.color & 255},${cmd.alpha})`;
        ctx.lineCap = CAPS_MAP[cmd.caps ?? "none"] ?? "butt";
        ctx.lineJoin = cmd.joints ?? "round";
        ctx.miterLimit = cmd.miterLimit;
        if (cmd.lineDash)
          ctx.setLineDash(cmd.lineDash);
        this._hasStroke = true;
        break;
      case 0:
        ctx.moveTo(cmd.x, cmd.y);
        break;
      case 1:
        ctx.lineTo(cmd.x, cmd.y);
        break;
      case 2:
        ctx.quadraticCurveTo(cmd.cx, cmd.cy, cmd.ax, cmd.ay);
        break;
      case 3:
        ctx.bezierCurveTo(cmd.cx1, cmd.cy1, cmd.cx2, cmd.cy2, cmd.ax, cmd.ay);
        break;
      case 4:
        ctx.beginPath();
        ctx.rect(cmd.x, cmd.y, cmd.w, cmd.h);
        if (this._hasFill)
          ctx.fill();
        if (this._hasStroke)
          ctx.stroke();
        break;
      case 5: {
        const { x, y, w, h, ew, eh } = cmd;
        const rx = ew / 2, ry = eh / 2;
        ctx.beginPath();
        ctx.moveTo(x + rx, y);
        ctx.lineTo(x + w - rx, y);
        ctx.ellipse(x + w - rx, y + ry, rx, ry, 0, -Math.PI / 2, 0);
        ctx.lineTo(x + w, y + h - ry);
        ctx.ellipse(x + w - rx, y + h - ry, rx, ry, 0, 0, Math.PI / 2);
        ctx.lineTo(x + rx, y + h);
        ctx.ellipse(x + rx, y + h - ry, rx, ry, 0, Math.PI / 2, Math.PI);
        ctx.lineTo(x, y + ry);
        ctx.ellipse(x + rx, y + ry, rx, ry, 0, Math.PI, Math.PI * 1.5);
        ctx.closePath();
        if (this._hasFill)
          ctx.fill();
        if (this._hasStroke)
          ctx.stroke();
        break;
      }
      case 6:
        ctx.beginPath();
        ctx.arc(cmd.x, cmd.y, cmd.r, 0, Math.PI * 2);
        if (this._hasFill)
          ctx.fill();
        if (this._hasStroke)
          ctx.stroke();
        break;
      case 7: {
        const cx = cmd.x + cmd.w / 2;
        const cy = cmd.y + cmd.h / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, cmd.w / 2, cmd.h / 2, 0, 0, Math.PI * 2);
        if (this._hasFill)
          ctx.fill();
        if (this._hasStroke)
          ctx.stroke();
        break;
      }
      case 8:
        ctx.beginPath();
        ctx.arc(cmd.x, cmd.y, cmd.r, cmd.start, cmd.end, cmd.ccw);
        if (this._hasStroke)
          ctx.stroke();
        break;
      case 13:
        this._hasFill = false;
        this._hasStroke = false;
        break;
    }
  }
};
function applyColorMatrix(data, matrix) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    data[i] = Math.max(0, Math.min(255, r * matrix[0] + g * matrix[1] + b * matrix[2] + a * matrix[3] + matrix[4]));
    data[i + 1] = Math.max(0, Math.min(255, r * matrix[5] + g * matrix[6] + b * matrix[7] + a * matrix[8] + matrix[9]));
    data[i + 2] = Math.max(0, Math.min(255, r * matrix[10] + g * matrix[11] + b * matrix[12] + a * matrix[13] + matrix[14]));
    data[i + 3] = Math.max(0, Math.min(255, r * matrix[15] + g * matrix[16] + b * matrix[17] + a * matrix[18] + matrix[19]));
  }
}
var _hitRenderer = new CanvasRenderer();
setGraphicsHitTest((graphics, localX, localY) => {
  const buf = hitTestBuffer();
  buf.clear();
  const ctx = buf.context;
  ctx.setTransform(1, 0, 0, 1, 1 - localX, 1 - localY);
  _hitRenderer.renderGraphicsToContext(graphics, ctx, 0, 0, true);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  try {
    return buf.getPixels(1, 1)[3] !== 0;
  } catch {
    return false;
  }
});
setBitmapPixelHitTest((bitmap, localX, localY) => {
  const buf = hitTestBuffer();
  buf.clear();
  const ctx = buf.context;
  ctx.setTransform(1, 0, 0, 1, 1 - localX, 1 - localY);
  _hitRenderer.renderBitmapToContext(bitmap, ctx, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  try {
    return buf.getPixels(1, 1)[3] !== 0;
  } catch {
    return false;
  }
});

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/webgl/InstructionSet.js
var InstructionSet = class {
  // ── Instance fields ───────────────────────────────────────────────────────
  instructions = [];
  instructionSize = 0;
  structureDirty = true;
  dirtyRenderables = [];
  dirtyRenderableCount = 0;
  renderableIndex = /* @__PURE__ */ new Map();
  // ── Public methods ────────────────────────────────────────────────────────
  /** Reset the instruction list (does not shrink the backing array). */
  reset() {
    this.instructionSize = 0;
    this.dirtyRenderableCount = 0;
    this.renderableIndex.clear();
  }
  /** Append an instruction. */
  add(instruction) {
    this.instructions[this.instructionSize++] = instruction;
  }
  /**
   * Append a leaf instruction and register it in the renderable index
   * so transform snapshots can be patched without a full rebuild.
   */
  addLeaf(instruction) {
    this.renderableIndex.set(instruction.renderable, this.instructionSize);
    this.instructions[this.instructionSize++] = instruction;
  }
  /** Mark a renderable as needing a data update this frame. */
  markRenderableDirty(obj) {
    this.dirtyRenderables[this.dirtyRenderableCount++] = obj;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/webgl/pipes/BitmapPipe.js
var BitmapPipe = class _BitmapPipe {
  static PIPE_ID = "bitmap";
  // Pool of reusable instruction objects to avoid per-frame allocation.
  static _pool = [];
  static _alloc(bitmap, offsetX, offsetY) {
    const inst = _BitmapPipe._pool.pop() ?? {
      renderPipeId: "bitmap",
      renderable: bitmap,
      offsetX,
      offsetY
    };
    inst.renderable = bitmap;
    inst.offsetX = offsetX;
    inst.offsetY = offsetY;
    return inst;
  }
  static release(inst) {
    _BitmapPipe._pool.push(inst);
  }
  // ── RenderPipe impl ───────────────────────────────────────────────────────
  addToInstructionSet(bitmap, set) {
    set.add(_BitmapPipe._alloc(bitmap, 0, 0));
  }
  updateRenderable(_bitmap) {
  }
  destroyRenderable(_bitmap) {
  }
  // ── Execute ───────────────────────────────────────────────────────────────
  /**
   * Issue the draw call for a BitmapInstruction.
   * Called by WebGLRenderer._executeInstructions().
   */
  execute(inst, buffer) {
    const bitmap = inst.renderable;
    const bd = bitmap.bitmapData;
    if (!bd?.source)
      return;
    const destW = !isNaN(bitmap.width) ? bitmap.width : bitmap.textureWidth;
    const destH = !isNaN(bitmap.height) ? bitmap.height : bitmap.textureHeight;
    if (destW <= 0 || destH <= 0)
      return;
    buffer.offsetX = 0;
    buffer.offsetY = 0;
    const grid = bitmap.scale9Grid;
    if (grid) {
      this._drawScale9(bitmap, bd, grid, destW, destH, buffer);
    } else {
      buffer.context.drawImage(bd, bitmap.bitmapX, bitmap.bitmapY, bitmap.bitmapWidth, bitmap.bitmapHeight, bitmap.bitmapOffsetX, bitmap.bitmapOffsetY, destW, destH, bitmap.sourceWidth, bitmap.sourceHeight, bitmap.texture?.rotated ?? false, bitmap.smoothing);
    }
    buffer.offsetX = 0;
    buffer.offsetY = 0;
  }
  _drawScale9(bitmap, bd, grid, destW, destH, buffer) {
    const bx = bitmap.bitmapX;
    const by = bitmap.bitmapY;
    const bw = bitmap.bitmapWidth;
    const bh = bitmap.bitmapHeight;
    const ox = bitmap.bitmapOffsetX;
    const oy = bitmap.bitmapOffsetY;
    const sw = bitmap.sourceWidth;
    const sh = bitmap.sourceHeight;
    const rotated = bitmap.texture?.rotated ?? false;
    const smoothing = bitmap.smoothing;
    const srcW0 = grid.x - ox;
    const srcH0 = grid.y - oy;
    const srcW1 = grid.width;
    const srcH1 = grid.height;
    const srcW2 = bw - srcW0 - srcW1;
    const srcH2 = bh - srcH0 - srcH1;
    const tgtW0 = srcW0;
    const tgtH0 = srcH0;
    const tgtW2 = srcW2;
    const tgtH2 = srcH2;
    if (tgtW0 + tgtW2 > destW || tgtH0 + tgtH2 > destH) {
      buffer.context.drawImage(bd, bx, by, bw, bh, ox, oy, destW, destH, sw, sh, rotated, smoothing);
      return;
    }
    const tgtW1 = destW - tgtW0 - tgtW2;
    const tgtH1 = destH - tgtH0 - tgtH2;
    const srcX0 = bx;
    const srcX1 = srcX0 + srcW0;
    const srcX2 = srcX1 + srcW1;
    const srcY0 = by;
    const srcY1 = srcY0 + srcH0;
    const srcY2 = srcY1 + srcH1;
    const tgtX0 = ox;
    const tgtX1 = tgtX0 + tgtW0;
    const tgtX2 = tgtX0 + destW - tgtW2;
    const tgtY0 = oy;
    const tgtY1 = tgtY0 + tgtH0;
    const tgtY2 = tgtY0 + destH - tgtH2;
    const ctx = buffer.context;
    const draw = (sx, sy, sW, sH, dx, dy, dW, dH) => {
      if (sW <= 0 || sH <= 0 || dW <= 0 || dH <= 0)
        return;
      ctx.drawImage(bd, sx, sy, sW, sH, dx, dy, dW, dH, sw, sh, rotated, smoothing);
    };
    if (srcH0 > 0) {
      draw(srcX0, srcY0, srcW0, srcH0, tgtX0, tgtY0, tgtW0, tgtH0);
      draw(srcX1, srcY0, srcW1, srcH0, tgtX1, tgtY0, tgtW1, tgtH0);
      draw(srcX2, srcY0, srcW2, srcH0, tgtX2, tgtY0, tgtW2, tgtH0);
    }
    if (srcH1 > 0) {
      draw(srcX0, srcY1, srcW0, srcH1, tgtX0, tgtY1, tgtW0, tgtH1);
      draw(srcX1, srcY1, srcW1, srcH1, tgtX1, tgtY1, tgtW1, tgtH1);
      draw(srcX2, srcY1, srcW2, srcH1, tgtX2, tgtY1, tgtW2, tgtH1);
    }
    if (srcH2 > 0) {
      draw(srcX0, srcY2, srcW0, srcH2, tgtX0, tgtY2, tgtW0, tgtH2);
      draw(srcX1, srcY2, srcW1, srcH2, tgtX1, tgtY2, tgtW1, tgtH2);
      draw(srcX2, srcY2, srcW2, srcH2, tgtX2, tgtY2, tgtW2, tgtH2);
    }
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/webgl/pipes/GraphicsPipe.js
var _scratchBounds = new Rectangle();
var _textureRegistry = new FinalizationRegistry(({ gl, texture }) => {
  gl.deleteTexture(texture);
});
var GraphicsPipe = class _GraphicsPipe {
  // ── Static fields ─────────────────────────────────────────────────────────
  static PIPE_ID = "graphics";
  static _pool = [];
  // ── Instance fields ───────────────────────────────────────────────────────
  _canvasRenderer;
  _cache = /* @__PURE__ */ new WeakMap();
  _registryTokens = /* @__PURE__ */ new WeakMap();
  _gl;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(canvasRenderer) {
    this._canvasRenderer = canvasRenderer;
  }
  static _alloc(renderable, graphics, ox, oy) {
    const inst = _GraphicsPipe._pool.pop() ?? {
      renderPipeId: "graphics",
      renderable,
      graphics,
      offsetX: ox,
      offsetY: oy
    };
    inst.renderable = renderable;
    inst.graphics = graphics;
    inst.offsetX = ox;
    inst.offsetY = oy;
    return inst;
  }
  static release(inst) {
    _GraphicsPipe._pool.push(inst);
  }
  // ── RenderPipe impl ───────────────────────────────────────────────────────
  addToInstructionSet(renderable, set) {
    const graphics = renderable.graphics;
    if (!graphics || graphics.commands.length === 0) {
      return;
    }
    set.add(_GraphicsPipe._alloc(renderable, graphics, 0, 0));
  }
  updateRenderable(_renderable) {
  }
  destroyRenderable(renderable) {
    const graphics = renderable.graphics;
    if (!graphics)
      return;
    const cache = this._cache.get(graphics);
    if (cache?.texture) {
      const token = this._registryTokens.get(graphics);
      if (token) {
        _textureRegistry.unregister(token);
        this._registryTokens.delete(graphics);
      }
      if (this._gl)
        this._gl.deleteTexture(cache.texture);
    }
    this._cache.delete(graphics);
  }
  // ── Execute ───────────────────────────────────────────────────────────────
  execute(inst, buffer) {
    const { graphics } = inst;
    if (graphics.commands.length === 0) {
      return;
    }
    if (!this._gl)
      this._gl = buffer.context.gl;
    const bounds = _scratchBounds;
    bounds.setEmpty();
    graphics.$measureContentBounds(bounds);
    const w = Math.ceil(bounds.width);
    const h = Math.ceil(bounds.height);
    if (w <= 0 || h <= 0) {
      return;
    }
    const ox = inst.offsetX;
    const oy = inst.offsetY;
    buffer.offsetX = 0;
    buffer.offsetY = 0;
    let cache = this._cache.get(graphics);
    if (!cache) {
      cache = {
        renderBuffer: new RenderBuffer(w, h),
        texture: void 0,
        textureWidth: 0,
        textureHeight: 0,
        boundsX: bounds.x,
        boundsY: bounds.y
      };
      this._cache.set(graphics, cache);
    }
    const needsRebuild = graphics.canvasCacheDirty || cache.textureWidth !== w || cache.textureHeight !== h;
    if (needsRebuild) {
      if (cache.renderBuffer.width !== w || cache.renderBuffer.height !== h) {
        cache.renderBuffer.resize(w, h);
      }
      cache.renderBuffer.clear();
      this._canvasRenderer.renderGraphicsToContext(graphics, cache.renderBuffer.context, -bounds.x, -bounds.y, false, true);
      const surface = cache.renderBuffer.surface;
      if (!cache.texture) {
        cache.texture = buffer.context.createTexture(surface);
        const token = {};
        _textureRegistry.register(graphics, { gl: buffer.context.gl, texture: cache.texture }, token);
        this._registryTokens.set(graphics, token);
      } else {
        const oldToken = this._registryTokens.get(graphics);
        if (oldToken)
          _textureRegistry.unregister(oldToken);
        buffer.context.updateTexture(cache.texture, surface);
        const token = {};
        _textureRegistry.register(graphics, { gl: buffer.context.gl, texture: cache.texture }, token);
        this._registryTokens.set(graphics, token);
      }
      cache.textureWidth = w;
      cache.textureHeight = h;
      cache.boundsX = bounds.x;
      cache.boundsY = bounds.y;
      graphics.canvasCacheDirty = false;
    }
    if (!cache.texture) {
      return;
    }
    buffer.saveTransform();
    if (cache.boundsX !== 0 || cache.boundsY !== 0) {
      buffer.globalMatrix.append(1, 0, 0, 1, cache.boundsX, cache.boundsY);
    }
    buffer.context.drawTexture(cache.texture, 0, 0, w, h, 0, 0, w, h, w, h);
    buffer.restoreTransform();
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/webgl/pipes/MeshPipe.js
var MeshPipe = class _MeshPipe {
  static PIPE_ID = "mesh";
  static _pool = [];
  static _alloc(mesh, ox, oy) {
    const inst = _MeshPipe._pool.pop() ?? {
      renderPipeId: "mesh",
      renderable: mesh,
      offsetX: ox,
      offsetY: oy
    };
    inst.renderable = mesh;
    inst.offsetX = ox;
    inst.offsetY = oy;
    return inst;
  }
  static release(inst) {
    _MeshPipe._pool.push(inst);
  }
  // ── RenderPipe impl ───────────────────────────────────────────────────────
  addToInstructionSet(mesh, set) {
    if (!mesh.bitmapData?.source || mesh.vertices.length === 0 || mesh.indices.length === 0) {
      return;
    }
    set.add(_MeshPipe._alloc(mesh, 0, 0));
  }
  updateRenderable(_mesh) {
  }
  destroyRenderable(_mesh) {
  }
  // ── Execute ───────────────────────────────────────────────────────────────
  execute(inst, buffer) {
    const mesh = inst.renderable;
    const bd = mesh.bitmapData;
    if (!bd?.source || mesh.vertices.length === 0 || mesh.indices.length === 0) {
      return;
    }
    const destW = !isNaN(mesh.width) ? mesh.width : mesh.textureWidth;
    const destH = !isNaN(mesh.height) ? mesh.height : mesh.textureHeight;
    buffer.offsetX = 0;
    buffer.offsetY = 0;
    buffer.context.drawMesh(bd, mesh.bitmapX, mesh.bitmapY, mesh.bitmapWidth, mesh.bitmapHeight, mesh.bitmapOffsetX, mesh.bitmapOffsetY, destW, destH, mesh.sourceWidth, mesh.sourceHeight, mesh.uvs, mesh.vertices, mesh.indices, mesh.texture?.rotated ?? false, mesh.smoothing);
    buffer.offsetX = 0;
    buffer.offsetY = 0;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/webgl/WebGLRenderTarget.js
var WebGLRenderTarget = class {
  // ── Public fields ─────────────────────────────────────────────────────────
  texture;
  width;
  height;
  useFrameBuffer = true;
  clearColor = [0, 0, 0, 0];
  // ── Private fields ────────────────────────────────────────────────────────
  _gl;
  _frameBuffer;
  _stencilBuffer;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(gl, width, height) {
    this._gl = gl;
    this.width = Math.max(width, 1);
    this.height = Math.max(height, 1);
  }
  // ── Public methods ────────────────────────────────────────────────────────
  resize(width, height) {
    this.width = Math.max(width, 1);
    this.height = Math.max(height, 1);
    const gl = this._gl;
    if (this._frameBuffer && this.texture) {
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    if (this._stencilBuffer) {
      gl.deleteRenderbuffer(this._stencilBuffer);
      this._stencilBuffer = void 0;
    }
  }
  activate() {
    this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, this.useFrameBuffer ? this._frameBuffer ?? null : null);
  }
  initFrameBuffer() {
    if (this._frameBuffer)
      return;
    const gl = this._gl;
    this.texture = this._createTexture();
    this._frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._frameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
  }
  enabledStencil() {
    if (!this._frameBuffer || this._stencilBuffer)
      return;
    const gl = this._gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._frameBuffer);
    this._stencilBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this._stencilBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, this.width, this.height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this._stencilBuffer);
  }
  clear(bind = false) {
    const gl = this._gl;
    if (bind)
      this.activate();
    gl.colorMask(true, true, true, true);
    gl.clearColor(this.clearColor[0], this.clearColor[1], this.clearColor[2], this.clearColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  dispose() {
    const gl = this._gl;
    if (this.texture) {
      gl.deleteTexture(this.texture);
      this.texture = void 0;
    }
    if (this._frameBuffer) {
      gl.deleteFramebuffer(this._frameBuffer);
      this._frameBuffer = void 0;
    }
    if (this._stencilBuffer) {
      gl.deleteRenderbuffer(this._stencilBuffer);
      this._stencilBuffer = void 0;
    }
  }
  // ── Private methods ───────────────────────────────────────────────────────
  _createTexture() {
    const gl = this._gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/webgl/WebGLRenderBuffer.js
var _pool = [];
var WebGLRenderBuffer = class _WebGLRenderBuffer {
  // ── Static fields ─────────────────────────────────────────────────────────
  static create(context, width, height) {
    const buf = _pool.pop();
    if (buf) {
      buf.resize(width, height);
      const m = buf.globalMatrix;
      m.a = 1;
      m.b = 0;
      m.c = 0;
      m.d = 1;
      m.tx = 0;
      m.ty = 0;
      buf.globalAlpha = 1;
      buf.offsetX = 0;
      buf.offsetY = 0;
      buf.offscreenOriginX = 0;
      buf.offscreenOriginY = 0;
      buf.filterPadX = 0;
      buf.filterPadY = 0;
      return buf;
    }
    return new _WebGLRenderBuffer(context, width, height, false);
  }
  static release(buf) {
    buf.filterPadX = 0;
    buf.filterPadY = 0;
    if (_pool.length < 6) {
      _pool.push(buf);
    } else {
      buf.rootRenderTarget.resize(0, 0);
    }
  }
  // ── Public readonly fields ────────────────────────────────────────────────
  context;
  rootRenderTarget;
  isRoot;
  // ── Public mutable fields ─────────────────────────────────────────────────
  globalAlpha = 1;
  globalTintColor = 16777215;
  globalMatrix = new Matrix();
  savedGlobalMatrix = new Matrix();
  offsetX = 0;
  offsetY = 0;
  currentTexture;
  drawCalls = 0;
  offscreenOriginX = 0;
  offscreenOriginY = 0;
  filterPadX = 0;
  filterPadY = 0;
  // Stencil
  stencilList = [];
  stencilHandleCount = 0;
  // Scissor
  scissorState = false;
  hasScissor = false;
  // ── Private fields ────────────────────────────────────────────────────────
  _stencilState = false;
  _scissorRect = new Rectangle();
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(context, width, height, isRoot = false) {
    this.context = context;
    this.isRoot = isRoot;
    this.rootRenderTarget = new WebGLRenderTarget(context.gl, width ?? 3, height ?? 3);
    if (isRoot) {
      context.pushBuffer(this);
    } else {
      const last = context.activatedBuffer;
      if (last) {
        last.rootRenderTarget.activate();
      }
      this.rootRenderTarget.initFrameBuffer();
    }
    if (width && height) {
      this.resize(width, height);
    }
  }
  // ── Getters ───────────────────────────────────────────────────────────────
  get width() {
    return this.rootRenderTarget.width;
  }
  get height() {
    return this.rootRenderTarget.height;
  }
  // ── Lifecycle ─────────────────────────────────────────────────────────────
  resize(width, height) {
    width = Math.max(width, 1);
    height = Math.max(height, 1);
    this.context.pushBuffer(this);
    if (width !== this.rootRenderTarget.width || height !== this.rootRenderTarget.height) {
      this.context.drawCmdManager.pushResize(this, width, height);
      this.rootRenderTarget.width = width;
      this.rootRenderTarget.height = height;
    }
    if (this.isRoot) {
      this.context.resize(width, height);
    }
    this.context.clear();
    this.context.popBuffer();
  }
  clear() {
    this.context.pushBuffer(this);
    this.context.clear();
    this.context.popBuffer();
  }
  onRenderFinish() {
    this.drawCalls = 0;
  }
  getPixels(x, y, width = 1, height = 1) {
    const pixels = new Uint8Array(4 * width * height);
    const useFrameBuffer = this.rootRenderTarget.useFrameBuffer;
    this.rootRenderTarget.useFrameBuffer = true;
    this.rootRenderTarget.activate();
    this.context.getPixels(x, this.height - y - height, width, height, pixels);
    this.rootRenderTarget.useFrameBuffer = useFrameBuffer;
    this.rootRenderTarget.activate();
    const result = new Uint8Array(4 * width * height);
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const src = (width * i + j) * 4;
        const dst = (width * (height - i - 1) + j) * 4;
        const a = pixels[src + 3];
        result[dst] = a ? Math.round(pixels[src] / a * 255) : 0;
        result[dst + 1] = a ? Math.round(pixels[src + 1] / a * 255) : 0;
        result[dst + 2] = a ? Math.round(pixels[src + 2] / a * 255) : 0;
        result[dst + 3] = a;
      }
    }
    return Array.from(result);
  }
  // ── Transform ─────────────────────────────────────────────────────────────
  setTransform(a, b, c, d, tx, ty) {
    const m = this.globalMatrix;
    m.a = a;
    m.b = b;
    m.c = c;
    m.d = d;
    m.tx = tx;
    m.ty = ty;
  }
  transform(a, b, c, d, tx, ty) {
    const m = this.globalMatrix;
    const a1 = m.a, b1 = m.b, c1 = m.c, d1 = m.d;
    if (a !== 1 || b !== 0 || c !== 0 || d !== 1) {
      m.a = a * a1 + b * c1;
      m.b = a * b1 + b * d1;
      m.c = c * a1 + d * c1;
      m.d = c * b1 + d * d1;
    }
    m.tx = tx * a1 + ty * c1 + m.tx;
    m.ty = tx * b1 + ty * d1 + m.ty;
  }
  useOffset() {
    if (this.offsetX !== 0 || this.offsetY !== 0) {
      this.globalMatrix.append(1, 0, 0, 1, this.offsetX, this.offsetY);
      this.offsetX = this.offsetY = 0;
    }
  }
  saveTransform() {
    const m = this.globalMatrix, s = this.savedGlobalMatrix;
    s.a = m.a;
    s.b = m.b;
    s.c = m.c;
    s.d = m.d;
    s.tx = m.tx;
    s.ty = m.ty;
  }
  restoreTransform() {
    const m = this.globalMatrix, s = this.savedGlobalMatrix;
    m.a = s.a;
    m.b = s.b;
    m.c = s.c;
    m.d = s.d;
    m.tx = s.tx;
    m.ty = s.ty;
  }
  // ── Stencil ───────────────────────────────────────────────────────────────
  enableStencil() {
    if (!this._stencilState) {
      this.context.enableStencilTest();
      this._stencilState = true;
    }
  }
  disableStencil() {
    if (this._stencilState) {
      this.context.disableStencilTest();
      this._stencilState = false;
    }
  }
  restoreStencil() {
    if (this._stencilState)
      this.context.enableStencilTest();
    else
      this.context.disableStencilTest();
  }
  // ── Scissor ───────────────────────────────────────────────────────────────
  enableScissor(x, y, width, height) {
    if (!this.scissorState) {
      this.scissorState = true;
      this._scissorRect.setTo(x, y, width, height);
      this.context.enableScissorTest(this._scissorRect);
    }
  }
  disableScissor() {
    if (this.scissorState) {
      this.scissorState = false;
      this._scissorRect.setEmpty();
      this.context.disableScissorTest();
    }
  }
  restoreScissor() {
    if (this.scissorState) {
      this.context.enableScissorTest(this._scissorRect);
    } else {
      this.context.disableScissorTest();
    }
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/webgl/pipes/FilterPipe.js
var BLEND_MODES = {
  0: "source-over",
  1: "lighter",
  2: "destination-out"
};
var FilterPipe = class _FilterPipe {
  // ── Static fields ─────────────────────────────────────────────────────────
  static PUSH_ID = "filterPush";
  static POP_ID = "filterPop";
  static _pushPool = [];
  static _popPool = [];
  // ── RenderPipe impl ───────────────────────────────────────────────────────
  addToInstructionSet(_renderable, _set) {
  }
  updateRenderable(_renderable) {
  }
  // ── Factory helpers used by the renderer ─────────────────────────────────
  static makePush(renderable, filters, offsetX, offsetY) {
    const inst = _FilterPipe._pushPool.pop();
    if (inst) {
      inst.renderable = renderable;
      inst.filters = filters;
      inst.offsetX = offsetX;
      inst.offsetY = offsetY;
      inst.savedBlendMode = "source-over";
      return inst;
    }
    return { renderPipeId: "filterPush", renderable, filters, offsetX, offsetY, savedBlendMode: "source-over" };
  }
  static makePop(renderable, push) {
    const inst = _FilterPipe._popPool.pop();
    if (inst) {
      inst.renderable = renderable;
      inst.push = push;
      return inst;
    }
    return { renderPipeId: "filterPop", renderable, push };
  }
  static releasePush(inst) {
    _FilterPipe._pushPool.push(inst);
  }
  static releasePop(inst) {
    _FilterPipe._popPool.push(inst);
  }
  // ── Execute ───────────────────────────────────────────────────────────────
  /**
   * Called by the renderer when it encounters a filterPush instruction.
   *
   * Two paths:
   * - ColorMatrix inline: sets activeFilter on the main buffer, returns undefined.
   *   Subsequent leaf instructions draw directly to the main buffer with the
   *   filter applied per-draw-call.
   * - All other filters: allocates an offscreen buffer and activates it via
   *   pushBuffer so that ALL subsequent draw calls (until filterPop) land in
   *   the offscreen buffer, not the main buffer.
   *
   * Returns the offscreen buffer (or undefined for inline path).
   */
  executePush(inst, buffer) {
    const filters = inst.filters;
    if (!filters.length)
      return void 0;
    const bounds = inst.renderable.$getOriginalBounds();
    if (bounds.width <= 0 || bounds.height <= 0)
      return void 0;
    if (!inst.renderable.$mask && filters.length === 1 && filters[0] instanceof ColorMatrixFilter) {
      const hasBlend = inst.renderable.$blendMode !== 0;
      if (hasBlend) {
        inst.savedBlendMode = buffer.context.currentBlendMode;
        buffer.context.setGlobalCompositeOperation(BLEND_MODES[inst.renderable.$blendMode] ?? "source-over");
      }
      buffer.context.flush();
      buffer.context.pushBuffer(buffer);
      buffer.context.activeFilter = filters[0];
      return void 0;
    }
    let padL = 0, padR = 0, padT = 0, padB = 0;
    for (const f of filters) {
      const p = f.getPadding();
      if (p.left > padL)
        padL = p.left;
      if (p.right > padR)
        padR = p.right;
      if (p.top > padT)
        padT = p.top;
      if (p.bottom > padB)
        padB = p.bottom;
    }
    const offW = Math.ceil(bounds.width + padL + padR);
    const offH = Math.ceil(bounds.height + padT + padB);
    const offscreen = WebGLRenderBuffer.create(buffer.context, offW, offH);
    offscreen.filterPadX = padL;
    offscreen.filterPadY = padT;
    offscreen.context.pushBuffer(offscreen);
    return offscreen;
  }
  /**
   * Called by the renderer when it encounters a filterPop instruction.
   * Deactivates the offscreen buffer and composites it back onto the main buffer.
   */
  executePop(inst, buffer, offscreen) {
    const { renderable, push } = inst;
    const filters = push.filters;
    const hasBlend = renderable.$blendMode !== 0;
    const blendOp = BLEND_MODES[renderable.$blendMode] ?? "source-over";
    if (!offscreen) {
      buffer.context.flush();
      buffer.context.popBuffer();
      buffer.context.activeFilter = void 0;
      if (hasBlend)
        buffer.context.setGlobalCompositeOperation(push.savedBlendMode);
      return;
    }
    offscreen.context.popBuffer();
    const bounds = renderable.$getOriginalBounds();
    const bx = bounds.x;
    const by = bounds.y;
    const prevBlend = buffer.context.currentBlendMode;
    if (hasBlend)
      buffer.context.setGlobalCompositeOperation(blendOp);
    const padX = offscreen.filterPadX;
    const padY = offscreen.filterPadY;
    buffer.offsetX = bx - padX;
    buffer.offsetY = by - padY;
    buffer.saveTransform();
    buffer.useOffset();
    buffer.context.compositeFilterResult(filters, offscreen);
    buffer.restoreTransform();
    if (hasBlend)
      buffer.context.setGlobalCompositeOperation(prevBlend);
    WebGLRenderBuffer.release(offscreen);
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/webgl/pipes/MaskPipe.js
var MaskPipe = class _MaskPipe {
  // ── Static fields ─────────────────────────────────────────────────────────
  static PUSH_ID = "maskPush";
  static POP_ID = "maskPop";
  static _pushPool = [];
  static _popPool = [];
  // ── RenderPipe impl ───────────────────────────────────────────────────────
  addToInstructionSet(_renderable, _set) {
  }
  updateRenderable(_renderable) {
  }
  // ── Factory helpers ───────────────────────────────────────────────────────
  static makePush(renderable, offsetX, offsetY) {
    const inst = _MaskPipe._pushPool.pop();
    if (inst) {
      inst.renderable = renderable;
      inst.offsetX = offsetX;
      inst.offsetY = offsetY;
      inst.isScrollRect = void 0;
      return inst;
    }
    return { renderPipeId: "maskPush", renderable, offsetX, offsetY };
  }
  static makePop(renderable, push) {
    const inst = _MaskPipe._popPool.pop();
    if (inst) {
      inst.renderable = renderable;
      inst.push = push;
      return inst;
    }
    return { renderPipeId: "maskPop", renderable, push };
  }
  static releasePush(inst) {
    _MaskPipe._pushPool.push(inst);
  }
  static releasePop(inst) {
    _MaskPipe._popPool.push(inst);
  }
  // ── Execute ───────────────────────────────────────────────────────────────
  /**
   * Handles scrollRect / maskRect via scissor or stencil.
   * Returns true if a scissor was used (caller must call executePopScissor).
   */
  executeScrollRectPush(inst, buffer) {
    const { renderable } = inst;
    const rect = renderable.$scrollRect ?? renderable.$maskRect;
    if (!rect || rect.isEmpty()) {
      return false;
    }
    const m = buffer.globalMatrix;
    if (buffer.hasScissor || m.b !== 0 || m.c !== 0) {
      buffer.context.pushMask(rect.x, rect.y, rect.width, rect.height);
      return false;
    }
    const a = m.a, d = m.d, tx = m.tx, ty = m.ty;
    const xMax = rect.width, yMax = rect.height;
    const minX = Math.min(tx, a * xMax + tx);
    const maxX = Math.max(tx, a * xMax + tx);
    const minY = Math.min(ty, d * yMax + ty);
    const maxY = Math.max(ty, d * yMax + ty);
    buffer.context.enableScissor(minX, -maxY + buffer.height, maxX - minX, maxY - minY);
    return true;
  }
  executeScrollRectPop(buffer, usedScissor) {
    if (usedScissor) {
      buffer.context.disableScissor();
    } else {
      buffer.context.popMask();
    }
  }
  /**
   * Handles DisplayObject mask (stencil-based compositing).
   *
   * Allocates an offscreen buffer and activates it via pushBuffer so that
   * all subsequent leaf instructions (the masked subtree) draw into it.
   * The mask object itself is rendered separately in executeClipPop because
   * it is not part of the main InstructionSet.
   *
   * Returns the offscreen buffer, or undefined if the object has zero bounds.
   */
  executeClipPush(inst, buffer, renderer) {
    const { renderable } = inst;
    const scrollRect = renderable.$scrollRect ?? renderable.$maskRect;
    if (!renderable.$mask && (!renderable.$children || renderable.$children.length === 0)) {
      if (scrollRect) {
        buffer.context.pushMask(scrollRect.x + inst.offsetX, scrollRect.y + inst.offsetY, scrollRect.width, scrollRect.height);
      }
      return void 0;
    }
    const bounds = renderable.$getOriginalBounds();
    if (bounds.width <= 0 || bounds.height <= 0) {
      return void 0;
    }
    const bw = bounds.width;
    const bh = bounds.height;
    const displayBuffer = WebGLRenderBuffer.create(buffer.context, bw, bh);
    displayBuffer.context.pushBuffer(displayBuffer);
    return displayBuffer;
  }
  executeClipPop(inst, buffer, displayBuffer, renderer) {
    const { renderable, push } = inst;
    const { offsetX, offsetY } = push;
    const scrollRect = renderable.$scrollRect ?? renderable.$maskRect;
    const hasBlend = renderable.$blendMode !== 0;
    const blendOp = hasBlend ? { 0: "source-over", 1: "lighter", 2: "destination-out" }[renderable.$blendMode] ?? "source-over" : "source-over";
    if (!displayBuffer) {
      if (scrollRect) {
        buffer.context.popMask();
      }
      return;
    }
    const bounds = renderable.$getOriginalBounds();
    const bx = bounds.x;
    const by = bounds.y;
    const bw = bounds.width;
    const bh = bounds.height;
    const mask = renderable.$mask;
    if (mask) {
      const maskBuffer = WebGLRenderBuffer.create(buffer.context, bw, bh);
      maskBuffer.context.pushBuffer(maskBuffer);
      const maskMatrix = Matrix.create();
      maskMatrix.copyFrom(mask.$getConcatenatedMatrix());
      mask.$getConcatenatedMatrixAt(renderable, maskMatrix);
      maskMatrix.translate(-bx, -by);
      maskBuffer.setTransform(maskMatrix.a, maskMatrix.b, maskMatrix.c, maskMatrix.d, maskMatrix.tx, maskMatrix.ty);
      Matrix.release(maskMatrix);
      renderer._drawDisplayObject(mask, maskBuffer, 0, 0);
      maskBuffer.context.popBuffer();
      displayBuffer.context.setGlobalCompositeOperation("destination-in");
      const mw = maskBuffer.rootRenderTarget.width;
      const mh = maskBuffer.rootRenderTarget.height;
      if (maskBuffer.rootRenderTarget.texture) {
        displayBuffer.setTransform(1, 0, 0, -1, 0, maskBuffer.height);
        displayBuffer.context.drawTexture(maskBuffer.rootRenderTarget.texture, 0, 0, mw, mh, 0, 0, mw, mh, mw, mh);
        displayBuffer.setTransform(1, 0, 0, 1, 0, 0);
      }
      displayBuffer.context.setGlobalCompositeOperation("source-over");
      WebGLRenderBuffer.release(maskBuffer);
    }
    displayBuffer.context.popBuffer();
    const prevBlend = buffer.context.currentBlendMode;
    if (hasBlend)
      buffer.context.setGlobalCompositeOperation(blendOp);
    if (scrollRect) {
      buffer.context.pushMask(scrollRect.x + offsetX, scrollRect.y + offsetY, scrollRect.width, scrollRect.height);
    }
    const savedMatrix = Matrix.create();
    savedMatrix.copyFrom(buffer.globalMatrix);
    buffer.globalMatrix.append(1, 0, 0, -1, bx, by + displayBuffer.height);
    const dw = displayBuffer.rootRenderTarget.width;
    const dh = displayBuffer.rootRenderTarget.height;
    if (displayBuffer.rootRenderTarget.texture) {
      buffer.context.drawTexture(displayBuffer.rootRenderTarget.texture, 0, 0, dw, dh, 0, 0, dw, dh, dw, dh);
    }
    buffer.globalMatrix.copyFrom(savedMatrix);
    Matrix.release(savedMatrix);
    if (scrollRect)
      buffer.context.popMask();
    if (hasBlend)
      buffer.context.setGlobalCompositeOperation(prevBlend);
    WebGLRenderBuffer.release(displayBuffer);
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/webgl/pipes/TextPipe.js
var _textureRegistry2 = new FinalizationRegistry(({ gl, texture }) => {
  gl.deleteTexture(texture);
});
var TextPipe = class _TextPipe {
  // ── Static fields ─────────────────────────────────────────────────────────
  static PIPE_ID = "text";
  static _pool = [];
  // ── Instance fields ───────────────────────────────────────────────────────
  _canvasRenderer;
  _cache = /* @__PURE__ */ new WeakMap();
  _registryTokens = /* @__PURE__ */ new WeakMap();
  _gl;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(canvasRenderer) {
    this._canvasRenderer = canvasRenderer;
  }
  static _alloc(tf, ox, oy) {
    const inst = _TextPipe._pool.pop() ?? {
      renderPipeId: "text",
      renderable: tf,
      offsetX: ox,
      offsetY: oy
    };
    inst.renderable = tf;
    inst.offsetX = ox;
    inst.offsetY = oy;
    return inst;
  }
  static release(inst) {
    _TextPipe._pool.push(inst);
  }
  // ── RenderPipe impl ───────────────────────────────────────────────────────
  addToInstructionSet(tf, set) {
    set.add(_TextPipe._alloc(tf, 0, 0));
  }
  updateRenderable(_tf) {
  }
  destroyRenderable(tf) {
    const cache = this._cache.get(tf);
    if (cache?.texture) {
      const token = this._registryTokens.get(tf);
      if (token) {
        _textureRegistry2.unregister(token);
        this._registryTokens.delete(tf);
      }
      if (this._gl)
        this._gl.deleteTexture(cache.texture);
    }
    this._cache.delete(tf);
  }
  // ── Execute ───────────────────────────────────────────────────────────────
  /**
   * Render a TextField into the WebGL buffer.
   * Follows Egret's `WebGLRenderer.renderText` pattern:
   *
   *   1. Compute logical width/height from the TextField.
   *   2. Scale by canvasScale (DPR), clamped to maxTextureSize.
   *   3. Rasterize to offscreen canvas (if dirty).
   *   4. Upload as WebGL texture.
   *   5. Draw with drawTexture, scaling back by canvasScale.
   */
  execute(inst, buffer) {
    const tf = inst.renderable;
    tf.getLinesArr();
    if (!this._gl)
      this._gl = buffer.context.gl;
    if (tf.type === TextFieldType.INPUT && tf.isTyping) {
      return;
    }
    const logicalW = Math.ceil(!isNaN(tf.$explicitWidth) ? tf.$explicitWidth : tf.textWidth);
    const logicalH = Math.ceil(!isNaN(tf.$explicitHeight) ? tf.$explicitHeight : tf.textHeight);
    if (logicalW <= 0 || logicalH <= 0) {
      return;
    }
    buffer.offsetX = 0;
    buffer.offsetY = 0;
    let canvasScaleX = (
      /* devicePixelRatio || */
      1
    );
    let canvasScaleY = (
      /* devicePixelRatio || */
      1
    );
    const maxTexSize = buffer.context.maxTextureSize;
    if (logicalW * canvasScaleX > maxTexSize) {
      canvasScaleX *= maxTexSize / (logicalW * canvasScaleX);
    }
    if (logicalH * canvasScaleY > maxTexSize) {
      canvasScaleY *= maxTexSize / (logicalH * canvasScaleY);
    }
    const pixelW = Math.ceil(logicalW * canvasScaleX);
    const pixelH = Math.ceil(logicalH * canvasScaleY);
    let cache = this._cache.get(tf);
    let scaleChanged = false;
    if (cache) {
      scaleChanged = cache.canvasScaleX !== canvasScaleX || cache.canvasScaleY !== canvasScaleY;
      if (scaleChanged) {
        cache.canvasScaleX = canvasScaleX;
        cache.canvasScaleY = canvasScaleY;
      }
    } else {
      cache = {
        renderBuffer: new RenderBuffer(pixelW, pixelH),
        texture: void 0,
        textureWidth: 0,
        textureHeight: 0,
        canvasScaleX,
        canvasScaleY
      };
      this._cache.set(tf, cache);
    }
    const needsRebuild = tf.$renderDirty || cache.textureWidth !== pixelW || cache.textureHeight !== pixelH || scaleChanged;
    if (needsRebuild) {
      if (cache.renderBuffer.width !== pixelW || cache.renderBuffer.height !== pixelH) {
        cache.renderBuffer.resize(pixelW, pixelH);
      }
      cache.renderBuffer.clear();
      const ctx = cache.renderBuffer.context;
      if (canvasScaleX !== 1 || canvasScaleY !== 1) {
        ctx.setTransform(canvasScaleX, 0, 0, canvasScaleY, 0, 0);
      }
      this._canvasRenderer.renderTextFieldToContext(tf, ctx, 0, 0);
      const surface = cache.renderBuffer.surface;
      if (!cache.texture) {
        cache.texture = buffer.context.createTexture(surface);
        const token = {};
        _textureRegistry2.register(tf, { gl: buffer.context.gl, texture: cache.texture }, token);
        this._registryTokens.set(tf, token);
      } else {
        const oldToken = this._registryTokens.get(tf);
        if (oldToken)
          _textureRegistry2.unregister(oldToken);
        buffer.context.updateTexture(cache.texture, surface);
        const token = {};
        _textureRegistry2.register(tf, { gl: buffer.context.gl, texture: cache.texture }, token);
        this._registryTokens.set(tf, token);
      }
      cache.textureWidth = pixelW;
      cache.textureHeight = pixelH;
    }
    if (!cache.texture)
      return;
    buffer.context.drawTexture(
      cache.texture,
      0,
      0,
      cache.textureWidth,
      cache.textureHeight,
      // src rect (full texture)
      0,
      0,
      // dest position (offset already in globalMatrix via _applyTransform)
      cache.textureWidth / canvasScaleX,
      // dest width (scaled back)
      cache.textureHeight / canvasScaleY,
      // dest height (scaled back)
      cache.textureWidth,
      // texture source width
      cache.textureHeight
    );
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/webgl/pipes/ParticlePipe.js
var ParticlePipe = class {
  static PIPE_ID = "particle";
  // ── RenderPipe impl ───────────────────────────────────────────────────────
  addToInstructionSet(_ps, _set) {
  }
  updateRenderable(_ps) {
  }
  destroyRenderable(_ps) {
  }
  // ── Execute ───────────────────────────────────────────────────────────────
  execute(inst, buffer) {
    const ps = inst.renderable;
    if (ps.numParticles === 0)
      return;
    const texture = ps.texture;
    const bd = texture.bitmapData;
    if (!bd?.source)
      return;
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
      buffer.context.drawImage(bd, texture.bitmapX, texture.bitmapY, texture.bitmapWidth, texture.bitmapHeight, texture.offsetX, texture.offsetY, texW, texH, texture.sourceWidth, texture.sourceHeight, texture.rotated ?? false, false);
    }
    buffer.globalMatrix.copyFrom(savedMatrix);
    buffer.globalAlpha = baseAlpha;
    Matrix.release(savedMatrix);
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/webgl/WebGLRenderer.js
var WebGLRenderer = class {
  // ── Pipes ─────────────────────────────────────────────────────────────────
  _canvasRenderer = new CanvasRenderer();
  _bitmapPipe;
  _graphicsPipe;
  _meshPipe;
  _textPipe;
  _filterPipe = new FilterPipe();
  _maskPipe = new MaskPipe();
  _particlePipe = new ParticlePipe();
  // ── Instruction set ───────────────────────────────────────────────────────
  _instructionSet = new InstructionSet();
  _renderGroupSets = /* @__PURE__ */ new WeakMap();
  _renderGroupSetList = [];
  // Tracks recursive render() depth. Currently render() is never called
  // recursively (cacheAsBitmap uses an instruction-based path, RenderTexture
  // uses CanvasRenderer), so this stays at 0 on entry / exit. The guard below
  // (`if (this._nestLevel === 0)`) therefore fires on every render today.
  // Kept so that a future WebGL cacheAsBitmap / drawToTexture that recurses
  // through render() will only restore the root projection on the outermost
  // call — restoring it on an inner call would corrupt the in-flight
  // offscreen pass. DO NOT remove even though it looks unused.
  _nestLevel = 0;
  constructor() {
    this._bitmapPipe = new BitmapPipe();
    this._graphicsPipe = new GraphicsPipe(this._canvasRenderer);
    this._meshPipe = new MeshPipe();
    this._textPipe = new TextPipe(this._canvasRenderer);
  }
  // ── Public entry point ────────────────────────────────────────────────────
  /**
   * Release pooled instructions (filter/mask push/pop) back to their
   * respective pipes before a rebuild discards `set`'s current contents.
   */
  _releaseInstructions(set) {
    for (let i = 0; i < set.instructionSize; i++) {
      const inst = set.instructions[i];
      switch (inst.renderPipeId) {
        case "filterPush":
          FilterPipe.releasePush(inst);
          break;
        case "filterPop":
          FilterPipe.releasePop(inst);
          break;
        case "maskPush":
          MaskPipe.releasePush(inst);
          break;
        case "maskPop":
          MaskPipe.releasePop(inst);
          break;
      }
    }
  }
  /**
   * Render `displayObject` into `buffer` and return the number of draw calls
   * issued. Rebuilds the instruction set when the scene structure is dirty,
   * otherwise patches dirty renderables in place, then executes.
   */
  render(displayObject, buffer, matrix) {
    this._nestLevel++;
    const ctx = buffer.context;
    ctx.pushBuffer(buffer);
    buffer.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, 0, 0);
    const set = this._instructionSet;
    if (set.structureDirty) {
      this._releaseInstructions(set);
      set.reset();
      buffer.globalAlpha = 1;
      buffer.globalTintColor = 16777215;
      this._buildInstructions(displayObject, set, buffer, matrix.tx, matrix.ty, true);
      set.structureDirty = false;
    } else {
      this._updateDirtyRenderables(set);
    }
    this._executeInstructions(set, buffer);
    ctx.flush();
    const drawCalls = buffer.drawCalls;
    buffer.onRenderFinish();
    ctx.popBuffer();
    buffer.setTransform(1, 0, 0, 1, 0, 0);
    displayObject.$renderDirty = false;
    this._nestLevel--;
    if (this._nestLevel === 0) {
      WebGLRenderBuffer.release(WebGLRenderBuffer.create(buffer.context, 0, 0));
    }
    return drawCalls;
  }
  // ── Phase A: build ────────────────────────────────────────────────────────
  /**
   * Recursively build render instructions for the display subtree rooted at
   * `displayObject`, appending leaf/effect/group instructions into `set`.
   *
   * A `cacheAsBitmap` object is treated as a single opaque leaf: a synthetic
   * `BitmapInstruction` backed by its DisplayList cache is emitted via
   * `addLeaf` (not `add`), so an ancestor's later transform/alpha/tint
   * change can still refresh this instruction's snapshot through the same
   * `renderableIndex` path as ordinary leaves; the cache itself is refreshed
   * lazily during the execute phase if dirty.
   *
   * A child with `isRenderGroup` is built into its own `InstructionSet` and
   * emitted as a single `renderGroup` instruction in the parent set, rather
   * than being inlined here.
   */
  _buildInstructions(displayObject, set, buffer, offsetX, offsetY, isStage = false) {
    const $displayList = displayObject.$displayList;
    if ($displayList && !isStage) {
      const inst = this._makeCacheInstruction(displayObject, offsetX, offsetY, buffer);
      if (inst)
        set.addLeaf(inst);
      return;
    }
    this._buildLeaf(displayObject, set, buffer, offsetX, offsetY);
    const $children = displayObject.$children;
    if (!$children || $children.length === 0)
      return;
    for (const child of $children) {
      if (child.$renderMode === 1)
        continue;
      let ox, oy;
      let savedMatrix;
      if (child.$useTranslate) {
        const m = child.$getMatrix();
        ox = offsetX + child.$x;
        oy = offsetY + child.$y;
        savedMatrix = Matrix.create();
        savedMatrix.copyFrom(buffer.globalMatrix);
        buffer.transform(m.a, m.b, m.c, m.d, ox, oy);
        ox = -child.$anchorOffsetX;
        oy = -child.$anchorOffsetY;
      } else {
        ox = offsetX + child.$x - child.$anchorOffsetX;
        oy = offsetY + child.$y - child.$anchorOffsetY;
      }
      const prevAlpha = buffer.globalAlpha;
      if (child.$alpha !== 1)
        buffer.globalAlpha *= child.$alpha;
      const prevTint = buffer.globalTintColor;
      if (child.$tintRGB !== 16777215)
        buffer.globalTintColor = child.$tintRGB;
      if (child instanceof DisplayObjectContainer && child.isRenderGroup) {
        this._buildRenderGroup(child, set, buffer, ox, oy);
      } else {
        switch (child.$renderMode) {
          case 2:
            this._buildFilter(child, set, buffer, ox, oy);
            break;
          case 3:
            this._buildClip(child, set, buffer, ox, oy);
            break;
          case 4:
            this._buildScrollRect(child, set, buffer, ox, oy);
            break;
          default:
            this._buildInstructions(child, set, buffer, ox, oy);
        }
      }
      buffer.globalAlpha = prevAlpha;
      buffer.globalTintColor = prevTint;
      if (savedMatrix) {
        buffer.globalMatrix.copyFrom(savedMatrix);
        Matrix.release(savedMatrix);
      }
    }
  }
  /**
   * Emit a leaf instruction (bitmap/mesh/shape/text/particle) for a single
   * DisplayObject, based on its `$renderObjectType`. No-op for object types
   * that don't map to a render pipe (e.g. plain containers).
   */
  _buildLeaf(obj, set, buffer, offsetX, offsetY) {
    const transform = this._snapshotTransform(buffer, offsetX, offsetY);
    switch (obj.$renderObjectType) {
      case 2:
        set.addLeaf({
          renderPipeId: "mesh",
          renderable: obj,
          offsetX,
          offsetY,
          transform
        });
        break;
      case 1:
        set.addLeaf({
          renderPipeId: "bitmap",
          renderable: obj,
          offsetX,
          offsetY,
          transform
        });
        break;
      case 3:
        set.addLeaf({
          renderPipeId: "graphics",
          renderable: obj,
          graphics: obj.graphics,
          offsetX,
          offsetY,
          transform
        });
        break;
      case 5:
        set.addLeaf({
          renderPipeId: "text",
          renderable: obj,
          offsetX,
          offsetY,
          transform
        });
        break;
      case 4: {
        const sprite = obj;
        if (sprite.graphics.commands.length > 0) {
          set.addLeaf({
            renderPipeId: "graphics",
            renderable: obj,
            graphics: sprite.graphics,
            offsetX,
            offsetY,
            transform
          });
        }
        break;
      }
      case 6:
        set.addLeaf({
          renderPipeId: "particle",
          renderable: obj,
          offsetX,
          offsetY,
          transform
        });
        break;
    }
  }
  /**
   * Wrap `obj`'s subtree with filter push/pop instructions. Skips the
   * wrapper entirely (falls through to a plain build) if `obj` has no
   * filters, since an empty push/pop pair would still incur an offscreen
   * buffer allocation for nothing.
   */
  _buildFilter(obj, set, buffer, offsetX, offsetY) {
    const filters = obj.$filters;
    if (!filters.length) {
      this._buildInstructions(obj, set, buffer, offsetX, offsetY);
      return;
    }
    const transform = this._snapshotTransform(buffer, offsetX, offsetY);
    const push = Object.assign(FilterPipe.makePush(obj, filters, offsetX, offsetY), {
      transform
    });
    set.add(push);
    this._buildInstructions(obj, set, buffer, offsetX, offsetY);
    set.add(FilterPipe.makePop(obj, push));
  }
  /**
   * Wrap `obj`'s subtree with mask push/pop instructions (`obj.$mask`).
   */
  _buildClip(obj, set, buffer, offsetX, offsetY) {
    const transform = this._snapshotTransform(buffer, offsetX, offsetY);
    const push = Object.assign(MaskPipe.makePush(obj, offsetX, offsetY), { transform });
    set.add(push);
    this._buildInstructions(obj, set, buffer, offsetX, offsetY);
    set.add(MaskPipe.makePop(obj, push));
  }
  /**
   * Wrap `obj`'s subtree with a mask push/pop pair driven by its
   * `$scrollRect`/`$maskRect`, using the mask pipe's scrollRect path
   * (`isScrollRect`) rather than a full clip mask.
   */
  _buildScrollRect(obj, set, buffer, offsetX, offsetY) {
    const rect = obj.$scrollRect ?? obj.$maskRect;
    if (!rect || rect.isEmpty())
      return;
    let ox = offsetX, oy = offsetY;
    if (obj.$scrollRect) {
      ox -= rect.x;
      oy -= rect.y;
    }
    const transform = this._snapshotTransform(buffer, offsetX, offsetY);
    const push = Object.assign(MaskPipe.makePush(obj, offsetX, offsetY), { transform });
    push.isScrollRect = true;
    set.add(push);
    this._buildInstructions(obj, set, buffer, ox, oy);
    set.add(MaskPipe.makePop(obj, push));
  }
  /**
   * Build a RenderGroup subtree into its own InstructionSet and emit a
   * single `renderGroup` instruction into the parent set.
   *
   * The child set is rebuilt only when its own `structureDirty` flag is set,
   * so changes inside the group never force a rebuild of the parent set.
   */
  _buildRenderGroup(obj, parentSet, buffer, offsetX, offsetY) {
    let groupSet = this._renderGroupSets.get(obj);
    if (!groupSet) {
      groupSet = new InstructionSet();
      this._renderGroupSets.set(obj, groupSet);
      this._renderGroupSetList.push(new WeakRef(obj));
    }
    if (groupSet.structureDirty) {
      this._releaseInstructions(groupSet);
      groupSet.reset();
      this._buildInstructions(obj, groupSet, buffer, offsetX, offsetY);
      groupSet.structureDirty = false;
    } else {
      this._updateDirtyRenderables(groupSet);
    }
    const transform = this._snapshotTransform(buffer, offsetX, offsetY);
    parentSet.add({
      renderPipeId: "renderGroup",
      renderable: obj,
      set: groupSet,
      offsetX,
      offsetY,
      transform
    });
  }
  /**
   * Build a `displayListCache` instruction for a `cacheAsBitmap` object.
   * Returns `undefined` if the object has no `$displayList` cache.
   */
  _makeCacheInstruction(obj, offsetX, offsetY, buffer) {
    const $displayList = obj.$displayList;
    if (!$displayList)
      return void 0;
    const transform = this._snapshotTransform(buffer, offsetX, offsetY);
    return {
      renderPipeId: "displayListCache",
      renderable: obj,
      offsetX,
      offsetY,
      transform
    };
  }
  // ── Phase A helpers ───────────────────────────────────────────────────────
  _snapshotTransform(buffer, offsetX, offsetY) {
    const m = buffer.globalMatrix;
    return {
      a: m.a,
      b: m.b,
      c: m.c,
      d: m.d,
      tx: m.tx,
      ty: m.ty,
      offsetX,
      offsetY,
      alpha: buffer.globalAlpha,
      tint: buffer.globalTintColor
    };
  }
  // ── Partial update ────────────────────────────────────────────────────────
  /**
   * Patch cached transform/alpha/tint snapshots for objects marked dirty
   * since the last build, without forcing a full instruction rebuild.
   *
   * `set.renderableIndex.get(obj)` misses (returns `undefined`) in two
   * distinct cases, both handled by recursing/flagging rather than
   * refreshing directly:
   * 1. `obj` is a plain container (or any non-leaf) whose own
   *    transform/alpha/tint changed. Containers never get a leaf
   *    instruction (see `_buildLeaf`'s switch — containers don't match any
   *    `RenderObjectType` case), so without recursing into descendants here,
   *    their cached snapshots would never be refreshed: Canvas re-walks the
   *    tree every frame and picks up new state for free, but WebGL's
   *    snapshot-based leaves would keep drawing at the old position
   *    indefinitely.
   * 2. `obj` is a leaf-type object that was skipped during
   *    `_buildInstructions` because its graphics commands were empty at
   *    build time (e.g. a UI component whose Validator fills commands one
   *    frame later). If it now has graphics content, flag the set for a
   *    full rebuild so it gets an instruction.
   *
   * When a hit is found, the snapshot is rebuilt from the object's current
   * world transform rather than `buffer.globalMatrix`, since that reflects
   * the main buffer's current state, not this object's.
   */
  _updateDirtyRenderables(set) {
    for (let i = 0; i < set.dirtyRenderableCount; i++) {
      const obj = set.dirtyRenderables[i];
      const idx = set.renderableIndex.get(obj);
      if (idx === void 0) {
        if (obj.$children && obj.$children.length > 0) {
          this._refreshDescendantTransforms(obj, set);
        } else if (this._hasGraphicsContent(obj)) {
          set.structureDirty = true;
        }
        continue;
      }
      const inst = set.instructions[idx];
      if (!inst)
        continue;
      this._refreshLeafTransform(obj, inst);
    }
    set.dirtyRenderableCount = 0;
  }
  /**
   * Recursively refresh the transform snapshot of every descendant leaf
   * instruction under `obj`. Used when an ancestor container's own
   * transform/alpha/tint changed — the container itself has no instruction,
   * but its descendants' cached snapshots are now stale and must be patched
   * without forcing a full structural rebuild.
   *
   * Stops descending into a subtree once it hits a nested RenderGroup —
   * that subtree owns its own InstructionSet and is refreshed independently
   * (see markRenderableDirty's RenderGroup routing), so walking into it here
   * would refresh against the wrong InstructionSet.
   */
  _refreshDescendantTransforms(obj, set) {
    const children = obj.$children;
    if (!children)
      return;
    for (const child of children) {
      if (child instanceof DisplayObjectContainer && child.isRenderGroup)
        continue;
      const idx = set.renderableIndex.get(child);
      if (idx !== void 0) {
        const inst = set.instructions[idx];
        if (inst)
          this._refreshLeafTransform(child, inst);
      }
      if (child.$children && child.$children.length > 0) {
        this._refreshDescendantTransforms(child, set);
      }
    }
  }
  /**
   * Recompute the transform snapshot for a leaf instruction from the object's
   * current concatenated matrix and cached world alpha/tint.
   */
  _refreshLeafTransform(obj, inst) {
    const cm = obj.$getConcatenatedMatrix();
    const t = inst.transform;
    t.a = cm.a;
    t.b = cm.b;
    t.c = cm.c;
    t.d = cm.d;
    t.tx = cm.tx;
    t.ty = cm.ty;
    t.offsetX = 0;
    t.offsetY = 0;
    t.alpha = obj.$worldAlpha;
    t.tint = obj.$worldTint;
  }
  /**
   * Check if a display object now has graphics content that warrants an instruction.
   */
  _hasGraphicsContent(obj) {
    const graphics = obj.graphics;
    return graphics != null && graphics.commands.length > 0;
  }
  // ── Phase B: execute ──────────────────────────────────────────────────────
  /**
   * Walk `set` and dispatch each instruction to its render pipe. No
   * scene-graph traversal happens here — `renderGroup` instructions recurse
   * into their own nested `InstructionSet` via this same method.
   */
  _executeInstructions(set, buffer) {
    const offscreenStack = [];
    const scissorStack = [];
    let activeBuffer = buffer;
    for (let i = 0; i < set.instructionSize; i++) {
      const inst = set.instructions[i];
      switch (inst.renderPipeId) {
        // ── Leaf nodes ────────────────────────────────────────────────
        case "bitmap": {
          const leaf = inst;
          this._applyTransform(activeBuffer, leaf.transform);
          this._bitmapPipe.execute(leaf, activeBuffer);
          break;
        }
        case "mesh": {
          const leaf = inst;
          this._applyTransform(activeBuffer, leaf.transform);
          this._meshPipe.execute(leaf, activeBuffer);
          break;
        }
        case "graphics": {
          const leaf = inst;
          this._applyTransform(activeBuffer, leaf.transform);
          this._graphicsPipe.execute(leaf, activeBuffer);
          break;
        }
        case "text": {
          const leaf = inst;
          this._applyTransform(activeBuffer, leaf.transform);
          this._textPipe.execute(leaf, activeBuffer);
          break;
        }
        case "particle": {
          const leaf = inst;
          this._applyTransform(activeBuffer, leaf.transform);
          this._particlePipe.execute(leaf, activeBuffer);
          break;
        }
        // ── DisplayList cache ─────────────────────────────────────────
        case "displayListCache": {
          const cacheInst = inst;
          this._applyTransform(activeBuffer, cacheInst.transform);
          this._executeDisplayListCache(cacheInst.renderable, activeBuffer, cacheInst.offsetX, cacheInst.offsetY);
          break;
        }
        // ── RenderGroup ───────────────────────────────────────────────
        case "renderGroup": {
          const rgInst = inst;
          this._applyTransform(activeBuffer, rgInst.transform);
          this._executeInstructions(rgInst.set, activeBuffer);
          break;
        }
        // ── Filter push/pop ───────────────────────────────────────────
        case "filterPush": {
          const push = inst;
          const pushT = push.transform;
          this._applyTransform(activeBuffer, pushT);
          const offscreen = this._filterPipe.executePush(push, activeBuffer);
          offscreenStack.push(offscreen);
          if (offscreen) {
            this._setOffscreenOrigin(offscreen, push.renderable.$getOriginalBounds(), pushT);
            activeBuffer = offscreen;
          }
          break;
        }
        case "filterPop": {
          const pop = inst;
          const offscreen = offscreenStack.pop();
          if (offscreen)
            activeBuffer = offscreenStack.length > 0 ? offscreenStack[offscreenStack.length - 1] ?? buffer : buffer;
          this._filterPipe.executePop(pop, activeBuffer, offscreen);
          break;
        }
        // ── Mask / clip push/pop ──────────────────────────────────────
        case "maskPush": {
          const push = inst;
          const pushT = push.transform;
          this._applyTransform(activeBuffer, pushT);
          if (push.isScrollRect) {
            const usedScissor = this._maskPipe.executeScrollRectPush(push, activeBuffer);
            scissorStack.push(usedScissor);
            offscreenStack.push(void 0);
          } else {
            const displayBuffer = this._maskPipe.executeClipPush(push, activeBuffer, this);
            offscreenStack.push(displayBuffer);
            if (displayBuffer) {
              this._setOffscreenOrigin(displayBuffer, push.renderable.$getOriginalBounds(), pushT);
              activeBuffer = displayBuffer;
            }
          }
          break;
        }
        case "maskPop": {
          const pop = inst;
          if (pop.push.isScrollRect) {
            const usedScissor = scissorStack.pop() ?? false;
            offscreenStack.pop();
            this._maskPipe.executeScrollRectPop(activeBuffer, usedScissor);
          } else {
            const displayBuffer = offscreenStack.pop();
            if (displayBuffer)
              activeBuffer = offscreenStack.length > 0 ? offscreenStack[offscreenStack.length - 1] ?? buffer : buffer;
            this._maskPipe.executeClipPop(pop, activeBuffer, displayBuffer, this);
          }
          break;
        }
      }
    }
  }
  /**
   * Restore `buffer`'s global matrix/alpha/tint from a snapshot, adjusting
   * for the buffer's offscreen origin if it's a filter/mask offscreen target.
   */
  _applyTransform(buffer, t) {
    const m = buffer.globalMatrix;
    m.a = t.a;
    m.b = t.b;
    m.c = t.c;
    m.d = t.d;
    m.tx = t.tx + t.offsetX - buffer.offscreenOriginX;
    m.ty = t.ty + t.offsetY - buffer.offscreenOriginY;
    buffer.globalAlpha = t.alpha;
    buffer.globalTintColor = t.tint;
  }
  /**
   * Compute the world-space position that should map to (padX, padY) in the
   * offscreen buffer.  Because the buffer includes filter padding, the
   * content's bounds origin must land at (padX, padY) rather than (0,0).
   */
  _setOffscreenOrigin(buf, bounds, t) {
    const padX = buf.filterPadX;
    const padY = buf.filterPadY;
    const worldBX = t.a * bounds.x + t.c * bounds.y + t.tx + t.offsetX;
    const worldBY = t.b * bounds.x + t.d * bounds.y + t.ty + t.offsetY;
    buf.offscreenOriginX = worldBX - padX;
    buf.offscreenOriginY = worldBY - padY;
  }
  /**
   * Execute a `displayListCache` instruction: refresh the cached bitmap if
   * dirty (re-rendering `obj`'s subtree via the canvas renderer into an
   * offscreen surface), then draw that cached bitmap into `buffer`.
   */
  _executeDisplayListCache(obj, buffer, offsetX, offsetY) {
    const $displayList = obj.$displayList;
    if (!$displayList)
      return;
    if (obj.$cacheDirty || obj.$renderDirty) {
      if ($displayList.updateSurfaceSize()) {
        $displayList.renderBuffer.clear();
        this._canvasRenderer.renderToContext(obj, $displayList.renderBuffer.context, $displayList.offsetX, $displayList.offsetY);
        $displayList.updateBitmapData();
      }
      obj.$cacheDirty = false;
      obj.$renderDirty = false;
    }
    if (!$displayList.bitmapData?.source)
      return;
    const bd = $displayList.bitmapData;
    const w = $displayList.renderBuffer.width;
    const h = $displayList.renderBuffer.height;
    if (offsetX !== 0 || offsetY !== 0) {
      buffer.globalMatrix.append(1, 0, 0, 1, offsetX, offsetY);
    }
    buffer.context.drawImage(bd, 0, 0, w, h, -$displayList.offsetX, -$displayList.offsetY, w, h, w, h, false);
    if (offsetX !== 0 || offsetY !== 0) {
      buffer.globalMatrix.append(1, 0, 0, 1, -offsetX, -offsetY);
    }
  }
  // ── Public accessor for MaskPipe (needs to call _drawDisplayObject) ───────
  /**
   * @internal Used by MaskPipe.executeClipPush() to render mask objects
   * into offscreen buffers during the execute phase.
   */
  _drawDisplayObject(obj, buffer, offsetX, offsetY) {
    return this._directDraw(obj, buffer, offsetX, offsetY);
  }
  /**
   * Draw `obj` and its subtree directly into `buffer`, bypassing the
   * InstructionSet. Used for offscreen mask/filter buffers, which are
   * rendered on demand rather than through the main build/execute pass.
   * Returns the number of draw calls issued.
   */
  _directDraw(obj, buffer, offsetX, offsetY) {
    let drawCalls = 0;
    if (offsetX !== 0 || offsetY !== 0) {
      buffer.globalMatrix.append(1, 0, 0, 1, offsetX, offsetY);
    }
    switch (obj.$renderObjectType) {
      case 2: {
        const inst = { renderPipeId: "mesh", renderable: obj, offsetX: 0, offsetY: 0 };
        this._meshPipe.execute(inst, buffer);
        drawCalls++;
        break;
      }
      case 1: {
        const inst = {
          renderPipeId: "bitmap",
          renderable: obj,
          offsetX: 0,
          offsetY: 0
        };
        this._bitmapPipe.execute(inst, buffer);
        drawCalls++;
        break;
      }
      case 3: {
        const inst = {
          renderPipeId: "graphics",
          renderable: obj,
          graphics: obj.graphics,
          offsetX: 0,
          offsetY: 0
        };
        this._graphicsPipe.execute(inst, buffer);
        drawCalls++;
        break;
      }
      case 5: {
        const inst = {
          renderPipeId: "text",
          renderable: obj,
          offsetX: 0,
          offsetY: 0
        };
        this._textPipe.execute(inst, buffer);
        drawCalls++;
        break;
      }
      case 4: {
        const sprite = obj;
        if (sprite.graphics && sprite.graphics.commands.length > 0) {
          const inst = {
            renderPipeId: "graphics",
            renderable: obj,
            graphics: sprite.graphics,
            offsetX: 0,
            offsetY: 0
          };
          this._graphicsPipe.execute(inst, buffer);
          drawCalls++;
        }
        break;
      }
      case 6: {
        const inst = {
          renderPipeId: "particle",
          renderable: obj,
          offsetX: 0,
          offsetY: 0
        };
        this._particlePipe.execute(inst, buffer);
        drawCalls++;
        break;
      }
    }
    if (offsetX !== 0 || offsetY !== 0) {
      buffer.globalMatrix.append(1, 0, 0, 1, -offsetX, -offsetY);
    }
    const $children = obj.$children;
    if (!$children)
      return drawCalls;
    for (const child of $children) {
      if (child.$renderMode === 1)
        continue;
      let ox, oy;
      let savedMatrix;
      if (child.$useTranslate) {
        const m = child.$getMatrix();
        ox = offsetX + child.$x;
        oy = offsetY + child.$y;
        savedMatrix = Matrix.create();
        savedMatrix.copyFrom(buffer.globalMatrix);
        buffer.transform(m.a, m.b, m.c, m.d, ox, oy);
        ox = -child.$anchorOffsetX;
        oy = -child.$anchorOffsetY;
      } else {
        ox = offsetX + child.$x - child.$anchorOffsetX;
        oy = offsetY + child.$y - child.$anchorOffsetY;
      }
      const prevAlpha = buffer.globalAlpha;
      if (child.$alpha !== 1)
        buffer.globalAlpha *= child.$alpha;
      const prevTint = buffer.globalTintColor;
      if (child.$tintRGB !== 16777215)
        buffer.globalTintColor = child.$tintRGB;
      drawCalls += this._directDraw(child, buffer, ox, oy);
      buffer.globalAlpha = prevAlpha;
      buffer.globalTintColor = prevTint;
      if (savedMatrix) {
        buffer.globalMatrix.copyFrom(savedMatrix);
        Matrix.release(savedMatrix);
      }
    }
    return drawCalls;
  }
  // ── Structure dirty notification ──────────────────────────────────────────
  /**
   * Call this when the scene graph structure changes (child added/removed,
   * visibility toggled, filter added, etc.) to trigger a full rebuild next frame.
   *
   * If `owner` is provided and is a RenderGroup, only that group's set is
   * marked dirty — the parent set is left untouched.
   */
  markStructureDirty(owner) {
    if (owner?.isRenderGroup) {
      const groupSet = this._renderGroupSets.get(owner);
      if (groupSet) {
        groupSet.structureDirty = true;
        return;
      }
    }
    this._instructionSet.structureDirty = true;
    if (!owner) {
      for (let i = this._renderGroupSetList.length - 1; i >= 0; i--) {
        const container = this._renderGroupSetList[i].deref();
        if (!container) {
          this._renderGroupSetList.splice(i, 1);
          continue;
        }
        const groupSet = this._renderGroupSets.get(container);
        if (groupSet)
          groupSet.structureDirty = true;
      }
    }
  }
  /**
   * @internal Called by Player when a DisplayObject's data changes but the
   * scene structure is stable. Queues the object for a transform-snapshot
   * update instead of a full rebuild.
   *
   * Routes to the RenderGroup's set if the object lives inside one.
   */
  markRenderableDirty(obj) {
    let p = obj.$parent;
    while (p) {
      if (p instanceof DisplayObjectContainer && p.isRenderGroup) {
        const groupSet = this._renderGroupSets.get(p);
        if (groupSet) {
          if (!groupSet.structureDirty)
            groupSet.markRenderableDirty(obj);
          return;
        }
      }
      p = p.$parent;
    }
    if (!this._instructionSet.structureDirty)
      this._instructionSet.markRenderableDirty(obj);
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/webgl/WebGLUtils.js
var SYM_GL_CONTEXT = "__blakronGlContext";
var SYM_PREMULTIPLIED = "__blakronPremultiplied";
var SYM_DEFAULT_EMPTY = "__blakronDefaultEmpty";
var SYM_SMOOTHING = "__blakronSmoothing";
function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
  }
  return shader;
}
function createProgram(gl, vertSrc, fragSrc) {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const program = gl.createProgram();
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
  }
  return program;
}
function premultiplyTint(tint, alpha) {
  if (alpha === 1)
    return (4278190080 | tint) >>> 0;
  if (alpha === 0)
    return 0;
  const A = Math.round(alpha * 255);
  const R = Math.round((tint >> 16 & 255) * alpha);
  const G = Math.round((tint >> 8 & 255) * alpha);
  const B = Math.round((tint & 255) * alpha);
  return (A << 24 | R << 16 | G << 8 | B) >>> 0;
}
function checkWebGLSupport() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/webgl/WebGLVertexArrayObject.js
var VERT_SIZE = 5;
var VERT_BYTE_SIZE = VERT_SIZE * 4;
var MULTI_VERT_SIZE = 6;
var MULTI_VERT_BYTE_SIZE = MULTI_VERT_SIZE * 4;
var MAX_QUADS = 2048;
var MAX_VERTS = MAX_QUADS * 4;
var MAX_INDICES = MAX_QUADS * 6;
var WebGLVertexArrayObject = class {
  // ── Static fields ─────────────────────────────────────────────────────────
  /** Maximum byte size of the vertex buffer (single-texture layout). */
  static MAX_VERTEX_BYTES = MAX_VERTS * VERT_BYTE_SIZE;
  /** Maximum byte size of the multi-texture vertex buffer. */
  static MAX_MULTI_VERTEX_BYTES = MAX_VERTS * MULTI_VERT_BYTE_SIZE;
  // ── Instance fields ───────────────────────────────────────────────────────
  // Single-texture buffer
  _buffer;
  _float32;
  _uint32;
  // Multi-texture buffer (larger stride)
  _multiBuffer;
  _multiFloat32;
  _multiUint32;
  _indices;
  _indicesForMesh;
  _vertexIndex = 0;
  _indexIndex = 0;
  _hasMesh = false;
  // Whether the current batch uses the multi-texture layout.
  _isMulti = false;
  constructor() {
    this._buffer = new ArrayBuffer(MAX_VERTS * VERT_BYTE_SIZE);
    this._float32 = new Float32Array(this._buffer);
    this._uint32 = new Uint32Array(this._buffer);
    this._multiBuffer = new ArrayBuffer(MAX_VERTS * MULTI_VERT_BYTE_SIZE);
    this._multiFloat32 = new Float32Array(this._multiBuffer);
    this._multiUint32 = new Uint32Array(this._multiBuffer);
    this._indices = new Uint16Array(MAX_INDICES);
    this._indicesForMesh = new Uint16Array(MAX_INDICES);
    for (let i = 0, j = 0; i < MAX_INDICES; i += 6, j += 4) {
      this._indices[i] = j;
      this._indices[i + 1] = j + 1;
      this._indices[i + 2] = j + 2;
      this._indices[i + 3] = j;
      this._indices[i + 4] = j + 2;
      this._indices[i + 5] = j + 3;
    }
  }
  reachMaxSize(vertexCount = 4, indexCount = 6) {
    return this._vertexIndex > MAX_VERTS - vertexCount || this._indexIndex > MAX_INDICES - indexCount;
  }
  getVertices() {
    if (this._isMulti) {
      return this._multiFloat32.subarray(0, this._vertexIndex * MULTI_VERT_SIZE);
    }
    return this._float32.subarray(0, this._vertexIndex * VERT_SIZE);
  }
  getVerticesByteLength() {
    if (this._isMulti) {
      return this._vertexIndex * MULTI_VERT_BYTE_SIZE;
    }
    return this._vertexIndex * VERT_BYTE_SIZE;
  }
  getVerticesBuffer() {
    return this._isMulti ? this._multiBuffer : this._buffer;
  }
  getIndices() {
    return this._indices;
  }
  getMeshIndices() {
    return this._indicesForMesh.subarray(0, this._indexIndex);
  }
  changeToMeshIndices() {
    if (!this._hasMesh) {
      for (let i = 0; i < this._indexIndex; i++) {
        this._indicesForMesh[i] = this._indices[i];
      }
      this._hasMesh = true;
    }
  }
  isMesh() {
    return this._hasMesh;
  }
  isMultiTexture() {
    return this._isMulti;
  }
  // Switch this batch to multi-texture mode. Must be called before any cacheArrays.
  setMultiTexture(enabled) {
    this._isMulti = enabled;
  }
  cacheArrays(buffer, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, textureSourceWidth, textureSourceHeight, meshUVs, meshVertices, meshIndices, rotated, textureId = 0) {
    const alpha = Math.min(buffer.globalAlpha, 1);
    const tint = buffer.globalTintColor;
    const packed = premultiplyTint(tint, alpha);
    const m = buffer.globalMatrix;
    let a = m.a, b = m.b, c = m.c, d = m.d;
    let tx = m.tx + buffer.offsetX * a + buffer.offsetY * c;
    let ty = m.ty + buffer.offsetX * b + buffer.offsetY * d;
    if (this._isMulti) {
      this._cacheMulti(a, b, c, d, tx, ty, packed, textureId, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, textureSourceWidth, textureSourceHeight, meshUVs, meshVertices, meshIndices, rotated);
    } else {
      this._cacheSingle(a, b, c, d, tx, ty, packed, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, textureSourceWidth, textureSourceHeight, meshUVs, meshVertices, meshIndices, rotated);
    }
  }
  _cacheSingle(a, b, c, d, tx, ty, packed, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, textureSourceWidth, textureSourceHeight, meshUVs, meshVertices, meshIndices, rotated) {
    const f32 = this._float32;
    const u32 = this._uint32;
    if (meshVertices && meshUVs && meshIndices) {
      let idx = this._vertexIndex * VERT_SIZE;
      for (let i = 0, l = meshUVs.length; i < l; i += 2) {
        const x = meshVertices[i], y = meshVertices[i + 1];
        const u = meshUVs[i], v = meshUVs[i + 1];
        const base = idx + i / 2 * VERT_SIZE;
        f32[base] = a * x + c * y + tx;
        f32[base + 1] = b * x + d * y + ty;
        if (rotated) {
          f32[base + 2] = (sourceX + (1 - v) * sourceHeight) / textureSourceWidth;
          f32[base + 3] = (sourceY + u * sourceWidth) / textureSourceHeight;
        } else {
          f32[base + 2] = (sourceX + u * sourceWidth) / textureSourceWidth;
          f32[base + 3] = (sourceY + v * sourceHeight) / textureSourceHeight;
        }
        u32[base + 4] = packed;
      }
      if (this._hasMesh) {
        for (let i = 0; i < meshIndices.length; i++) {
          this._indicesForMesh[this._indexIndex + i] = meshIndices[i] + this._vertexIndex;
        }
      }
      this._vertexIndex += meshUVs.length / 2;
      this._indexIndex += meshIndices.length;
    } else {
      this._writeQuadSingle(f32, u32, a, b, c, d, tx, ty, packed, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, textureSourceWidth, textureSourceHeight, rotated);
    }
  }
  _writeQuadSingle(f32, u32, a, b, c, d, tx, ty, packed, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, tw, th, rotated) {
    if (destX !== 0 || destY !== 0) {
      tx = destX * a + destY * c + tx;
      ty = destX * b + destY * d + ty;
    }
    const a1 = destWidth / sourceWidth;
    if (a1 !== 1) {
      a *= a1;
      b *= a1;
    }
    const d1 = destHeight / sourceHeight;
    if (d1 !== 1) {
      c *= d1;
      d *= d1;
    }
    const w = sourceWidth, h = sourceHeight;
    let sx = sourceX / tw, sy = sourceY / th;
    let sw, sh;
    let idx = this._vertexIndex * VERT_SIZE;
    if (rotated) {
      sw = sourceHeight / tw;
      sh = sourceWidth / th;
      f32[idx] = tx;
      f32[idx + 1] = ty;
      f32[idx + 2] = sw + sx;
      f32[idx + 3] = sy;
      u32[idx + 4] = packed;
      idx += 5;
      f32[idx] = a * w + tx;
      f32[idx + 1] = b * w + ty;
      f32[idx + 2] = sw + sx;
      f32[idx + 3] = sh + sy;
      u32[idx + 4] = packed;
      idx += 5;
      f32[idx] = a * w + c * h + tx;
      f32[idx + 1] = d * h + b * w + ty;
      f32[idx + 2] = sx;
      f32[idx + 3] = sh + sy;
      u32[idx + 4] = packed;
      idx += 5;
      f32[idx] = c * h + tx;
      f32[idx + 1] = d * h + ty;
      f32[idx + 2] = sx;
      f32[idx + 3] = sy;
      u32[idx + 4] = packed;
    } else {
      sw = sourceWidth / tw;
      sh = sourceHeight / th;
      f32[idx] = tx;
      f32[idx + 1] = ty;
      f32[idx + 2] = sx;
      f32[idx + 3] = sy;
      u32[idx + 4] = packed;
      idx += 5;
      f32[idx] = a * w + tx;
      f32[idx + 1] = b * w + ty;
      f32[idx + 2] = sw + sx;
      f32[idx + 3] = sy;
      u32[idx + 4] = packed;
      idx += 5;
      f32[idx] = a * w + c * h + tx;
      f32[idx + 1] = d * h + b * w + ty;
      f32[idx + 2] = sw + sx;
      f32[idx + 3] = sh + sy;
      u32[idx + 4] = packed;
      idx += 5;
      f32[idx] = c * h + tx;
      f32[idx + 1] = d * h + ty;
      f32[idx + 2] = sx;
      f32[idx + 3] = sh + sy;
      u32[idx + 4] = packed;
    }
    if (this._hasMesh) {
      const im = this._indicesForMesh;
      const ii = this._indexIndex, vi = this._vertexIndex;
      im[ii] = vi;
      im[ii + 1] = vi + 1;
      im[ii + 2] = vi + 2;
      im[ii + 3] = vi;
      im[ii + 4] = vi + 2;
      im[ii + 5] = vi + 3;
    }
    this._vertexIndex += 4;
    this._indexIndex += 6;
  }
  _cacheMulti(a, b, c, d, tx, ty, packed, textureId, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, tw, th, meshUVs, meshVertices, meshIndices, rotated) {
    const f32 = this._multiFloat32;
    const u32 = this._multiUint32;
    if (meshVertices && meshUVs && meshIndices) {
      let idx = this._vertexIndex * MULTI_VERT_SIZE;
      for (let i = 0, l = meshUVs.length; i < l; i += 2) {
        const x = meshVertices[i], y = meshVertices[i + 1];
        const u = meshUVs[i], v = meshUVs[i + 1];
        const base = idx + i / 2 * MULTI_VERT_SIZE;
        f32[base] = a * x + c * y + tx;
        f32[base + 1] = b * x + d * y + ty;
        if (rotated) {
          f32[base + 2] = (sourceX + (1 - v) * sourceHeight) / tw;
          f32[base + 3] = (sourceY + u * sourceWidth) / th;
        } else {
          f32[base + 2] = (sourceX + u * sourceWidth) / tw;
          f32[base + 3] = (sourceY + v * sourceHeight) / th;
        }
        u32[base + 4] = packed;
        f32[base + 5] = textureId;
      }
      if (this._hasMesh) {
        for (let i = 0; i < meshIndices.length; i++) {
          this._indicesForMesh[this._indexIndex + i] = meshIndices[i] + this._vertexIndex;
        }
      }
      this._vertexIndex += meshUVs.length / 2;
      this._indexIndex += meshIndices.length;
    } else {
      this._writeQuadMulti(f32, u32, a, b, c, d, tx, ty, packed, textureId, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, tw, th, rotated);
    }
  }
  _writeQuadMulti(f32, u32, a, b, c, d, tx, ty, packed, tid, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, tw, th, rotated) {
    if (destX !== 0 || destY !== 0) {
      tx = destX * a + destY * c + tx;
      ty = destX * b + destY * d + ty;
    }
    const a1 = destWidth / sourceWidth;
    if (a1 !== 1) {
      a *= a1;
      b *= a1;
    }
    const d1 = destHeight / sourceHeight;
    if (d1 !== 1) {
      c *= d1;
      d *= d1;
    }
    const w = sourceWidth, h = sourceHeight;
    let sx = sourceX / tw, sy = sourceY / th;
    let sw, sh;
    let idx = this._vertexIndex * MULTI_VERT_SIZE;
    if (rotated) {
      sw = sourceHeight / tw;
      sh = sourceWidth / th;
      f32[idx] = tx;
      f32[idx + 1] = ty;
      f32[idx + 2] = sw + sx;
      f32[idx + 3] = sy;
      u32[idx + 4] = packed;
      f32[idx + 5] = tid;
      idx += 6;
      f32[idx] = a * w + tx;
      f32[idx + 1] = b * w + ty;
      f32[idx + 2] = sw + sx;
      f32[idx + 3] = sh + sy;
      u32[idx + 4] = packed;
      f32[idx + 5] = tid;
      idx += 6;
      f32[idx] = a * w + c * h + tx;
      f32[idx + 1] = d * h + b * w + ty;
      f32[idx + 2] = sx;
      f32[idx + 3] = sh + sy;
      u32[idx + 4] = packed;
      f32[idx + 5] = tid;
      idx += 6;
      f32[idx] = c * h + tx;
      f32[idx + 1] = d * h + ty;
      f32[idx + 2] = sx;
      f32[idx + 3] = sy;
      u32[idx + 4] = packed;
      f32[idx + 5] = tid;
    } else {
      sw = sourceWidth / tw;
      sh = sourceHeight / th;
      f32[idx] = tx;
      f32[idx + 1] = ty;
      f32[idx + 2] = sx;
      f32[idx + 3] = sy;
      u32[idx + 4] = packed;
      f32[idx + 5] = tid;
      idx += 6;
      f32[idx] = a * w + tx;
      f32[idx + 1] = b * w + ty;
      f32[idx + 2] = sw + sx;
      f32[idx + 3] = sy;
      u32[idx + 4] = packed;
      f32[idx + 5] = tid;
      idx += 6;
      f32[idx] = a * w + c * h + tx;
      f32[idx + 1] = d * h + b * w + ty;
      f32[idx + 2] = sw + sx;
      f32[idx + 3] = sh + sy;
      u32[idx + 4] = packed;
      f32[idx + 5] = tid;
      idx += 6;
      f32[idx] = c * h + tx;
      f32[idx + 1] = d * h + ty;
      f32[idx + 2] = sx;
      f32[idx + 3] = sh + sy;
      u32[idx + 4] = packed;
      f32[idx + 5] = tid;
    }
    if (this._hasMesh) {
      const im = this._indicesForMesh;
      const ii = this._indexIndex, vi = this._vertexIndex;
      im[ii] = vi;
      im[ii + 1] = vi + 1;
      im[ii + 2] = vi + 2;
      im[ii + 3] = vi;
      im[ii + 4] = vi + 2;
      im[ii + 5] = vi + 3;
    }
    this._vertexIndex += 4;
    this._indexIndex += 6;
  }
  clear() {
    this._hasMesh = false;
    this._isMulti = false;
    this._vertexIndex = 0;
    this._indexIndex = 0;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/webgl/WebGLDrawCmdManager.js
function makeCmd() {
  return {
    type: 0,
    count: 0,
    texture: void 0,
    filter: void 0,
    value: "",
    buffer: void 0,
    width: 0,
    height: 0,
    textureWidth: 0,
    textureHeight: 0,
    smoothing: false,
    x: 0,
    y: 0,
    multiCmd: void 0
  };
}
var WebGLDrawCmdManager = class {
  // ── Public fields ─────────────────────────────────────────────────────────
  drawData = [];
  drawDataLen = 0;
  // ── Public methods — push ─────────────────────────────────────────────────
  pushDrawRect() {
    const last = this.drawData[this.drawDataLen - 1];
    if (this.drawDataLen > 0 && last.type === 1) {
      last.count += 2;
      return;
    }
    const d = this._get();
    d.type = 1;
    d.count = 2;
    this.drawDataLen++;
  }
  pushDrawTexture(texture, count = 2, filter, textureWidth, textureHeight) {
    if (filter) {
      const d2 = this._get();
      d2.type = 0;
      d2.texture = texture;
      d2.filter = filter;
      d2.count = count;
      d2.textureWidth = textureWidth ?? 0;
      d2.textureHeight = textureHeight ?? 0;
      this.drawDataLen++;
      return;
    }
    const last = this.drawData[this.drawDataLen - 1];
    if (this.drawDataLen > 0 && last.type === 0 && last.texture === texture && !last.filter) {
      last.count += count;
      return;
    }
    const d = this._get();
    d.type = 0;
    d.texture = texture;
    d.filter = void 0;
    d.count = count;
    this.drawDataLen++;
  }
  /**
   * Push a multi-texture batch draw command.
   * The caller is responsible for ensuring the VAO is in multi-texture mode
   * and that `multiCmd` contains the correct texture slot snapshot.
   */
  pushDrawMultiTexture(multiCmd) {
    const last = this.drawData[this.drawDataLen - 1];
    if (this.drawDataLen > 0 && last.type === 11 && last.multiCmd && last.multiCmd.textureCount === multiCmd.textureCount && last.multiCmd.textures.every((t, i) => t === multiCmd.textures[i])) {
      last.multiCmd.count += multiCmd.count;
      last.count += multiCmd.count;
      return;
    }
    const d = this._get();
    d.type = 11;
    d.multiCmd = multiCmd;
    d.count = multiCmd.count;
    this.drawDataLen++;
  }
  pushChangeSmoothing(texture, smoothing) {
    texture["__blakronSmoothing"] = smoothing;
    const d = this._get();
    d.type = 10;
    d.texture = texture;
    d.smoothing = smoothing;
    this.drawDataLen++;
  }
  pushPushMask(count = 1) {
    const d = this._get();
    d.type = 2;
    d.count = count * 2;
    this.drawDataLen++;
  }
  pushPopMask(count = 1) {
    const d = this._get();
    d.type = 3;
    d.count = count * 2;
    this.drawDataLen++;
  }
  pushSetBlend(value) {
    let drawState = false;
    for (let i = this.drawDataLen - 1; i >= 0; i--) {
      const d2 = this.drawData[i];
      if (d2.type === 0 || d2.type === 1)
        drawState = true;
      if (!drawState && d2.type === 4) {
        this.drawData.splice(i, 1);
        this.drawDataLen--;
        continue;
      }
      if (d2.type === 4) {
        if (d2.value === value)
          return;
        break;
      }
    }
    const d = this._get();
    d.type = 4;
    d.value = value;
    this.drawDataLen++;
  }
  pushResize(buffer, width, height) {
    const d = this._get();
    d.type = 5;
    d.buffer = buffer;
    d.width = width;
    d.height = height;
    this.drawDataLen++;
  }
  pushClearColor() {
    const d = this._get();
    d.type = 6;
    this.drawDataLen++;
  }
  pushActivateBuffer(buffer) {
    let drawState = false;
    for (let i = this.drawDataLen - 1; i >= 0; i--) {
      const d2 = this.drawData[i];
      if (d2.type !== 4 && d2.type !== 7)
        drawState = true;
      if (!drawState && d2.type === 7) {
        this.drawData.splice(i, 1);
        this.drawDataLen--;
        continue;
      }
    }
    const d = this._get();
    d.type = 7;
    d.buffer = buffer;
    d.width = buffer.rootRenderTarget?.width ?? 0;
    d.height = buffer.rootRenderTarget?.height ?? 0;
    this.drawDataLen++;
  }
  pushEnableScissor(x, y, width, height) {
    const d = this._get();
    d.type = 8;
    d.x = x;
    d.y = y;
    d.width = width;
    d.height = height;
    this.drawDataLen++;
  }
  pushDisableScissor() {
    const d = this._get();
    d.type = 9;
    this.drawDataLen++;
  }
  // ── Public methods — reset ────────────────────────────────────────────────
  clear() {
    for (let i = 0; i < this.drawDataLen; i++) {
      const d = this.drawData[i];
      d.type = 0;
      d.count = 0;
      d.texture = void 0;
      d.filter = void 0;
      d.value = "";
      d.buffer = void 0;
      d.width = 0;
      d.height = 0;
      d.textureWidth = 0;
      d.textureHeight = 0;
      d.smoothing = false;
      d.x = 0;
      d.y = 0;
      d.multiCmd = void 0;
    }
    this.drawDataLen = 0;
  }
  // ── Private methods ───────────────────────────────────────────────────────
  _get() {
    return this.drawData[this.drawDataLen] ?? (this.drawData[this.drawDataLen] = makeCmd());
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/webgl/WebGLProgram.js
var WebGLProgram = class _WebGLProgram {
  // ── Static ────────────────────────────────────────────────────────────────
  static _cache = /* @__PURE__ */ new Map();
  static get(gl, vertSrc, fragSrc, key) {
    if (!this._cache.has(key)) {
      this._cache.set(key, new _WebGLProgram(gl, vertSrc, fragSrc));
    }
    return this._cache.get(key);
  }
  static clearCache() {
    this._cache.clear();
  }
  // ── Instance ──────────────────────────────────────────────────────────────
  id;
  uniforms = {};
  attributes = {};
  constructor(gl, vertSrc, fragSrc) {
    this.id = createProgram(gl, vertSrc, fragSrc);
    const totalUniforms = gl.getProgramParameter(this.id, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < totalUniforms; i++) {
      const info = gl.getActiveUniform(this.id, i);
      this.uniforms[info.name] = gl.getUniformLocation(this.id, info.name);
    }
    const totalAttribs = gl.getProgramParameter(this.id, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < totalAttribs; i++) {
      const info = gl.getActiveAttrib(this.id, i);
      this.attributes[info.name] = gl.getAttribLocation(this.id, info.name);
    }
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/webgl/shaders/ShaderLib.js
var ShaderLib = {
  default_vert: (
    /* glsl */
    `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;
attribute vec4 aColor;
uniform vec2 projectionVector;
varying vec2 vTextureCoord;
varying vec4 vColor;
const vec2 center = vec2(-1.0, 1.0);
void main(void) {
   gl_Position = vec4((aVertexPosition / projectionVector) + center, 0.0, 1.0);
   vTextureCoord = aTextureCoord;
   vColor = aColor;
   }`
  ),
  // Standalone vertex shader for fullscreen quad blits (filters, blur passes).
  // Identical to default_vert but kept separate so filter passes can be
  // paired with their own fragment shaders without colliding with the
  // batched-texture program cache key.
  fullscreen_vert: (
    /* glsl */
    `
   attribute vec2 aVertexPosition;
   attribute vec2 aTextureCoord;
   attribute vec4 aColor;
   uniform vec2 projectionVector;
   varying vec2 vTextureCoord;
   varying vec4 vColor;
   const vec2 center = vec2(-1.0, 1.0);
   void main(void) {
      gl_Position = vec4((aVertexPosition / projectionVector) + center, 0.0, 1.0);
      vTextureCoord = aTextureCoord;
      vColor = aColor;
   }`
  ),
  multi_vert: (
    /* glsl */
    `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;
attribute vec4 aColor;
attribute float aTextureId;
uniform vec2 projectionVector;
varying vec2 vTextureCoord;
varying vec4 vColor;
varying float vTextureId;
const vec2 center = vec2(-1.0, 1.0);
void main(void) {
   gl_Position = vec4((aVertexPosition / projectionVector) + center, 0.0, 1.0);
   vTextureCoord = aTextureCoord;
   vColor = aColor;
   vTextureId = aTextureId;
}`
  ),
  multi_frag: (
    /* glsl */
    `
precision lowp float;
varying vec2 vTextureCoord;
varying vec4 vColor;
varying float vTextureId;
uniform sampler2D uSamplers[8];
void main(void) {
    vec4 color;
    int id = int(vTextureId + 0.5);
    if (id == 0)      color = texture2D(uSamplers[0], vTextureCoord);
    else if (id == 1) color = texture2D(uSamplers[1], vTextureCoord);
    else if (id == 2) color = texture2D(uSamplers[2], vTextureCoord);
    else if (id == 3) color = texture2D(uSamplers[3], vTextureCoord);
    else if (id == 4) color = texture2D(uSamplers[4], vTextureCoord);
    else if (id == 5) color = texture2D(uSamplers[5], vTextureCoord);
    else if (id == 6) color = texture2D(uSamplers[6], vTextureCoord);
    else              color = texture2D(uSamplers[7], vTextureCoord);
    gl_FragColor = color * vColor;
}`
  ),
  texture_frag: (
    /* glsl */
    `
precision lowp float;
varying vec2 vTextureCoord;
varying vec4 vColor;
uniform sampler2D uSampler;
void main(void) {
    gl_FragColor = texture2D(uSampler, vTextureCoord) * vColor;
}`
  ),
  primitive_frag: (
    /* glsl */
    `
precision lowp float;
varying vec2 vTextureCoord;
varying vec4 vColor;
void main(void) {
    gl_FragColor = vColor;
}`
  ),
  blur_frag: (
    /* glsl */
    `
precision mediump float;
uniform vec2 blur;
uniform sampler2D uSampler;
varying vec2 vTextureCoord;
uniform vec2 uTextureSize;
void main() {
    const int sampleRadius = 5;
    const int samples = sampleRadius * 2 + 1;
    vec2 blurUv = blur / uTextureSize;
    vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
    vec2 uv = vec2(0.0, 0.0);
    blurUv /= float(sampleRadius);
    for (int i = -sampleRadius; i <= sampleRadius; i++) {
        uv.x = vTextureCoord.x + float(i) * blurUv.x;
        uv.y = vTextureCoord.y + float(i) * blurUv.y;
        color += texture2D(uSampler, uv);
    }
    color /= float(samples);
    gl_FragColor = color;
}`
  ),
  blur_h_frag: (
    /* glsl */
    `
precision mediump float;
uniform float blurX;
uniform sampler2D uSampler;
varying vec2 vTextureCoord;
uniform vec2 uTextureSize;
void main() {
    float step = 1.0 / uTextureSize.x;
    vec4 color = vec4(0.0);
    float total = 0.0;
    for (int i = -8; i <= 8; i++) {
        if (abs(float(i)) > blurX) continue;
        float weight = 1.0 - abs(float(i)) / (blurX + 1.0);
        color += texture2D(uSampler, vTextureCoord + vec2(float(i) * step, 0.0)) * weight;
        total += weight;
    }
    gl_FragColor = color / total;
}`
  ),
  blur_v_frag: (
    /* glsl */
    `
precision mediump float;
uniform float blurY;
uniform sampler2D uSampler;
varying vec2 vTextureCoord;
uniform vec2 uTextureSize;
void main() {
    float step = 1.0 / uTextureSize.y;
    vec4 color = vec4(0.0);
    float total = 0.0;
    for (int i = -8; i <= 8; i++) {
        if (abs(float(i)) > blurY) continue;
        float weight = 1.0 - abs(float(i)) / (blurY + 1.0);
        color += texture2D(uSampler, vTextureCoord + vec2(0.0, float(i) * step)) * weight;
        total += weight;
    }
    gl_FragColor = color / total;
}`
  ),
  glow_frag: (
    /* glsl */
    `
precision highp float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float dist;
uniform float angle;
uniform vec4 color;
uniform float alpha;
uniform float blurX;
uniform float blurY;
uniform float strength;
uniform float inner;
uniform float knockout;
uniform float hideObject;
uniform vec2 uTextureSize;
float random(vec2 scale) {
    return fract(sin(dot(gl_FragCoord.xy, scale)) * 43758.5453);
}
void main(void) {
    vec2 px = vec2(1.0 / uTextureSize.x, 1.0 / uTextureSize.y);
    const float linearSamplingTimes = 7.0;
    const float circleSamplingTimes = 12.0;
    vec4 ownColor = texture2D(uSampler, vTextureCoord);
    vec4 curColor;
    float totalAlpha = 0.0;
    float maxTotalAlpha = 0.0;
    float offsetX = dist * cos(angle) * px.x;
    float offsetY = dist * sin(angle) * px.y;
    const float PI = 3.14159265358979323846264;
    float offset = PI * 2.0 / circleSamplingTimes * random(vec2(12.9898, 78.233));
    float stepX = blurX * px.x / linearSamplingTimes;
    float stepY = blurY * px.y / linearSamplingTimes;
    for (float a = 0.0; a <= PI * 2.0; a += PI * 2.0 / circleSamplingTimes) {
        float cosAngle = cos(a + offset);
        float sinAngle = sin(a + offset);
        for (float i = 1.0; i <= linearSamplingTimes; i++) {
            float curDistanceX = i * stepX * cosAngle;
            float curDistanceY = i * stepY * sinAngle;
            if (vTextureCoord.x + curDistanceX - offsetX >= 0.0 && vTextureCoord.y + curDistanceY + offsetY <= 1.0) {
                curColor = texture2D(uSampler, vec2(vTextureCoord.x + curDistanceX - offsetX, vTextureCoord.y + curDistanceY + offsetY));
                totalAlpha += (linearSamplingTimes - i) * curColor.a;
            }
            maxTotalAlpha += (linearSamplingTimes - i);
        }
    }
    ownColor.a = max(ownColor.a, 0.0001);
    ownColor.rgb = ownColor.rgb / ownColor.a;
    float outerGlowAlpha = (totalAlpha / maxTotalAlpha) * strength * alpha * (1.0 - inner) * max(min(hideObject, knockout), 1.0 - ownColor.a);
    float innerGlowAlpha = ((maxTotalAlpha - totalAlpha) / maxTotalAlpha) * strength * alpha * inner * ownColor.a;
    ownColor.a = max(ownColor.a * knockout * (1.0 - hideObject), 0.0001);
    vec3 mix1 = mix(ownColor.rgb, color.rgb, innerGlowAlpha / (innerGlowAlpha + ownColor.a));
    vec3 mix2 = mix(mix1, color.rgb, outerGlowAlpha / (innerGlowAlpha + ownColor.a + outerGlowAlpha));
    float resultAlpha = min(ownColor.a + outerGlowAlpha + innerGlowAlpha, 1.0);
    gl_FragColor = vec4(mix2 * resultAlpha, resultAlpha);
}`
  ),
  colorTransform_frag: (
    /* glsl */
    `
precision mediump float;
varying vec2 vTextureCoord;
varying vec4 vColor;
uniform mat4 matrix;
uniform vec4 colorAdd;
uniform sampler2D uSampler;
void main(void) {
    vec4 texColor = texture2D(uSampler, vTextureCoord);
    if (texColor.a > 0.0) {
        texColor = vec4(texColor.rgb / texColor.a, texColor.a);
    }
    vec4 locColor = clamp(texColor * matrix + colorAdd, 0.0, 1.0);
    gl_FragColor = vColor * vec4(locColor.rgb * locColor.a, locColor.a);
}`
  )
};
var BLUR_TIERS = [4, 8, 16, 32];
function getBlurTier(radius) {
  for (const tier of BLUR_TIERS) {
    if (radius <= tier)
      return tier;
  }
  return 32;
}
function makeBlurHFrag(tier) {
  return (
    /* glsl */
    `
precision mediump float;
uniform float blurX;
uniform sampler2D uSampler;
varying vec2 vTextureCoord;
uniform vec2 uTextureSize;
void main() {
    float step = 1.0 / uTextureSize.x;
    vec4 color = vec4(0.0);
    float total = 0.0;
    for (int i = -${tier}; i <= ${tier}; i++) {
        if (abs(float(i)) > blurX) continue;
        float weight = 1.0 - abs(float(i)) / (blurX + 1.0);
        color += texture2D(uSampler, vTextureCoord + vec2(float(i) * step, 0.0)) * weight;
        total += weight;
    }
    gl_FragColor = color / total;
}`
  );
}
function makeBlurVFrag(tier) {
  return (
    /* glsl */
    `
precision mediump float;
uniform float blurY;
uniform sampler2D uSampler;
varying vec2 vTextureCoord;
uniform vec2 uTextureSize;
void main() {
    float step = 1.0 / uTextureSize.y;
    vec4 color = vec4(0.0);
    float total = 0.0;
    for (int i = -${tier}; i <= ${tier}; i++) {
        if (abs(float(i)) > blurY) continue;
        float weight = 1.0 - abs(float(i)) / (blurY + 1.0);
        color += texture2D(uSampler, vTextureCoord + vec2(0.0, float(i) * step)) * weight;
        total += weight;
    }
    gl_FragColor = color / total;
}`
  );
}

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/webgl/shaders/ShaderLib2.js
var ShaderLib2 = {
  default_vert: (
    /* glsl */
    `#version 300 es
in vec2 aVertexPosition;
in vec2 aTextureCoord;
in vec4 aColor;
uniform vec2 projectionVector;
out vec2 vTextureCoord;
out vec4 vColor;
const vec2 center = vec2(-1.0, 1.0);
void main(void) {
   gl_Position = vec4((aVertexPosition / projectionVector) + center, 0.0, 1.0);
   vTextureCoord = aTextureCoord;
   vColor = aColor;
}`
  ),
  // Standalone vertex shader for fullscreen quad blits (filters, blur passes).
  // Identical to default_vert but kept separate so filter passes can be
  // paired with their own fragment shaders without colliding with the
  // batched-texture program cache key.
  fullscreen_vert: (
    /* glsl */
    `#version 300 es
in vec2 aVertexPosition;
in vec2 aTextureCoord;
in vec4 aColor;
uniform vec2 projectionVector;
out vec2 vTextureCoord;
out vec4 vColor;
const vec2 center = vec2(-1.0, 1.0);
void main(void) {
   gl_Position = vec4((aVertexPosition / projectionVector) + center, 0.0, 1.0);
   vTextureCoord = aTextureCoord;
   vColor = aColor;
}`
  ),
  // Multi-texture vertex shader: carries textureId as a float attribute.
  multi_vert: (
    /* glsl */
    `#version 300 es
in vec2 aVertexPosition;
in vec2 aTextureCoord;
in vec4 aColor;
in float aTextureId;
uniform vec2 projectionVector;
out vec2 vTextureCoord;
out vec4 vColor;
out float vTextureId;
const vec2 center = vec2(-1.0, 1.0);
void main(void) {
   gl_Position = vec4((aVertexPosition / projectionVector) + center, 0.0, 1.0);
   vTextureCoord = aTextureCoord;
   vColor = aColor;
   vTextureId = aTextureId;
}`
  ),
  // Multi-texture fragment shader.
  // Each branch uses a constant integer to index the sampler array, which
  // satisfies GLSL ES 3.00's requirement that sampler indices be constant or
  // dynamically uniform. (Direct variable indexing is NOT allowed.)
  multi_frag: (
    /* glsl */
    `#version 300 es
precision lowp float;
in vec2 vTextureCoord;
in vec4 vColor;
in float vTextureId;
uniform sampler2D uSamplers[8];
out vec4 fragColor;
void main(void) {
    vec4 color;
    int id = int(vTextureId + 0.5);
    if (id == 0)      color = texture(uSamplers[0], vTextureCoord);
    else if (id == 1) color = texture(uSamplers[1], vTextureCoord);
    else if (id == 2) color = texture(uSamplers[2], vTextureCoord);
    else if (id == 3) color = texture(uSamplers[3], vTextureCoord);
    else if (id == 4) color = texture(uSamplers[4], vTextureCoord);
    else if (id == 5) color = texture(uSamplers[5], vTextureCoord);
    else if (id == 6) color = texture(uSamplers[6], vTextureCoord);
    else              color = texture(uSamplers[7], vTextureCoord);
    fragColor = color * vColor;
}`
  ),
  texture_frag: (
    /* glsl */
    `#version 300 es
precision lowp float;
in vec2 vTextureCoord;
in vec4 vColor;
uniform sampler2D uSampler;
out vec4 fragColor;
void main(void) {
    fragColor = texture(uSampler, vTextureCoord) * vColor;
}`
  ),
  primitive_frag: (
    /* glsl */
    `#version 300 es
precision lowp float;
in vec2 vTextureCoord;
in vec4 vColor;
out vec4 fragColor;
void main(void) {
    fragColor = vColor;
}`
  ),
  blur_frag: (
    /* glsl */
    `#version 300 es
precision mediump float;
uniform vec2 blur;
uniform sampler2D uSampler;
in vec2 vTextureCoord;
uniform vec2 uTextureSize;
out vec4 fragColor;
void main() {
    const int sampleRadius = 5;
    const int samples = sampleRadius * 2 + 1;
    vec2 blurUv = blur / uTextureSize;
    vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
    vec2 uv = vec2(0.0, 0.0);
    blurUv /= float(sampleRadius);
    for (int i = -sampleRadius; i <= sampleRadius; i++) {
        uv.x = vTextureCoord.x + float(i) * blurUv.x;
        uv.y = vTextureCoord.y + float(i) * blurUv.y;
        color += texture(uSampler, uv);
    }
    color /= float(samples);
    fragColor = color;
}`
  ),
  // Horizontal blur pass for ping-pong two-pass Gaussian blur.
  blur_h_frag: (
    /* glsl */
    `#version 300 es
precision mediump float;
uniform float blurX;
uniform sampler2D uSampler;
in vec2 vTextureCoord;
uniform vec2 uTextureSize;
out vec4 fragColor;
void main() {
    float step = 1.0 / uTextureSize.x;
    vec4 color = vec4(0.0);
    float total = 0.0;
    for (int i = -8; i <= 8; i++) {
        if (abs(float(i)) > blurX) continue;
        float weight = 1.0 - abs(float(i)) / (blurX + 1.0);
        color += texture(uSampler, vTextureCoord + vec2(float(i) * step, 0.0)) * weight;
        total += weight;
    }
    fragColor = color / total;
}`
  ),
  // Vertical blur pass for ping-pong two-pass Gaussian blur.
  blur_v_frag: (
    /* glsl */
    `#version 300 es
precision mediump float;
uniform float blurY;
uniform sampler2D uSampler;
in vec2 vTextureCoord;
uniform vec2 uTextureSize;
out vec4 fragColor;
void main() {
    float step = 1.0 / uTextureSize.y;
    vec4 color = vec4(0.0);
    float total = 0.0;
    for (int i = -8; i <= 8; i++) {
        if (abs(float(i)) > blurY) continue;
        float weight = 1.0 - abs(float(i)) / (blurY + 1.0);
        color += texture(uSampler, vTextureCoord + vec2(0.0, float(i) * step)) * weight;
        total += weight;
    }
    fragColor = color / total;
}`
  ),
  glow_frag: (
    /* glsl */
    `#version 300 es
precision highp float;
in vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float dist;
uniform float angle;
uniform vec4 color;
uniform float alpha;
uniform float blurX;
uniform float blurY;
uniform float strength;
uniform float inner;
uniform float knockout;
uniform float hideObject;
uniform vec2 uTextureSize;
out vec4 fragColor;
float random(vec2 scale) {
    return fract(sin(dot(gl_FragCoord.xy, scale)) * 43758.5453);
}
void main(void) {
    vec2 px = vec2(1.0 / uTextureSize.x, 1.0 / uTextureSize.y);
    const float linearSamplingTimes = 7.0;
    const float circleSamplingTimes = 12.0;
    vec4 ownColor = texture(uSampler, vTextureCoord);
    vec4 curColor;
    float totalAlpha = 0.0;
    float maxTotalAlpha = 0.0;
    float offsetX = dist * cos(angle) * px.x;
    float offsetY = dist * sin(angle) * px.y;
    const float PI = 3.14159265358979323846264;
    float offset = PI * 2.0 / circleSamplingTimes * random(vec2(12.9898, 78.233));
    float stepX = blurX * px.x / linearSamplingTimes;
    float stepY = blurY * px.y / linearSamplingTimes;
    for (float a = 0.0; a <= PI * 2.0; a += PI * 2.0 / circleSamplingTimes) {
        float cosAngle = cos(a + offset);
        float sinAngle = sin(a + offset);
        for (float i = 1.0; i <= linearSamplingTimes; i++) {
            float curDistanceX = i * stepX * cosAngle;
            float curDistanceY = i * stepY * sinAngle;
            if (vTextureCoord.x + curDistanceX - offsetX >= 0.0 && vTextureCoord.y + curDistanceY + offsetY <= 1.0) {
                curColor = texture(uSampler, vec2(vTextureCoord.x + curDistanceX - offsetX, vTextureCoord.y + curDistanceY + offsetY));
                totalAlpha += (linearSamplingTimes - i) * curColor.a;
            }
            maxTotalAlpha += (linearSamplingTimes - i);
        }
    }
    ownColor.a = max(ownColor.a, 0.0001);
    ownColor.rgb = ownColor.rgb / ownColor.a;
    float outerGlowAlpha = (totalAlpha / maxTotalAlpha) * strength * alpha * (1.0 - inner) * max(min(hideObject, knockout), 1.0 - ownColor.a);
    float innerGlowAlpha = ((maxTotalAlpha - totalAlpha) / maxTotalAlpha) * strength * alpha * inner * ownColor.a;
    ownColor.a = max(ownColor.a * knockout * (1.0 - hideObject), 0.0001);
    vec3 mix1 = mix(ownColor.rgb, color.rgb, innerGlowAlpha / (innerGlowAlpha + ownColor.a));
    vec3 mix2 = mix(mix1, color.rgb, outerGlowAlpha / (innerGlowAlpha + ownColor.a + outerGlowAlpha));
    float resultAlpha = min(ownColor.a + outerGlowAlpha + innerGlowAlpha, 1.0);
    fragColor = vec4(mix2 * resultAlpha, resultAlpha);
}`
  ),
  colorTransform_frag: (
    /* glsl */
    `#version 300 es
precision mediump float;
in vec2 vTextureCoord;
in vec4 vColor;
uniform mat4 matrix;
uniform vec4 colorAdd;
uniform sampler2D uSampler;
out vec4 fragColor;
void main(void) {
    vec4 texColor = texture(uSampler, vTextureCoord);
    if (texColor.a > 0.0) {
        texColor = vec4(texColor.rgb / texColor.a, texColor.a);
    }
    vec4 locColor = clamp(texColor * matrix + colorAdd, 0.0, 1.0);
    fragColor = vColor * vec4(locColor.rgb * locColor.a, locColor.a);
}`
  )
};
var BLUR_TIERS2 = [4, 8, 16, 32];
function getBlurTier2(radius) {
  for (const tier of BLUR_TIERS2) {
    if (radius <= tier)
      return tier;
  }
  return 32;
}
function makeBlurHFrag2(tier) {
  return (
    /* glsl */
    `#version 300 es
precision mediump float;
uniform float blurX;
uniform sampler2D uSampler;
in vec2 vTextureCoord;
uniform vec2 uTextureSize;
out vec4 fragColor;
void main() {
    float step = 1.0 / uTextureSize.x;
    vec4 color = vec4(0.0);
    float total = 0.0;
    for (int i = -${tier}; i <= ${tier}; i++) {
        if (abs(float(i)) > blurX) continue;
        float weight = 1.0 - abs(float(i)) / (blurX + 1.0);
        color += texture(uSampler, vTextureCoord + vec2(float(i) * step, 0.0)) * weight;
        total += weight;
    }
    fragColor = color / total;
}`
  );
}
function makeBlurVFrag2(tier) {
  return (
    /* glsl */
    `#version 300 es
precision mediump float;
uniform float blurY;
uniform sampler2D uSampler;
in vec2 vTextureCoord;
uniform vec2 uTextureSize;
out vec4 fragColor;
void main() {
    float step = 1.0 / uTextureSize.y;
    vec4 color = vec4(0.0);
    float total = 0.0;
    for (int i = -${tier}; i <= ${tier}; i++) {
        if (abs(float(i)) > blurY) continue;
        float weight = 1.0 - abs(float(i)) / (blurY + 1.0);
        color += texture(uSampler, vTextureCoord + vec2(0.0, float(i) * step)) * weight;
        total += weight;
    }
    fragColor = color / total;
}`
  );
}

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/webgl/MultiTextureBatcher.js
function makeMultiCmd(count, slots, slotCount) {
  return {
    isMulti: true,
    count,
    textures: slots.slice(0, slotCount),
    textureCount: slotCount,
    filter: void 0
  };
}
var MultiTextureBatcher = class _MultiTextureBatcher {
  // ── Static fields ─────────────────────────────────────────────────────────
  static MAX_TEXTURES = 8;
  // ── Instance fields ───────────────────────────────────────────────────────
  slots = new Array(_MultiTextureBatcher.MAX_TEXTURES).fill(void 0);
  _slotCount = 0;
  _slotMap = /* @__PURE__ */ new Map();
  // ── Getters ───────────────────────────────────────────────────────────────
  get textureCount() {
    return this._slotCount;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  /**
   * Assign a slot to `texture`. Returns the slot index (0–7).
   * Returns -1 if all slots are full — caller must flush first.
   */
  getOrAssignSlot(texture) {
    const existing = this._slotMap.get(texture);
    if (existing !== void 0) {
      return existing;
    }
    if (this._slotCount >= _MultiTextureBatcher.MAX_TEXTURES) {
      return -1;
    }
    const slot = this._slotCount++;
    this.slots[slot] = texture;
    this._slotMap.set(texture, slot);
    return slot;
  }
  isFull() {
    return this._slotCount >= _MultiTextureBatcher.MAX_TEXTURES;
  }
  reset() {
    for (let i = 0; i < this._slotCount; i++) {
      this.slots[i] = void 0;
    }
    this._slotCount = 0;
    this._slotMap.clear();
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/webgl/WebGLRenderContext.js
var WebGLRenderContext = class {
  // ── Public readonly fields ────────────────────────────────────────────────
  gl;
  isWebGL2;
  surface;
  drawCmdManager;
  // ── Shader library (selected at init based on WebGL version) ─────────────
  shaders;
  blurTierFn;
  makeBlurH;
  makeBlurV;
  // ── Public mutable fields ─────────────────────────────────────────────────
  maxTextureSize = 2048;
  contextLost = false;
  projectionX = 0;
  projectionY = 0;
  activeFilter;
  currentBlendMode = "source-over";
  // ── Private fields ────────────────────────────────────────────────────────
  _vao;
  _batcher = new MultiTextureBatcher();
  _bufferStack = [];
  _currentBuffer;
  _vertexBuffer;
  _indexBuffer;
  _bindIndices = false;
  // Track which GPU buffer size is currently allocated so we only re-allocate
  // when switching between single-texture and multi-texture layouts.
  _gpuVertexBufferSize = 0;
  _defaultEmptyTexture;
  _maxTextureUnits = MultiTextureBatcher.MAX_TEXTURES;
  _contextRestoredCallbacks = [];
  _trackedBitmapDatas = /* @__PURE__ */ new Set();
  // ── Blur FBO pool ─────────────────────────────────────────────────────────
  // Key: "${width}x${height}", Value: stack of reusable { texture, fbo } pairs.
  _blurFboPool = /* @__PURE__ */ new Map();
  // Public so Player can construct it. The engine is single-Player by
  // design; there is intentionally no getInstance() singleton.
  constructor(canvas) {
    this.surface = canvas;
    const gl2 = canvas.getContext("webgl2");
    if (gl2) {
      this.gl = gl2;
      this.isWebGL2 = true;
      this.shaders = ShaderLib2;
      this.blurTierFn = getBlurTier2;
      this.makeBlurH = makeBlurHFrag2;
      this.makeBlurV = makeBlurVFrag2;
    } else {
      const gl1 = canvas.getContext("webgl");
      if (!gl1)
        throw new Error("WebGL not supported");
      this.gl = gl1;
      this.isWebGL2 = false;
      this.shaders = ShaderLib;
      this.blurTierFn = getBlurTier;
      this.makeBlurH = makeBlurHFrag;
      this.makeBlurV = makeBlurVFrag;
    }
    const gl = this.gl;
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.colorMask(true, true, true, true);
    gl.activeTexture(gl.TEXTURE0);
    this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    this._maxTextureUnits = Math.min(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS), MultiTextureBatcher.MAX_TEXTURES);
    this._vertexBuffer = gl.createBuffer();
    this._indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    this.drawCmdManager = new WebGLDrawCmdManager();
    this._vao = new WebGLVertexArrayObject();
    gl.bufferData(gl.ARRAY_BUFFER, WebGLVertexArrayObject.MAX_VERTEX_BYTES, gl.DYNAMIC_DRAW);
    this._gpuVertexBufferSize = WebGLVertexArrayObject.MAX_VERTEX_BYTES;
    this.setGlobalCompositeOperation("source-over");
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.contextLost = true;
    });
    canvas.addEventListener("webglcontextrestored", () => {
      this.contextLost = false;
      this._onContextRestored();
    });
  }
  // ── Getter ────────────────────────────────────────────────────────────────
  /**
   * Register a callback invoked after the WebGL context is restored.
   * Returns an unregister function.
   */
  addContextRestoredListener(fn) {
    this._contextRestoredCallbacks.push(fn);
    return () => {
      const i = this._contextRestoredCallbacks.indexOf(fn);
      if (i >= 0)
        this._contextRestoredCallbacks.splice(i, 1);
    };
  }
  get activatedBuffer() {
    return this._currentBuffer;
  }
  get defaultEmptyTexture() {
    if (!this._defaultEmptyTexture) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 16;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 16, 16);
      this._defaultEmptyTexture = this.createTexture(canvas);
      this._defaultEmptyTexture[SYM_DEFAULT_EMPTY] = true;
    }
    return this._defaultEmptyTexture;
  }
  // ── Buffer stack ──────────────────────────────────────────────────────────
  pushBuffer(buffer) {
    this._bufferStack.push(buffer);
    if (buffer !== this._currentBuffer) {
      this.drawCmdManager.pushActivateBuffer(buffer);
    }
    this._currentBuffer = buffer;
  }
  popBuffer() {
    if (this._bufferStack.length <= 1)
      return;
    this._bufferStack.pop();
    const last = this._bufferStack[this._bufferStack.length - 1];
    if (last !== this._currentBuffer) {
      this.drawCmdManager.pushActivateBuffer(last);
    }
    this._currentBuffer = last;
  }
  // ── Resize ────────────────────────────────────────────────────────────────
  resize(width, height) {
    this.surface.width = width;
    this.surface.height = height;
    this.onResize(width, height);
  }
  onResize(width, height) {
    const w = width ?? this.surface.width;
    const h = height ?? this.surface.height;
    this.projectionX = w / 2;
    this.projectionY = -h / 2;
    this.gl.viewport(0, 0, w, h);
  }
  // ── Stencil / Scissor ─────────────────────────────────────────────────────
  enableStencilTest() {
    this.gl.enable(this.gl.STENCIL_TEST);
  }
  disableStencilTest() {
    this.gl.disable(this.gl.STENCIL_TEST);
  }
  enableScissorTest(rect) {
    const gl = this.gl;
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(rect.x, rect.y, rect.width, rect.height);
  }
  disableScissorTest() {
    this.gl.disable(this.gl.SCISSOR_TEST);
  }
  enableScissor(x, y, width, height) {
    this.drawCmdManager.pushEnableScissor(x, y, width, height);
  }
  disableScissor() {
    this.drawCmdManager.pushDisableScissor();
  }
  // ── Mask (stencil-based) ──────────────────────────────────────────────────
  pushMask(x, y, width, height) {
    this.drawCmdManager.pushPushMask();
    const buf = this._currentBuffer;
    this._vao.cacheArrays(buf, 0, 0, width, height, x, y, width, height, width, height);
    this.drawCmdManager.pushDrawRect();
  }
  popMask() {
    this.drawCmdManager.pushPopMask();
    const buf = this._currentBuffer;
    const rect = buf.stencilList[buf.stencilList.length - 1];
    if (rect) {
      this._vao.cacheArrays(buf, 0, 0, rect.width, rect.height, rect.x, rect.y, rect.width, rect.height, rect.width, rect.height);
      this.drawCmdManager.pushDrawRect();
    }
  }
  // ── Blend mode ────────────────────────────────────────────────────────────
  setGlobalCompositeOperation(value) {
    this.currentBlendMode = value;
    this.drawCmdManager.pushSetBlend(value);
  }
  // ── Texture ───────────────────────────────────────────────────────────────
  createTexture(source) {
    const gl = this.gl;
    const texture = gl.createTexture();
    texture[SYM_GL_CONTEXT] = gl;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
    texture[SYM_PREMULTIPLIED] = true;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }
  updateTexture(texture, source) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }
  getWebGLTexture(bitmapData) {
    const source = bitmapData.source;
    if (!source)
      return void 0;
    if (!bitmapData.webGLTexture) {
      const tex = this.createTexture(source);
      bitmapData.webGLTexture = tex;
      tex[SYM_SMOOTHING] = true;
      this._trackedBitmapDatas.add(new WeakRef(bitmapData));
    } else if (source instanceof HTMLVideoElement) {
      this.updateTexture(bitmapData.webGLTexture, source);
    }
    return bitmapData.webGLTexture;
  }
  // ── Draw ──────────────────────────────────────────────────────────────────
  drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, imageSourceWidth, imageSourceHeight, rotated, smoothing) {
    if (this.contextLost || !image || !this._currentBuffer)
      return;
    const texture = this.getWebGLTexture(image);
    if (!texture)
      return;
    this.drawTexture(texture, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, imageSourceWidth, imageSourceHeight, void 0, void 0, void 0, void 0, rotated, smoothing);
  }
  drawMesh(image, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, imageSourceWidth, imageSourceHeight, meshUVs, meshVertices, meshIndices, rotated, smoothing) {
    if (this.contextLost || !image || !this._currentBuffer)
      return;
    const texture = this.getWebGLTexture(image);
    if (!texture)
      return;
    this.drawTexture(texture, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, imageSourceWidth, imageSourceHeight, meshUVs, meshVertices, meshIndices, void 0, rotated, smoothing);
  }
  drawTexture(texture, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, textureWidth, textureHeight, meshUVs, meshVertices, meshIndices, _bounds, rotated, smoothing) {
    if (this.contextLost || !texture || !this._currentBuffer)
      return;
    const buf = this._currentBuffer;
    if (meshVertices && meshIndices) {
      const meshNum = meshIndices.length / 3;
      if (this._vao.reachMaxSize(meshNum * 4, meshNum * 6))
        this.flush();
    } else {
      if (this._vao.reachMaxSize())
        this.flush();
    }
    if (smoothing !== void 0 && texture[SYM_SMOOTHING] !== smoothing) {
      this.drawCmdManager.pushChangeSmoothing(texture, smoothing);
    }
    if (meshUVs)
      this._vao.changeToMeshIndices();
    const useMulti = !this.activeFilter && !meshVertices && this._maxTextureUnits > 1;
    if (useMulti) {
      let slot = this._batcher.getOrAssignSlot(texture);
      if (slot === -1) {
        this.flush();
        slot = this._batcher.getOrAssignSlot(texture);
      }
      if (!this._vao.isMultiTexture())
        this._vao.setMultiTexture(true);
      this._vao.cacheArrays(buf, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, textureWidth, textureHeight, void 0, void 0, void 0, rotated, slot);
      const cmd = makeMultiCmd(2, this._batcher.slots, this._batcher.textureCount);
      this.drawCmdManager.pushDrawMultiTexture(cmd);
      return;
    }
    if (this._vao.isMultiTexture())
      this.flush();
    this._vao.cacheArrays(buf, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, textureWidth, textureHeight, meshUVs, meshVertices, meshIndices, rotated);
    const count = meshIndices ? meshIndices.length / 3 : 2;
    this.drawCmdManager.pushDrawTexture(texture, count, this.activeFilter, textureWidth, textureHeight);
  }
  /**
   * Composite the offscreen filter result back onto the current (parent) buffer.
   *
   * Strategy (following Egret's WebGLRenderer._drawWithFilter pattern):
   *
   * 1. Flush all pending batched commands so the offscreen FBO content is
   *    fully rasterised and the GL state is clean.
   * 2. Apply multi-pass effects (blur ping-pong) directly on the offscreen
   *    texture via temporary FBOs.
   * 3. Activate the parent buffer's FBO.
   * 4. Draw the offscreen texture onto the parent buffer using the batched
   *    drawTexture() path so that the parent buffer's globalMatrix is
   *    correctly applied to position the result.
   * 5. Flush immediately so the draw executes while the GL FBO state is
   *    known-good, preventing feedback loops.
   */
  compositeFilterResult(filters, offscreen) {
    const target = offscreen.rootRenderTarget;
    if (!target?.texture) {
      return;
    }
    const w = target.width;
    const h = target.height;
    this.flush();
    for (const filter of filters) {
      if (filter instanceof BlurFilter && (filter.blurX > 0 || filter.blurY > 0)) {
        this._drawBlurPingPong(target.texture, w, h, filter, offscreen);
      }
    }
    if (this._currentBuffer) {
      this._currentBuffer.rootRenderTarget.activate();
      this.onResize(this._currentBuffer.width, this._currentBuffer.height);
    }
    const nonBlurFilter = filters.find((f) => !(f instanceof BlurFilter));
    this.activeFilter = nonBlurFilter;
    this.drawTexture(target.texture, 0, 0, w, h, 0, 0, w, h, w, h);
    this.activeFilter = void 0;
    this.flush();
  }
  /**
   * Two-pass separable Gaussian blur.
   * Horizontal pass renders into a temporary FBO; vertical pass writes the
   * blurred result back into the offscreen buffer's FBO so that the caller
   * (compositeFilterResult) can composite it onto the parent buffer.
   *
   * Optimisations vs. the naive approach:
   * - FBO pool: temporary textures/framebuffers are reused across frames
   *   (keyed by size) to avoid the expensive create/delete cycle on mobile.
   * - Dynamic shader tier: the loop bound in the GLSL is a compile-time
   *   constant chosen from {4, 8, 16, 32} so the GPU can unroll/optimise it,
   *   while still supporting blur radii up to 32 px.
   *
   * NOTE: This method does NOT restore the parent buffer's FBO — the caller
   * is responsible for activating the correct destination FBO before the
   * final composite draw.
   */
  _drawBlurPingPong(texture, w, h, filter, buffer) {
    const gl = this.gl;
    const poolKey = `${w}x${h}`;
    let pool = this._blurFboPool.get(poolKey);
    if (!pool) {
      pool = [];
      this._blurFboPool.set(poolKey, pool);
    }
    let tmpEntry = pool.pop();
    if (!tmpEntry) {
      const tmpTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tmpTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const tmpFbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, tmpFbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tmpTex, 0);
      tmpEntry = { texture: tmpTex, fbo: tmpFbo };
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, tmpEntry.fbo);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const hTier = this.blurTierFn(filter.blurX);
    const vTier = this.blurTierFn(filter.blurY);
    const hKey = `blur_h_${hTier}`;
    const vKey = `blur_v_${vTier}`;
    const hProg = WebGLProgram.get(gl, this.shaders.fullscreen_vert, this.makeBlurH(hTier), hKey);
    this._drawFullscreenQuad(hProg, texture, w, h, (prog) => {
      const uBlurX = prog.uniforms["blurX"];
      const uSize = prog.uniforms["uTextureSize"];
      if (uBlurX)
        gl.uniform1f(uBlurX, filter.blurX);
      if (uSize)
        gl.uniform2f(uSize, w, h);
    });
    buffer.rootRenderTarget.activate();
    this.onResize(w, h);
    const vProg = WebGLProgram.get(gl, this.shaders.fullscreen_vert, this.makeBlurV(vTier), vKey);
    this._drawFullscreenQuad(vProg, tmpEntry.texture, w, h, (prog) => {
      const uBlurY = prog.uniforms["blurY"];
      const uSize = prog.uniforms["uTextureSize"];
      if (uBlurY)
        gl.uniform1f(uBlurY, filter.blurY);
      if (uSize)
        gl.uniform2f(uSize, w, h);
    });
    pool.push(tmpEntry);
  }
  /**
   * Draws a single full-screen quad using the given program and texture.
   * `setUniforms` is called after `useProgram` to let the caller set
   * filter-specific uniforms.
   */
  _drawFullscreenQuad(prog, texture, w, h, setUniforms) {
    const gl = this.gl;
    gl.useProgram(prog.id);
    const stride = 5 * 4;
    const aPos = prog.attributes["aVertexPosition"];
    const aUV = prog.attributes["aTextureCoord"];
    const aColor = prog.attributes["aColor"];
    if (aPos !== void 0 && aPos >= 0) {
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0);
    }
    if (aUV !== void 0 && aUV >= 0) {
      gl.enableVertexAttribArray(aUV);
      gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, stride, 8);
    }
    if (aColor !== void 0 && aColor >= 0) {
      gl.enableVertexAttribArray(aColor);
      gl.vertexAttribPointer(aColor, 4, gl.UNSIGNED_BYTE, true, stride, 16);
    }
    const uProj = prog.uniforms["projectionVector"];
    if (uProj)
      gl.uniform2f(uProj, w / 2, -h / 2);
    const uSampler = prog.uniforms["uSampler"];
    if (uSampler)
      gl.uniform1i(uSampler, 0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    setUniforms(prog);
    const f32 = new Float32Array(20);
    const u32 = new Uint32Array(f32.buffer);
    const packed = 4294967295;
    f32[0] = 0;
    f32[1] = 0;
    f32[2] = 0;
    f32[3] = 0;
    u32[4] = packed;
    f32[5] = w;
    f32[6] = 0;
    f32[7] = 1;
    f32[8] = 0;
    u32[9] = packed;
    f32[10] = w;
    f32[11] = h;
    f32[12] = 1;
    f32[13] = 1;
    u32[14] = packed;
    f32[15] = 0;
    f32[16] = h;
    f32[17] = 0;
    f32[18] = 1;
    u32[19] = packed;
    gl.bufferData(gl.ARRAY_BUFFER, f32, gl.STREAM_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.bufferData(gl.ARRAY_BUFFER, this._gpuVertexBufferSize, gl.DYNAMIC_DRAW);
    this._bindIndices = false;
  }
  clear() {
    this.drawCmdManager.pushClearColor();
  }
  getPixels(x, y, width, height, pixels) {
    this.gl.readPixels(x, y, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
  }
  // ── Execute ───────────────────────────────────────────────────────────────
  flush() {
    this._flush();
  }
  // ── Private — flush & dispatch ────────────────────────────────────────────
  _onContextRestored() {
    const gl = this.gl;
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.colorMask(true, true, true, true);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._gpuVertexBufferSize, gl.DYNAMIC_DRAW);
    WebGLProgram.clearCache();
    this._bindIndices = false;
    this._batcher.reset();
    this.drawCmdManager.clear();
    this._vao.clear();
    this._defaultEmptyTexture = void 0;
    this._blurFboPool.clear();
    for (const ref of this._trackedBitmapDatas) {
      const bd = ref.deref();
      if (bd) {
        bd.webGLTexture = void 0;
      } else {
        this._trackedBitmapDatas.delete(ref);
      }
    }
    this.onResize();
    for (const fn of this._contextRestoredCallbacks)
      fn();
  }
  _flush() {
    const gl = this.gl;
    const cmds = this.drawCmdManager;
    const vao = this._vao;
    if (vao.getVerticesByteLength() === 0 && cmds.drawDataLen === 0)
      return;
    const neededBytes = vao.getVerticesByteLength();
    if (neededBytes > 0) {
      if (neededBytes > this._gpuVertexBufferSize) {
        const newSize = WebGLVertexArrayObject.MAX_MULTI_VERTEX_BYTES;
        gl.bufferData(gl.ARRAY_BUFFER, newSize, gl.DYNAMIC_DRAW);
        this._gpuVertexBufferSize = newSize;
      }
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Uint8Array(vao.getVerticesBuffer(), 0, neededBytes));
    }
    if (!this._bindIndices) {
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, vao.isMesh() ? vao.getMeshIndices() : vao.getIndices(), gl.STATIC_DRAW);
      if (!vao.isMesh()) {
        this._bindIndices = true;
      }
    }
    let indexOffset = 0;
    let gpuDrawCalls = 0;
    for (let i = 0; i < cmds.drawDataLen; i++) {
      const cmd = cmds.drawData[i];
      switch (cmd.type) {
        case 7:
          this._activateBuffer(cmd.buffer, cmd.width, cmd.height);
          break;
        case 5:
          cmd.buffer.rootRenderTarget?.resize(cmd.width, cmd.height);
          break;
        case 6:
          gl.colorMask(true, true, true, true);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          break;
        case 4:
          this._applyBlend(cmd.value);
          break;
        case 8:
          gl.enable(gl.SCISSOR_TEST);
          gl.scissor(cmd.x, cmd.y, cmd.width, cmd.height);
          break;
        case 9:
          gl.disable(gl.SCISSOR_TEST);
          break;
        case 2:
          this._pushMaskDraw(indexOffset, cmd.count);
          indexOffset += cmd.count;
          break;
        case 3:
          this._popMaskDraw(indexOffset, cmd.count);
          indexOffset += cmd.count;
          break;
        case 10:
          if (cmd.texture) {
            gl.bindTexture(gl.TEXTURE_2D, cmd.texture);
            const filter = cmd.smoothing ? gl.LINEAR : gl.NEAREST;
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
          }
          break;
        case 0:
          this._drawTextureBatch(cmd.texture, indexOffset, cmd.count, cmd.filter, cmd.textureWidth, cmd.textureHeight);
          indexOffset += cmd.count;
          gpuDrawCalls++;
          break;
        case 11:
          if (cmd.multiCmd) {
            this._drawMultiTextureBatch(cmd.multiCmd, indexOffset, cmd.count);
            indexOffset += cmd.count;
            gpuDrawCalls++;
          }
          break;
        case 1:
          this._drawRectBatch(indexOffset, cmd.count);
          indexOffset += cmd.count;
          gpuDrawCalls++;
          break;
      }
    }
    vao.clear();
    cmds.clear();
    this._batcher.reset();
    this._bindIndices = false;
    if (gpuDrawCalls > 0 && this._currentBuffer) {
      this._currentBuffer.drawCalls += gpuDrawCalls;
    }
  }
  // ── Private — blend & program ─────────────────────────────────────────────
  _activateBuffer(buffer, width, height) {
    const gl = this.gl;
    buffer.rootRenderTarget?.activate();
    if (!this._bindIndices) {
      const vao = this._vao;
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, vao.isMesh() ? vao.getMeshIndices() : vao.getIndices(), gl.STATIC_DRAW);
    }
    buffer.restoreStencil();
    buffer.restoreScissor();
    this.onResize(width, height);
  }
  _applyBlend(value) {
    const gl = this.gl;
    switch (value) {
      case "source-over":
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        break;
      case "lighter":
        gl.blendFunc(gl.ONE, gl.ONE);
        break;
      case "destination-out":
        gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
        break;
      case "destination-in":
        gl.blendFunc(gl.ZERO, gl.SRC_ALPHA);
        break;
      default:
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        break;
    }
  }
  // ── Private — draw batches ────────────────────────────────────────────────
  _drawMultiTextureBatch(cmd, indexOffset, count) {
    const gl = this.gl;
    const prog = WebGLProgram.get(gl, this.shaders.multi_vert, this.shaders.multi_frag, "multi");
    gl.useProgram(prog.id);
    const stride = 6 * 4;
    const aPos = prog.attributes["aVertexPosition"];
    const aUV = prog.attributes["aTextureCoord"];
    const aColor = prog.attributes["aColor"];
    const aTid = prog.attributes["aTextureId"];
    if (aPos !== void 0 && aPos >= 0) {
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0);
    }
    if (aUV !== void 0 && aUV >= 0) {
      gl.enableVertexAttribArray(aUV);
      gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, stride, 8);
    }
    if (aColor !== void 0 && aColor >= 0) {
      gl.enableVertexAttribArray(aColor);
      gl.vertexAttribPointer(aColor, 4, gl.UNSIGNED_BYTE, true, stride, 16);
    }
    if (aTid !== void 0 && aTid >= 0) {
      gl.enableVertexAttribArray(aTid);
      gl.vertexAttribPointer(aTid, 1, gl.FLOAT, false, stride, 20);
    }
    const uProj = prog.uniforms["projectionVector"];
    if (uProj)
      gl.uniform2f(uProj, this.projectionX, this.projectionY);
    const uSamplers = prog.uniforms["uSamplers[0]"];
    const samplerIndices = new Int32Array(cmd.textureCount);
    for (let i = 0; i < cmd.textureCount; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, cmd.textures[i] ?? null);
      samplerIndices[i] = i;
    }
    if (uSamplers)
      gl.uniform1iv(uSamplers, samplerIndices);
    gl.activeTexture(gl.TEXTURE0);
    gl.drawElements(gl.TRIANGLES, count * 3, gl.UNSIGNED_SHORT, indexOffset * 6);
  }
  _getTextureProgram(filter) {
    if (filter instanceof ColorMatrixFilter) {
      return WebGLProgram.get(this.gl, this.shaders.default_vert, this.shaders.colorTransform_frag, "colorTransform");
    }
    if (filter instanceof BlurFilter || filter instanceof GlowFilter || filter instanceof DropShadowFilter) {
      return WebGLProgram.get(this.gl, this.shaders.default_vert, this.shaders.glow_frag, "glow");
    }
    return WebGLProgram.get(this.gl, this.shaders.default_vert, this.shaders.texture_frag, "texture");
  }
  _drawTextureBatch(texture, indexOffset, count, filter, texW, texH) {
    const gl = this.gl;
    const prog = this._getTextureProgram(filter);
    gl.useProgram(prog.id);
    const stride = 5 * 4;
    const aPos = prog.attributes["aVertexPosition"];
    const aUV = prog.attributes["aTextureCoord"];
    const aColor = prog.attributes["aColor"];
    if (aPos !== void 0 && aPos >= 0) {
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0);
    }
    if (aUV !== void 0 && aUV >= 0) {
      gl.enableVertexAttribArray(aUV);
      gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, stride, 8);
    }
    if (aColor !== void 0 && aColor >= 0) {
      gl.enableVertexAttribArray(aColor);
      gl.vertexAttribPointer(aColor, 4, gl.UNSIGNED_BYTE, true, stride, 16);
    }
    const uProj = prog.uniforms["projectionVector"];
    if (uProj)
      gl.uniform2f(uProj, this.projectionX, this.projectionY);
    const uSampler = prog.uniforms["uSampler"];
    if (uSampler)
      gl.uniform1i(uSampler, 0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if (filter instanceof ColorMatrixFilter) {
      const uMatrix = prog.uniforms["matrix"];
      const uAdd = prog.uniforms["colorAdd"];
      const fu = filter.uniforms;
      if (uMatrix)
        gl.uniformMatrix4fv(uMatrix, false, new Float32Array(fu.matrix));
      if (uAdd)
        gl.uniform4f(uAdd, fu.colorAdd.x, fu.colorAdd.y, fu.colorAdd.z, fu.colorAdd.w);
    } else if (filter instanceof BlurFilter) {
      const uBlur = prog.uniforms["blur"];
      const uSize = prog.uniforms["uTextureSize"];
      if (uBlur)
        gl.uniform2f(uBlur, filter.blurX, filter.blurY);
      if (uSize)
        gl.uniform2f(uSize, texW, texH);
    } else if (filter instanceof GlowFilter || filter instanceof DropShadowFilter) {
      const uSize = prog.uniforms["uTextureSize"];
      if (uSize)
        gl.uniform2f(uSize, texW, texH);
      const uColor = prog.uniforms["color"];
      const c = filter.color;
      if (uColor)
        gl.uniform4f(uColor, (c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255, 1);
      const uAlpha = prog.uniforms["alpha"];
      if (uAlpha)
        gl.uniform1f(uAlpha, filter.alpha);
      const uStrength = prog.uniforms["strength"];
      if (uStrength)
        gl.uniform1f(uStrength, filter.strength);
      const uBlurX = prog.uniforms["blurX"];
      if (uBlurX)
        gl.uniform1f(uBlurX, filter.blurX);
      const uBlurY = prog.uniforms["blurY"];
      if (uBlurY)
        gl.uniform1f(uBlurY, filter.blurY);
      if (filter instanceof DropShadowFilter) {
        const uDist = prog.uniforms["dist"];
        if (uDist)
          gl.uniform1f(uDist, filter.distance);
        const uAngle = prog.uniforms["angle"];
        if (uAngle)
          gl.uniform1f(uAngle, -(filter.angle / 180) * Math.PI);
        const uHide = prog.uniforms["hideObject"];
        if (uHide)
          gl.uniform1f(uHide, filter.hideObject ? 1 : 0);
      } else {
        const uDist = prog.uniforms["dist"];
        if (uDist)
          gl.uniform1f(uDist, 0);
        const uAngle = prog.uniforms["angle"];
        if (uAngle)
          gl.uniform1f(uAngle, 0);
        const uHide = prog.uniforms["hideObject"];
        if (uHide)
          gl.uniform1f(uHide, 0);
      }
      const uInner = prog.uniforms["inner"];
      if (uInner)
        gl.uniform1f(uInner, filter instanceof GlowFilter && filter.inner ? 1 : 0);
      const uKnockout = prog.uniforms["knockout"];
      if (uKnockout)
        gl.uniform1f(uKnockout, filter instanceof GlowFilter && filter.knockout ? 1 : 0);
    }
    gl.drawElements(gl.TRIANGLES, count * 3, gl.UNSIGNED_SHORT, indexOffset * 6);
  }
  _drawRectBatch(indexOffset, count) {
    const gl = this.gl;
    const prog = WebGLProgram.get(gl, this.shaders.default_vert, this.shaders.primitive_frag, "primitive");
    gl.useProgram(prog.id);
    const stride = 5 * 4;
    const aPos = prog.attributes["aVertexPosition"];
    const aColor = prog.attributes["aColor"];
    if (aPos !== void 0 && aPos >= 0) {
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0);
    }
    if (aColor !== void 0 && aColor >= 0) {
      gl.enableVertexAttribArray(aColor);
      gl.vertexAttribPointer(aColor, 4, gl.UNSIGNED_BYTE, true, stride, 16);
    }
    const uProj = prog.uniforms["projectionVector"];
    if (uProj)
      gl.uniform2f(uProj, this.projectionX, this.projectionY);
    gl.drawElements(gl.TRIANGLES, count * 3, gl.UNSIGNED_SHORT, indexOffset * 6);
  }
  // ── Private — stencil mask ────────────────────────────────────────────────
  _pushMaskDraw(indexOffset, count) {
    const gl = this.gl;
    const buf = this._currentBuffer;
    buf.enableStencil();
    gl.colorMask(false, false, false, false);
    gl.stencilFunc(gl.ALWAYS, 1, 255);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
    this._drawRectBatch(indexOffset, count);
    gl.colorMask(true, true, true, true);
    gl.stencilFunc(gl.EQUAL, buf.stencilHandleCount + 1, 255);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
    buf.stencilHandleCount++;
  }
  _popMaskDraw(indexOffset, count) {
    const gl = this.gl;
    const buf = this._currentBuffer;
    gl.colorMask(false, false, false, false);
    gl.stencilFunc(gl.ALWAYS, 1, 255);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.DECR);
    this._drawRectBatch(indexOffset, count);
    gl.colorMask(true, true, true, true);
    buf.stencilHandleCount--;
    if (buf.stencilHandleCount === 0) {
      buf.disableStencil();
    } else {
      gl.stencilFunc(gl.EQUAL, buf.stencilHandleCount, 255);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
    }
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/Player.js
var Player = class _Player {
  // ── Static fields ─────────────────────────────────────────────────────────
  static _IDENTITY = new Matrix();
  // ── Instance fields ───────────────────────────────────────────────────────
  stage;
  _isPlaying = false;
  _root;
  _canvas2dBuffer;
  _canvas2dRenderer;
  _webglBuffer;
  _webglRenderer;
  _webglContext;
  _unregisterCallbacks = [];
  perf = {
    frameCount: 0,
    lastFrameTime: 0,
    fps: 0,
    avgFps: 0,
    minFps: 0,
    maxFps: 0,
    drawCalls: 0,
    avgDrawCalls: 0,
    renderTimeMs: 0,
    avgRenderTimeMs: 0,
    maxRenderTimeMs: 0,
    totalRenderTimeMs: 0
  };
  _fpsFrames = 0;
  _fpsLastTime = performance.now();
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(canvas, stage) {
    this.stage = stage ?? new Stage();
    if (checkWebGLSupport()) {
      try {
        this._webglContext = new WebGLRenderContext(canvas);
        this._webglBuffer = new WebGLRenderBuffer(this._webglContext, canvas.width || 1, canvas.height || 1, true);
        this._webglRenderer = new WebGLRenderer();
        const renderer = this._webglRenderer;
        DisplayObject.$onStructureChange = () => renderer.markStructureDirty();
        DisplayObjectContainer.$onContainerStructureChange = (owner) => renderer.markStructureDirty(owner);
        DisplayObject.$onRenderableDirty = (obj) => renderer.markRenderableDirty(obj);
        this._unregisterCallbacks.push(
          // After context loss + restore, all WebGL textures are invalid and
          // the instruction set contains stale texture references. Force a
          // full rebuild so the next render re-uploads everything.
          this._webglContext.addContextRestoredListener(() => renderer.markStructureDirty())
        );
        return;
      } catch {
        this._webglContext = void 0;
        this._webglBuffer = void 0;
      }
    }
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("Failed to get Canvas 2D context");
    this._canvas2dBuffer = new RenderBuffer();
    this._canvas2dBuffer.surface = canvas;
    this._canvas2dBuffer.context = ctx;
    this._canvas2dRenderer = new CanvasRenderer();
  }
  get isWebGL() {
    return !!this._webglRenderer;
  }
  start(root) {
    if (this._isPlaying)
      return;
    this._isPlaying = true;
    if (root && !this._root) {
      this._root = root;
      this.stage.addChild(root);
    }
    ticker.addPlayer(this);
    ticker.start();
  }
  stop() {
    this.pause();
  }
  pause() {
    if (!this._isPlaying)
      return;
    this._isPlaying = false;
    ticker.removePlayer(this);
  }
  /** Destroy the player and release all resources. */
  destroy() {
    this.pause();
    for (const fn of this._unregisterCallbacks)
      fn();
    this._unregisterCallbacks = [];
    DisplayObject.$onStructureChange = void 0;
    DisplayObject.$onRenderableDirty = void 0;
    DisplayObjectContainer.$onContainerStructureChange = void 0;
  }
  updateStageSize(width, height) {
    this.stage.resize(width, height);
    if (this._webglBuffer) {
      this._webglBuffer.resize(width, height);
    } else {
      this._canvas2dBuffer?.resize(width, height);
    }
  }
  // ── Public methods (Renderable) ───────────────────────────────────────────
  render(_triggerByFrame, _costTicker) {
    const t0 = performance.now();
    if (this._webglBuffer && this._webglRenderer) {
      this._webglBuffer.clear();
      this.perf.drawCalls = this._webglRenderer.render(this.stage, this._webglBuffer, _Player._IDENTITY);
    } else if (this._canvas2dBuffer && this._canvas2dRenderer) {
      this._canvas2dBuffer.clear();
      this.perf.drawCalls = this._canvas2dRenderer.render(this.stage, this._canvas2dBuffer);
    }
    const renderTime = performance.now() - t0;
    this.perf.renderTimeMs = renderTime;
    this.perf.totalRenderTimeMs += renderTime;
    if (renderTime > this.perf.maxRenderTimeMs)
      this.perf.maxRenderTimeMs = renderTime;
    this.perf.frameCount++;
    this._fpsFrames++;
    const now = performance.now();
    const elapsed = now - this._fpsLastTime;
    if (elapsed >= 1e3) {
      const fps = this._fpsFrames / elapsed * 1e3;
      this.perf.fps = fps;
      if (fps < this.perf.minFps)
        this.perf.minFps = fps;
      if (fps > this.perf.maxFps)
        this.perf.maxFps = fps;
      this.perf.avgFps = this.perf.frameCount / (this.perf.totalRenderTimeMs / 1e3 + (now - this._fpsLastTime + elapsed) / 1e3) || fps;
      this._fpsFrames = 0;
      this._fpsLastTime = now;
    }
    this.perf.avgDrawCalls = this.perf.drawCalls;
    this.perf.avgRenderTimeMs = this.perf.totalRenderTimeMs / this.perf.frameCount;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/TouchHandler.js
var TouchHandler = class {
  // ── Instance fields ───────────────────────────────────────────────────────
  _stage;
  _canvas;
  _maxTouches;
  _useTouchesCount = 0;
  _touchDownTarget = /* @__PURE__ */ new Map();
  _lastTouchX = -1;
  _lastTouchY = -1;
  _scaleX = 1;
  _scaleY = 1;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(stage, canvas) {
    this._stage = stage;
    this._canvas = canvas;
    this._maxTouches = stage.maxTouches;
    this.bindEvents();
  }
  // ── Public methods ────────────────────────────────────────────────────────
  /**
   * Updates the coordinate scale factors when the canvas size changes.
   * Call this after resizing the canvas or changing the stage size.
   */
  updateScale(scaleX, scaleY) {
    this._scaleX = scaleX;
    this._scaleY = scaleY;
  }
  updateMaxTouches(value) {
    this._maxTouches = value;
  }
  dispose() {
    this._canvas.removeEventListener("touchstart", this.onTouchStartEvent);
    this._canvas.removeEventListener("touchmove", this.onTouchMoveEvent);
    this._canvas.removeEventListener("touchend", this.onTouchEndEvent);
    this._canvas.removeEventListener("touchcancel", this.onTouchEndEvent);
    this._canvas.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
    this._touchDownTarget.clear();
    this._useTouchesCount = 0;
  }
  // ── Touch event handlers ──────────────────────────────────────────────────
  onTouchBegin(x, y, touchPointID) {
    if (this._useTouchesCount >= this._maxTouches)
      return;
    this._lastTouchX = x;
    this._lastTouchY = y;
    const target = this.findTarget(x, y);
    if (!this._touchDownTarget.has(touchPointID)) {
      this._touchDownTarget.set(touchPointID, target);
      this._useTouchesCount++;
    }
    TouchEvent.dispatchTouchEvent(target, TouchEvent.TOUCH_BEGIN, true, true, x, y, touchPointID, true);
  }
  onTouchMove(x, y, touchPointID) {
    if (!this._touchDownTarget.has(touchPointID))
      return;
    if (this._lastTouchX === x && this._lastTouchY === y)
      return;
    this._lastTouchX = x;
    this._lastTouchY = y;
    const target = this.findTarget(x, y);
    TouchEvent.dispatchTouchEvent(target, TouchEvent.TOUCH_MOVE, true, true, x, y, touchPointID, true);
  }
  onTouchEnd(x, y, touchPointID) {
    const oldTarget = this._touchDownTarget.get(touchPointID);
    if (!oldTarget)
      return;
    this._touchDownTarget.delete(touchPointID);
    this._useTouchesCount--;
    const target = this.findTarget(x, y);
    TouchEvent.dispatchTouchEvent(target, TouchEvent.TOUCH_END, true, true, x, y, touchPointID, false);
    if (oldTarget === target) {
      TouchEvent.dispatchTouchEvent(target, TouchEvent.TOUCH_TAP, true, true, x, y, touchPointID, false);
    } else {
      TouchEvent.dispatchTouchEvent(oldTarget, TouchEvent.TOUCH_RELEASE_OUTSIDE, true, true, x, y, touchPointID, false);
    }
  }
  // ── Private methods ───────────────────────────────────────────────────────
  findTarget(stageX, stageY) {
    return this._stage.$hitTest(stageX, stageY) ?? this._stage;
  }
  getStageCoords(clientX, clientY) {
    const rect = this._canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this._canvas.clientLeft) * this._scaleX,
      y: (clientY - rect.top - this._canvas.clientTop) * this._scaleY
    };
  }
  bindEvents() {
    this._canvas.addEventListener("touchstart", this.onTouchStartEvent, { passive: false });
    this._canvas.addEventListener("touchmove", this.onTouchMoveEvent, { passive: false });
    this._canvas.addEventListener("touchend", this.onTouchEndEvent);
    this._canvas.addEventListener("touchcancel", this.onTouchEndEvent);
    this._canvas.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
  }
  onTouchStartEvent = (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const { x, y } = this.getStageCoords(touch.clientX, touch.clientY);
      this.onTouchBegin(x, y, touch.identifier);
    }
  };
  onTouchMoveEvent = (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const { x, y } = this.getStageCoords(touch.clientX, touch.clientY);
      this.onTouchMove(x, y, touch.identifier);
    }
  };
  onTouchEndEvent = (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const { x, y } = this.getStageCoords(touch.clientX, touch.clientY);
      this.onTouchEnd(x, y, touch.identifier);
    }
  };
  onMouseDown = (e) => {
    e.preventDefault();
    const { x, y } = this.getStageCoords(e.clientX, e.clientY);
    this.onTouchBegin(x, y, 0);
  };
  onMouseMove = (e) => {
    const { x, y } = this.getStageCoords(e.clientX, e.clientY);
    this.onTouchMove(x, y, 0);
  };
  onMouseUp = (e) => {
    const { x, y } = this.getStageCoords(e.clientX, e.clientY);
    this.onTouchEnd(x, y, 0);
  };
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/system/Capabilities.js
var Capabilities = class {
  // ── Static fields ─────────────────────────────────────────────────────────
  /** System language code, e.g. "zh-CN", "en-US". */
  static language = "en";
  /**
   * Operating system name.
   * One of: "iOS" | "Android" | "Windows Phone" | "Windows PC" | "Mac OS" | "Unknown"
   */
  static os = "Unknown";
  /** Whether the application is running on a mobile device. */
  static isMobile = false;
  /**
   * Current render mode, set by Player after WebGL initialisation.
   * One of: "webgl" | "canvas"
   */
  static $renderMode = "unknown";
  /** Blakron engine version, injected at build time via package.json. */
  static engineVersion = "0.2.4";
  /**
   * Width of the canvas bounding client rect in CSS pixels.
   * Updated by ScreenAdapter on every resize.
   */
  static boundingClientWidth = 0;
  /**
   * Height of the canvas bounding client rect in CSS pixels.
   * Updated by ScreenAdapter on every resize.
   */
  static boundingClientHeight = 0;
  // ── Internal init ─────────────────────────────────────────────────────────
  /**
   * Detects environment capabilities from the browser UA and navigator APIs.
   * Called once by `createPlayer` before the player starts.
   *
   * Strategy (per MDN + Client Hints spec):
   * 1. `navigator.userAgentData.mobile` — Client Hints API, most accurate,
   *    Chromium-only as of 2025 (not available in Safari / Firefox).
   * 2. UA regex fallback — covers Safari, Firefox, and older browsers.
   */
  static _init() {
    const ua = navigator.userAgent;
    const uaLower = ua.toLowerCase();
    const uaData = navigator.userAgentData;
    if (uaData !== void 0) {
      this.isMobile = uaData.mobile;
    } else {
      this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    }
    if (this.isMobile) {
      const isIpad = navigator.maxTouchPoints > 1 && uaLower.includes("mac os");
      if (isIpad || uaLower.includes("iphone") || uaLower.includes("ipad") || uaLower.includes("ipod")) {
        this.os = "iOS";
        this.isMobile = true;
      } else if (uaLower.includes("android")) {
        this.os = "Android";
      } else if (uaLower.includes("windows")) {
        this.os = "Windows Phone";
      } else {
        this.os = "Unknown";
      }
    } else {
      if (uaLower.includes("windows nt")) {
        this.os = "Windows PC";
      } else if (uaLower.includes("mac os")) {
        this.os = "Mac OS";
      } else {
        this.os = "Unknown";
      }
    }
    const raw = navigator.language ?? "en";
    const parts = raw.split("-");
    if (parts.length > 1) {
      this.language = `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
    } else {
      this.language = raw.toLowerCase();
    }
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/ScreenAdapter.js
var ScreenAdapter = class {
  // ── Instance fields ───────────────────────────────────────────────────────
  _player;
  _canvas;
  _touchHandler;
  _contentWidth;
  _contentHeight;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(player, canvas, touchHandler, contentWidth, contentHeight) {
    this._player = player;
    this._canvas = canvas;
    this._touchHandler = touchHandler;
    this._contentWidth = contentWidth;
    this._contentHeight = contentHeight;
    window.addEventListener("resize", this.onResize);
    this._player.stage.setScreenAdapter(this);
    this.updateScreenSize();
  }
  // ── Public methods ────────────────────────────────────────────────────────
  setContentSize(width, height) {
    this._contentWidth = width;
    this._contentHeight = height;
    this.updateScreenSize();
  }
  updateScreenSize() {
    const stage = this._player.stage;
    const container = this._canvas.parentElement;
    const screenWidth = container?.clientWidth ?? window.innerWidth;
    const screenHeight = container?.clientHeight ?? window.innerHeight;
    const size = this.calculateStageSize(stage.scaleMode, screenWidth, screenHeight, this._contentWidth, this._contentHeight);
    this._canvas.width = size.displayWidth;
    this._canvas.height = size.displayHeight;
    this._canvas.style.width = size.displayWidth + "px";
    this._canvas.style.height = size.displayHeight + "px";
    this._player.updateStageSize(size.stageWidth, size.stageHeight);
    Capabilities.boundingClientWidth = size.displayWidth;
    Capabilities.boundingClientHeight = size.displayHeight;
    const innerW = this._canvas.clientWidth || size.displayWidth;
    const innerH = this._canvas.clientHeight || size.displayHeight;
    const scaleX = this._canvas.width / innerW;
    const scaleY = this._canvas.height / innerH;
    this._touchHandler.updateScale(scaleX, scaleY);
  }
  dispose() {
    window.removeEventListener("resize", this.onResize);
  }
  // ── Private methods ───────────────────────────────────────────────────────
  onResize = () => {
    this.updateScreenSize();
  };
  calculateStageSize(scaleMode, screenWidth, screenHeight, contentWidth, contentHeight) {
    let displayWidth = screenWidth;
    let displayHeight = screenHeight;
    let stageWidth = contentWidth;
    let stageHeight = contentHeight;
    const scaleX = screenWidth / stageWidth || 0;
    const scaleY = screenHeight / stageHeight || 0;
    switch (scaleMode) {
      case StageScaleMode.EXACT_FIT:
        break;
      case StageScaleMode.FIXED_HEIGHT:
        stageWidth = Math.round(screenWidth / scaleY);
        break;
      case StageScaleMode.FIXED_WIDTH:
        stageHeight = Math.round(screenHeight / scaleX);
        break;
      case StageScaleMode.NO_BORDER:
        if (scaleX > scaleY)
          displayHeight = Math.round(stageHeight * scaleX);
        else
          displayWidth = Math.round(stageWidth * scaleY);
        break;
      case StageScaleMode.SHOW_ALL:
        if (scaleX > scaleY)
          displayWidth = Math.round(stageWidth * scaleY);
        else
          displayHeight = Math.round(stageHeight * scaleX);
        break;
      case StageScaleMode.FIXED_NARROW:
        if (scaleX > scaleY)
          stageWidth = Math.round(screenWidth / scaleY);
        else
          stageHeight = Math.round(screenHeight / scaleX);
        break;
      case StageScaleMode.FIXED_WIDE:
        if (scaleX > scaleY)
          stageHeight = Math.round(screenHeight / scaleX);
        else
          stageWidth = Math.round(screenWidth / scaleY);
        break;
      case StageScaleMode.NO_SCALE:
      default:
        stageWidth = screenWidth;
        stageHeight = screenHeight;
        break;
    }
    if (stageWidth % 2 !== 0)
      stageWidth++;
    if (stageHeight % 2 !== 0)
      stageHeight++;
    if (displayWidth % 2 !== 0)
      displayWidth++;
    if (displayHeight % 2 !== 0)
      displayHeight++;
    return { stageWidth, stageHeight, displayWidth, displayHeight };
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/player/createPlayer.js
function createPlayer(options) {
  Capabilities._init();
  if (!RenderTexture.renderer) {
    const _renderer = new CanvasRenderer();
    RenderTexture.renderer = (displayObject, width, height, offsetX, offsetY) => {
      const buffer = new RenderBuffer(width, height);
      const m = new Matrix();
      m.translate(offsetX, offsetY);
      _renderer.render(displayObject, buffer, m);
      return buffer.surface;
    };
  }
  const { canvas, frameRate = 60, scaleMode = StageScaleMode.SHOW_ALL, contentWidth = canvas.width || 640, contentHeight = canvas.height || 1136, orientation = OrientationMode.AUTO, maxTouches = 99, background } = options;
  if (background) {
    canvas.style.backgroundColor = background;
  }
  const stage = new Stage();
  stage.scaleMode = scaleMode;
  stage.orientation = orientation;
  stage.maxTouches = maxTouches;
  stage.frameRate = frameRate;
  const player = new Player(canvas, stage);
  const touchHandler = new TouchHandler(stage, canvas);
  const screenAdapter = new ScreenAdapter(player, canvas, touchHandler, contentWidth, contentHeight);
  const disposeLifecycle = setupLifecycle(stage);
  let destroyed = false;
  return {
    player,
    stage,
    touchHandler,
    screenAdapter,
    start(root) {
      if (destroyed)
        throw new Error("Cannot start a destroyed Blakron application.");
      player.start(root);
    },
    stop() {
      player.stop();
    },
    destroy() {
      if (destroyed)
        return;
      destroyed = true;
      player.destroy();
      touchHandler.dispose();
      screenAdapter.dispose();
      disposeLifecycle();
    }
  };
}

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/text/enums/TextFieldInputType.js
var TextFieldInputType = {
  TEXT: "text",
  TEL: "tel",
  PASSWORD: "password"
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/text/HtmlTextParser.js
var REPLACE_PAIRS = [
  [/&lt;/g, "<"],
  [/&gt;/g, ">"],
  [/&amp;/g, "&"],
  [/&quot;/g, '"'],
  [/&apos;/g, "'"]
];
var HEAD_REG = /^(color|textcolor|strokecolor|stroke|b|bold|i|italic|u|size|fontfamily|href|target)(\s)*=/;
function replaceSpecial(value) {
  for (const [pattern, replacement] of REPLACE_PAIRS) {
    value = value.replace(pattern, replacement);
  }
  return value;
}
function parseProperty(info, head, value) {
  switch (head.toLowerCase()) {
    case "color":
    case "textcolor":
      info.textColor = parseInt(value.replace(/#/, "0x"));
      break;
    case "strokecolor":
      info.strokeColor = parseInt(value.replace(/#/, "0x"));
      break;
    case "stroke":
      info.stroke = parseInt(value);
      break;
    case "b":
    case "bold":
      info.bold = value === "true";
      break;
    case "u":
      info.underline = value === "true";
      break;
    case "i":
    case "italic":
      info.italic = value === "true";
      break;
    case "size":
      info.size = parseInt(value);
      break;
    case "fontfamily":
      info.fontFamily = value;
      break;
    case "href":
      info.href = replaceSpecial(value);
      break;
    case "target":
      info.target = replaceSpecial(value);
      break;
  }
}
function parseTag(str) {
  str = str.trim();
  const info = {};
  if (str.charAt(0) === "i" || str.charAt(0) === "b" || str.charAt(0) === "u") {
    parseProperty(info, str, "true");
    return info;
  }
  const header = str.match(/^(font|a)\s/);
  if (!header)
    return info;
  str = str.substring(header[0].length).trim();
  let titles;
  while (titles = str.match(HEAD_REG) ?? void 0) {
    const title = titles[0];
    str = str.substring(title.length).trim();
    let value = "";
    let next = 0;
    if (str.charAt(0) === '"') {
      next = str.indexOf('"', 1);
      value = str.substring(1, next);
      next++;
    } else if (str.charAt(0) === "'") {
      next = str.indexOf("'", 1);
      value = str.substring(1, next);
      next++;
    } else {
      const m = str.match(/(\S)+/);
      value = m ? m[0] : "";
      next = value.length;
    }
    parseProperty(info, title.substring(0, title.length - 1).trim(), value.trim());
    str = str.substring(next).trim();
  }
  return info;
}
var HtmlTextParser = class {
  _stack = [];
  _result = [];
  parse(htmltext) {
    this._stack = [];
    this._result = [];
    let firstIdx = 0;
    const length = htmltext.length;
    while (firstIdx < length) {
      const startIdx = htmltext.indexOf("<", firstIdx);
      if (startIdx < 0) {
        this.addText(htmltext.substring(firstIdx));
        break;
      }
      this.addText(htmltext.substring(firstIdx, startIdx));
      let endIdx = htmltext.indexOf(">", startIdx);
      if (endIdx === -1)
        endIdx = startIdx;
      if (htmltext.charAt(startIdx + 1) === "/") {
        this._stack.pop();
      } else {
        const tagContent = htmltext.substring(startIdx + 1, endIdx);
        const style = parseTag(tagContent);
        if (this._stack.length > 0) {
          const parent = this._stack[this._stack.length - 1];
          for (const key in parent) {
            if (style[key] === void 0) {
              style[key] = parent[key];
            }
          }
        }
        this._stack.push(style);
      }
      firstIdx = endIdx + 1;
    }
    return this._result;
  }
  /** @deprecated Use parse() instead. */
  parser(htmltext) {
    return this.parse(htmltext);
  }
  addText(value) {
    if (!value)
      return;
    value = replaceSpecial(value);
    if (this._stack.length > 0) {
      this._result.push({ text: value, style: this._stack[this._stack.length - 1] });
    } else {
      this._result.push({ text: value });
    }
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/text/BitmapFont.js
var BitmapFont = class extends SpriteSheet {
  _charList = {};
  _firstCharHeight = 0;
  constructor(texture, config) {
    super(texture);
    if (typeof config === "string") {
      this._charList = this._parseConfig(config);
    } else if (config?.frames) {
      this._charList = config.frames;
    }
  }
  getTexture(name) {
    const cached = super.getTexture(name);
    if (cached)
      return cached;
    const c = this._charList[name];
    if (!c)
      return void 0;
    return this.createTexture(name, c.x, c.y, c.w, c.h, c.offX, c.offY, c.sourceW, c.sourceH);
  }
  getConfig(name, key) {
    return this._charList[name]?.[key] ?? 0;
  }
  /** @internal Returns the height of the first character, used for space width calculation. */
  getFirstCharHeight() {
    if (this._firstCharHeight === 0) {
      for (const str in this._charList) {
        const c = this._charList[str];
        if (!c)
          continue;
        const sourceH = c.sourceH ?? (c.h ?? 0) + (c.offY ?? 0);
        if (sourceH <= 0)
          continue;
        this._firstCharHeight = sourceH;
        break;
      }
    }
    return this._firstCharHeight;
  }
  _parseConfig(fntText) {
    const lines = fntText.replace(/\r\n/g, "\n").split("\n");
    let charsCount = 0;
    let charsStartLine = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("chars ")) {
        charsCount = this._getConfigByKey(lines[i], "count");
        charsStartLine = i + 1;
        break;
      }
    }
    if (charsStartLine < 0)
      return {};
    const chars = {};
    for (let i = charsStartLine; i < charsStartLine + charsCount && i < lines.length; i++) {
      const line = lines[i];
      if (!line.startsWith("char "))
        continue;
      const letter = String.fromCharCode(this._getConfigByKey(line, "id"));
      chars[letter] = {
        x: this._getConfigByKey(line, "x"),
        y: this._getConfigByKey(line, "y"),
        w: this._getConfigByKey(line, "width"),
        h: this._getConfigByKey(line, "height"),
        offX: this._getConfigByKey(line, "xoffset"),
        offY: this._getConfigByKey(line, "yoffset"),
        xadvance: this._getConfigByKey(line, "xadvance")
      };
    }
    return chars;
  }
  _getConfigByKey(configText, key) {
    for (const item of configText.split(" ")) {
      if (item.startsWith(key + "=")) {
        return parseInt(item.substring(key.length + 1));
      }
    }
    return 0;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/text/BitmapText.js
var BitmapText = class _BitmapText extends DisplayObject {
  static EMPTY_FACTOR = 0.33;
  _text = "";
  _font;
  _lineSpacing = 0;
  _letterSpacing = 0;
  _textAlign = HorizontalAlign.LEFT;
  _verticalAlign = VerticalAlign.TOP;
  // Width/Height affect line-breaking, so invalidate text when they change.
  set width(value) {
    const v = isNaN(value) ? NaN : value;
    if (this.$explicitWidth === v)
      return;
    this.$explicitWidth = v;
    this._invalidate();
  }
  set height(value) {
    const v = isNaN(value) ? NaN : value;
    if (this.$explicitHeight === v)
      return;
    this.$explicitHeight = v;
    this._invalidate();
  }
  _smoothing = true;
  _textLinesChanged = false;
  _textLines = [];
  _textLinesWidth = [];
  _lineHeights = [];
  _textWidth = 0;
  _textHeight = 0;
  _textStartX = 0;
  _textStartY = 0;
  get text() {
    return this._text;
  }
  set text(value) {
    const v = value ?? "";
    if (this._text === v)
      return;
    this._text = v;
    this._invalidate();
  }
  get font() {
    return this._font;
  }
  set font(value) {
    if (this._font === value)
      return;
    this._font = value;
    this._invalidate();
  }
  get lineSpacing() {
    return this._lineSpacing;
  }
  set lineSpacing(value) {
    if (this._lineSpacing === value)
      return;
    this._lineSpacing = value;
    this._invalidate();
  }
  get letterSpacing() {
    return this._letterSpacing;
  }
  set letterSpacing(value) {
    if (this._letterSpacing === value)
      return;
    this._letterSpacing = value;
    this._invalidate();
  }
  get textAlign() {
    return this._textAlign;
  }
  set textAlign(value) {
    if (this._textAlign === value)
      return;
    this._textAlign = value;
    this._invalidate();
  }
  get verticalAlign() {
    return this._verticalAlign;
  }
  set verticalAlign(value) {
    if (this._verticalAlign === value)
      return;
    this._verticalAlign = value;
    this._invalidate();
  }
  get smoothing() {
    return this._smoothing;
  }
  set smoothing(value) {
    if (this._smoothing === value)
      return;
    this._smoothing = value;
    this.$markDirty();
  }
  get textWidth() {
    this._ensureLines();
    return this._textWidth;
  }
  get textHeight() {
    this._ensureLines();
    return this._textHeight;
  }
  $measureContentBounds(bounds) {
    this._ensureLines();
    if (this._textLines.length === 0) {
      bounds.setEmpty();
    } else {
      bounds.setTo(this._textStartX, this._textStartY, this._textWidth, this._textHeight);
    }
  }
  /** @internal Returns computed text lines for rendering. */
  getTextLines() {
    return this._ensureLines();
  }
  /** @internal Per-line widths for rendering. */
  getTextLinesWidth() {
    this._ensureLines();
    return this._textLinesWidth;
  }
  /** @internal Per-line heights for rendering. */
  getLineHeights() {
    this._ensureLines();
    return this._lineHeights;
  }
  /** @internal Text start X offset after alignment. */
  getTextStartX() {
    this._ensureLines();
    return this._textStartX;
  }
  /** @internal Text start Y offset after alignment. */
  getTextStartY() {
    this._ensureLines();
    return this._textStartY;
  }
  _invalidate() {
    this._textLinesChanged = true;
    this.$renderDirty = true;
    this.$markDirty();
  }
  _ensureLines() {
    if (!this._textLinesChanged)
      return this._textLines;
    this._textLinesChanged = false;
    this._textLines = [];
    this._textLinesWidth = [];
    this._lineHeights = [];
    this._textWidth = 0;
    this._textHeight = 0;
    const font = this._font;
    if (!this._text || !font)
      return this._textLines;
    const hasWidthSet = !isNaN(this.$explicitWidth);
    const fieldWidth = this.$explicitWidth;
    const fieldHeight = this.$explicitHeight;
    const emptyHeight = font.getFirstCharHeight();
    const emptyWidth = Math.ceil(emptyHeight * _BitmapText.EMPTY_FACTOR);
    const textArr = this._text.split(/(?:\r\n|\r|\n)/);
    let totalWidth = 0;
    let totalHeight = 0;
    const pushLine = (str, lh, lw) => {
      if (!isNaN(fieldHeight) && this._textLines.length > 0 && totalHeight > fieldHeight)
        return false;
      totalHeight += lh + this._lineSpacing;
      this._textLines.push(str);
      this._lineHeights.push(lh);
      this._textLinesWidth.push(lw);
      totalWidth = Math.max(lw, totalWidth);
      return true;
    };
    for (let i = 0; i < textArr.length; i++) {
      let line = textArr[i];
      let len = line.length;
      let lineHeight = 0;
      let xPos = 0;
      let isFirstChar = true;
      for (let j = 0; j < len; j++) {
        if (!isFirstChar)
          xPos += this._letterSpacing;
        const ch = line.charAt(j);
        const texture = font.getTexture(ch);
        let texW;
        let texH;
        if (!texture) {
          if (ch === " ") {
            texW = emptyWidth;
            texH = emptyHeight;
          } else {
            if (isFirstChar)
              isFirstChar = false;
            continue;
          }
        } else {
          texW = texture.textureWidth;
          texH = texture.textureHeight;
        }
        if (isFirstChar)
          isFirstChar = false;
        if (hasWidthSet && j > 0 && xPos + texW > fieldWidth) {
          if (!pushLine(line.substring(0, j), lineHeight, xPos))
            break;
          line = line.substring(j);
          len = line.length;
          j = 0;
          xPos = len === 1 ? texW : font.getConfig(ch, "xadvance") || texW;
          lineHeight = texH;
          continue;
        }
        xPos += j === len - 1 ? texW : font.getConfig(ch, "xadvance") || texW;
        lineHeight = Math.max(texH, lineHeight);
      }
      if (!isNaN(fieldHeight) && i > 0 && totalHeight > fieldHeight)
        break;
      pushLine(line, lineHeight, xPos);
    }
    this._textWidth = totalWidth;
    this._textHeight = Math.max(0, totalHeight - this._lineSpacing);
    this._textStartX = 0;
    this._textStartY = 0;
    if (hasWidthSet && fieldWidth > totalWidth) {
      if (this._textAlign === HorizontalAlign.RIGHT)
        this._textStartX = fieldWidth - totalWidth;
      else if (this._textAlign === HorizontalAlign.CENTER)
        this._textStartX = Math.floor((fieldWidth - totalWidth) / 2);
    }
    if (!isNaN(fieldHeight) && fieldHeight > this._textHeight) {
      if (this._verticalAlign === VerticalAlign.BOTTOM)
        this._textStartY = fieldHeight - this._textHeight;
      else if (this._verticalAlign === VerticalAlign.MIDDLE)
        this._textStartY = Math.floor((fieldHeight - this._textHeight) / 2);
    }
    return this._textLines;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/text/StageText.js
var StageText = class extends EventDispatcher {
  _textField;
  _inputElement;
  _inputDiv;
  _text = "";
  _compositionLock = false;
  _clearing = false;
  _isShowing = false;
  setTextField(textField) {
    this._textField = textField;
  }
  getText() {
    return this._text;
  }
  setText(value) {
    this._text = value;
    if (this._inputElement)
      this._inputElement.value = value;
  }
  setColor(value) {
    if (this._inputElement) {
      this._inputElement.style.color = colorString(value);
    }
  }
  show(_active = false) {
    if (!this._textField)
      return;
    if (this._isShowing) {
      this.initElementPosition();
      this.resetStageText();
      return;
    }
    this.ensureElements();
    this.initElementPosition();
    this.resetStageText();
    this.executeShow();
  }
  hide() {
    this.clearInputElement();
  }
  addToStage() {
    this.ensureElements();
  }
  removeFromStage() {
    this.clearInputElement();
    if (this._inputDiv?.parentElement) {
      this._inputDiv.parentElement.removeChild(this._inputDiv);
      this._inputDiv = void 0;
    }
    this._inputElement = void 0;
  }
  onBlur() {
  }
  resetStageText() {
    if (!this._textField || !this._inputElement || !this._inputDiv)
      return;
    const tf = this._textField;
    const el = this._inputElement;
    el.style.fontFamily = tf.fontFamily;
    el.style.fontSize = tf.size + "px";
    el.style.fontWeight = tf.bold ? "bold" : "normal";
    el.style.fontStyle = tf.italic ? "italic" : "normal";
    el.style.textAlign = tf.textAlign;
    el.style.color = colorString(tf.textColor);
    if (el instanceof HTMLInputElement) {
      el.type = tf.inputType;
      if (tf.maxChars > 0) {
        el.setAttribute("maxlength", String(tf.maxChars));
      } else {
        el.removeAttribute("maxlength");
      }
    }
    el.style.width = tf.width + "px";
    el.style.left = "0px";
    el.style.transform = "";
    if (tf.multiline) {
      this.setAreaHeight(tf, el);
    } else {
      const remaining = Math.max(0, tf.height - tf.size);
      const top = remaining * getValign(tf);
      el.style.lineHeight = tf.size + "px";
      el.style.top = top + "px";
      el.style.height = Math.min(tf.size, tf.height) + "px";
      el.style.padding = "0px";
    }
    this._inputDiv.style.overflow = "hidden";
    this._inputDiv.style.width = tf.width + "px";
    this._inputDiv.style.height = tf.height + "px";
  }
  // ── Element lifecycle ────────────────────────────────────────────────────
  ensureElements() {
    if (this._inputDiv && this._inputElement)
      return;
    if (!this._textField)
      return;
    if (!this._inputDiv) {
      const div = document.createElement("div");
      div.style.position = "fixed";
      div.style.boxSizing = "content-box";
      div.style.left = "0px";
      div.style.top = "-100px";
      div.style.border = "none";
      div.style.padding = "0";
      div.style.margin = "0";
      div.style.width = "0px";
      div.style.height = "0px";
      div.style.overflow = "hidden";
      div.style.transformOrigin = "0% 0% 0px";
      div.style.zIndex = "10000";
      div.style.pointerEvents = "none";
      document.body.appendChild(div);
      this._inputDiv = div;
    }
    if (!this._inputElement) {
      const tf = this._textField;
      const el = tf.multiline ? document.createElement("textarea") : document.createElement("input");
      if (el instanceof HTMLTextAreaElement) {
        el.style.resize = "none";
      }
      el.style.position = "absolute";
      el.style.boxSizing = "border-box";
      el.style.left = "0px";
      el.style.top = "0px";
      el.style.border = "none";
      el.style.padding = "0";
      el.style.margin = "0";
      el.style.outline = "none";
      el.style.background = "none transparent";
      el.style.overflow = "hidden";
      el.style.wordBreak = "break-all";
      el.style.opacity = "0";
      el.style.pointerEvents = "auto";
      el.value = this._text;
      el.addEventListener("input", () => {
        if (!this._compositionLock) {
          this.onTextInput();
        }
      });
      el.addEventListener("compositionstart", () => {
        this._compositionLock = true;
      });
      el.addEventListener("compositionend", () => {
        this._compositionLock = false;
        this.onTextInput();
      });
      el.addEventListener("focus", () => {
        this.dispatchEventWith("focus");
      });
      el.addEventListener("blur", () => {
        this.dispatchEventWith("blur");
        this.clearInputElement();
      });
      this._inputDiv.appendChild(el);
      this._inputElement = el;
    }
  }
  /**
   * Positions the wrapper div so that its (0,0) aligns with the TextField's
   * top-left corner on screen.
   *
   * Uses `position:fixed` + viewport coordinates so the calculation works
   * regardless of the page layout (flex centering, CSS transforms, etc.).
   *
   * IMPORTANT: Uses `clientWidth`/`clientHeight` and `clientLeft`/`clientTop`
   * to correctly handle CSS borders on the canvas element.
   */
  initElementPosition() {
    if (!this._textField || !this._inputDiv)
      return;
    const tf = this._textField;
    const canvas = this.getCanvas();
    const matrix = tf.$getConcatenatedMatrix();
    let left = 0;
    let top = 0;
    let scaleX = 1;
    let scaleY = 1;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const borderLeft = canvas.clientLeft;
      const borderTop = canvas.clientTop;
      scaleX = (canvas.clientWidth || 1) / (canvas.width || 1);
      scaleY = (canvas.clientHeight || 1) / (canvas.height || 1);
      left = rect.left + borderLeft;
      top = rect.top + borderTop;
    }
    this._inputDiv.style.left = left + "px";
    this._inputDiv.style.top = top + "px";
    if (tf.multiline && tf.height > tf.size && this._inputElement) {
      this._inputElement.style.top = `${-tf.lineSpacing / 2}px`;
    } else if (this._inputElement) {
      this._inputElement.style.top = "0px";
    }
    this._inputDiv.style.transform = `matrix(${matrix.a * scaleX},${matrix.b * scaleY},${matrix.c * scaleX},${matrix.d * scaleY},${matrix.tx * scaleX},${matrix.ty * scaleY})`;
  }
  executeShow() {
    const el = this._inputElement;
    if (!el)
      return;
    if (el.value !== this._text) {
      el.value = this._text;
    }
    el.style.opacity = "1";
    this._isShowing = true;
    setTimeout(() => {
      if (!this._isShowing || !this._inputElement)
        return;
      el.selectionStart = el.value.length;
      el.selectionEnd = el.value.length;
      el.focus();
    }, 0);
  }
  clearInputElement() {
    if (this._clearing)
      return;
    this._clearing = true;
    this._isShowing = false;
    const el = this._inputElement;
    const div = this._inputDiv;
    if (el) {
      el.style.opacity = "0";
      el.style.width = "1px";
      el.style.height = "12px";
      el.style.left = "0px";
      el.style.top = "0px";
      el.style.transform = "";
      el.style.padding = "0";
      el.style.lineHeight = "";
      el.style.verticalAlign = "";
      el.blur();
    }
    if (div) {
      div.style.left = "0px";
      div.style.top = "-100px";
      div.style.height = "0px";
      div.style.width = "0px";
      div.style.transform = "";
    }
    this._clearing = false;
  }
  // ── Helpers ─────────────────────────────────────────────────────────────
  setAreaHeight(tf, el) {
    const cssLineH = tf.size + tf.lineSpacing;
    if (tf.height <= tf.size) {
      el.style.height = tf.size + "px";
      el.style.padding = "0px";
      el.style.lineHeight = cssLineH + "px";
    } else {
      el.style.height = tf.height + "px";
      const rap = tf.height - tf.size - tf.lineSpacing;
      const valign = getValign(tf);
      const top = Math.max(0, rap * valign);
      const bottom = Math.max(0, rap - top);
      el.style.padding = `${top}px 0px ${bottom}px 0px`;
      el.style.lineHeight = cssLineH + "px";
    }
  }
  onTextInput() {
    if (this._inputElement) {
      this._text = this._inputElement.value;
      this.dispatchEventWith("updateText");
    }
  }
  getCanvas() {
    return document.querySelector("canvas") ?? void 0;
  }
};
function getValign(tf) {
  const v = tf.verticalAlign;
  if (v === "middle" || v === "Middle")
    return 0.5;
  if (v === "bottom" || v === "Bottom")
    return 1;
  return 0;
}
function colorString(color) {
  const r = color >> 16 & 255;
  const g = color >> 8 & 255;
  const b = color & 255;
  return `rgb(${r},${g},${b})`;
}

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/text/InputController.js
var InputController = class {
  // ── Instance fields ───────────────────────────────────────────────────────
  stageText;
  _text;
  _isFocus = false;
  _stageTextAdded = false;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(text) {
    this._text = text;
    this.stageText = new StageText();
    this.stageText.setTextField(text);
  }
  addStageText() {
    if (this._stageTextAdded)
      return;
    this._text.touchEnabled = true;
    this.stageText.addToStage();
    this.stageText.addEventListener("updateText", this.onUpdateText);
    this.stageText.addEventListener("focus", this.onFocus);
    this.stageText.addEventListener("blur", this.onBlur);
    this._text.addEventListener(TouchEvent.TOUCH_BEGIN, this.onTouchBegin);
    this._text.addEventListener(TouchEvent.TOUCH_MOVE, this.onTouchMove);
    this._stageTextAdded = true;
  }
  removeStageText() {
    if (!this._stageTextAdded)
      return;
    this.stageText.removeFromStage();
    this.stageText.removeEventListener("updateText", this.onUpdateText);
    this.stageText.removeEventListener("focus", this.onFocus);
    this.stageText.removeEventListener("blur", this.onBlur);
    this._text.removeEventListener(TouchEvent.TOUCH_BEGIN, this.onTouchBegin);
    this._text.removeEventListener(TouchEvent.TOUCH_MOVE, this.onTouchMove);
    this._text.stage?.removeEventListener(TouchEvent.TOUCH_BEGIN, this.onStageDown);
    if (this._isFocus) {
      this._isFocus = false;
      this._text.setIsTyping(false);
    }
    this._stageTextAdded = false;
  }
  getText() {
    return this.stageText.getText();
  }
  setText(value) {
    this.stageText.setText(value);
  }
  setColor(value) {
    this.stageText.setColor(value);
  }
  focus(active = false) {
    if (!this._text.$visible)
      return;
    if (this._isFocus)
      return;
    const stage = this._text.stage;
    stage?.removeEventListener(TouchEvent.TOUCH_BEGIN, this.onStageDown);
    setTimeout(() => {
      this._text.stage?.addEventListener(TouchEvent.TOUCH_BEGIN, this.onStageDown);
    }, 0);
    this.stageText.show(active);
  }
  hideInput() {
    this.stageText.removeFromStage();
  }
  updateProperties() {
    if (this._isFocus) {
      this.stageText.resetStageText();
      return;
    }
    this.stageText.setText(this._text.text);
    this.stageText.resetStageText();
  }
  // ── Private event handlers ────────────────────────────────────────────────
  onFocus = () => {
    if (!this._isFocus) {
      this._isFocus = true;
      this._text.setIsTyping(true);
      this._text.dispatchEvent(new FocusEvent(FocusEvent.FOCUS_IN, true));
    }
  };
  onBlur = () => {
    if (this._isFocus) {
      this._isFocus = false;
      this._text.stage?.removeEventListener(TouchEvent.TOUCH_BEGIN, this.onStageDown);
      this._text.setIsTyping(false);
      this.stageText.onBlur();
      this._text.dispatchEvent(new FocusEvent(FocusEvent.FOCUS_OUT, true));
    }
  };
  onTouchBegin = () => {
    this.focus();
  };
  onTouchMove = () => {
    this.stageText.hide();
  };
  onStageDown = (e) => {
    if (e.target !== this._text) {
      this.stageText.hide();
    }
  };
  onUpdateText = () => {
    let textValue = this.stageText.getText();
    const restrictAnd = this._text.restrictAnd;
    const restrictNot = this._text.restrictNot;
    if (restrictAnd !== void 0) {
      const reg = new RegExp("[" + restrictAnd + "]", "g");
      const result = textValue.match(reg);
      textValue = result ? result.join("") : "";
    }
    if (restrictNot !== void 0) {
      textValue = textValue.replace(new RegExp("[" + restrictNot + "]", "g"), "");
    }
    if (this.stageText.getText() !== textValue) {
      this.stageText.setText(textValue);
    }
    this._text.text = textValue;
    this._text.dispatchEvent(new Event(Event.CHANGE, true));
  };
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/text/WordWrap.js
var _segmenter;
var hasSegmenter = typeof Intl !== "undefined" && typeof Intl.Segmenter === "function";
function getSegmenter() {
  if (!_segmenter) {
    _segmenter = new Intl.Segmenter(void 0, { granularity: "word" });
  }
  return _segmenter;
}
var BREAKING_SPACES = /* @__PURE__ */ new Set([
  9,
  // tab
  32,
  // space
  8192,
  // en quad
  8193,
  // em quad
  8194,
  // en space
  8195,
  // em space
  8196,
  // three-per-em space
  8197,
  // four-per-em space
  8198,
  // six-per-em space
  8200,
  // punctuation space
  8201,
  // thin space
  8202,
  // hair space
  8287,
  // medium mathematical space
  12288
  // ideographic space
]);
var NEWLINES = /* @__PURE__ */ new Set([10, 13]);
function tokenize(text) {
  if (!text)
    return [];
  if (hasSegmenter) {
    const result2 = [];
    for (const seg of getSegmenter().segment(text)) {
      const s = seg.segment;
      if (!s)
        continue;
      const code = s.charCodeAt(0);
      if (NEWLINES.has(code))
        continue;
      result2.push(s);
    }
    return result2;
  }
  const result = [];
  let buf = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (NEWLINES.has(code)) {
      if (buf) {
        result.push(buf);
        buf = "";
      }
      continue;
    }
    if (BREAKING_SPACES.has(code)) {
      if (buf) {
        result.push(buf);
        buf = "";
      }
      result.push(text[i]);
    } else {
      buf += text[i];
    }
  }
  if (buf)
    result.push(buf);
  return result;
}
function splitGraphemes(text) {
  if (hasSegmenter) {
    const seg = new Intl.Segmenter(void 0, { granularity: "grapheme" });
    const result = [];
    for (const s of seg.segment(text)) {
      result.push(s.segment);
    }
    return result;
  }
  return [...text];
}

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/text/TextField.js
var TextField = class _TextField extends DisplayObject {
  // ── Static fields ─────────────────────────────────────────────────────────
  static default_fontFamily = "Arial";
  static default_size = 30;
  static default_textColor = 16777215;
  // ── Instance fields ───────────────────────────────────────────────────────
  _fontFamily = _TextField.default_fontFamily;
  _fontSize = _TextField.default_size;
  _bold = false;
  _italic = false;
  _textAlign = HorizontalAlign.LEFT;
  _verticalAlign = VerticalAlign.TOP;
  _textColor = _TextField.default_textColor;
  _strokeColor = 0;
  _stroke = 0;
  _lineSpacing = 0;
  _wordWrap = false;
  _multiline = false;
  _type = TextFieldType.DYNAMIC;
  _inputType = TextFieldInputType.TEXT;
  _text = "";
  _displayAsPassword = false;
  _maxChars = 0;
  _scrollV = 1;
  _restrict;
  _restrictAnd;
  _restrictNot;
  _border = false;
  _borderColor = 0;
  _background = false;
  _backgroundColor = 16777215;
  _textFlow;
  _textWidth = 0;
  _textHeight = 0;
  _numLines = 0;
  _linesArr;
  _textDirty = true;
  _fontString = "";
  _selectionAnchor = 0;
  _selectionActive = 0;
  _isTyping = false;
  _inputController;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor() {
    super();
    this.$renderObjectType = 5;
    this.invalidateFontString();
  }
  // Width/Height affect line-breaking, so invalidate text when they change.
  // NOTE: override both getter AND setter — overriding only the setter in JS
  // shadows the parent's getter, causing `tf.height` to return `undefined`.
  get width() {
    return isNaN(this.$explicitWidth) ? this.$getOriginalBounds().width : this.$explicitWidth;
  }
  set width(value) {
    const v = isNaN(value) ? NaN : value;
    if (this.$explicitWidth === v)
      return;
    this.$explicitWidth = v;
    this.invalidateText();
  }
  get height() {
    return isNaN(this.$explicitHeight) ? this.$getOriginalBounds().height : this.$explicitHeight;
  }
  set height(value) {
    const v = isNaN(value) ? NaN : value;
    if (this.$explicitHeight === v)
      return;
    this.$explicitHeight = v;
    this.invalidateText();
  }
  // ── Getters / Setters ─────────────────────────────────────────────────────
  get fontFamily() {
    return this._fontFamily;
  }
  set fontFamily(value) {
    if (this._fontFamily !== value) {
      this._fontFamily = value;
      this.invalidateText();
    }
  }
  get size() {
    return this._fontSize;
  }
  set size(value) {
    if (this._fontSize !== value) {
      this._fontSize = value;
      this.invalidateText();
    }
  }
  get bold() {
    return this._bold;
  }
  set bold(value) {
    if (this._bold !== value) {
      this._bold = value;
      this.invalidateText();
    }
  }
  get italic() {
    return this._italic;
  }
  set italic(value) {
    if (this._italic !== value) {
      this._italic = value;
      this.invalidateText();
    }
  }
  get textAlign() {
    return this._textAlign;
  }
  set textAlign(value) {
    if (this._textAlign !== value) {
      this._textAlign = value;
      this.invalidateText();
    }
  }
  get verticalAlign() {
    return this._verticalAlign;
  }
  set verticalAlign(value) {
    if (this._verticalAlign !== value) {
      this._verticalAlign = value;
      this.invalidateText();
    }
  }
  get textColor() {
    return this._textColor;
  }
  set textColor(value) {
    if (this._textColor !== value) {
      this._textColor = value;
      this._inputController?.setColor(value);
      this.$markDirty();
    }
  }
  get strokeColor() {
    return this._strokeColor;
  }
  set strokeColor(value) {
    if (this._strokeColor !== value) {
      this._strokeColor = value;
      this.$markDirty();
    }
  }
  get stroke() {
    return this._stroke;
  }
  set stroke(value) {
    if (this._stroke !== value) {
      this._stroke = value;
      this.$markDirty();
    }
  }
  get lineSpacing() {
    return this._lineSpacing;
  }
  set lineSpacing(value) {
    if (this._lineSpacing !== value) {
      this._lineSpacing = value;
      this.invalidateText();
    }
  }
  get wordWrap() {
    return this._wordWrap;
  }
  set wordWrap(value) {
    if (this._wordWrap !== value) {
      if (this._displayAsPassword)
        return;
      this._wordWrap = value;
      this.invalidateText();
    }
  }
  get multiline() {
    return this._multiline;
  }
  set multiline(value) {
    if (this._multiline !== value) {
      this._multiline = value;
      this.invalidateText();
    }
  }
  get type() {
    return this._type;
  }
  set type(value) {
    if (this._type === value)
      return;
    this._type = value;
    if (value === TextFieldType.INPUT) {
      if (!this._inputController) {
        this._inputController = new InputController(this);
      }
      this.touchEnabled = true;
      if (isNaN(this.$explicitWidth))
        this.width = 100;
      if (isNaN(this.$explicitHeight))
        this.height = 30;
      if (this.stage) {
        this._inputController.addStageText();
      }
      this._inputController.setText(this._text);
    } else {
      if (this._inputController) {
        this._inputController.removeStageText();
        this._inputController = void 0;
      }
      this.touchEnabled = false;
    }
    this.$markDirty();
  }
  get inputType() {
    return this._inputType;
  }
  set inputType(value) {
    this._inputType = value;
  }
  get text() {
    if (this._type === TextFieldType.INPUT && this._inputController) {
      return this._inputController.getText();
    }
    return this._text;
  }
  set text(value) {
    if (this._text === value)
      return;
    this._text = value;
    this._textFlow = void 0;
    if (this._inputController) {
      this._inputController.setText(value);
    }
    this.invalidateText();
  }
  get displayAsPassword() {
    return this._displayAsPassword;
  }
  set displayAsPassword(value) {
    if (this._displayAsPassword !== value) {
      this._displayAsPassword = value;
      this.invalidateText();
    }
  }
  get maxChars() {
    return this._maxChars;
  }
  set maxChars(value) {
    this._maxChars = value;
  }
  get scrollV() {
    return Math.min(Math.max(this._scrollV, 1), this.maxScrollV);
  }
  set scrollV(value) {
    value = Math.max(value, 1);
    if (this._scrollV !== value) {
      this._scrollV = value;
      this.$markDirty();
    }
  }
  get maxScrollV() {
    this.ensureLines();
    return Math.max(1, this._numLines - this.getScrollNum() + 1);
  }
  get numLines() {
    this.ensureLines();
    return this._numLines;
  }
  get restrict() {
    return this._restrict;
  }
  set restrict(value) {
    this._restrict = value;
    if (value === void 0) {
      this._restrictAnd = void 0;
      this._restrictNot = void 0;
    } else {
      let index = -1;
      let i = 0;
      while (i < value.length) {
        const pos = value.indexOf("^", i);
        if (pos < 0)
          break;
        if (pos === 0 || value.charAt(pos - 1) !== "\\") {
          index = pos;
          break;
        }
        i = pos + 1;
      }
      if (index === 0) {
        this._restrictAnd = void 0;
        this._restrictNot = value.substring(1);
      } else if (index > 0) {
        this._restrictAnd = value.substring(0, index);
        this._restrictNot = value.substring(index + 1);
      } else {
        this._restrictAnd = value;
        this._restrictNot = void 0;
      }
    }
  }
  /** @internal Parsed whitelist portion of restrict. */
  get restrictAnd() {
    return this._restrictAnd;
  }
  /** @internal Parsed blacklist portion of restrict. */
  get restrictNot() {
    return this._restrictNot;
  }
  get border() {
    return this._border;
  }
  set border(value) {
    if (this._border !== value) {
      this._border = value;
      this.$markDirty();
    }
  }
  get borderColor() {
    return this._borderColor;
  }
  set borderColor(value) {
    if (this._borderColor !== value) {
      this._borderColor = value;
      this.$markDirty();
    }
  }
  get background() {
    return this._background;
  }
  set background(value) {
    if (this._background !== value) {
      this._background = value;
      this.$markDirty();
    }
  }
  get backgroundColor() {
    return this._backgroundColor;
  }
  set backgroundColor(value) {
    if (this._backgroundColor !== value) {
      this._backgroundColor = value;
      this.$markDirty();
    }
  }
  get textFlow() {
    return this._textFlow;
  }
  set textFlow(value) {
    this._textFlow = value;
    if (value) {
      this._text = value.map((e) => e.text).join("");
    }
    this.invalidateText();
  }
  get textWidth() {
    this.ensureLines();
    return this._textWidth;
  }
  get textHeight() {
    this.ensureLines();
    if (this._type === TextFieldType.INPUT && !this._multiline) {
      return this._fontSize;
    }
    return this._textHeight + (this._numLines - 1) * this._lineSpacing;
  }
  /** @internal Font string for Canvas 2D rendering. */
  get fontString() {
    return this._fontString;
  }
  get selectionBeginIndex() {
    return this._selectionAnchor;
  }
  get selectionEndIndex() {
    return this._selectionActive;
  }
  get caretIndex() {
    return this._selectionActive;
  }
  /** @internal Whether the user is currently typing (INPUT mode). Used by renderer. */
  get isTyping() {
    return this._isTyping;
  }
  /** @internal Computed line layout data. */
  getLinesArr() {
    this.ensureLines();
    return this._linesArr ?? [];
  }
  /** @internal Y offset in pixels for the current scrollV position. */
  getScrollYOffset() {
    if (this._scrollV <= 1)
      return 0;
    this.ensureLines();
    const lines = this._linesArr ?? [];
    let offset = 0;
    const startLine = Math.min(this._scrollV - 1, lines.length - 1);
    for (let i = 0; i < startLine; i++) {
      offset += lines[i].height + this._lineSpacing;
    }
    return offset;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  appendText(text) {
    this.appendElement({ text });
  }
  appendElement(element) {
    if (this._displayAsPassword) {
      this.text = this._text + element.text;
      return;
    }
    const flow = this._textFlow ? [...this._textFlow] : this._text ? [{ text: this._text, style: void 0 }] : [];
    flow.push(element);
    this.textFlow = flow;
    if (this._inputController) {
      this._inputController.setText(this._text);
    }
  }
  setFocus() {
    if (this._type === TextFieldType.INPUT && this.stage && this._inputController) {
      this._inputController.focus(true);
    }
  }
  setSelection(beginIndex, endIndex) {
    this._selectionAnchor = beginIndex;
    this._selectionActive = endIndex;
  }
  /** @internal Called by InputController when typing state changes. */
  setIsTyping(value) {
    this._isTyping = value;
    this.$renderDirty = true;
    this.$markDirty();
  }
  getLineHeight() {
    return this._fontSize + this._lineSpacing;
  }
  // ── Internal methods ──────────────────────────────────────────────────────
  $onAddToStage(stage, $nestLevel) {
    super.$onAddToStage(stage, $nestLevel);
    if (this._type === TextFieldType.INPUT && this._inputController) {
      this._inputController.addStageText();
    }
    this.addEventListener(TouchEvent.TOUCH_TAP, this.onTapHandler);
  }
  $onRemoveFromStage() {
    super.$onRemoveFromStage();
    if (this._inputController) {
      this._inputController.removeStageText();
    }
    this.removeEventListener(TouchEvent.TOUCH_TAP, this.onTapHandler);
  }
  $measureContentBounds(bounds) {
    this.ensureLines();
    const w = !isNaN(this.$explicitWidth) ? this.$explicitWidth : this._textWidth;
    const h = !isNaN(this.$explicitHeight) ? this.$explicitHeight : this.textHeight;
    bounds.setTo(0, 0, w, h);
  }
  // ── Private methods ───────────────────────────────────────────────────────
  invalidateText() {
    this._textDirty = true;
    this._linesArr = void 0;
    this.invalidateFontString();
    this.$renderDirty = true;
    this.$markDirty();
  }
  invalidateFontString() {
    this._fontString = getFontString(this._fontSize, this._fontFamily, this._bold, this._italic);
  }
  ensureLines() {
    if (!this._textDirty && this._linesArr)
      return;
    this._textDirty = false;
    this._linesArr = this.calculateLines();
    this._numLines = this._linesArr.length;
    let maxWidth = 0;
    let totalHeight = 0;
    for (let i = 0; i < this._linesArr.length; i++) {
      const line = this._linesArr[i];
      if (line.width > maxWidth)
        maxWidth = line.width;
      totalHeight += line.height;
    }
    this._textWidth = maxWidth;
    this._textHeight = totalHeight;
  }
  /** Number of fully-visible lines in the current explicit height (mirrors Egret's $getScrollNum). */
  getScrollNum() {
    if (!this._multiline)
      return 1;
    if (isNaN(this.$explicitHeight))
      return this._numLines;
    const lineH = this._fontSize + this._lineSpacing;
    if (lineH <= 0)
      return this._numLines;
    let scrollNum = Math.floor(this.$explicitHeight / lineH);
    const leftH = this.$explicitHeight - lineH * scrollNum;
    if (leftH > this._fontSize / 2)
      scrollNum++;
    return Math.max(1, scrollNum);
  }
  calculateLines() {
    const elements = this._textFlow ?? [{ text: this.getDisplayText() }];
    const maxWidth = !isNaN(this.$explicitWidth) ? this.$explicitWidth : NaN;
    const isInput = this._type === TextFieldType.INPUT;
    const lines = [];
    if (!isNaN(maxWidth) && maxWidth === 0) {
      return [{ width: 0, height: 0, charNum: 0, hasNextLine: false, elements: [] }];
    }
    let currentLine = [];
    let lineWidth = 0;
    let lineHeight = this._fontSize;
    let lineCharNum = 0;
    const flushLine = (hasNext) => {
      lines.push({
        width: lineWidth,
        height: lineHeight,
        charNum: lineCharNum + (hasNext ? 1 : 0),
        hasNextLine: hasNext,
        elements: currentLine
      });
      currentLine = [];
      lineWidth = 0;
      lineHeight = this._fontSize;
      lineCharNum = 0;
    };
    for (const element of elements) {
      if (!element.text)
        continue;
      const style = element.style ?? {};
      const fontSize = typeof style.size === "number" ? style.size : this._fontSize;
      const fontFamily = style.fontFamily ?? this._fontFamily;
      const bold = style.bold ?? this._bold;
      const italic = style.italic ?? this._italic;
      const segments = element.text.split(/\r\n|\r|\n/);
      for (let si = 0; si < segments.length; si++) {
        const seg = segments[si];
        const isLastSeg = si === segments.length - 1;
        if (seg === "") {
          if (!isLastSeg) {
            flushLine(true);
          }
          continue;
        }
        if (isNaN(maxWidth)) {
          const w = measureText(seg, fontFamily, fontSize, bold, italic);
          currentLine.push({ text: seg, width: w, style: element.style });
          lineWidth += w;
          if (!isInput)
            lineHeight = Math.max(lineHeight, fontSize);
          lineCharNum += seg.length;
          if (!isLastSeg)
            flushLine(true);
        } else {
          const totalSegWidth = measureText(seg, fontFamily, fontSize, bold, italic);
          if (lineWidth + totalSegWidth <= maxWidth || !this._multiline) {
            currentLine.push({ text: seg, width: totalSegWidth, style: element.style });
            lineWidth += totalSegWidth;
            if (!isInput)
              lineHeight = Math.max(lineHeight, fontSize);
            lineCharNum += seg.length;
            if (!isLastSeg)
              flushLine(true);
          } else {
            const tokenTexts = this._wordWrap ? tokenize(seg) : seg.match(/[\s\S]/gu) ?? seg.split("");
            let ww = 0;
            let charNum = 0;
            for (const token of tokenTexts) {
              const w = measureText(token, fontFamily, fontSize, bold, italic);
              if (lineWidth !== 0 && lineWidth + w > maxWidth) {
                flushLine(false);
              }
              if (w > maxWidth) {
                const chars = splitGraphemes(token);
                for (const ch of chars) {
                  const cw = measureText(ch, fontFamily, fontSize, bold, italic);
                  if (lineWidth !== 0 && lineWidth + cw > maxWidth) {
                    flushLine(false);
                  }
                  currentLine.push({ text: ch, width: cw, style: element.style });
                  lineWidth += cw;
                  if (!isInput)
                    lineHeight = Math.max(lineHeight, fontSize);
                  lineCharNum++;
                  charNum++;
                }
              } else {
                currentLine.push({ text: token, width: w, style: element.style });
                lineWidth += w;
                if (!isInput)
                  lineHeight = Math.max(lineHeight, fontSize);
                lineCharNum += token.length;
                charNum += token.length;
                ww += w;
              }
            }
            if (!isLastSeg)
              flushLine(true);
          }
        }
      }
    }
    if (currentLine.length > 0) {
      lines.push({
        width: lineWidth,
        height: lineHeight,
        charNum: lineCharNum,
        hasNextLine: false,
        elements: currentLine
      });
    }
    if (lines.length === 0) {
      lines.push({ width: 0, height: this._fontSize, charNum: 0, hasNextLine: false, elements: [] });
    }
    return lines;
  }
  getDisplayText() {
    if (this._displayAsPassword)
      return "*".repeat(this._text.length);
    return this._text;
  }
  onTapHandler = (e) => {
    if (this._type === TextFieldType.INPUT)
      return;
    const te = e;
    const element = this.getTextElementAt(te.localX, te.localY);
    if (!element?.style?.href)
      return;
    const href = element.style.href;
    if (href.startsWith("event:")) {
      TextEvent.dispatchTextEvent(this, TextEvent.LINK, href.substring("event:".length));
    } else {
      open(href, element.style.target ?? "_blank");
    }
  };
  /** @internal Hit-test to find the ITextElement at a given local coordinate. */
  getTextElementAt(x, y) {
    this.ensureLines();
    const lines = this._linesArr ?? [];
    const width = !isNaN(this.$explicitWidth) ? this.$explicitWidth : this._textWidth;
    const height = !isNaN(this.$explicitHeight) ? this.$explicitHeight : this.textHeight;
    let totalTextHeight = 0;
    for (let i = 0; i < lines.length; i++) {
      totalTextHeight += lines[i].height;
      if (i > 0)
        totalTextHeight += this._lineSpacing;
    }
    let verticalOffset = 0;
    if (this._verticalAlign === VerticalAlign.MIDDLE) {
      verticalOffset = Math.max(0, (height - totalTextHeight) / 2);
    } else if (this._verticalAlign === VerticalAlign.BOTTOM) {
      verticalOffset = Math.max(0, height - totalTextHeight);
    }
    const scrollOffset = this.getScrollYOffset();
    const localY = y - verticalOffset + scrollOffset;
    let lineY = 0;
    for (const line of lines) {
      if (localY < lineY)
        break;
      if (localY <= lineY + line.height) {
        let lineX = 0;
        if (this._textAlign === HorizontalAlign.RIGHT) {
          lineX = width - line.width;
        } else if (this._textAlign === HorizontalAlign.CENTER) {
          lineX = (width - line.width) / 2;
        }
        for (const el of line.elements) {
          if (x >= lineX && x < lineX + el.width)
            return el;
          lineX += el.width;
        }
        break;
      }
      lineY += line.height + this._lineSpacing;
    }
    return void 0;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/localStorage/localStorage.js
var localStorage_exports = {};
__export(localStorage_exports, {
  clear: () => clear,
  getItem: () => getItem,
  removeItem: () => removeItem,
  setItem: () => setItem
});
function getItem(key) {
  return window.localStorage.getItem(key) ?? void 0;
}
function setItem(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
function removeItem(key) {
  window.localStorage.removeItem(key);
}
function clear() {
  window.localStorage.clear();
}

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/external/ExternalInterface.js
var _callbacks = /* @__PURE__ */ new Map();
var ExternalInterface = {
  /**
   * Calls a function registered on the host page via `window[functionName]`.
   */
  call(functionName, value) {
    const fn = window[functionName];
    if (typeof fn === "function") {
      fn(value);
    }
  },
  /**
   * Registers a callback that can be invoked from the host page via
   * `window.__blakronCallback(functionName, value)`.
   */
  addCallback(functionName, listener) {
    _callbacks.set(functionName, listener);
    window.__blakronCallback = (name, value) => {
      _callbacks.get(name)?.(value);
    };
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/resource/ResourceItem.js
var ResourceType = {
  Image: "image",
  Json: "json",
  Text: "text",
  Sound: "sound",
  Sheet: "sheet"
};
var ResourceItem = class {
  name;
  url;
  type;
  groupName = "";
  loaded = false;
  constructor(name, url, type) {
    this.name = name;
    this.url = url;
    this.type = type;
  }
  toString() {
    return `[ResourceItem name="${this.name}" url="${this.url}" type="${this.type}"]`;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/resource/ResourceConfig.js
var ResourceConfig = class {
  keyMap = /* @__PURE__ */ new Map();
  groupDic = /* @__PURE__ */ new Map();
  /**
   * Parse a config JSON object.
   * @param data The parsed JSON data from resource.json
   * @param folder URL prefix for relative paths
   */
  parseConfig(data, folder) {
    if (!data)
      return;
    const resources = data.resources;
    if (resources) {
      for (const item of resources) {
        let url = item.url;
        if (url && !url.includes("://")) {
          item.url = folder + url;
        }
        this.addItemToKeyMap(item);
      }
    }
    const groups = data.groups;
    if (groups) {
      for (const group of groups) {
        const list = [];
        const keys = group.keys.split(",");
        for (const rawKey of keys) {
          const name = rawKey.trim();
          const item = this.keyMap.get(name);
          if (item && !list.includes(item)) {
            list.push(item);
          }
        }
        this.groupDic.set(group.name, list);
      }
    }
  }
  /**
   * Get a list of ResourceItem objects for a group.
   */
  getGroupByName(name) {
    const list = this.groupDic.get(name);
    if (!list)
      return [];
    return list.map((entry) => this.parseResourceItem(entry));
  }
  /**
   * Create a custom resource group from a list of keys.
   * @param name Group name
   * @param keys Resource keys or existing group names to include
   * @param override Whether to overwrite an existing group
   */
  createGroup(name, keys, override = false) {
    if (!override && this.groupDic.has(name) || !keys || keys.length === 0) {
      return false;
    }
    const group = [];
    for (const key of keys) {
      const existingGroup = this.groupDic.get(key);
      if (existingGroup) {
        for (const item of existingGroup) {
          if (!group.includes(item)) {
            group.push(item);
          }
        }
      } else {
        const item = this.keyMap.get(key);
        if (item) {
          if (!group.includes(item)) {
            group.push(item);
          }
        }
      }
    }
    if (group.length === 0)
      return false;
    this.groupDic.set(name, group);
    return true;
  }
  /**
   * Add a resource config entry directly.
   */
  addItem(item) {
    this.addItemToKeyMap(item);
  }
  /**
   * Get the type of a resource by key.
   */
  getType(key) {
    const data = this.keyMap.get(key);
    return data ? data.type : "";
  }
  /**
   * Get a ResourceItem by key.
   */
  getResourceItem(key) {
    const data = this.keyMap.get(key);
    if (data)
      return this.parseResourceItem(data);
    return void 0;
  }
  /**
   * Check if a key exists in the config.
   */
  hasKey(key) {
    return this.keyMap.has(key);
  }
  /**
   * Check if a group exists.
   */
  hasGroup(name) {
    return this.groupDic.has(name);
  }
  /**
   * Get all group names.
   */
  getGroupNames() {
    return Array.from(this.groupDic.keys());
  }
  // ── Private helpers ──────────────────────────────────────────────────────
  addItemToKeyMap(item) {
    if (!this.keyMap.has(item.name)) {
      this.keyMap.set(item.name, item);
    }
    if (item.subkeys) {
      const subkeys = item.subkeys.split(",");
      for (const key of subkeys) {
        if (!this.keyMap.has(key)) {
          this.keyMap.set(key, item);
        }
      }
    }
  }
  parseResourceItem(data) {
    return new ResourceItem(data.name, data.url, data.type);
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/resource/ResourceLoader.js
var ResourceLoader = class {
  // ── Configuration ──────────────────────────────────────────────────────
  /** Maximum concurrent loads */
  threadCount = 2;
  /** Maximum retries for failed items */
  retryCount = 3;
  // ── Callbacks ──────────────────────────────────────────────────────────
  /** Called for each successfully loaded item */
  onComplete;
  /** Called for each failed item (after retries exhausted) */
  onError;
  /** Called with (loaded, total) progress */
  onProgress;
  // ── Internal state ─────────────────────────────────────────────────────
  pendingList = [];
  loadingList = [];
  retryDic = /* @__PURE__ */ new Map();
  analyzerMap = /* @__PURE__ */ new Map();
  activeCount = 0;
  totalCount = 0;
  completedCount = 0;
  // ── Public API ─────────────────────────────────────────────────────────
  /**
   * Register an analyzer for a resource type.
   */
  registerAnalyzer(type, analyzer) {
    this.analyzerMap.set(type, analyzer);
  }
  /**
   * Enqueue items for loading. Does not start loading — call `start()` to begin.
   */
  loadResourceList(list) {
    this.pendingList = list.slice();
    this.loadingList = [];
    this.retryDic.clear();
    this.totalCount = list.length;
    this.completedCount = 0;
  }
  /**
   * Start or resume loading. Returns a promise that resolves when all items are loaded.
   */
  start() {
    return new Promise((resolve) => {
      this._resolve = resolve;
      this.next();
    });
  }
  /**
   * Abort all loading.
   */
  abort() {
    this.pendingList = [];
    this.loadingList = [];
    this.activeCount = 0;
    if (this._resolve) {
      this._resolve();
      this._resolve = void 0;
    }
  }
  // ── Private methods ────────────────────────────────────────────────────
  _resolve;
  next() {
    if (this.pendingList.length === 0 && this.activeCount === 0) {
      if (this._resolve) {
        this._resolve();
        this._resolve = void 0;
      }
      return;
    }
    while (this.activeCount < this.threadCount && this.pendingList.length > 0) {
      const item = this.pendingList.shift();
      this.loadingList.push(item);
      this.activeCount++;
      this.loadItem(item);
    }
  }
  /**
   * Load a single item via its registered analyzer and route the outcome
   * through `finishItem()`, regardless of how it finished (no analyzer,
   * synchronous throw, rejection, or a resolved result).
   *
   * `analyzer.loadFile(item)` is a plain (possibly user-supplied) method —
   * it isn't guaranteed to always return a Promise before throwing. If it
   * throws synchronously instead of rejecting, that exception happens on
   * the call expression itself, before any Promise exists to attach
   * `.catch()` to; without the try/catch below, the exception would
   * propagate out of `loadItem()` (past `next()`'s while-loop, skipping
   * every subsequent item this tick) and this item's `activeCount` slot
   * would never be retired, permanently wedging `start()`.
   */
  loadItem(item) {
    const analyzer = this.analyzerMap.get(item.type);
    if (!analyzer) {
      item.loaded = false;
      this.finishItem(item);
      return;
    }
    let result;
    try {
      result = analyzer.loadFile(item);
    } catch {
      item.loaded = false;
      this.finishItem(item);
      return;
    }
    result.then((r) => {
      this.finishItem(r);
    }, () => {
      item.loaded = false;
      this.finishItem(item);
    });
  }
  /**
   * Single completion point for an in-flight item, whether it loaded, failed,
   * threw, or had no analyzer. Decrements `activeCount` exactly once per item
   * so retry / no-analyzer paths can't double-decrement or leak a slot.
   */
  finishItem(item) {
    this.loadingList = this.loadingList.filter((i) => i !== item);
    this.activeCount--;
    if (item.loaded) {
      this.onItemComplete(item);
    } else {
      this.onItemError(item);
    }
  }
  onItemComplete(item) {
    this.completedCount++;
    this.reportProgress();
    this.safeNotify(() => this.onComplete?.(item));
    this.next();
  }
  onItemError(item) {
    const retries = this.retryDic.get(item.name) ?? 0;
    if (retries < this.retryCount) {
      this.retryDic.set(item.name, retries + 1);
      this.pendingList.push(item);
      this.next();
      return;
    }
    this.completedCount++;
    this.safeNotify(() => this.onError?.(item));
    this.reportProgress();
    this.next();
  }
  reportProgress() {
    this.safeNotify(() => this.onProgress?.(this.completedCount, this.totalCount));
  }
  safeNotify(callback) {
    try {
      callback();
    } catch {
    }
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/resource/ResourceEvent.js
var ResourceEventType = {
  CONFIG_COMPLETE: "configComplete",
  CONFIG_LOAD_ERROR: "configLoadError",
  GROUP_COMPLETE: "groupComplete",
  GROUP_PROGRESS: "groupProgress",
  GROUP_LOAD_ERROR: "groupLoadError",
  ITEM_LOAD_ERROR: "itemLoadError"
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/resource/analyzers/AnalyzerBase.js
var AnalyzerBase = class {
  /** Cached resource data: name → data */
  fileDic = /* @__PURE__ */ new Map();
  /**
   * Get a cached resource by name.
   */
  getRes(name) {
    return this.fileDic.get(name);
  }
  /**
   * Check if a resource is cached.
   */
  hasRes(name) {
    return this.fileDic.has(name);
  }
  /**
   * Remove a cached resource. Returns true if the resource existed.
   */
  destroyRes(name) {
    if (this.fileDic.has(name)) {
      this.onResourceDestroy(this.fileDic.get(name));
      this.fileDic.delete(name);
      return true;
    }
    return false;
  }
  /**
   * Called when a resource is destroyed. Subclasses override for cleanup.
   */
  onResourceDestroy(_resource) {
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/resource/analyzers/ImageAnalyzer.js
var ImageAnalyzer = class extends AnalyzerBase {
  /**
   * Load an image resource.
   */
  loadFile(item) {
    if (this.fileDic.has(item.name)) {
      item.loaded = true;
      return Promise.resolve(item);
    }
    return new Promise((resolve) => {
      const loader = new ImageLoader();
      const onComplete = () => {
        cleanup();
        if (loader.data) {
          const texture = new Texture();
          texture.setBitmapData(loader.data);
          this.fileDic.set(item.name, texture);
          item.loaded = true;
        } else {
          item.loaded = false;
        }
        resolve(item);
      };
      const onError = () => {
        cleanup();
        item.loaded = false;
        resolve(item);
      };
      const cleanup = () => {
        loader.removeEventListener(Event.COMPLETE, onComplete);
        loader.removeEventListener(IOErrorEvent.IO_ERROR, onError);
      };
      loader.addEventListener(Event.COMPLETE, onComplete);
      loader.addEventListener(IOErrorEvent.IO_ERROR, onError);
      loader.load(item.url);
    });
  }
  onResourceDestroy(resource2) {
    if (resource2 instanceof Texture) {
      resource2.dispose();
    }
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/resource/analyzers/JsonAnalyzer.js
var JsonAnalyzer = class extends AnalyzerBase {
  /**
   * Load a JSON resource.
   */
  loadFile(item) {
    if (this.fileDic.has(item.name)) {
      item.loaded = true;
      return Promise.resolve(item);
    }
    return new Promise((resolve) => {
      const request = new HttpRequest();
      request.responseType = HttpResponseType.TEXT;
      const onComplete = () => {
        cleanup();
        const response = request.response;
        if (response) {
          try {
            this.fileDic.set(item.name, JSON.parse(response));
            item.loaded = true;
          } catch {
            item.loaded = false;
          }
        } else {
          item.loaded = false;
        }
        resolve(item);
      };
      const onError = () => {
        cleanup();
        item.loaded = false;
        resolve(item);
      };
      const cleanup = () => {
        request.removeEventListener(Event.COMPLETE, onComplete);
        request.removeEventListener(IOErrorEvent.IO_ERROR, onError);
      };
      request.addEventListener(Event.COMPLETE, onComplete);
      request.addEventListener(IOErrorEvent.IO_ERROR, onError);
      request.open(item.url);
      request.send();
    });
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/resource/analyzers/TextAnalyzer.js
var TextAnalyzer = class extends AnalyzerBase {
  /**
   * Load a text resource.
   */
  loadFile(item) {
    if (this.fileDic.has(item.name)) {
      item.loaded = true;
      return Promise.resolve(item);
    }
    return new Promise((resolve) => {
      const request = new HttpRequest();
      request.responseType = HttpResponseType.TEXT;
      const onComplete = () => {
        cleanup();
        const response = request.response;
        if (response !== void 0) {
          this.fileDic.set(item.name, response);
          item.loaded = true;
        } else {
          item.loaded = false;
        }
        resolve(item);
      };
      const onError = () => {
        cleanup();
        item.loaded = false;
        resolve(item);
      };
      const cleanup = () => {
        request.removeEventListener(Event.COMPLETE, onComplete);
        request.removeEventListener(IOErrorEvent.IO_ERROR, onError);
      };
      request.addEventListener(Event.COMPLETE, onComplete);
      request.addEventListener(IOErrorEvent.IO_ERROR, onError);
      request.open(item.url);
      request.send();
    });
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/resource/analyzers/SoundAnalyzer.js
var SoundAnalyzer = class extends AnalyzerBase {
  /**
   * Load a sound resource.
   */
  loadFile(item) {
    if (this.fileDic.has(item.name)) {
      item.loaded = true;
      return Promise.resolve(item);
    }
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = "auto";
      const onCanPlayThrough = () => {
        cleanup();
        this.fileDic.set(item.name, audio);
        item.loaded = true;
        resolve(item);
      };
      const onError = () => {
        cleanup();
        item.loaded = false;
        resolve(item);
      };
      const cleanup = () => {
        audio.removeEventListener("canplaythrough", onCanPlayThrough);
        audio.removeEventListener("error", onError);
      };
      audio.addEventListener("canplaythrough", onCanPlayThrough);
      audio.addEventListener("error", onError);
      audio.src = item.url;
    });
  }
  onResourceDestroy(_resource) {
    if (_resource instanceof HTMLAudioElement) {
      _resource.pause();
      _resource.src = "";
    }
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/resource/analyzers/SheetAnalyzer.js
var SheetAnalyzer = class extends AnalyzerBase {
  /** Texture map for individual sub-textures accessible by subkey */
  textureMap = /* @__PURE__ */ new Map();
  /** Reverse mapping: sheet name → sub-key names */
  sheetSubkeys = /* @__PURE__ */ new Map();
  /**
   * Load a sheet resource. This involves two steps:
   * 1. Load the JSON config via HttpRequest
   * 2. Load the referenced image via ImageLoader
   * 3. Parse into a SpriteSheet
   */
  loadFile(item) {
    if (this.fileDic.has(item.name)) {
      item.loaded = true;
      return Promise.resolve(item);
    }
    return this.loadSheetConfig(item).then(({ config, imageUrl }) => {
      if (!config || !imageUrl) {
        item.loaded = false;
        return item;
      }
      return this.loadSheetImage(item, imageUrl, config);
    });
  }
  /**
   * Get a cached resource by name. Supports subkey lookup (e.g., "sheet.textureName").
   */
  getRes(name) {
    const direct = this.fileDic.get(name);
    if (direct)
      return direct;
    const tex = this.textureMap.get(name);
    if (tex)
      return tex;
    const dotIndex = name.indexOf(".");
    if (dotIndex !== -1) {
      const prefix = name.substring(0, dotIndex);
      const tail = name.substring(dotIndex + 1);
      const sheet = this.fileDic.get(prefix);
      if (sheet instanceof SpriteSheet) {
        return sheet.getTexture(tail);
      }
    }
    return void 0;
  }
  destroyRes(name) {
    const sheet = this.fileDic.get(name);
    if (sheet instanceof SpriteSheet) {
      const subkeys = this.sheetSubkeys.get(name);
      if (subkeys) {
        for (const texName of subkeys) {
          this.textureMap.delete(texName);
        }
        this.sheetSubkeys.delete(name);
      }
      this.fileDic.delete(name);
      sheet.dispose();
      return true;
    }
    if (this.textureMap.has(name)) {
      this.textureMap.delete(name);
      return true;
    }
    return false;
  }
  // ── Private helpers ──────────────────────────────────────────────────────
  loadSheetConfig(item) {
    return new Promise((resolve) => {
      const request = new HttpRequest();
      request.responseType = HttpResponseType.TEXT;
      const onComplete = () => {
        cleanup();
        const response = request.response;
        if (!response) {
          resolve({ config: void 0, imageUrl: "" });
          return;
        }
        try {
          const config = JSON.parse(response);
          const imageUrl = this.getRelativePath(item.url, config.file);
          resolve({ config, imageUrl });
        } catch {
          resolve({ config: void 0, imageUrl: "" });
        }
      };
      const onError = () => {
        cleanup();
        resolve({ config: void 0, imageUrl: "" });
      };
      const cleanup = () => {
        request.removeEventListener(Event.COMPLETE, onComplete);
        request.removeEventListener(IOErrorEvent.IO_ERROR, onError);
      };
      request.addEventListener(Event.COMPLETE, onComplete);
      request.addEventListener(IOErrorEvent.IO_ERROR, onError);
      request.open(item.url);
      request.send();
    });
  }
  loadSheetImage(item, imageUrl, config) {
    return new Promise((resolve) => {
      const loader = new ImageLoader();
      const onComplete = () => {
        cleanup();
        if (loader.data) {
          const texture = new Texture();
          texture.setBitmapData(loader.data);
          this.analyzeBitmap(item, texture, config);
          item.loaded = true;
        } else {
          item.loaded = false;
        }
        resolve(item);
      };
      const onError = () => {
        cleanup();
        item.loaded = false;
        resolve(item);
      };
      const cleanup = () => {
        loader.removeEventListener(Event.COMPLETE, onComplete);
        loader.removeEventListener(IOErrorEvent.IO_ERROR, onError);
      };
      loader.addEventListener(Event.COMPLETE, onComplete);
      loader.addEventListener(IOErrorEvent.IO_ERROR, onError);
      loader.load(imageUrl);
    });
  }
  analyzeBitmap(item, texture, config) {
    const name = item.name;
    if (this.fileDic.has(name) || !texture)
      return;
    const frames = config.frames;
    if (!frames)
      return;
    const spriteSheet = new SpriteSheet(texture);
    const subkeys = [];
    for (const subkey in frames) {
      const frame = frames[subkey];
      const subTexture = spriteSheet.createTexture(subkey, frame.x, frame.y, frame.w, frame.h, frame.offX ?? 0, frame.offY ?? 0, frame.sourceW ?? frame.w, frame.sourceH ?? frame.h);
      if (!this.textureMap.has(subkey)) {
        this.textureMap.set(subkey, subTexture);
      }
      subkeys.push(subkey);
    }
    this.sheetSubkeys.set(name, subkeys);
    this.fileDic.set(name, spriteSheet);
  }
  /**
   * Resolve a relative image path from the sheet URL.
   */
  getRelativePath(url, file) {
    const normalized = url.split("\\").join("/");
    const index = normalized.lastIndexOf("/");
    if (index !== -1) {
      return normalized.substring(0, index + 1) + file;
    }
    return file;
  }
};

// node_modules/.pnpm/@blakron+core@1.0.7/node_modules/@blakron/core/dist/blakron/resource/Resource.js
var Resource = class {
  // ── Instance fields ────────────────────────────────────────────────────────
  config = new ResourceConfig();
  loader = new ResourceLoader();
  analyzerMap = /* @__PURE__ */ new Map();
  eventListeners = /* @__PURE__ */ new Map();
  loadedNames = /* @__PURE__ */ new Set();
  groupLoadQueue = Promise.resolve();
  // ── Constructor ──────────────────────────────────────────────────────────
  constructor() {
    this.registerDefaultAnalyzers();
  }
  // ── Config ───────────────────────────────────────────────────────────────
  /**
   * Load and parse a resource configuration file.
   * @param url URL of the resource.json file
   * @param folder Base URL prefix for resource files (default: '')
   */
  async loadConfig(url, folder = "") {
    const data = await this.fetchConfig(url);
    this.config.parseConfig(data, folder);
    this.emit({
      type: ResourceEventType.CONFIG_COMPLETE,
      groupName: "",
      itemsLoaded: 0,
      itemsTotal: 0
    });
  }
  /**
   * Add a resource definition directly (without a config file).
   */
  addResource(def) {
    this.config.addItem(def);
  }
  // ── Group loading ────────────────────────────────────────────────────────
  /**
   * Load all resources in a group. Returns a promise that resolves when done.
   *
   * `this.loader` is a single shared instance, so running two batches at once
   * would let the second call's queue/callbacks silently replace the first's
   * mid-flight. Concurrent calls (for the same or different groups) are
   * therefore chained onto `groupLoadQueue` and run to completion one at a
   * time; each call still gets its own promise that resolves/rejects
   * independently once its turn comes up, and a failed batch doesn't block
   * the ones queued after it.
   *
   * The already-loaded filter is recomputed once this call's turn actually
   * starts (inside `run()`), not at call time — otherwise an
   * already-queued, overlapping `loadGroup()` call could finish loading some
   * of these items first, and a stale snapshot would re-load them anyway.
   *
   * @param groupName Name of the group to load
   * @param priority Reserved for future prioritized loading; currently unused by `ResourceLoader`
   * @param onProgress Optional progress callback
   */
  async loadGroup(groupName, priority = 0, onProgress) {
    const items = this.config.getGroupByName(groupName);
    if (items.length === 0) {
      throw new Error(`Resource group "${groupName}" not found or is empty.`);
    }
    const run = () => {
      const toLoad = items.filter((item) => !this.isResourceLoaded(item.name));
      if (toLoad.length === 0)
        return Promise.resolve();
      return this.loadResourceList(toLoad, groupName, priority, onProgress);
    };
    const scheduled = this.groupLoadQueue.then(run, run);
    this.groupLoadQueue = scheduled.catch(() => void 0);
    return scheduled;
  }
  // ── Single resource loading ──────────────────────────────────────────────
  /**
   * Load a single resource by name. Returns the cached data.
   */
  async load(name) {
    const cached = this.get(name);
    if (cached !== void 0)
      return cached;
    const item = this.config.getResourceItem(name);
    if (!item) {
      throw new Error(`Resource "${name}" not found in config.`);
    }
    const analyzer = this.getAnalyzer(item.type);
    if (!analyzer) {
      throw new Error(`No analyzer registered for type "${item.type}".`);
    }
    const result = await analyzer.loadFile(item);
    if (!result.loaded) {
      throw new Error(`Failed to load resource "${name}" from "${item.url}".`);
    }
    this.loadedNames.add(name);
    return this.get(name);
  }
  // ── Cache access ─────────────────────────────────────────────────────────
  /**
   * Get a cached resource synchronously. Returns undefined if not loaded.
   */
  get(name) {
    for (const analyzer of this.analyzerMap.values()) {
      const data = analyzer.getRes(name);
      if (data !== void 0)
        return data;
    }
    return void 0;
  }
  /**
   * Check if a resource is loaded and cached.
   */
  hasRes(name) {
    for (const analyzer of this.analyzerMap.values()) {
      if (analyzer.hasRes(name))
        return true;
    }
    return false;
  }
  /**
   * Check if a group exists in the config.
   */
  hasGroup(name) {
    return this.config.hasGroup(name);
  }
  /**
   * Get all group names.
   */
  getGroupNames() {
    return this.config.getGroupNames();
  }
  // ── Resource destruction ─────────────────────────────────────────────────
  /**
   * Destroy a single cached resource by name.
   */
  destroy(name) {
    for (const analyzer of this.analyzerMap.values()) {
      if (analyzer.destroyRes(name)) {
        this.loadedNames.delete(name);
        return true;
      }
    }
    return false;
  }
  /**
   * Destroy all resources in a group.
   */
  destroyGroup(groupName) {
    const items = this.config.getGroupByName(groupName);
    for (const item of items) {
      this.destroy(item.name);
    }
  }
  /**
   * Destroy all cached resources.
   */
  destroyAll() {
    const names = Array.from(this.loadedNames);
    for (const name of names) {
      this.destroy(name);
    }
    this.loadedNames.clear();
  }
  // ── Events ───────────────────────────────────────────────────────────────
  /**
   * Listen for resource events.
   */
  on(type, listener) {
    let set = this.eventListeners.get(type);
    if (!set) {
      set = /* @__PURE__ */ new Set();
      this.eventListeners.set(type, set);
    }
    set.add(listener);
  }
  /**
   * Remove an event listener.
   */
  off(type, listener) {
    const set = this.eventListeners.get(type);
    if (set) {
      set.delete(listener);
    }
  }
  /**
   * Listen for loading progress on the next loadGroup/load call.
   * Convenience method — shorthand for on(ResourceEventType.GROUP_PROGRESS, ...).
   */
  onProgress(callback) {
    this.on(ResourceEventType.GROUP_PROGRESS, (event) => {
      callback(event.itemsLoaded, event.itemsTotal);
    });
  }
  // ── Custom analyzer registration ─────────────────────────────────────────
  /**
   * Register a custom analyzer for a resource type.
   */
  registerAnalyzer(type, analyzer) {
    this.analyzerMap.set(type, analyzer);
    this.loader.registerAnalyzer(type, analyzer);
  }
  // ── Private methods ──────────────────────────────────────────────────────
  registerDefaultAnalyzers() {
    const imageAnalyzer = new ImageAnalyzer();
    const jsonAnalyzer = new JsonAnalyzer();
    const textAnalyzer = new TextAnalyzer();
    const soundAnalyzer = new SoundAnalyzer();
    const sheetAnalyzer = new SheetAnalyzer();
    this.analyzerMap.set(ResourceType.Image, imageAnalyzer);
    this.analyzerMap.set(ResourceType.Json, jsonAnalyzer);
    this.analyzerMap.set(ResourceType.Text, textAnalyzer);
    this.analyzerMap.set(ResourceType.Sound, soundAnalyzer);
    this.analyzerMap.set(ResourceType.Sheet, sheetAnalyzer);
    this.loader.registerAnalyzer(ResourceType.Image, imageAnalyzer);
    this.loader.registerAnalyzer(ResourceType.Json, jsonAnalyzer);
    this.loader.registerAnalyzer(ResourceType.Text, textAnalyzer);
    this.loader.registerAnalyzer(ResourceType.Sound, soundAnalyzer);
    this.loader.registerAnalyzer(ResourceType.Sheet, sheetAnalyzer);
  }
  async fetchConfig(url) {
    return new Promise((resolve, reject) => {
      const request = new HttpRequest();
      request.responseType = HttpResponseType.TEXT;
      const onComplete = () => {
        cleanup();
        const response = request.response;
        if (!response) {
          const error = new Error(`Failed to load config from "${url}"`);
          this.emit({
            type: ResourceEventType.CONFIG_LOAD_ERROR,
            groupName: "",
            itemsLoaded: 0,
            itemsTotal: 0
          });
          reject(error);
          return;
        }
        try {
          resolve(JSON.parse(response));
        } catch (e) {
          reject(e);
        }
      };
      const onError = () => {
        cleanup();
        const error = new Error(`Failed to fetch config from "${url}"`);
        this.emit({
          type: ResourceEventType.CONFIG_LOAD_ERROR,
          groupName: "",
          itemsLoaded: 0,
          itemsTotal: 0
        });
        reject(error);
      };
      const cleanup = () => {
        request.removeEventListener(Event.COMPLETE, onComplete);
        request.removeEventListener(IOErrorEvent.IO_ERROR, onError);
      };
      request.addEventListener(Event.COMPLETE, onComplete);
      request.addEventListener(IOErrorEvent.IO_ERROR, onError);
      request.open(url);
      request.send();
    });
  }
  loadResourceList(list, groupName, _priority, onProgress) {
    return new Promise((resolve, reject) => {
      let loadedCount = 0;
      const totalCount = list.length;
      let hasError = false;
      this.loader.loadResourceList(list);
      this.loader.onComplete = (item) => {
        loadedCount++;
        this.loadedNames.add(item.name);
        this.emit({
          type: ResourceEventType.GROUP_PROGRESS,
          groupName,
          item,
          itemsLoaded: loadedCount,
          itemsTotal: totalCount
        });
        if (onProgress) {
          onProgress(loadedCount, totalCount);
        }
      };
      this.loader.onError = (item) => {
        hasError = true;
        this.emit({
          type: ResourceEventType.ITEM_LOAD_ERROR,
          groupName,
          item,
          itemsLoaded: loadedCount,
          itemsTotal: totalCount
        });
      };
      this.loader.onProgress = (_loaded, _total) => {
      };
      this.loader.start().then(() => {
        this.loader.onComplete = void 0;
        this.loader.onError = void 0;
        this.loader.onProgress = void 0;
        if (hasError) {
          this.emit({
            type: ResourceEventType.GROUP_LOAD_ERROR,
            groupName,
            itemsLoaded: loadedCount,
            itemsTotal: totalCount
          });
          reject(new Error(`Failed to load some resources in group "${groupName}".`));
        } else {
          this.emit({
            type: ResourceEventType.GROUP_COMPLETE,
            groupName,
            itemsLoaded: loadedCount,
            itemsTotal: totalCount
          });
          resolve();
        }
      });
    });
  }
  getAnalyzer(type) {
    return this.analyzerMap.get(type);
  }
  isResourceLoaded(name) {
    return this.hasRes(name);
  }
  emit(event) {
    const set = this.eventListeners.get(event.type);
    if (set) {
      for (const listener of set) {
        try {
          listener(event);
        } catch {
        }
      }
    }
  }
};
var resource = new Resource();
export {
  AnalyzerBase,
  Base64Util,
  Bitmap,
  BitmapData,
  BitmapFillMode,
  BitmapFont,
  BitmapText,
  BlendMode,
  BlurFilter,
  ByteArray,
  CanvasRenderer,
  Capabilities,
  CapsStyle,
  ColorMatrixFilter,
  CompressedTextureData,
  CustomFilter,
  DebugLog,
  DisplayList,
  DisplayObject,
  DisplayObjectContainer,
  DropShadowFilter,
  Endian,
  Event,
  EventDispatcher,
  ExternalInterface,
  Filter,
  FocusEvent,
  GlowFilter,
  GradientType,
  Graphics,
  HTTPStatusEvent,
  HorizontalAlign,
  HtmlTextParser,
  HttpMethod,
  HttpRequest,
  HttpResponseType,
  IOErrorEvent,
  ImageAnalyzer,
  ImageLoader,
  InputController,
  InstructionSet,
  JointStyle,
  JsonAnalyzer,
  Logger,
  Matrix,
  Mesh,
  MultiTextureBatcher,
  NumberUtils,
  OrientationMode,
  Player,
  Point,
  ProgressEvent,
  Rectangle,
  RenderBuffer,
  RenderTexture,
  Resource,
  ResourceConfig,
  ResourceEventType,
  ResourceItem,
  ResourceLoader,
  ResourceType,
  START_TIME,
  ScreenAdapter,
  ShaderLib,
  Shape,
  SheetAnalyzer,
  Sound,
  SoundAnalyzer,
  SoundChannel,
  SoundType,
  Sprite,
  SpriteSheet,
  Stage,
  StageOrientationEvent,
  StageScaleMode,
  StageText,
  SystemTicker,
  TextAnalyzer,
  TextEvent,
  TextField,
  TextFieldInputType,
  TextFieldType,
  Texture,
  Timer,
  TimerEvent,
  TouchEvent,
  TouchHandler,
  VerticalAlign,
  Video,
  WebGLDrawCmdManager,
  WebGLProgram,
  WebGLRenderBuffer,
  WebGLRenderContext,
  WebGLRenderTarget,
  WebGLRenderer,
  WebGLVertexArrayObject,
  blendModeToNumber,
  cacheFontResource,
  checkWebGLSupport,
  createPlayer,
  getFontString,
  getTimer,
  hitTestBuffer,
  invalidateRenderFlag,
  localStorage_exports as localStorage,
  measureText,
  numberToBlendMode,
  registerFontMapping,
  requestRenderingFlag,
  resource,
  setBitmapPixelHitTest,
  setGraphicsHitTest,
  setInvalidateRenderFlag,
  setRequestRenderingFlag,
  setupLifecycle,
  sharedMatrix,
  sharedPoint,
  sharedRectangle,
  splitGraphemes,
  textureScaleFactor,
  ticker,
  toColorString,
  tokenize
};
