// node_modules/.pnpm/@blakron+game@1.0.4/node_modules/@blakron/game/dist/blakron/tween/Tween.js
import { ticker } from "@blakron/core";

// node_modules/.pnpm/@blakron+game@1.0.4/node_modules/@blakron/game/dist/blakron/tween/Ease.js
var Ease = {
  // ── Linear ───────────────────────────────────────────────────────────────
  linear: (t) => t,
  // ── Configurable factories ────────────────────────────────────────────────
  /** Produces an adjustable quadratic curve; amount is clamped to [-1, 1]. */
  get: (amount) => {
    const a = Math.max(-1, Math.min(1, amount));
    return (t) => {
      if (a === 0)
        return t;
      if (a < 0)
        return t * (t * -a + 1 + a);
      return t * ((2 - t) * a + (1 - a));
    };
  },
  getPowIn: (pow) => (t) => Math.pow(t, pow),
  getPowOut: (pow) => (t) => 1 - Math.pow(1 - t, pow),
  getPowInOut: (pow) => (t) => {
    const t2 = t * 2;
    if (t2 < 1)
      return 0.5 * Math.pow(t2, pow);
    return 1 - 0.5 * Math.abs(Math.pow(2 - t2, pow));
  },
  // ── Sine ─────────────────────────────────────────────────────────────────
  sineIn: (t) => 1 - Math.cos(t * Math.PI / 2),
  sineOut: (t) => Math.sin(t * Math.PI / 2),
  sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  // ── Quad ─────────────────────────────────────────────────────────────────
  quadIn: (t) => t * t,
  quadOut: (t) => t * (2 - t),
  quadInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  // ── Cubic ─────────────────────────────────────────────────────────────────
  cubicIn: (t) => t * t * t,
  cubicOut: (t) => --t * t * t + 1,
  cubicInOut: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  // ── Quart ─────────────────────────────────────────────────────────────────
  quartIn: (t) => t * t * t * t,
  quartOut: (t) => 1 - --t * t * t * t,
  quartInOut: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t,
  // ── Quint ─────────────────────────────────────────────────────────────────
  quintIn: (t) => t * t * t * t * t,
  quintOut: (t) => 1 + --t * t * t * t * t,
  quintInOut: (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t,
  // ── Expo ─────────────────────────────────────────────────────────────────
  expoIn: (t) => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
  expoOut: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  expoInOut: (t) => {
    if (t === 0)
      return 0;
    if (t === 1)
      return 1;
    return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  // ── Circ ─────────────────────────────────────────────────────────────────
  circIn: (t) => 1 - Math.sqrt(1 - t * t),
  circOut: (t) => Math.sqrt(1 - --t * t),
  circInOut: (t) => t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - (-2 * t + 2) * (-2 * t + 2)) + 1) / 2,
  // ── Back ─────────────────────────────────────────────────────────────────
  getBackIn: (amount) => (t) => t * t * ((amount + 1) * t - amount),
  getBackOut: (amount) => (t) => --t * t * ((amount + 1) * t + amount) + 1,
  getBackInOut: (amount) => {
    const a = amount * 1.525;
    return (t) => {
      const t2 = t * 2;
      if (t2 < 1)
        return 0.5 * (t2 * t2 * ((a + 1) * t2 - a));
      return 0.5 * ((t2 - 2) * (t2 - 2) * ((a + 1) * (t2 - 2) + a) + 2);
    };
  },
  backIn: (t) => t * t * (2.70158 * t - 1.70158),
  backOut: (t) => --t * t * (2.70158 * t + 1.70158) + 1,
  backInOut: (t) => {
    const c2 = 1.70158 * 1.525;
    return t < 0.5 ? Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
  // ── Elastic ───────────────────────────────────────────────────────────────
  getElasticIn: (amplitude, period) => {
    const pi2 = Math.PI * 2;
    return (t) => {
      if (t === 0 || t === 1)
        return t;
      const s = period / pi2 * Math.asin(1 / amplitude);
      return -(amplitude * Math.pow(2, 10 * (t -= 1)) * Math.sin((t - s) * pi2 / period));
    };
  },
  getElasticOut: (amplitude, period) => {
    const pi2 = Math.PI * 2;
    return (t) => {
      if (t === 0 || t === 1)
        return t;
      const s = period / pi2 * Math.asin(1 / amplitude);
      return amplitude * Math.pow(2, -10 * t) * Math.sin((t - s) * pi2 / period) + 1;
    };
  },
  getElasticInOut: (amplitude, period) => {
    const pi2 = Math.PI * 2;
    return (t) => {
      if (t === 0 || t === 1)
        return t;
      const s = period / pi2 * Math.asin(1 / amplitude);
      const t2 = t * 2;
      if (t2 < 1)
        return -0.5 * (amplitude * Math.pow(2, 10 * (t2 - 1)) * Math.sin((t2 - 1 - s) * pi2 / period));
      return amplitude * Math.pow(2, -10 * (t2 - 1)) * Math.sin((t2 - 1 - s) * pi2 / period) * 0.5 + 1;
    };
  },
  elasticIn: (t) => {
    if (t === 0)
      return 0;
    if (t === 1)
      return 1;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * (2 * Math.PI) / 3);
  },
  elasticOut: (t) => {
    if (t === 0)
      return 0;
    if (t === 1)
      return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
  },
  elasticInOut: (t) => {
    if (t === 0)
      return 0;
    if (t === 1)
      return 1;
    return t < 0.5 ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / 4.5)) / 2 : Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / 4.5) / 2 + 1;
  },
  // ── Bounce ────────────────────────────────────────────────────────────────
  bounceOut: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1)
      return n1 * t * t;
    if (t < 2 / d1)
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1)
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  bounceIn: (t) => 1 - Ease.bounceOut(1 - t),
  bounceInOut: (t) => t < 0.5 ? (1 - Ease.bounceOut(1 - 2 * t)) / 2 : (1 + Ease.bounceOut(2 * t - 1)) / 2,
  /**
   * Creates a custom cubic-bezier easing function.
   *
   * The supplied progress is an x-coordinate. The corresponding curve
   * parameter is found with Newton iteration, falling back to bounded binary
   * search near flat derivatives, then used to sample the y-coordinate.
   */
  cubicBezier(x1, y1, x2, y2) {
    const sampleX = (t) => 3 * x1 * t * (1 - t) * (1 - t) + 3 * x2 * t * t * (1 - t) + t * t * t;
    const sampleY = (t) => 3 * y1 * t * (1 - t) * (1 - t) + 3 * y2 * t * t * (1 - t) + t * t * t;
    const sampleXDerivative = (t) => 3 * x1 * (1 - t) * (1 - t) + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t;
    return (progress) => {
      let t = progress;
      for (let i = 0; i < 8; i++) {
        const error = sampleX(t) - progress;
        if (Math.abs(error) < 1e-6) {
          return sampleY(t);
        }
        const derivative = sampleXDerivative(t);
        if (Math.abs(derivative) < 1e-6) {
          break;
        }
        const next = t - error / derivative;
        if (next < 0 || next > 1) {
          break;
        }
        t = next;
      }
      let lower = 0;
      let upper = 1;
      t = progress;
      for (let i = 0; i < 24; i++) {
        const value = sampleX(t);
        if (Math.abs(value - progress) < 1e-6) {
          break;
        }
        if (value < progress) {
          lower = t;
        } else {
          upper = t;
        }
        t = (lower + upper) / 2;
      }
      return sampleY(t);
    };
  }
};

// node_modules/.pnpm/@blakron+game@1.0.4/node_modules/@blakron/game/dist/blakron/tween/Tween.js
var _activeTweens = /* @__PURE__ */ new Set();
var _tweenCounts = /* @__PURE__ */ new WeakMap();
var _tickerRegistered = false;
var _globalPaused = false;
var _lastTimeStamp;
function _getTweenCount(target) {
  return _tweenCounts.get(target) ?? 0;
}
function _incrementTweenCount(target) {
  _tweenCounts.set(target, _getTweenCount(target) + 1);
}
function _decrementTweenCount(target) {
  const count = _getTweenCount(target) - 1;
  if (count <= 0) {
    _tweenCounts.delete(target);
  } else {
    _tweenCounts.set(target, count);
  }
}
function _normalizeRepeat(repeat, loop) {
  if (repeat === void 0) {
    return loop ? -1 : 0;
  }
  if (repeat === -1) {
    return -1;
  }
  return Number.isFinite(repeat) ? Math.max(0, Math.floor(repeat)) : 0;
}
function _validateDuration(duration) {
  if (!Number.isFinite(duration) || duration < 0) {
    throw new RangeError("Tween duration must be a finite non-negative number.");
  }
  return duration;
}
function _validatePosition(position) {
  if (!Number.isFinite(position)) {
    throw new RangeError("Tween position must be a finite number.");
  }
  return Math.max(0, position);
}
function _registerTicker() {
  if (_tickerRegistered) {
    return;
  }
  _tickerRegistered = true;
  ticker.startTick(_globalTick, null);
}
function _unregisterTicker() {
  if (!_tickerRegistered) {
    return;
  }
  _tickerRegistered = false;
  _lastTimeStamp = void 0;
  ticker.stopTick(_globalTick, null);
}
function _globalTick(timeStamp) {
  if (_lastTimeStamp === void 0) {
    _lastTimeStamp = timeStamp;
    return false;
  }
  const deltaTime = timeStamp - _lastTimeStamp;
  _lastTimeStamp = timeStamp;
  for (const tween of [..._activeTweens]) {
    tween._tick(deltaTime);
  }
  return false;
}
function _addActive(tween) {
  if (_activeTweens.size === 0) {
    _registerTicker();
  }
  _activeTweens.add(tween);
}
function _removeActive(tween) {
  if (!_activeTweens.delete(tween) || _activeTweens.size !== 0) {
    return;
  }
  _unregisterTicker();
}
function _releaseTween(tween) {
  const target = tween._target;
  if (!target) {
    return;
  }
  tween._target = void 0;
  _decrementTweenCount(target);
  _removeActive(tween);
  tween._resolveAll();
  tween._notifyRelease();
  tween._dispose();
}
var Tween = class _Tween {
  // ── Static methods ────────────────────────────────────────────────────────
  /**
   * Creates a Tween for a target.
   */
  static get(target, options, override = false) {
    if (override) {
      _Tween.removeTweens(target);
    }
    const tween = new _Tween();
    tween._initialize(target, options);
    _addActive(tween);
    _incrementTweenCount(target);
    return tween;
  }
  /**
   * Returns the number of active or paused tweens targeting an object.
   */
  static getCount(target) {
    return _getTweenCount(target);
  }
  /**
   * Removes every tween targeting an object.
   */
  static removeTweens(target) {
    for (const tween of [..._activeTweens]) {
      if (tween._target === target) {
        _releaseTween(tween);
      }
    }
  }
  /**
   * Pauses every tween targeting an object.
   */
  static pauseTweens(target) {
    for (const tween of _activeTweens) {
      if (tween._target === target) {
        tween.setPaused(true);
      }
    }
  }
  /**
   * Resumes every tween targeting an object.
   */
  static resumeTweens(target) {
    for (const tween of _activeTweens) {
      if (tween._target === target) {
        tween.setPaused(false);
      }
    }
  }
  /**
   * Removes every active tween.
   */
  static removeAllTweens() {
    for (const tween of [..._activeTweens]) {
      _releaseTween(tween);
    }
  }
  /**
   * Pauses all tweens except those configured to ignore global pause.
   */
  static pauseAll() {
    _globalPaused = true;
  }
  /**
   * Resumes globally paused tweens.
   */
  static resumeAll() {
    _globalPaused = false;
  }
  // ── Instance fields ───────────────────────────────────────────────────────
  _target;
  _steps = [];
  _stepIndex = 0;
  _stepElapsed = 0;
  _hasTimedSteps = false;
  _pendingPosition;
  _paused = false;
  _repeatsLeft = 0;
  _yoyo = false;
  _reversed = false;
  _ignoreGlobalPause = false;
  _defaultEase = Ease.linear;
  _onChange;
  _onChangeObj;
  _onLoopComplete;
  _onLoopCompleteObj;
  _resolvers = [];
  _releaseListeners = [];
  _isCompleted = false;
  // ── Getters / Setters ─────────────────────────────────────────────────────
  /**
   * Whether the tween has not yet completed or been removed.
   */
  get isActive() {
    return this._target !== void 0;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  /**
   * Resolves with `undefined` when the tween completes or is removed.
   * Completion never rejects; cancellation and natural completion share the
   * same terminal state.
   */
  then(onfulfilled, onrejected) {
    return new Promise((resolve) => {
      if (this._isCompleted) {
        resolve();
      } else {
        this._resolvers.push(resolve);
      }
    }).then(onfulfilled, onrejected);
  }
  /**
   * Adds a property interpolation step. Start values are sampled on first use
   * and then retained, keeping repeat and yoyo cycles continuous.
   */
  to(props, duration, ease) {
    const stepDuration = _validateDuration(duration);
    this._steps.push({ type: "to", props, duration: stepDuration, ease: ease ?? this._defaultEase });
    this._hasTimedSteps ||= stepDuration > 0;
    return this;
  }
  /**
   * Adds an interpolation from explicit values to the target's initial values.
   * The original end values are captured once and reused by later cycles.
   */
  from(props, duration, ease) {
    const stepDuration = _validateDuration(duration);
    this._steps.push({ type: "from", props, duration: stepDuration, ease: ease ?? this._defaultEase });
    this._hasTimedSteps ||= stepDuration > 0;
    return this;
  }
  /**
   * Adds a delay to the sequence.
   */
  wait(duration) {
    const stepDuration = _validateDuration(duration);
    if (stepDuration === 0) {
      return this;
    }
    this._steps.push({ type: "wait", duration: stepDuration });
    this._hasTimedSteps = true;
    return this;
  }
  /**
   * Adds a callback step.
   */
  call(callback, thisObj, params) {
    this._steps.push({ type: "call", duration: 0, fn: callback, thisObj, params: params ?? [] });
    return this;
  }
  /**
   * Adds an immediate property update.
   */
  set(props) {
    this._steps.push({ type: "set", duration: 0, props });
    return this;
  }
  /**
   * Pauses or resumes the tween.
   */
  setPaused(value) {
    this._paused = value;
    return this;
  }
  /**
   * Pauses the tween.
   */
  pause() {
    this.setPaused(true);
  }
  /**
   * Resumes the tween.
   */
  resume() {
    this.setPaused(false);
  }
  /**
   * Removes the tween.
   */
  remove() {
    _releaseTween(this);
  }
  /**
   * Moves the sequence to an absolute position in its initial forward pass.
   * Seeking applies prior interpolations and `set` steps, but deliberately
   * skips `call` steps to avoid replaying arbitrary side effects.
   */
  setPosition(value) {
    if (!this._target) {
      return;
    }
    this._pendingPosition = void 0;
    this._seekTo(_validatePosition(value));
    if (this._stepIndex >= this._steps.length) {
      _releaseTween(this);
    }
  }
  // ── Internal methods ──────────────────────────────────────────────────────
  _addReleaseListener(listener) {
    if (this._isCompleted) {
      listener();
      return;
    }
    this._releaseListeners.push(listener);
  }
  _tick(deltaTime) {
    if (this._paused || !this._ignoreGlobalPause && _globalPaused || !this._target) {
      return;
    }
    if (this._pendingPosition !== void 0) {
      const position = this._pendingPosition;
      this._pendingPosition = void 0;
      this._seekTo(position);
    }
    if (this._stepIndex >= this._steps.length) {
      _releaseTween(this);
      return;
    }
    let remaining = Math.max(0, deltaTime);
    do {
      while (remaining > 0 && this._stepIndex < this._steps.length) {
        const step = this._steps[this._canonicalStepIndex(this._stepIndex)];
        if (step.duration === 0) {
          this._advanceInstantSteps();
          continue;
        }
        if (this._stepElapsed === 0) {
          this._initializeStep(step);
        }
        this._stepElapsed += remaining;
        if (this._stepElapsed >= step.duration) {
          remaining = this._stepElapsed - step.duration;
          this._stepElapsed = 0;
          this._applyStep(step, this._reversed ? 0 : 1);
          this._stepIndex++;
        } else {
          this._applyStep(step, this._reversed ? 1 - this._stepElapsed / step.duration : this._stepElapsed / step.duration);
          remaining = 0;
        }
      }
      this._advanceInstantSteps();
      if (this._stepIndex < this._steps.length) {
        break;
      }
      if (this._repeatsLeft === 0) {
        this._notifyChange();
        if (!this._target) {
          return;
        }
        _releaseTween(this);
        return;
      }
      this._startNextCycle();
      if (!this._target) {
        return;
      }
      if (!this._hasTimedSteps && this._repeatsLeft === -1) {
        break;
      }
    } while (remaining > 0 || !this._hasTimedSteps && this._repeatsLeft !== -1);
    this._notifyChange();
  }
  _notifyRelease() {
    const listeners = this._releaseListeners;
    this._releaseListeners = [];
    for (const listener of listeners) {
      listener();
    }
  }
  _resolveAll() {
    this._isCompleted = true;
    const resolvers = this._resolvers;
    this._resolvers = [];
    for (const resolve of resolvers) {
      resolve();
    }
  }
  _dispose() {
    this._steps = [];
    this._stepIndex = 0;
    this._stepElapsed = 0;
    this._hasTimedSteps = false;
    this._pendingPosition = void 0;
    this._onChange = void 0;
    this._onChangeObj = void 0;
    this._onLoopComplete = void 0;
    this._onLoopCompleteObj = void 0;
    this._releaseListeners = [];
  }
  // ── Private methods ───────────────────────────────────────────────────────
  _initialize(target, options) {
    this._target = target;
    this._steps = [];
    this._stepIndex = 0;
    this._stepElapsed = 0;
    this._hasTimedSteps = false;
    this._pendingPosition = options?.position === void 0 ? void 0 : _validatePosition(options.position);
    this._paused = options?.paused ?? false;
    this._repeatsLeft = _normalizeRepeat(options?.repeat, options?.loop);
    this._yoyo = options?.yoyo ?? false;
    this._reversed = false;
    this._ignoreGlobalPause = options?.ignoreGlobalPause ?? false;
    this._defaultEase = options?.ease ?? Ease.linear;
    this._onChange = options?.onChange;
    this._onChangeObj = options?.onChangeObj;
    this._onLoopComplete = options?.onLoopComplete;
    this._onLoopCompleteObj = options?.onLoopCompleteObj;
  }
  /**
   * Runs consecutive zero-duration steps. Property steps are reversible;
   * callbacks and setters run only forward because they have no generic undo.
   */
  _advanceInstantSteps() {
    while (this._stepIndex < this._steps.length) {
      const step = this._steps[this._canonicalStepIndex(this._stepIndex)];
      if (step.duration !== 0) {
        return;
      }
      if (step.type === "to" || step.type === "from") {
        this._initializeStep(step);
        this._applyStep(step, this._reversed ? 0 : 1);
      } else if (!this._reversed) {
        this._executeInstantStep(step);
      }
      this._stepIndex++;
    }
  }
  /**
   * Starts the next repeat cycle and flips traversal direction for yoyo.
   */
  _startNextCycle() {
    if (this._repeatsLeft > 0) {
      this._repeatsLeft--;
    }
    this._stepIndex = 0;
    this._stepElapsed = 0;
    this._reversed = this._yoyo ? !this._reversed : false;
    if (this._onLoopComplete) {
      this._onLoopComplete.call(this._onLoopCompleteObj ?? this._target, this);
    }
  }
  /**
   * Captures endpoints lazily. A captured endpoint is never overwritten so a
   * repeat or yoyo pass retraces the same animation instead of sampling a
   * mutated target value.
   */
  _initializeStep(step) {
    if (step.type === "to" && step.startValues) {
      return;
    }
    if (step.type === "from" && step.endValues) {
      return;
    }
    const target = this._target;
    if (step.type === "to") {
      step.startValues = {};
      for (const key of Object.keys(step.props)) {
        step.startValues[key] = target[key] ?? 0;
      }
    } else if (step.type === "from") {
      step.endValues = {};
      for (const key of Object.keys(step.props)) {
        step.endValues[key] = target[key] ?? 0;
        target[key] = step.props[key];
      }
    }
  }
  /** Maps the current traversal index to the original step order for yoyo. */
  _canonicalStepIndex(index) {
    return this._reversed ? this._steps.length - 1 - index : index;
  }
  /** Applies one interpolated `to` or `from` step at an uneased normalized progress value. */
  _applyStep(step, progress) {
    const target = this._target;
    if (step.type === "to") {
      const easedProgress = step.ease(progress);
      const start = step.startValues;
      for (const key of Object.keys(step.props)) {
        target[key] = start[key] + (step.props[key] - start[key]) * easedProgress;
      }
    } else if (step.type === "from") {
      const easedProgress = step.ease(progress);
      const end = step.endValues;
      for (const key of Object.keys(step.props)) {
        target[key] = step.props[key] + (end[key] - step.props[key]) * easedProgress;
      }
    }
  }
  /** Executes a non-interpolated forward step; only callbacks and property sets reach this method. */
  _executeInstantStep(step) {
    if (step.type === "call") {
      step.fn.apply(step.thisObj ?? this._target, step.params);
    } else if (step.type === "set") {
      this._applySetStep(step);
    }
  }
  /** Copies a `set` step's values to the target without invoking user code. */
  _applySetStep(step) {
    const target = this._target;
    for (const key of Object.keys(step.props)) {
      target[key] = step.props[key];
    }
  }
  /**
   * Rebuilds target state from the start of the forward sequence. Calls are
   * skipped, while `set` is applied because later interpolation may depend on
   * its resulting target state.
   */
  _seekTo(position) {
    this._stepIndex = 0;
    this._stepElapsed = 0;
    this._reversed = false;
    let remaining = position;
    while (this._stepIndex < this._steps.length) {
      const step = this._steps[this._stepIndex];
      if (step.duration === 0) {
        if (step.type === "to" || step.type === "from") {
          this._initializeStep(step);
          this._applyStep(step, 1);
        } else if (step.type === "set") {
          this._applySetStep(step);
        }
        this._stepIndex++;
        continue;
      }
      this._initializeStep(step);
      if (remaining >= step.duration) {
        this._applyStep(step, 1);
        remaining -= step.duration;
        this._stepIndex++;
        continue;
      }
      this._stepElapsed = remaining;
      this._applyStep(step, remaining / step.duration);
      return;
    }
  }
  /** Invokes the per-update observer with its configured receiver or the tween target. */
  _notifyChange() {
    if (this._onChange) {
      this._onChange.call(this._onChangeObj ?? this._target, this);
    }
  }
};

// node_modules/.pnpm/@blakron+game@1.0.4/node_modules/@blakron/game/dist/blakron/tween/TweenGroup.js
var TweenGroup = class {
  // ── Instance fields ───────────────────────────────────────────────────────
  name;
  _tweens = [];
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(name = "") {
    this.name = name;
  }
  // ── Getters / Setters ─────────────────────────────────────────────────────
  /**
   * Number of active Tweens currently tracked by this group.
   */
  get size() {
    return this._tweens.length;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  /**
   * Create and track a Tween for the specified target.
   */
  get(target, options) {
    const tween = Tween.get(target, options);
    this._track(tween);
    return tween;
  }
  /**
   * Add an existing active Tween to this group.
   */
  add(tween) {
    this._track(tween);
  }
  /**
   * Pause every tracked Tween.
   */
  pause() {
    for (const tween of this._tweens) {
      tween.pause();
    }
  }
  /**
   * Resume every tracked Tween.
   */
  resume() {
    for (const tween of this._tweens) {
      tween.resume();
    }
  }
  /**
   * Remove every tracked Tween and clear the group.
   */
  removeAll() {
    for (const tween of this._tweens.slice()) {
      tween.remove();
    }
    this._tweens = [];
  }
  // ── Private methods ───────────────────────────────────────────────────────
  _track(tween) {
    if (!tween.isActive || this._tweens.includes(tween)) {
      return;
    }
    this._tweens.push(tween);
    tween._addReleaseListener(() => {
      const index = this._tweens.indexOf(tween);
      if (index !== -1) {
        this._tweens.splice(index, 1);
      }
    });
  }
};

// node_modules/.pnpm/@blakron+game@1.0.4/node_modules/@blakron/game/dist/blakron/display/MovieClip.js
import { Bitmap } from "@blakron/core";

// node_modules/.pnpm/@blakron+game@1.0.4/node_modules/@blakron/game/dist/blakron/display/types.js
var MovieClipEvent = {
  /** Dispatched after a finite playback session reaches its final frame and stops. */
  COMPLETE: "complete",
  /** Dispatched after a completed cycle that will continue with another cycle. */
  LOOP_COMPLETE: "loopComplete",
  /** Dispatched when MovieClip makes a valid logical frame current. */
  FRAME_CHANGE: "frameChange"
};

// node_modules/.pnpm/@blakron+game@1.0.4/node_modules/@blakron/game/dist/blakron/display/MovieClip.js
function _validatePlayTimes(value) {
  if (!Number.isInteger(value) || value < -1) {
    throw new RangeError("MovieClip playTimes must be -1, 0, or a positive integer.");
  }
  return value;
}
var MovieClip = class extends Bitmap {
  // ── Instance fields ───────────────────────────────────────────────────────
  _data;
  _currentFrameIndex = 0;
  _isPlaying = false;
  _playTimes = 1;
  _playedTimes = 0;
  _playRangeStart = 0;
  _playRangeEnd;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(data) {
    super();
    if (data) {
      this.movieClipData = data;
    }
  }
  // ── Getters / Setters ─────────────────────────────────────────────────────
  get movieClipData() {
    return this._data;
  }
  /**
   * Set the frame data source and reset the clip to its first frame.
   * Any active playback is stopped before the source is replaced.
   */
  set movieClipData(value) {
    this.stop();
    this._data = value;
    this._currentFrameIndex = 0;
    this._playedTimes = 0;
    this._clearPlayRange();
    this._applyFrame(0);
  }
  /**
   * Current frame number, 1-based.
   */
  get currentFrame() {
    return this._currentFrameIndex + 1;
  }
  /**
   * Total number of frames.
   */
  get totalFrames() {
    return this._data?.frameCount ?? 0;
  }
  /**
   * Whether the animation is currently playing.
   */
  get isPlaying() {
    return this._isPlaying;
  }
  /**
   * Label that begins at the current frame, or undefined when there is none.
   */
  get currentFrameLabel() {
    return this._data?.getFrameLabel(this._currentFrameIndex);
  }
  /**
   * Nearest preceding label for the current frame, or undefined when absent.
   */
  get currentLabel() {
    return this._data?.getFrameLabelForFrame(this._currentFrameIndex);
  }
  // ── Public methods ────────────────────────────────────────────────────────
  /**
   * Start or resume playback from the current frame.
   *
   * Calling play does not schedule updates. The owning game loop must call
   * advanceFrame() whenever this clip should enter its next animation frame.
   *
   * @param playTimes -1 loops forever; 0 keeps the current setting; a positive
   * integer plays that many times.
   */
  play(playTimes = 0) {
    _validatePlayTimes(playTimes);
    if (this._isPlaying || !this._data || this._data.frameCount === 0)
      return;
    if (playTimes !== 0) {
      this._playTimes = playTimes;
    }
    this._playedTimes = 0;
    this._isPlaying = true;
  }
  /**
   * Advance to the next animation frame.
   *
   * This is the external playback entry point. It advances exactly one frame,
   * performs loop/completion handling, and dispatches frame events. It does
   * nothing while stopped.
   */
  advanceFrame() {
    if (!this._isPlaying)
      return;
    const data = this._data;
    if (!data || data.frameCount === 0) {
      this.stop();
      return;
    }
    const rangeEnd = this._playRangeEnd ?? data.frameCount - 1;
    const nextIndex = this._currentFrameIndex + 1;
    if (nextIndex <= rangeEnd) {
      this._currentFrameIndex = nextIndex;
      this._applyFrame(nextIndex);
      return;
    }
    this._playedTimes++;
    if (this._playTimes !== -1 && this._playedTimes >= this._playTimes) {
      this.stop();
      this.dispatchEventWith(MovieClipEvent.COMPLETE);
      return;
    }
    this.dispatchEventWith(MovieClipEvent.LOOP_COMPLETE);
    if (!this._isPlaying || this._data !== data)
      return;
    this._currentFrameIndex = this._playRangeEnd === void 0 ? 0 : this._playRangeStart;
    this._applyFrame(this._currentFrameIndex);
  }
  /**
   * Stop playback and stay on the current frame.
   */
  stop() {
    this._isPlaying = false;
  }
  /**
   * Move to the previous frame and stop.
   */
  prevFrame() {
    this.gotoAndStop(this.currentFrame - 1);
  }
  /**
   * Move to the next frame and stop.
   *
   * This is manual navigation. Playback loops should use advanceFrame().
   */
  nextFrame() {
    this.gotoAndStop(this.currentFrame + 1);
  }
  /**
   * Jump to a frame or label and start a new playback session.
   *
   * A label plays only its declared inclusive frame range. A numeric frame
   * clears any active label range and plays through the full animation.
   *
   * @param frame 1-based frame number or a frame label string.
   * @param playTimes -1 loops forever; 0 keeps the current setting; a positive
   * integer plays that many times.
   */
  gotoAndPlay(frame, playTimes = 0) {
    _validatePlayTimes(playTimes);
    const target = this._resolveFrame(frame);
    if (!target) {
      this.stop();
      return;
    }
    this.stop();
    this._setPlayRange(target.rangeStart, target.rangeEnd);
    this._setCurrentFrame(target.index);
    this.play(playTimes);
  }
  /**
   * Jump to a frame or label and stop.
   * @param frame 1-based frame number or a frame label string.
   */
  gotoAndStop(frame) {
    const target = this._resolveFrame(frame);
    if (!target)
      return;
    this.stop();
    this._clearPlayRange();
    this._setCurrentFrame(target.index);
  }
  // ── Override methods ──────────────────────────────────────────────────────
  $onRemoveFromStage() {
    super.$onRemoveFromStage();
    this.stop();
  }
  // ── Private methods ───────────────────────────────────────────────────────
  _resolveFrame(frame) {
    const data = this._data;
    if (!data || data.frameCount === 0)
      return void 0;
    if (typeof frame === "string") {
      const range = data.getFrameLabelRange(frame);
      if (!range) {
        throw new RangeError(`MovieClip label does not exist: ${frame}`);
      }
      return { index: range.startFrame, rangeStart: range.startFrame, rangeEnd: range.endFrame };
    }
    if (!Number.isInteger(frame)) {
      throw new RangeError("MovieClip frame number must be a finite integer.");
    }
    return {
      index: Math.max(0, Math.min(frame - 1, data.frameCount - 1)),
      rangeStart: 0,
      rangeEnd: void 0
    };
  }
  _setCurrentFrame(index) {
    this._currentFrameIndex = index;
    this._applyFrame(index);
  }
  _setPlayRange(startFrame, endFrame) {
    this._playRangeStart = startFrame;
    this._playRangeEnd = endFrame;
  }
  _clearPlayRange() {
    this._setPlayRange(0, void 0);
  }
  _applyFrame(index) {
    const frame = this._data?.getFrame(index);
    this.texture = frame?.texture;
    if (!frame)
      return;
    this.dispatchEventWith(MovieClipEvent.FRAME_CHANGE);
    if (frame.event) {
      this.dispatchEventWith(frame.event);
    }
  }
};

// node_modules/.pnpm/@blakron+game@1.0.4/node_modules/@blakron/game/dist/blakron/display/MovieClipData.js
function _validatePositiveFinite(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite positive number.`);
  }
  return value;
}
function _validateFrameIndex(value, frameCount, name) {
  if (!Number.isInteger(value) || value < 0 || value >= frameCount) {
    throw new RangeError(`${name} is out of range.`);
  }
  return value;
}
function _validateLabelName(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new RangeError("MovieClip label name must not be empty.");
  }
  return value;
}
var MovieClipData = class _MovieClipData {
  // ── Instance fields ───────────────────────────────────────────────────────
  _frames = [];
  _labels = [];
  _labelMap = /* @__PURE__ */ new Map();
  _frameRate = 24;
  // ── Getters / Setters ─────────────────────────────────────────────────────
  /**
   * Fixed-rate timing metadata used by factories and external schedulers.
   */
  get frameRate() {
    return this._frameRate;
  }
  set frameRate(value) {
    this._frameRate = _validatePositiveFinite(value, "MovieClipData frameRate");
  }
  /**
   * Total number of frames.
   */
  get frameCount() {
    return this._frames.length;
  }
  /**
   * Sum of frame-duration metadata in milliseconds.
   */
  get totalDuration() {
    let total = 0;
    for (const frame of this._frames) {
      total += frame.duration;
    }
    return total;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  /**
   * Append a frame to the animation.
   * @param texture Texture to display; undefined creates a blank frame.
   * @param duration Timing metadata in milliseconds for an external scheduler.
   * @param label Optional label beginning at this 0-based frame index.
   */
  addFrame(texture, duration, label) {
    const index = this._frames.length;
    this._frames.push({ texture, duration: _validatePositiveFinite(duration, "MovieClip frame duration"), label });
    if (label) {
      this.setFrameLabel(label, index);
    }
  }
  /**
   * Add or replace a named, inclusive playback range.
   * @param name Label name.
   * @param startFrame 0-based first frame in the range.
   * @param endFrame 0-based final frame in the range; defaults to startFrame.
   */
  setFrameLabel(name, startFrame, endFrame = startFrame) {
    _validateLabelName(name);
    _validateFrameIndex(startFrame, this._frames.length, "MovieClip label start frame");
    _validateFrameIndex(endFrame, this._frames.length, "MovieClip label end frame");
    if (endFrame < startFrame) {
      throw new RangeError("MovieClip label end frame must not precede its start frame.");
    }
    const existing = this._labelMap.get(name);
    if (existing) {
      existing.startFrame = startFrame;
      existing.endFrame = endFrame;
      return;
    }
    const label = { name, startFrame, endFrame };
    this._labels.push(label);
    this._labelMap.set(name, label);
  }
  /**
   * Set a custom event name to dispatch when a specific frame becomes current.
   */
  setFrameEvent(frameIndex, eventName) {
    _validateFrameIndex(frameIndex, this._frames.length, "MovieClip frame index");
    if (typeof eventName !== "string" || eventName.trim().length === 0) {
      throw new RangeError("MovieClip frame event name must not be empty.");
    }
    this._frames[frameIndex].event = eventName;
  }
  /**
   * Get a frame by 0-based internal index.
   */
  getFrame(index) {
    return this._frames[index];
  }
  /**
   * Get the inclusive range for a label, or undefined when it does not exist.
   */
  getFrameLabelRange(name) {
    return this._labelMap.get(name);
  }
  /**
   * Get the label that begins exactly at a 0-based frame index.
   */
  getFrameLabel(frameIndex) {
    return this._labels.find((label) => label.startFrame === frameIndex)?.name;
  }
  /**
   * Get the nearest preceding label at a 0-based frame index.
   */
  getFrameLabelForFrame(frameIndex) {
    let nearest;
    for (const label of this._labels) {
      if (label.startFrame <= frameIndex && (!nearest || label.startFrame > nearest.startFrame)) {
        nearest = label;
      }
    }
    return nearest?.name;
  }
  /**
   * Get the 0-based first frame index for a given label, or -1 when absent.
   */
  getFrameByLabel(label) {
    return this._labelMap.get(label)?.startFrame ?? -1;
  }
  // ── Static factories ──────────────────────────────────────────────────────
  /**
   * Create fixed-rate frame data from an array of textures.
   */
  static fromTextureArray(textures, fps = 12) {
    const frameRate = _validatePositiveFinite(fps, "MovieClip factory fps");
    const data = new _MovieClipData();
    data.frameRate = frameRate;
    const duration = 1e3 / frameRate;
    for (const texture of textures) {
      data.addFrame(texture, duration);
    }
    return data;
  }
  /**
   * Create fixed-rate frame data from a SpriteSheet and frame-name list.
   */
  static fromSpriteSheet(sheet, frameNames, fps = 12) {
    const frameRate = _validatePositiveFinite(fps, "MovieClip factory fps");
    const data = new _MovieClipData();
    data.frameRate = frameRate;
    const duration = 1e3 / frameRate;
    for (const name of frameNames) {
      data.addFrame(sheet.getTexture(name), duration, name);
    }
    return data;
  }
};

// node_modules/.pnpm/@blakron+game@1.0.4/node_modules/@blakron/game/dist/blakron/display/MovieClipDataFactory.js
import { SpriteSheet } from "@blakron/core";
function _validateFinite(value, name) {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number.`);
  }
  return value;
}
function _validateFrameNumber(value, frameCount, name) {
  if (!Number.isInteger(value) || value < 1 || value > frameCount) {
    throw new RangeError(`${name} is out of range.`);
  }
  return value;
}
var MovieClipDataFactory = class {
  // ── Instance fields ───────────────────────────────────────────────────────
  /** Whether generated MovieClipData instances are cached by clip name. */
  enableCache = true;
  _mcDataSet;
  _texture;
  _spriteSheet;
  _cache = /* @__PURE__ */ new Map();
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(mcDataSet, texture) {
    this._mcDataSet = mcDataSet;
    this._setTexture(texture);
  }
  // ── Getters / Setters ─────────────────────────────────────────────────────
  /** Egret MovieClip JSON data set containing top-level `mc` and `res` maps. */
  get mcDataSet() {
    return this._mcDataSet;
  }
  set mcDataSet(value) {
    if (value === this._mcDataSet)
      return;
    this._mcDataSet = value;
    this.clearCache();
  }
  /** Atlas texture used to create a core SpriteSheet for generated frame textures. */
  get texture() {
    return this._texture;
  }
  set texture(value) {
    if (value === this._texture)
      return;
    this._setTexture(value);
    this.clearCache();
  }
  /** SpriteSheet created from texture, or undefined when no atlas texture is set. */
  get spriteSheet() {
    return this._spriteSheet;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  /**
   * Clear all generated MovieClipData instances.
   */
  clearCache() {
    this._cache.clear();
  }
  /**
   * Generate data for a named Egret MovieClip. With no name, generates the
   * first clip in the data set. Returns undefined when no matching clip exists.
   */
  generateMovieClipData(movieClipName = "") {
    const clips = this._mcDataSet?.mc;
    if (!clips)
      return void 0;
    const name = movieClipName || Object.keys(clips)[0];
    if (!name)
      return void 0;
    if (this.enableCache) {
      const cached = this._cache.get(name);
      if (cached)
        return cached;
    }
    const source = clips[name];
    if (!source)
      return void 0;
    const data = this._createMovieClipData(name, source);
    if (this.enableCache) {
      this._cache.set(name, data);
    }
    return data;
  }
  // ── Private methods ───────────────────────────────────────────────────────
  _setTexture(value) {
    this._texture = value;
    this._spriteSheet = value ? new SpriteSheet(value) : void 0;
  }
  _createMovieClipData(name, source) {
    const frameRate = source.frameRate ?? 24;
    const data = new MovieClipData();
    data.frameRate = frameRate;
    const frameDuration = 1e3 / frameRate;
    const frames = source.frames ?? [];
    for (let index = 0; index < frames.length; index++) {
      const frame = frames[index];
      const texture = this._createFrameTexture(name, index, frame);
      const repeat = this._getFrameRepeat(frame, index);
      for (let repeatIndex = 0; repeatIndex < repeat; repeatIndex++) {
        data.addFrame(texture, frameDuration);
      }
    }
    for (const label of source.labels ?? []) {
      const startFrame = _validateFrameNumber(label.frame, data.frameCount, "MovieClip label frame") - 1;
      const endFrame = _validateFrameNumber(label.end ?? label.frame, data.frameCount, "MovieClip label end frame") - 1;
      data.setFrameLabel(label.name, startFrame, endFrame);
    }
    for (const event of source.events ?? []) {
      const frameIndex = _validateFrameNumber(event.frame, data.frameCount, "MovieClip event frame") - 1;
      data.setFrameEvent(frameIndex, event.name);
    }
    return data;
  }
  _createFrameTexture(movieClipName, frameIndex, frame) {
    if (!frame.res || !this._spriteSheet)
      return void 0;
    const resource = this._mcDataSet?.res?.[frame.res];
    if (!resource) {
      return this._spriteSheet.getTexture(frame.res);
    }
    const x = _validateFinite(frame.x ?? 0, "MovieClip frame x offset");
    const y = _validateFinite(frame.y ?? 0, "MovieClip frame y offset");
    const { x: bitmapX, y: bitmapY, w: bitmapWidth, h: bitmapHeight } = this._validateResource(resource, frame.res);
    return this._spriteSheet.createTexture(`${movieClipName}:${frameIndex}:${frame.res}`, bitmapX, bitmapY, bitmapWidth, bitmapHeight, x, y);
  }
  _getFrameRepeat(frame, frameIndex) {
    const duration = frame.duration ?? 1;
    if (!Number.isInteger(duration) || duration < 1) {
      throw new RangeError(`MovieClip frame duration at index ${frameIndex} must be a positive integer.`);
    }
    return duration;
  }
  _validateResource(resource, name) {
    const x = _validateFinite(resource.x, `MovieClip resource ${name} x`);
    const y = _validateFinite(resource.y, `MovieClip resource ${name} y`);
    const w = _validateFinite(resource.w, `MovieClip resource ${name} width`);
    const h = _validateFinite(resource.h, `MovieClip resource ${name} height`);
    if (w <= 0 || h <= 0) {
      throw new RangeError(`MovieClip resource ${name} dimensions must be positive.`);
    }
    return { x, y, w, h };
  }
};

// node_modules/.pnpm/@blakron+game@1.0.4/node_modules/@blakron/game/dist/blakron/display/ScrollView.js
import { Sprite, TouchEvent, Rectangle, Event } from "@blakron/core";
var ScrollPolicy = {
  AUTO: "auto",
  ON: "on",
  OFF: "off"
};
var SAMPLE_COUNT = 5;
var FRICTION = 0.95;
var SPRING = 0.2;
var STOP_THRESHOLD = 0.5;
var RESISTANCE = 0.4;
var FRAME_MS = 16.67;
var ScrollView = class extends Sprite {
  // ── Instance fields ───────────────────────────────────────────────────────
  /**
   * Horizontal scroll policy. Default: `ScrollPolicy.AUTO`.
   */
  horizontalScrollPolicy = ScrollPolicy.AUTO;
  /**
   * Vertical scroll policy. Default: `ScrollPolicy.AUTO`.
   */
  verticalScrollPolicy = ScrollPolicy.AUTO;
  /**
   * Minimum touch movement in pixels before scrolling begins. Default: 10.
   */
  scrollBeginThreshold = 10;
  /**
   * Scroll speed multiplier applied to touch deltas. Default: 1.
   */
  scrollSpeed = 1;
  /**
   * Whether to allow over-scroll bounce at the content boundaries. Default: true.
   */
  bounces = true;
  _content;
  _scrollLeft = 0;
  _scrollTop = 0;
  _maxScrollLeft = 0;
  _maxScrollTop = 0;
  // ── Touch tracking ────────────────────────────────────────────────────────
  _touchActive = false;
  _touchStage;
  _touchId = -1;
  _touchLastX = 0;
  _touchLastY = 0;
  _touchLastTime = 0;
  _touchStartX = 0;
  _touchStartY = 0;
  _scrollStarted = false;
  _samples = [];
  // ── Inertia ───────────────────────────────────────────────────────────────
  _velX = 0;
  _velY = 0;
  _inertiaActive = false;
  _lastInertiaTime = 0;
  // ── Tween scroll ──────────────────────────────────────────────────────────
  _tweenTarget;
  _tweenStart;
  _tweenElapsed = 0;
  _tweenDuration = 0;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor() {
    super();
    this.touchEnabled = true;
    this.addEventListener(TouchEvent.TOUCH_BEGIN, this._handleTouchBegin);
  }
  // ── Getters / Setters ─────────────────────────────────────────────────────
  /**
   * The current scrollable content object.
   */
  get content() {
    return this._content;
  }
  /**
   * Horizontal scroll position in pixels.
   */
  get scrollLeft() {
    return this._scrollLeft;
  }
  set scrollLeft(value) {
    this._setScroll(value, this._scrollTop);
  }
  /**
   * Vertical scroll position in pixels.
   */
  get scrollTop() {
    return this._scrollTop;
  }
  set scrollTop(value) {
    this._setScroll(this._scrollLeft, value);
  }
  /**
   * Maximum horizontal scroll distance (read-only).
   */
  get scrollRight() {
    this._updateScrollBounds();
    return this._maxScrollLeft;
  }
  /**
   * Maximum vertical scroll distance (read-only).
   */
  get scrollBottom() {
    this._updateScrollBounds();
    return this._maxScrollTop;
  }
  get width() {
    return super.width;
  }
  set width(value) {
    super.width = value;
    this._updateScrollRect();
    this._updateScrollBounds();
  }
  get height() {
    return super.height;
  }
  set height(value) {
    super.height = value;
    this._updateScrollRect();
    this._updateScrollBounds();
  }
  // ── Public methods ────────────────────────────────────────────────────────
  /**
   * Set the scrollable content object.
   */
  setContent(content) {
    if (this._content) {
      this.removeChild(this._content);
    }
    this._content = content;
    this.addChild(content);
    this._updateScrollRect();
    this._updateScrollBounds();
  }
  /**
   * Remove the current content object.
   */
  removeContent() {
    if (!this._content)
      return;
    this.removeChild(this._content);
    this._content = void 0;
    this._updateScrollRect();
    this._updateScrollBounds();
  }
  /**
   * Set both scroll axes simultaneously.
   * @param top Vertical scroll position.
   * @param left Horizontal scroll position.
   * @param isOffset If true, values are treated as deltas relative to the current position.
   */
  setScrollPosition(top, left, isOffset = false) {
    if (isOffset) {
      this._setScroll(this._scrollLeft + left * this.scrollSpeed, this._scrollTop + top * this.scrollSpeed, this.bounces);
    } else {
      this._setScroll(left, top);
    }
    this.dispatchEventWith(Event.CHANGE);
  }
  /**
   * Scroll to the given vertical position.
   * @param scrollTop Target vertical scroll position.
   * @param duration Tween duration in ms. 0 = instant.
   */
  setScrollTop(scrollTop, duration = 0) {
    const target = Math.max(0, Math.min(scrollTop, this._maxScrollTop));
    if (duration === 0) {
      this.scrollTop = target;
      return;
    }
    this._tweenScroll(this._scrollLeft, target, duration);
  }
  /**
   * Scroll to the given horizontal position.
   * @param scrollLeft Target horizontal scroll position.
   * @param duration Tween duration in ms. 0 = instant.
   */
  setScrollLeft(scrollLeft, duration = 0) {
    const target = Math.max(0, Math.min(scrollLeft, this._maxScrollLeft));
    if (duration === 0) {
      this.scrollLeft = target;
      return;
    }
    this._tweenScroll(target, this._scrollTop, duration);
  }
  /**
   * Maximum horizontal scroll distance.
   */
  getMaxScrollLeft() {
    this._updateScrollBounds();
    return this._maxScrollLeft;
  }
  /**
   * Maximum vertical scroll distance.
   */
  getMaxScrollTop() {
    this._updateScrollBounds();
    return this._maxScrollTop;
  }
  // ── Override methods ──────────────────────────────────────────────────────
  $onRemoveFromStage() {
    this._cancelTouch();
    this._stopInertia();
    this._stopTweenScroll();
    super.$onRemoveFromStage();
  }
  // ── Private methods ───────────────────────────────────────────────────────
  _handleTouchBegin = (e) => {
    if (this._touchActive)
      return;
    const stage = this.stage;
    if (!stage)
      return;
    this._updateScrollBounds();
    if (!this._canScrollHorizontally() && !this._canScrollVertically())
      return;
    this._touchActive = true;
    this._touchStage = stage;
    this._touchId = e.touchPointID;
    this._touchStartX = e.stageX;
    this._touchStartY = e.stageY;
    this._touchLastX = e.stageX;
    this._touchLastY = e.stageY;
    this._touchLastTime = Date.now();
    this._scrollStarted = false;
    this._samples = [];
    this._velX = 0;
    this._velY = 0;
    this._stopInertia();
    this._stopTweenScroll();
    stage.addEventListener(TouchEvent.TOUCH_MOVE, this._handleTouchMove);
    stage.addEventListener(TouchEvent.TOUCH_END, this._handleTouchEnd);
    stage.addEventListener(TouchEvent.TOUCH_CANCEL, this._handleTouchEnd);
  };
  _handleTouchMove = (e) => {
    if (!this._touchActive || e.touchPointID !== this._touchId)
      return;
    if (!this._scrollStarted) {
      const dx2 = e.stageX - this._touchStartX;
      const dy2 = e.stageY - this._touchStartY;
      if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < this.scrollBeginThreshold)
        return;
      this._scrollStarted = true;
    }
    const now = Date.now();
    const dt = now - this._touchLastTime || 1;
    const dx = e.stageX - this._touchLastX;
    const dy = e.stageY - this._touchLastY;
    this._touchLastX = e.stageX;
    this._touchLastY = e.stageY;
    this._touchLastTime = now;
    this._samples.push({ dx, dy, dt });
    if (this._samples.length > SAMPLE_COUNT) {
      this._samples.shift();
    }
    const newLeft = this._canScrollHorizontally() ? this._applyResistance(this._scrollLeft - dx * this.scrollSpeed, 0, this._maxScrollLeft) : 0;
    const newTop = this._canScrollVertically() ? this._applyResistance(this._scrollTop - dy * this.scrollSpeed, 0, this._maxScrollTop) : 0;
    this._setScroll(newLeft, newTop, this.bounces);
    this.dispatchEventWith(Event.CHANGE);
  };
  _handleTouchEnd = (e) => {
    if (!this._touchActive || e.touchPointID !== this._touchId)
      return;
    const samples = this._samples;
    this._cancelTouch();
    if (samples.length === 0)
      return;
    let totalWeight = 0;
    let vx = 0;
    let vy = 0;
    for (let i = 0; i < samples.length; i++) {
      const weight = i + 1;
      const s = samples[i];
      vx += s.dx / s.dt * weight;
      vy += s.dy / s.dt * weight;
      totalWeight += weight;
    }
    this._velX = this._canScrollHorizontally() ? -(vx / totalWeight) * FRAME_MS : 0;
    this._velY = this._canScrollVertically() ? -(vy / totalWeight) * FRAME_MS : 0;
    this._startInertia();
  };
  _handleEnterFrame = (_e) => {
    const now = Date.now();
    const dt = now - this._lastInertiaTime;
    this._lastInertiaTime = now;
    if (this._tweenTarget && this._tweenStart) {
      this._tweenElapsed += dt;
      const t = Math.min(this._tweenElapsed / this._tweenDuration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      const left = this._tweenStart.left + (this._tweenTarget.left - this._tweenStart.left) * ease;
      const top = this._tweenStart.top + (this._tweenTarget.top - this._tweenStart.top) * ease;
      this._setScroll(left, top);
      this.dispatchEventWith(Event.CHANGE);
      if (t >= 1) {
        this._stopTweenScroll();
        this.dispatchEventWith(Event.COMPLETE);
      }
      return;
    }
    const factor = Math.pow(FRICTION, dt / FRAME_MS);
    this._velX *= factor;
    this._velY *= factor;
    let newLeft = this._scrollLeft + this._velX * (dt / FRAME_MS);
    let newTop = this._scrollTop + this._velY * (dt / FRAME_MS);
    if (this.bounces) {
      if (newLeft < 0) {
        newLeft += (0 - newLeft) * SPRING;
        this._velX *= 0.5;
      } else if (newLeft > this._maxScrollLeft) {
        newLeft += (this._maxScrollLeft - newLeft) * SPRING;
        this._velX *= 0.5;
      }
      if (newTop < 0) {
        newTop += (0 - newTop) * SPRING;
        this._velY *= 0.5;
      } else if (newTop > this._maxScrollTop) {
        newTop += (this._maxScrollTop - newTop) * SPRING;
        this._velY *= 0.5;
      }
    } else {
      newLeft = Math.max(0, Math.min(newLeft, this._maxScrollLeft));
      newTop = Math.max(0, Math.min(newTop, this._maxScrollTop));
    }
    this._setScroll(newLeft, newTop, this.bounces);
    this.dispatchEventWith(Event.CHANGE);
    const inBoundsH = newLeft >= 0 && newLeft <= this._maxScrollLeft;
    const inBoundsV = newTop >= 0 && newTop <= this._maxScrollTop;
    if (Math.abs(this._velX) < STOP_THRESHOLD && Math.abs(this._velY) < STOP_THRESHOLD && inBoundsH && inBoundsV) {
      this._stopInertia();
    }
  };
  _startInertia() {
    if (this._inertiaActive)
      return;
    this._inertiaActive = true;
    this._lastInertiaTime = Date.now();
    this.addEventListener(Event.ENTER_FRAME, this._handleEnterFrame);
  }
  _stopInertia() {
    if (!this._inertiaActive)
      return;
    this._inertiaActive = false;
    this.removeEventListener(Event.ENTER_FRAME, this._handleEnterFrame);
  }
  _tweenScroll(targetLeft, targetTop, duration) {
    this._stopInertia();
    this._tweenStart = { left: this._scrollLeft, top: this._scrollTop };
    this._tweenTarget = { left: targetLeft, top: targetTop };
    this._tweenElapsed = 0;
    this._tweenDuration = duration;
    if (!this._inertiaActive) {
      this._inertiaActive = true;
      this._lastInertiaTime = Date.now();
      this.addEventListener(Event.ENTER_FRAME, this._handleEnterFrame);
    }
  }
  _stopTweenScroll() {
    this._tweenTarget = void 0;
    this._tweenStart = void 0;
    this._tweenElapsed = 0;
    if (this._inertiaActive && Math.abs(this._velX) < STOP_THRESHOLD && Math.abs(this._velY) < STOP_THRESHOLD) {
      this._stopInertia();
    }
  }
  _setScroll(left, top, allowOverscroll = false) {
    this._updateScrollBounds();
    if (!allowOverscroll) {
      left = Math.max(0, Math.min(left, this._maxScrollLeft));
      top = Math.max(0, Math.min(top, this._maxScrollTop));
    }
    if (this._canScrollHorizontally()) {
      this._scrollLeft = left;
    } else if (this.horizontalScrollPolicy === ScrollPolicy.AUTO) {
      this._scrollLeft = 0;
    }
    if (this._canScrollVertically()) {
      this._scrollTop = top;
    } else if (this.verticalScrollPolicy === ScrollPolicy.AUTO) {
      this._scrollTop = 0;
    }
    if (this._content) {
      this._content.x = -this._scrollLeft;
      this._content.y = -this._scrollTop;
    }
  }
  _applyResistance(value, min, max) {
    if (value < min) {
      return min + (value - min) * RESISTANCE;
    }
    if (value > max) {
      return max + (value - max) * RESISTANCE;
    }
    return value;
  }
  _updateScrollRect() {
    this.scrollRect = new Rectangle(0, 0, this.width, this.height);
  }
  _updateScrollBounds() {
    if (!this._content) {
      this._maxScrollLeft = 0;
      this._maxScrollTop = 0;
      return;
    }
    this._maxScrollLeft = Math.max(0, this._content.width - this.width);
    this._maxScrollTop = Math.max(0, this._content.height - this.height);
  }
  _canScrollHorizontally() {
    return this.horizontalScrollPolicy === ScrollPolicy.ON || this.horizontalScrollPolicy === ScrollPolicy.AUTO && this._maxScrollLeft > 0;
  }
  _canScrollVertically() {
    return this.verticalScrollPolicy === ScrollPolicy.ON || this.verticalScrollPolicy === ScrollPolicy.AUTO && this._maxScrollTop > 0;
  }
  _detachStageListeners() {
    const stage = this._touchStage;
    if (!stage)
      return;
    stage.removeEventListener(TouchEvent.TOUCH_MOVE, this._handleTouchMove);
    stage.removeEventListener(TouchEvent.TOUCH_END, this._handleTouchEnd);
    stage.removeEventListener(TouchEvent.TOUCH_CANCEL, this._handleTouchEnd);
    this._touchStage = void 0;
  }
  _cancelTouch() {
    this._touchActive = false;
    this._touchId = -1;
    this._scrollStarted = false;
    this._samples = [];
    this._detachStageListeners();
  }
};

// node_modules/.pnpm/@blakron+game@1.0.4/node_modules/@blakron/game/dist/blakron/particle/Particle.js
import { Matrix, NumberUtils } from "@blakron/core";
var Particle = class {
  // ── Instance fields ───────────────────────────────────────────────────────
  x = 0;
  y = 0;
  scale = 1;
  rotation = 0;
  alpha = 1;
  currentTime = 0;
  totalTime = 1e3;
  blendMode = 0;
  // ── Private fields ────────────────────────────────────────────────────────
  _matrix = new Matrix();
  // ── Public methods ────────────────────────────────────────────────────────
  reset() {
    this.x = 0;
    this.y = 0;
    this.scale = 1;
    this.rotation = 0;
    this.alpha = 1;
    this.currentTime = 0;
    this.totalTime = 1e3;
  }
  $getMatrix(regX, regY) {
    const matrix = this._matrix;
    matrix.identity();
    let cos;
    let sin;
    if (this.rotation % 360) {
      cos = NumberUtils.cos(this.rotation);
      sin = NumberUtils.sin(this.rotation);
    } else {
      cos = 1;
      sin = 0;
    }
    matrix.append(cos * this.scale, sin * this.scale, -sin * this.scale, cos * this.scale, this.x, this.y);
    if (regX || regY) {
      matrix.tx -= regX * matrix.a + regY * matrix.c;
      matrix.ty -= regX * matrix.b + regY * matrix.d;
    }
    return matrix;
  }
};

// node_modules/.pnpm/@blakron+game@1.0.4/node_modules/@blakron/game/dist/blakron/particle/GravityParticle.js
var GravityParticle = class extends Particle {
  // ── Instance fields ───────────────────────────────────────────────────────
  startX = 0;
  startY = 0;
  velocityX = 0;
  velocityY = 0;
  radialAcceleration = 0;
  tangentialAcceleration = 0;
  rotationDelta = 0;
  scaleDelta = 0;
  alphaDelta = 0;
  // ── Public methods ────────────────────────────────────────────────────────
  reset() {
    super.reset();
    this.startX = 0;
    this.startY = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    this.radialAcceleration = 0;
    this.tangentialAcceleration = 0;
    this.rotationDelta = 0;
    this.scaleDelta = 0;
  }
};

// node_modules/.pnpm/@blakron+game@1.0.4/node_modules/@blakron/game/dist/blakron/particle/ParticleSystem.js
import { DisplayObject, Event as Event2, Matrix as Matrix2, NumberUtils as NumberUtils2, Rectangle as Rectangle2, ticker as ticker2, getTimer } from "@blakron/core";
var regionPool = [];
var Region = class _Region {
  minX = 0;
  minY = 0;
  maxX = 0;
  maxY = 0;
  static release(r) {
    r.setEmpty();
    regionPool.push(r);
  }
  static create() {
    const r = regionPool.pop();
    if (r)
      return r;
    return new _Region();
  }
  setEmpty() {
    this.minX = 0;
    this.minY = 0;
    this.maxX = 0;
    this.maxY = 0;
  }
  updateRegion(rect, matrix) {
    const m = matrix;
    const a = m.a;
    const b = m.b;
    const c = m.c;
    const d = m.d;
    const tx = m.tx;
    const ty = m.ty;
    const x = rect.x;
    const y = rect.y;
    const xMax = x + rect.width;
    const yMax = y + rect.height;
    let minX;
    let minY;
    let maxX;
    let maxY;
    if (a === 1 && b === 0 && c === 0 && d === 1) {
      minX = x + tx;
      minY = y + ty;
      maxX = xMax + tx;
      maxY = yMax + ty;
    } else {
      const x0 = a * x + c * y + tx;
      const y0 = b * x + d * y + ty;
      const x1 = a * xMax + c * y + tx;
      const y1 = b * xMax + d * y + ty;
      const x2 = a * xMax + c * yMax + tx;
      const y2 = b * xMax + d * yMax + ty;
      const x3 = a * x + c * yMax + tx;
      const y3 = b * x + d * yMax + ty;
      let tmp;
      minX = x0;
      maxX = x0;
      if (x1 < minX)
        minX = x1;
      else if (x1 > maxX)
        maxX = x1;
      if (x2 < minX)
        minX = x2;
      else if (x2 > maxX)
        maxX = x2;
      if (x3 < minX)
        minX = x3;
      else if (x3 > maxX)
        maxX = x3;
      minY = y0;
      maxY = y0;
      if (y1 < minY)
        minY = y1;
      else if (y1 > maxY)
        maxY = y1;
      if (y2 < minY)
        minY = y2;
      else if (y2 > maxY)
        maxY = y2;
      if (y3 < minY)
        minY = y3;
      else if (y3 > maxY)
        maxY = y3;
    }
    this.minX = minX - 1;
    this.minY = minY - 1;
    this.maxX = maxX + 1;
    this.maxY = maxY + 1;
  }
};
var ParticleSystem = class _ParticleSystem extends DisplayObject {
  // ── Static fields ─────────────────────────────────────────────────────────
  /**
   * Custom $renderObjectType for particle systems.
   * Value 6 — extends the core RenderObjectType enum without modifying core.
   */
  static RENDER_TYPE_PARTICLE = 6;
  // ── Private fields ────────────────────────────────────────────────────────
  _pool = [];
  _frameTime = 0;
  _particles = [];
  _emitterBounds;
  _relativeContentBounds;
  _timeStamp = 0;
  // ── Protected fields ──────────────────────────────────────────────────────
  _emitterX = 0;
  _emitterY = 0;
  // ── Public fields ─────────────────────────────────────────────────────────
  /**
   * Total emission time in ms. -1 = infinite.
   * @default -1
   */
  emissionTime = -1;
  /**
   * Interval between particle emissions in ms.
   */
  _emissionRate;
  /**
   * The texture used for each particle.
   */
  texture;
  /**
   * Maximum number of particles alive at any time.
   * @default 200
   */
  maxParticles = 200;
  /**
   * Current number of active particles.
   */
  numParticles = 0;
  /**
   * Particle class to instantiate. Set by subclasses.
   */
  particleClass = null;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(texture, emissionRate) {
    super();
    this._emissionRate = this.validateEmissionRate(emissionRate);
    this.texture = texture;
    this.$renderObjectType = _ParticleSystem.RENDER_TYPE_PARTICLE;
  }
  // ── Getters / Setters ─────────────────────────────────────────────────────
  /**
   * Read-only access to the active particles array.
   * The renderer iterates this to draw each particle.
   */
  get particles() {
    return this._particles;
  }
  /** Interval between particle emissions in milliseconds. Zero disables emission. */
  get emissionRate() {
    return this._emissionRate;
  }
  set emissionRate(value) {
    this._emissionRate = this.validateEmissionRate(value);
  }
  /**
   * The emitter bounds rectangle (relative to the emitter point).
   */
  get emitterBounds() {
    return this._emitterBounds;
  }
  set emitterBounds(rect) {
    this._emitterBounds = rect;
    this.updateRelativeBounds(rect);
  }
  /**
   * Emitter X position.
   * @default 0
   */
  get emitterX() {
    return this._emitterX;
  }
  set emitterX(value) {
    this._emitterX = value;
    this.updateRelativeBounds(this._emitterBounds);
  }
  /**
   * Emitter Y position.
   * @default 0
   */
  get emitterY() {
    return this._emitterY;
  }
  set emitterY(value) {
    this._emitterY = value;
    this.updateRelativeBounds(this._emitterBounds);
  }
  // ── Public methods ────────────────────────────────────────────────────────
  /**
   * Start emitting particles.
   * @param duration Total emission time in ms. -1 = infinite.
   */
  start(duration = -1) {
    if (this.emissionRate === 0)
      return;
    this.emissionTime = duration;
    this._timeStamp = getTimer();
    ticker2.startTick(this._update, this);
  }
  /**
   * Stop emitting particles.
   * @param clear Whether to remove all existing particles immediately.
   */
  stop(clear = false) {
    this.emissionTime = 0;
    if (clear) {
      this.clear();
      ticker2.stopTick(this._update, this);
    }
  }
  /**
   * Set the number of current particles directly (up to maxParticles).
   */
  setCurrentParticles(num) {
    for (let i = this.numParticles; i < num && this.numParticles < this.maxParticles; i++) {
      this.addOneParticle();
    }
  }
  /**
   * Change the particle texture.
   */
  changeTexture(texture) {
    if (this.texture !== texture) {
      this.texture = texture;
    }
  }
  /**
   * Override to initialise a newly created particle.
   * @param particle The particle to initialise.
   */
  initParticle(particle) {
    particle.x = this._emitterX;
    particle.y = this._emitterY;
    particle.currentTime = 0;
    particle.totalTime = 1e3;
  }
  /**
   * Override to advance a particle by dt milliseconds.
   * @param _particle The particle to advance.
   * @param _dt Delta time in ms.
   */
  advanceParticle(_particle, _dt) {
  }
  // ── Overrides ─────────────────────────────────────────────────────────────
  $measureContentBounds(bounds) {
    if (this._relativeContentBounds) {
      bounds.copyFrom(this._relativeContentBounds);
      return;
    }
    if (this.numParticles > 0) {
      const texture = this.texture;
      const textureW = Math.round(texture.scaleBitmapWidth);
      const textureH = Math.round(texture.scaleBitmapHeight);
      let totalRect;
      for (let i = 0; i < this.numParticles; i++) {
        const particle = this._particles[i];
        this._transformForMeasure.identity();
        this.appendTransform(this._transformForMeasure, particle.x, particle.y, particle.scale, particle.scale, particle.rotation, 0, 0, textureW / 2, textureH / 2);
        this._particleMeasureRect.setEmpty();
        this._particleMeasureRect.width = textureW;
        this._particleMeasureRect.height = textureH;
        const tmpRegion = Region.create();
        tmpRegion.updateRegion(this._particleMeasureRect, this._transformForMeasure);
        if (i === 0) {
          totalRect = Rectangle2.create();
          totalRect.setTo(tmpRegion.minX, tmpRegion.minY, tmpRegion.maxX - tmpRegion.minX, tmpRegion.maxY - tmpRegion.minY);
        } else {
          const l = Math.min(totalRect.x, tmpRegion.minX);
          const t = Math.min(totalRect.y, tmpRegion.minY);
          const r = Math.max(totalRect.right, tmpRegion.maxX);
          const b = Math.max(totalRect.bottom, tmpRegion.maxY);
          totalRect.setTo(l, t, r - l, b - t);
        }
        Region.release(tmpRegion);
      }
      if (totalRect) {
        this._lastRect = totalRect;
        bounds.setTo(totalRect.x, totalRect.y, totalRect.width, totalRect.height);
        Rectangle2.release(totalRect);
      }
    } else {
      if (this._lastRect) {
        const lastRect = this._lastRect;
        bounds.setTo(lastRect.x, lastRect.y, lastRect.width, lastRect.height);
        Rectangle2.release(lastRect);
        this._lastRect = void 0;
      }
    }
  }
  // ── Private methods ───────────────────────────────────────────────────────
  _particleMeasureRect = new Rectangle2();
  _transformForMeasure = new Matrix2();
  _lastRect;
  _update = (timeStamp) => {
    const dt = timeStamp - this._timeStamp;
    this._timeStamp = timeStamp;
    if (this.emissionTime === -1 || this.emissionTime > 0) {
      this._frameTime += dt;
      while (this._frameTime > 0) {
        if (this.numParticles < this.maxParticles) {
          this.addOneParticle();
        }
        this._frameTime -= this.emissionRate;
      }
      if (this.emissionTime !== -1) {
        this.emissionTime -= dt;
        if (this.emissionTime < 0) {
          this.emissionTime = 0;
        }
      }
    }
    let particleIndex = 0;
    while (particleIndex < this.numParticles) {
      const particle = this._particles[particleIndex];
      if (particle.currentTime < particle.totalTime) {
        this.advanceParticle(particle, dt);
        particle.currentTime += dt;
        particleIndex++;
      } else {
        this.removeParticle(particle);
      }
    }
    this.$markDirty();
    if (this.numParticles === 0 && this.emissionTime === 0) {
      ticker2.stopTick(this._update, this);
      this.dispatchEventWith(Event2.COMPLETE);
    }
    return false;
  };
  getParticle() {
    if (this._pool.length) {
      return this._pool.pop();
    }
    if (this.particleClass) {
      return new this.particleClass();
    }
    return new Particle();
  }
  validateEmissionRate(value) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError("Particle emissionRate must be a finite non-negative number.");
    }
    return value;
  }
  removeParticle(particle) {
    const index = this._particles.indexOf(particle);
    if (index !== -1) {
      particle.reset();
      this._particles.splice(index, 1);
      this._pool.push(particle);
      this.numParticles--;
      return true;
    }
    return false;
  }
  clear() {
    while (this._particles.length) {
      this.removeParticle(this._particles[0]);
    }
    this.numParticles = 0;
    this._pool.length = 0;
    this.$markDirty();
  }
  addOneParticle() {
    const particle = this.getParticle();
    this.initParticle(particle);
    if (particle.totalTime > 0) {
      this._particles.push(particle);
      this.numParticles++;
    }
  }
  updateRelativeBounds(emitterRect) {
    if (emitterRect) {
      if (!this._relativeContentBounds) {
        this._relativeContentBounds = new Rectangle2();
      }
      this._relativeContentBounds.copyFrom(emitterRect);
      this._relativeContentBounds.x += this._emitterX;
      this._relativeContentBounds.y += this._emitterY;
    } else {
      this._relativeContentBounds = void 0;
    }
  }
  appendTransform(matrix, x, y, scaleX, scaleY, rotation, _skewX, _skewY, regX, regY) {
    let cos;
    let sin;
    if (rotation % 360) {
      cos = NumberUtils2.cos(rotation);
      sin = NumberUtils2.sin(rotation);
    } else {
      cos = 1;
      sin = 0;
    }
    matrix.append(cos * scaleX, sin * scaleX, -sin * scaleY, cos * scaleY, x, y);
    if (regX || regY) {
      matrix.tx -= regX * matrix.a + regY * matrix.c;
      matrix.ty -= regX * matrix.b + regY * matrix.d;
    }
    return matrix;
  }
};

// node_modules/.pnpm/@blakron+game@1.0.4/node_modules/@blakron/game/dist/blakron/particle/GravityParticleSystem.js
import { NumberUtils as NumberUtils3, Rectangle as Rectangle3 } from "@blakron/core";
function getValue(value) {
  if (typeof value === "undefined")
    return 0;
  return value;
}
var GravityParticleSystem = class _GravityParticleSystem extends ParticleSystem {
  // ── Private fields ────────────────────────────────────────────────────────
  _config;
  _emitterXVariance = 0;
  _emitterYVariance = 0;
  _lifespan = 0;
  _lifespanVariance = 0;
  _startSize = 0;
  _startSizeVariance = 0;
  _endSize = 0;
  _endSizeVariance = 0;
  _emitAngle = 0;
  _emitAngleVariance = 0;
  _startRotation = 0;
  _startRotationVariance = 0;
  _endRotation = 0;
  _endRotationVariance = 0;
  _speed = 0;
  _speedVariance = 0;
  _gravityX = 0;
  _gravityY = 0;
  _radialAcceleration = 0;
  _radialAccelerationVariance = 0;
  _tangentialAcceleration = 0;
  _tangentialAccelerationVariance = 0;
  _startAlpha = 0;
  _startAlphaVariance = 0;
  _endAlpha = 0;
  _endAlphaVariance = 0;
  _particleBlendMode = 0;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(texture, config) {
    super(texture, 200);
    this._config = config;
    this.parseConfig();
    this.emissionRate = this._lifespan / this.maxParticles;
    this.particleClass = GravityParticle;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  initParticle(particle) {
    const locParticle = particle;
    const lifespan = _GravityParticleSystem.getValue(this._lifespan, this._lifespanVariance);
    locParticle.currentTime = 0;
    locParticle.totalTime = lifespan > 0 ? lifespan : 0;
    if (lifespan <= 0)
      return;
    locParticle.x = _GravityParticleSystem.getValue(this._emitterX, this._emitterXVariance);
    locParticle.y = _GravityParticleSystem.getValue(this._emitterY, this._emitterYVariance);
    locParticle.startX = this._emitterX;
    locParticle.startY = this._emitterY;
    const angle = _GravityParticleSystem.getValue(this._emitAngle, this._emitAngleVariance);
    const spd = _GravityParticleSystem.getValue(this._speed, this._speedVariance);
    locParticle.velocityX = spd * NumberUtils3.cos(angle);
    locParticle.velocityY = spd * NumberUtils3.sin(angle);
    locParticle.radialAcceleration = _GravityParticleSystem.getValue(this._radialAcceleration, this._radialAccelerationVariance);
    locParticle.tangentialAcceleration = _GravityParticleSystem.getValue(this._tangentialAcceleration, this._tangentialAccelerationVariance);
    let startSize = _GravityParticleSystem.getValue(this._startSize, this._startSizeVariance);
    if (startSize < 0.1)
      startSize = 0.1;
    let endSize = _GravityParticleSystem.getValue(this._endSize, this._endSizeVariance);
    if (endSize < 0.1)
      endSize = 0.1;
    const textureWidth = this.texture.textureWidth;
    locParticle.scale = startSize / textureWidth;
    locParticle.scaleDelta = (endSize - startSize) / lifespan / textureWidth;
    const startRotation = _GravityParticleSystem.getValue(this._startRotation, this._startRotationVariance);
    const endRotation = _GravityParticleSystem.getValue(this._endRotation, this._endRotationVariance);
    locParticle.rotation = startRotation;
    locParticle.rotationDelta = (endRotation - startRotation) / lifespan;
    const startAlpha = _GravityParticleSystem.getValue(this._startAlpha, this._startAlphaVariance);
    const endAlpha = _GravityParticleSystem.getValue(this._endAlpha, this._endAlphaVariance);
    locParticle.alpha = startAlpha;
    locParticle.alphaDelta = (endAlpha - startAlpha) / lifespan;
    locParticle.blendMode = this._particleBlendMode;
  }
  advanceParticle(particle, dt) {
    const locParticle = particle;
    const dtSec = dt / 1e3;
    const restTime = locParticle.totalTime - locParticle.currentTime;
    const actualDt = restTime > dtSec ? dtSec : restTime;
    const distanceX = locParticle.x - locParticle.startX;
    const distanceY = locParticle.y - locParticle.startY;
    let distanceScalar = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    if (distanceScalar < 0.01)
      distanceScalar = 0.01;
    let radialX = distanceX / distanceScalar;
    let radialY = distanceY / distanceScalar;
    const tangentialX = radialX;
    const tangentialY = radialY;
    radialX *= locParticle.radialAcceleration;
    radialY *= locParticle.radialAcceleration;
    const temp = tangentialX;
    const finalTangentialX = -tangentialY * locParticle.tangentialAcceleration;
    const finalTangentialY = temp * locParticle.tangentialAcceleration;
    locParticle.velocityX += actualDt * (this._gravityX + radialX + finalTangentialX);
    locParticle.velocityY += actualDt * (this._gravityY + radialY + finalTangentialY);
    locParticle.x += locParticle.velocityX * actualDt;
    locParticle.y += locParticle.velocityY * actualDt;
    locParticle.scale += locParticle.scaleDelta * actualDt * 1e3;
    if (locParticle.scale < 0)
      locParticle.scale = 0;
    locParticle.rotation += locParticle.rotationDelta * actualDt * 1e3;
    locParticle.alpha += locParticle.alphaDelta * actualDt * 1e3;
  }
  // ── Private methods ───────────────────────────────────────────────────────
  parseConfig() {
    const config = this._config;
    this.emitterX = getValue(config.emitter.x);
    this.emitterY = getValue(config.emitter.y);
    this._emitterXVariance = getValue(config.emitterVariance.x);
    this._emitterYVariance = getValue(config.emitterVariance.y);
    this._gravityX = getValue(config.gravity.x);
    this._gravityY = getValue(config.gravity.y);
    if (config.useEmitterRect === true && config.emitterRect) {
      const bounds = new Rectangle3();
      bounds.x = getValue(config.emitterRect.x);
      bounds.y = getValue(config.emitterRect.y);
      bounds.width = getValue(config.emitterRect.width);
      bounds.height = getValue(config.emitterRect.height);
      this.emitterBounds = bounds;
    }
    this.maxParticles = getValue(config.maxParticles);
    this._speed = getValue(config.speed);
    this._speedVariance = getValue(config.speedVariance);
    this._lifespan = Math.max(0.01, getValue(config.lifespan));
    this._lifespanVariance = getValue(config.lifespanVariance);
    this._emitAngle = getValue(config.emitAngle);
    this._emitAngleVariance = getValue(config.emitAngleVariance);
    this._startSize = getValue(config.startSize);
    this._startSizeVariance = getValue(config.startSizeVariance);
    this._endSize = getValue(config.endSize);
    this._endSizeVariance = getValue(config.endSizeVariance);
    this._startRotation = getValue(config.startRotation);
    this._startRotationVariance = getValue(config.startRotationVariance);
    this._endRotation = getValue(config.endRotation);
    this._endRotationVariance = getValue(config.endRotationVariance);
    this._radialAcceleration = getValue(config.radialAcceleration);
    this._radialAccelerationVariance = getValue(config.radialAccelerationVariance);
    this._tangentialAcceleration = getValue(config.tangentialAcceleration);
    this._tangentialAccelerationVariance = getValue(config.tangentialAccelerationVariance);
    this._startAlpha = getValue(config.startAlpha);
    this._startAlphaVariance = getValue(config.startAlphaVariance);
    this._endAlpha = getValue(config.endAlpha);
    this._endAlphaVariance = getValue(config.endAlphaVariance);
    this._particleBlendMode = getValue(config.blendMode);
  }
  static getValue(base, variance) {
    return base + variance * (Math.random() * 2 - 1);
  }
};

// node_modules/.pnpm/@blakron+game@1.0.4/node_modules/@blakron/game/dist/blakron/net/URLLoader.js
import { EventDispatcher, Event as Event3, IOErrorEvent, ProgressEvent, HttpRequest, HttpResponseType, ImageLoader, Texture, Sound } from "@blakron/core";

// node_modules/.pnpm/@blakron+game@1.0.4/node_modules/@blakron/game/dist/blakron/net/URLLoaderDataFormat.js
var URLLoaderDataFormat = {
  TEXT: "text",
  BINARY: "binary",
  JSON: "json",
  TEXTURE: "texture",
  SOUND: "sound"
};

// node_modules/.pnpm/@blakron+game@1.0.4/node_modules/@blakron/game/dist/blakron/net/URLRequestMethod.js
var URLRequestMethod = {
  GET: "get",
  POST: "post"
};

// node_modules/.pnpm/@blakron+game@1.0.4/node_modules/@blakron/game/dist/blakron/net/URLVariables.js
var URLVariables = class {
  /** Key-value pairs stored in this object. */
  variables = {};
  constructor(source) {
    if (source)
      this.decode(source);
  }
  /**
   * Parse a URL-encoded query string into this.variables.
   */
  decode(source) {
    source = source.split("+").join(" ");
    const re = /[?&]?([^=]+)=([^&]*)/g;
    let tokens;
    while ((tokens = re.exec(source)) !== null) {
      const key = decodeURIComponent(tokens[1]);
      const val = decodeURIComponent(tokens[2]);
      const existing = this.variables[key];
      if (existing === void 0) {
        this.variables[key] = val;
      } else if (Array.isArray(existing)) {
        existing.push(val);
      } else {
        this.variables[key] = [existing, val];
      }
    }
  }
  /**
   * Returns a URL-encoded string of all variables.
   */
  toString() {
    const parts = [];
    for (const key in this.variables) {
      const value = this.variables[key];
      if (Array.isArray(value)) {
        for (const v of value) {
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
        }
      } else {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    }
    return parts.join("&");
  }
};

// node_modules/.pnpm/@blakron+game@1.0.4/node_modules/@blakron/game/dist/blakron/net/URLLoader.js
var URLLoader = class extends EventDispatcher {
  // ── Instance fields ───────────────────────────────────────────────────────
  dataFormat = URLLoaderDataFormat.TEXT;
  data;
  _xhr;
  _imageLoader;
  _sound;
  // ── Constructor ───────────────────────────────────────────────────────────
  /**
   * @param request Optional URLRequest to load immediately on construction.
   */
  constructor(request) {
    super();
    if (request) {
      this.load(request);
    }
  }
  // ── Public methods ────────────────────────────────────────────────────────
  /**
   * Start loading from the specified URL.
   */
  load(request) {
    this.close();
    this.data = void 0;
    switch (this.dataFormat) {
      case URLLoaderDataFormat.TEXTURE:
        this._loadTexture(request);
        break;
      case URLLoaderDataFormat.SOUND:
        this._loadSound(request);
        break;
      default:
        this._loadXhr(request);
        break;
    }
  }
  /**
   * Abort any in-flight request and release internal loader references.
   */
  close() {
    if (this._xhr) {
      this._xhr.removeEventListener(Event3.COMPLETE, this._handleXhrComplete);
      this._xhr.removeEventListener(IOErrorEvent.IO_ERROR, this._handleError);
      this._xhr.removeEventListener(ProgressEvent.PROGRESS, this._handleProgress);
      this._xhr.abort();
      this._xhr = void 0;
    }
    if (this._imageLoader) {
      this._imageLoader.removeEventListener(Event3.COMPLETE, this._handleImageComplete);
      this._imageLoader.removeEventListener(IOErrorEvent.IO_ERROR, this._handleError);
      this._imageLoader.close();
      this._imageLoader = void 0;
    }
    if (this._sound) {
      this._sound.removeEventListener(Event3.COMPLETE, this._handleSoundComplete);
      this._sound.removeEventListener(IOErrorEvent.IO_ERROR, this._handleError);
      this._sound.close();
      this._sound = void 0;
    }
  }
  // ── Private methods ───────────────────────────────────────────────────────
  _loadXhr(request) {
    const xhr = new HttpRequest();
    this._xhr = xhr;
    xhr.responseType = this._toHttpResponseType();
    xhr.addEventListener(Event3.COMPLETE, this._handleXhrComplete);
    xhr.addEventListener(IOErrorEvent.IO_ERROR, this._handleError);
    xhr.addEventListener(ProgressEvent.PROGRESS, this._handleProgress);
    const isGet = request.method !== URLRequestMethod.POST;
    const url = isGet && request.data instanceof URLVariables ? this._appendQueryString(request.url, request.data) : request.url;
    xhr.open(url, request.method);
    let sendData;
    if (isGet) {
      sendData = request.data instanceof URLVariables ? void 0 : request.data;
    } else if (request.data instanceof URLVariables) {
      const hasContentType = request.requestHeaders.some((h) => h.name.toLowerCase() === "content-type");
      if (!hasContentType) {
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      }
      sendData = request.data.toString();
    } else {
      sendData = request.data;
    }
    for (const header of request.requestHeaders) {
      xhr.setRequestHeader(header.name, header.value);
    }
    xhr.send(sendData);
  }
  _appendQueryString(url, variables) {
    const query = variables.toString();
    if (!query)
      return url;
    return url + (url.includes("?") ? "&" : "?") + query;
  }
  _loadTexture(request) {
    const loader = new ImageLoader();
    this._imageLoader = loader;
    loader.addEventListener(Event3.COMPLETE, this._handleImageComplete);
    loader.addEventListener(IOErrorEvent.IO_ERROR, this._handleError);
    loader.load(request.url);
  }
  _loadSound(request) {
    const sound = new Sound();
    this._sound = sound;
    sound.addEventListener(Event3.COMPLETE, this._handleSoundComplete);
    sound.addEventListener(IOErrorEvent.IO_ERROR, this._handleError);
    sound.load(request.url);
  }
  _handleXhrComplete = (_e) => {
    const response = this._xhr?.response;
    switch (this.dataFormat) {
      case URLLoaderDataFormat.JSON:
        try {
          this.data = JSON.parse(response);
        } catch {
          this._dispatchError();
          return;
        }
        break;
      case URLLoaderDataFormat.BINARY:
        this.data = response;
        break;
      default:
        this.data = response;
        break;
    }
    this.dispatchEventWith(Event3.COMPLETE);
  };
  _handleImageComplete = (_e) => {
    const bitmapData = this._imageLoader?.data;
    if (!bitmapData) {
      this._dispatchError();
      return;
    }
    const texture = new Texture();
    texture.setBitmapData(bitmapData);
    this.data = texture;
    this.dispatchEventWith(Event3.COMPLETE);
  };
  _handleSoundComplete = (_e) => {
    this.data = this._sound;
    this.dispatchEventWith(Event3.COMPLETE);
  };
  _handleError = (_e) => {
    this._dispatchError();
  };
  _handleProgress = (e) => {
    ProgressEvent.dispatchProgressEvent(this, ProgressEvent.PROGRESS, e.bytesLoaded, e.bytesTotal);
  };
  _dispatchError() {
    IOErrorEvent.dispatchIOErrorEvent(this);
  }
  _toHttpResponseType() {
    switch (this.dataFormat) {
      case URLLoaderDataFormat.BINARY:
        return HttpResponseType.ARRAY_BUFFER;
      default:
        return HttpResponseType.TEXT;
    }
  }
};

// node_modules/.pnpm/@blakron+game@1.0.4/node_modules/@blakron/game/dist/blakron/net/URLRequest.js
var URLRequest = class {
  // ── Instance fields ───────────────────────────────────────────────────────
  /**
   * The request URL.
   */
  url;
  /**
   * HTTP method. Default: `URLRequestMethod.GET`.
   */
  method = URLRequestMethod.GET;
  /**
   * Request body data.
   *
   * Passing a `URLVariables` instance sends it as
   * `application/x-www-form-urlencoded` (via `toString()`) for POST requests,
   * and appends it to the URL's query string for GET requests, unless a
   * `Content-Type` header is already present in `requestHeaders`.
   */
  data;
  /**
   * Additional HTTP request headers.
   */
  requestHeaders = [];
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(url = "") {
    this.url = url;
  }
};

// node_modules/.pnpm/@blakron+game@1.0.4/node_modules/@blakron/game/dist/blakron/net/URLRequestHeader.js
var URLRequestHeader = class {
  // ── Instance fields ───────────────────────────────────────────────────────
  /**
   * Header name, e.g. `Content-Type`.
   */
  name;
  /**
   * Header value, e.g. `application/json`.
   */
  value;
  // ── Constructor ───────────────────────────────────────────────────────────
  constructor(name, value) {
    this.name = name;
    this.value = value;
  }
};
export {
  Ease,
  GravityParticle,
  GravityParticleSystem,
  MovieClip,
  MovieClipData,
  MovieClipDataFactory,
  MovieClipEvent,
  Particle,
  ParticleSystem,
  ScrollPolicy,
  ScrollView,
  Tween,
  TweenGroup,
  URLLoader,
  URLLoaderDataFormat,
  URLRequest,
  URLRequestHeader,
  URLRequestMethod,
  URLVariables
};
