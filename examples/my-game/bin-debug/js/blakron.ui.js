// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/core/UIState.js
import { DisplayObjectContainer as DisplayObjectContainer2, Rectangle, Matrix, Event as Event2 } from "@blakron/core";

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/core/Validator.js
import { EventDispatcher, DisplayObjectContainer } from "@blakron/core";
var Validator = class extends EventDispatcher {
  // ── Instance fields ───────────────────────────────────────────────────
  _targetLevel = Infinity;
  _propsFlag = false;
  _clientPropsFlag = false;
  _propsQueue = new DepthQueue();
  _sizeFlag = false;
  _clientSizeFlag = false;
  _sizeQueue = new DepthQueue();
  _displayFlag = false;
  _displayQueue = new DepthQueue();
  _scheduled = false;
  // ── Public methods ────────────────────────────────────────────────────
  invalidateProperties(client) {
    if (!this._propsFlag) {
      this._propsFlag = true;
      this._schedule();
    }
    if (this._targetLevel <= client.$nestLevel)
      this._clientPropsFlag = true;
    this._propsQueue.insert(client);
  }
  invalidateSize(client) {
    if (!this._sizeFlag) {
      this._sizeFlag = true;
      this._schedule();
    }
    if (this._targetLevel <= client.$nestLevel)
      this._clientSizeFlag = true;
    this._sizeQueue.insert(client);
  }
  invalidateDisplayList(client) {
    if (!this._displayFlag) {
      this._displayFlag = true;
      this._schedule();
    }
    this._displayQueue.insert(client);
  }
  /**
   * Force immediate validation of all components at or below `target`'s depth.
   */
  validateClient(target) {
    const oldLevel = this._targetLevel;
    if (this._targetLevel === Infinity)
      this._targetLevel = target.$nestLevel;
    let done = false;
    while (!done) {
      done = true;
      let obj = this._propsQueue.removeSmallestChild(target);
      while (obj) {
        if (obj.stage)
          obj.validateProperties();
        obj = this._propsQueue.removeSmallestChild(target);
      }
      if (this._propsQueue.isEmpty())
        this._propsFlag = false;
      this._clientPropsFlag = false;
      obj = this._sizeQueue.removeLargestChild(target);
      while (obj) {
        if (obj.stage)
          obj.validateSize();
        if (this._clientPropsFlag) {
          const p = this._propsQueue.removeSmallestChild(target);
          if (p) {
            this._propsQueue.insert(p);
            done = false;
            break;
          }
        }
        obj = this._sizeQueue.removeLargestChild(target);
      }
      if (this._sizeQueue.isEmpty())
        this._sizeFlag = false;
      this._clientPropsFlag = false;
      this._clientSizeFlag = false;
      obj = this._displayQueue.removeSmallestChild(target);
      while (obj) {
        if (obj.stage)
          obj.validateDisplayList();
        if (this._clientPropsFlag) {
          const p = this._propsQueue.removeSmallestChild(target);
          if (p) {
            this._propsQueue.insert(p);
            done = false;
            break;
          }
        }
        if (this._clientSizeFlag) {
          const s = this._sizeQueue.removeLargestChild(target);
          if (s) {
            this._sizeQueue.insert(s);
            done = false;
            break;
          }
        }
        obj = this._displayQueue.removeSmallestChild(target);
      }
      if (this._displayQueue.isEmpty())
        this._displayFlag = false;
    }
    if (oldLevel === Infinity)
      this._targetLevel = Infinity;
  }
  // ── Private methods ───────────────────────────────────────────────────
  _schedule() {
    if (this._scheduled)
      return;
    this._scheduled = true;
    const tick = typeof requestAnimationFrame !== "undefined" ? (cb) => requestAnimationFrame(cb) : (cb) => setTimeout(cb, 0);
    tick(() => this._flush());
  }
  _flush() {
    this._scheduled = false;
    if (this._propsFlag)
      this._validateProperties();
    if (this._sizeFlag)
      this._validateSize();
    if (this._displayFlag)
      this._validateDisplayList();
    if (this._propsFlag || this._sizeFlag || this._displayFlag) {
      this._schedule();
    }
  }
  _validateProperties() {
    let client = this._propsQueue.shift();
    while (client) {
      if (client.stage)
        client.validateProperties();
      client = this._propsQueue.shift();
    }
    if (this._propsQueue.isEmpty())
      this._propsFlag = false;
  }
  _validateSize() {
    let client = this._sizeQueue.pop();
    while (client) {
      if (client.stage)
        client.validateSize();
      client = this._sizeQueue.pop();
    }
    if (this._sizeQueue.isEmpty())
      this._sizeFlag = false;
  }
  _validateDisplayList() {
    let client = this._displayQueue.shift();
    while (client) {
      if (client.stage)
        client.validateDisplayList();
      client = this._displayQueue.shift();
    }
    if (this._displayQueue.isEmpty())
      this._displayFlag = false;
  }
};
var DepthQueue = class {
  // ── Instance fields ───────────────────────────────────────────────────
  _bins = /* @__PURE__ */ new Map();
  _min = 0;
  _max = -1;
  // ── Public methods ────────────────────────────────────────────────────
  insert(client) {
    const depth = client.$nestLevel;
    if (this._max < this._min) {
      this._min = this._max = depth;
    } else {
      if (depth < this._min)
        this._min = depth;
      if (depth > this._max)
        this._max = depth;
    }
    let bin = this._bins.get(depth);
    if (!bin) {
      bin = new DepthBin();
      this._bins.set(depth, bin);
    }
    bin.insert(client);
  }
  /**
   * Pop deepest (for size validation — $children before parents).
   */
  pop() {
    let max = this._max;
    const min = this._min;
    while (min <= max) {
      const bin = this._bins.get(max);
      if (bin && bin.length > 0) {
        const client = bin.pop();
        while (this._bins.get(this._max)?.length === 0) {
          this._max--;
          if (this._max < min)
            break;
        }
        return client;
      }
      if (max === this._max)
        this._max--;
      max--;
    }
    return void 0;
  }
  /**
   * Shift shallowest (for properties / display list — parents before $children).
   */
  shift() {
    let min = this._min;
    const max = this._max;
    while (min <= max) {
      const bin = this._bins.get(min);
      if (bin && bin.length > 0) {
        const client = bin.pop();
        while (this._bins.get(this._min)?.length === 0) {
          this._min++;
          if (this._min > max)
            break;
        }
        return client;
      }
      if (min === this._min)
        this._min++;
      min++;
    }
    return void 0;
  }
  removeLargestChild(target) {
    let max = this._max;
    const min = target.$nestLevel;
    while (min <= max) {
      const bin = this._bins.get(max);
      if (bin && bin.length > 0) {
        if (max === target.$nestLevel) {
          if (bin.has(target)) {
            bin.remove(target);
            return target;
          }
        } else {
          const found = bin.findDescendant(target);
          if (found) {
            bin.remove(found);
            return found;
          }
        }
      }
      max--;
    }
    return void 0;
  }
  removeSmallestChild(target) {
    let min = target.$nestLevel;
    const max = this._max;
    while (min <= max) {
      const bin = this._bins.get(min);
      if (bin && bin.length > 0) {
        if (min === target.$nestLevel) {
          if (bin.has(target)) {
            bin.remove(target);
            return target;
          }
        } else {
          const found = bin.findDescendant(target);
          if (found) {
            bin.remove(found);
            return found;
          }
        }
      }
      min++;
    }
    return void 0;
  }
  isEmpty() {
    return this._min > this._max;
  }
};
var DepthBin = class {
  // ── Instance fields ───────────────────────────────────────────────────
  items = [];
  length = 0;
  _map = /* @__PURE__ */ new Set();
  // ── Public methods ────────────────────────────────────────────────────
  insert(client) {
    if (this._map.has(client))
      return;
    this._map.add(client);
    this.items.push(client);
    this.length++;
  }
  pop() {
    const client = this.items.pop();
    if (client) {
      this.length--;
      this._map.delete(client);
    }
    return client;
  }
  has(client) {
    return this._map.has(client);
  }
  remove(client) {
    const idx = this.items.indexOf(client);
    if (idx >= 0) {
      this.items.splice(idx, 1);
      this.length--;
      this._map.delete(client);
    }
  }
  /**
   * Find a direct or indirect child of `ancestor` in this bin.
   */
  findDescendant(ancestor) {
    if (!(ancestor instanceof DisplayObjectContainer))
      return void 0;
    for (const item of this.items) {
      if (ancestor.contains(item))
        return item;
    }
    return void 0;
  }
};
var validator = new Validator();

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/events/UIEvent.js
import { Event } from "@blakron/core";
var UIEvent = class _UIEvent extends Event {
  // ── Static fields ─────────────────────────────────────────────────────
  /**
   * Dispatched when a component finishes initialization after being added to stage.
   */
  static CREATION_COMPLETE = "creationComplete";
  /**
   * Dispatched when a change interaction ends (e.g. slider released).
   */
  static CHANGE_END = "changeEnd";
  /**
   * Dispatched when a change interaction begins.
   */
  static CHANGE_START = "changeStart";
  /**
   * Dispatched before a panel closes.
   */
  static CLOSING = "closing";
  /**
   * Dispatched when a UI component's position changes within its parent.
   */
  static MOVE = "move";
  // ── Constructor ───────────────────────────────────────────────────────
  constructor(type, bubbles = false, cancelable = false) {
    super(type, bubbles, cancelable);
  }
  // ── Public methods ────────────────────────────────────────────────────
  static dispatchUIEvent(target, eventType, bubbles = false, cancelable = false) {
    if (!target.hasEventListener(eventType))
      return true;
    const event = new _UIEvent(eventType, bubbles, cancelable);
    return target.dispatchEvent(event);
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/core/UIState.js
function isDeltaIdentity(m) {
  return m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1;
}
var UIState = class {
  // ── Instance fields ───────────────────────────────────────────────────
  _v;
  _includeInLayout = true;
  _owner;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor(owner) {
    this._owner = owner;
    this._v = {
      [
        0
        /* K.left */
      ]: NaN,
      [
        1
        /* K.right */
      ]: NaN,
      [
        2
        /* K.top */
      ]: NaN,
      [
        3
        /* K.bottom */
      ]: NaN,
      [
        4
        /* K.horizontalCenter */
      ]: NaN,
      [
        5
        /* K.verticalCenter */
      ]: NaN,
      [
        6
        /* K.percentWidth */
      ]: NaN,
      [
        7
        /* K.percentHeight */
      ]: NaN,
      [
        8
        /* K.$explicitWidth */
      ]: NaN,
      [
        9
        /* K.$explicitHeight */
      ]: NaN,
      [
        10
        /* K.width */
      ]: 0,
      [
        11
        /* K.height */
      ]: 0,
      [
        12
        /* K.minWidth */
      ]: 0,
      [
        13
        /* K.maxWidth */
      ]: 1e5,
      [
        14
        /* K.minHeight */
      ]: 0,
      [
        15
        /* K.maxHeight */
      ]: 1e5,
      [
        16
        /* K.measuredWidth */
      ]: 0,
      [
        17
        /* K.measuredHeight */
      ]: 0,
      [
        18
        /* K.oldPreferWidth */
      ]: NaN,
      [
        19
        /* K.oldPreferHeight */
      ]: NaN,
      [
        20
        /* K.oldX */
      ]: 0,
      [
        21
        /* K.oldY */
      ]: 0,
      [
        22
        /* K.oldWidth */
      ]: 0,
      [
        23
        /* K.oldHeight */
      ]: 0,
      [
        24
        /* K.invalidatePropertiesFlag */
      ]: true,
      [
        25
        /* K.invalidateSizeFlag */
      ]: true,
      [
        26
        /* K.invalidateDisplayListFlag */
      ]: true,
      [
        27
        /* K.layoutWidthExplicitlySet */
      ]: false,
      [
        28
        /* K.layoutHeightExplicitlySet */
      ]: false,
      [
        29
        /* K.initialized */
      ]: false
    };
  }
  // ── Getters / Setters ─────────────────────────────────────────────────
  get includeInLayout() {
    return this._includeInLayout;
  }
  set includeInLayout(value) {
    value = !!value;
    if (this._includeInLayout === value)
      return;
    this._includeInLayout = value;
    this._invalidateParentLayout();
  }
  get left() {
    return this._v[
      0
      /* K.left */
    ];
  }
  set left(value) {
    const v = typeof value === "number" || !value ? +value : String(value).trim();
    if (this._v[
      0
      /* K.left */
    ] === v)
      return;
    this._v[
      0
      /* K.left */
    ] = v;
    this._invalidateParentLayout();
  }
  get right() {
    return this._v[
      1
      /* K.right */
    ];
  }
  set right(value) {
    const v = typeof value === "number" || !value ? +value : String(value).trim();
    if (this._v[
      1
      /* K.right */
    ] === v)
      return;
    this._v[
      1
      /* K.right */
    ] = v;
    this._invalidateParentLayout();
  }
  get top() {
    return this._v[
      2
      /* K.top */
    ];
  }
  set top(value) {
    const v = typeof value === "number" || !value ? +value : String(value).trim();
    if (this._v[
      2
      /* K.top */
    ] === v)
      return;
    this._v[
      2
      /* K.top */
    ] = v;
    this._invalidateParentLayout();
  }
  get bottom() {
    return this._v[
      3
      /* K.bottom */
    ];
  }
  set bottom(value) {
    const v = typeof value === "number" || !value ? +value : String(value).trim();
    if (this._v[
      3
      /* K.bottom */
    ] === v)
      return;
    this._v[
      3
      /* K.bottom */
    ] = v;
    this._invalidateParentLayout();
  }
  get horizontalCenter() {
    return this._v[
      4
      /* K.horizontalCenter */
    ];
  }
  set horizontalCenter(value) {
    const v = typeof value === "number" || !value ? +value : String(value).trim();
    if (this._v[
      4
      /* K.horizontalCenter */
    ] === v)
      return;
    this._v[
      4
      /* K.horizontalCenter */
    ] = v;
    this._invalidateParentLayout();
  }
  get verticalCenter() {
    return this._v[
      5
      /* K.verticalCenter */
    ];
  }
  set verticalCenter(value) {
    const v = typeof value === "number" || !value ? +value : String(value).trim();
    if (this._v[
      5
      /* K.verticalCenter */
    ] === v)
      return;
    this._v[
      5
      /* K.verticalCenter */
    ] = v;
    this._invalidateParentLayout();
  }
  get percentWidth() {
    return this._v[
      6
      /* K.percentWidth */
    ];
  }
  set percentWidth(value) {
    value = +value;
    if (this._v[
      6
      /* K.percentWidth */
    ] === value)
      return;
    this._v[
      6
      /* K.percentWidth */
    ] = value;
    this._invalidateParentLayout();
  }
  get percentHeight() {
    return this._v[
      7
      /* K.percentHeight */
    ];
  }
  set percentHeight(value) {
    value = +value;
    if (this._v[
      7
      /* K.percentHeight */
    ] === value)
      return;
    this._v[
      7
      /* K.percentHeight */
    ] = value;
    this._invalidateParentLayout();
  }
  get $explicitWidth() {
    return this._owner.$explicitWidth;
  }
  get $explicitHeight() {
    return this._owner.$explicitHeight;
  }
  get minWidth() {
    return this._v[
      12
      /* K.minWidth */
    ];
  }
  set minWidth(value) {
    value = +value || 0;
    if (value < 0 || this._v[
      12
      /* K.minWidth */
    ] === value)
      return;
    this._v[
      12
      /* K.minWidth */
    ] = value;
    this.invalidateSize();
    this._invalidateParentLayout();
  }
  get maxWidth() {
    return this._v[
      13
      /* K.maxWidth */
    ];
  }
  set maxWidth(value) {
    value = +value || 0;
    if (value < 0 || this._v[
      13
      /* K.maxWidth */
    ] === value)
      return;
    this._v[
      13
      /* K.maxWidth */
    ] = value;
    this.invalidateSize();
    this._invalidateParentLayout();
  }
  get minHeight() {
    return this._v[
      14
      /* K.minHeight */
    ];
  }
  set minHeight(value) {
    value = +value || 0;
    if (value < 0 || this._v[
      14
      /* K.minHeight */
    ] === value)
      return;
    this._v[
      14
      /* K.minHeight */
    ] = value;
    this.invalidateSize();
    this._invalidateParentLayout();
  }
  get maxHeight() {
    return this._v[
      15
      /* K.maxHeight */
    ];
  }
  set maxHeight(value) {
    value = +value || 0;
    if (value < 0 || this._v[
      15
      /* K.maxHeight */
    ] === value)
      return;
    this._v[
      15
      /* K.maxHeight */
    ] = value;
    this.invalidateSize();
    this._invalidateParentLayout();
  }
  // ── Public methods ────────────────────────────────────────────────────
  $onAddToStage() {
    this._checkInvalidateFlag();
    const v = this._v;
    if (!v[
      29
      /* K.initialized */
    ]) {
      v[
        29
        /* K.initialized */
      ] = true;
      this._owner.createChildren();
      this._owner.childrenCreated();
      UIEvent.dispatchUIEvent(this._owner, UIEvent.CREATION_COMPLETE);
    } else {
      this.invalidateDisplayList();
      if (this._owner.stage)
        validator.validateClient(this._owner);
    }
  }
  onCommitProperties() {
    const v = this._v;
    const owner = this._owner;
    if (v[
      22
      /* K.oldWidth */
    ] !== v[
      10
      /* K.width */
    ] || v[
      23
      /* K.oldHeight */
    ] !== v[
      11
      /* K.height */
    ]) {
      owner.dispatchEventWith(Event2.RESIZE);
      v[
        22
        /* K.oldWidth */
      ] = v[
        10
        /* K.width */
      ];
      v[
        23
        /* K.oldHeight */
      ] = v[
        11
        /* K.height */
      ];
    }
    if (v[
      20
      /* K.oldX */
    ] !== owner.x || v[
      21
      /* K.oldY */
    ] !== owner.y) {
      UIEvent.dispatchUIEvent(owner, UIEvent.MOVE);
      v[
        20
        /* K.oldX */
      ] = owner.x;
      v[
        21
        /* K.oldY */
      ] = owner.y;
    }
  }
  getWidth() {
    this._validateSizeNow();
    return this._v[
      10
      /* K.width */
    ];
  }
  setWidth(value) {
    value = +value;
    const v = this._v;
    if (value < 0 || v[
      10
      /* K.width */
    ] === value && this._owner.$explicitWidth === value)
      return;
    this._owner.$explicitWidth = value;
    if (isNaN(value))
      this.invalidateSize();
    this.invalidateProperties();
    this.invalidateDisplayList();
    this._invalidateParentLayout();
  }
  getHeight() {
    this._validateSizeNow();
    return this._v[
      11
      /* K.height */
    ];
  }
  setHeight(value) {
    value = +value;
    const v = this._v;
    if (value < 0 || v[
      11
      /* K.height */
    ] === value && this._owner.$explicitHeight === value)
      return;
    this._owner.$explicitHeight = value;
    if (isNaN(value))
      this.invalidateSize();
    this.invalidateProperties();
    this.invalidateDisplayList();
    this._invalidateParentLayout();
  }
  setMeasuredSize(width, height) {
    this._v[
      16
      /* K.measuredWidth */
    ] = Math.ceil(+width || 0);
    this._v[
      17
      /* K.measuredHeight */
    ] = Math.ceil(+height || 0);
  }
  invalidateProperties() {
    const v = this._v;
    if (!v[
      24
      /* K.invalidatePropertiesFlag */
    ]) {
      v[
        24
        /* K.invalidatePropertiesFlag */
      ] = true;
      if (this._owner.stage)
        validator.invalidateProperties(this._owner);
    }
  }
  validateProperties() {
    const v = this._v;
    if (v[
      24
      /* K.invalidatePropertiesFlag */
    ]) {
      this._owner.commitProperties();
      v[
        24
        /* K.invalidatePropertiesFlag */
      ] = false;
    }
  }
  invalidateSize() {
    const v = this._v;
    if (!v[
      25
      /* K.invalidateSizeFlag */
    ]) {
      v[
        25
        /* K.invalidateSizeFlag */
      ] = true;
      if (this._owner.stage)
        validator.invalidateSize(this._owner);
    }
  }
  validateSize(recursive = false) {
    if (recursive && this._owner instanceof DisplayObjectContainer2) {
      for (let i = 0; i < this._owner.numChildren; i++) {
        const child = this._owner.getChildAt(i);
        if (child && isUIComponent(child))
          child.validateSize(true);
      }
    }
    const v = this._v;
    if (v[
      25
      /* K.invalidateSizeFlag */
    ]) {
      if (this._measureSizes()) {
        this.invalidateDisplayList();
        this._invalidateParentLayout();
      }
      v[
        25
        /* K.invalidateSizeFlag */
      ] = false;
    }
  }
  invalidateDisplayList() {
    const v = this._v;
    if (!v[
      26
      /* K.invalidateDisplayListFlag */
    ]) {
      v[
        26
        /* K.invalidateDisplayListFlag */
      ] = true;
      if (this._owner.stage)
        validator.invalidateDisplayList(this._owner);
    }
  }
  validateDisplayList() {
    const v = this._v;
    if (v[
      26
      /* K.invalidateDisplayListFlag */
    ]) {
      this._updateFinalSize();
      this._owner.updateDisplayList(v[
        10
        /* K.width */
      ], v[
        11
        /* K.height */
      ]);
      v[
        26
        /* K.invalidateDisplayListFlag */
      ] = false;
    }
  }
  validateNow() {
    if (this._owner.stage)
      validator.validateClient(this._owner);
  }
  setLayoutBoundsSize(layoutWidth, layoutHeight) {
    layoutWidth = +layoutWidth;
    layoutHeight = +layoutHeight;
    if (layoutWidth < 0 || layoutHeight < 0)
      return;
    const v = this._v;
    const maxW = v[
      13
      /* K.maxWidth */
    ];
    const maxH = v[
      15
      /* K.maxHeight */
    ];
    const minW = Math.min(v[
      12
      /* K.minWidth */
    ], maxW);
    const minH = Math.min(v[
      14
      /* K.minHeight */
    ], maxH);
    let w, h;
    if (isNaN(layoutWidth)) {
      v[
        27
        /* K.layoutWidthExplicitlySet */
      ] = false;
      w = this._preferredUWidth();
    } else {
      v[
        27
        /* K.layoutWidthExplicitlySet */
      ] = true;
      w = Math.max(minW, Math.min(maxW, layoutWidth));
    }
    if (isNaN(layoutHeight)) {
      v[
        28
        /* K.layoutHeightExplicitlySet */
      ] = false;
      h = this._preferredUHeight();
    } else {
      v[
        28
        /* K.layoutHeightExplicitlySet */
      ] = true;
      h = Math.max(minH, Math.min(maxH, layoutHeight));
    }
    const m = this._anchorMatrix();
    if (isDeltaIdentity(m)) {
      this._setActualSize(w, h);
      return;
    }
    const fit = fitBounds(layoutWidth, layoutHeight, m, this._owner.$explicitWidth, this._owner.$explicitHeight, this._preferredUWidth(), this._preferredUHeight(), minW, minH, maxW, maxH);
    this._setActualSize(fit.w, fit.h);
  }
  setLayoutBoundsPosition(x, y) {
    const owner = this._owner;
    const m = owner.matrix;
    if (!isDeltaIdentity(m) || owner.anchorOffsetX !== 0 || owner.anchorOffsetY !== 0) {
      const bounds = new Rectangle();
      this.getLayoutBounds(bounds);
      x += owner.x - bounds.x;
      y += owner.y - bounds.y;
    }
    const prevX = owner.x, prevY = owner.y;
    owner.x = x;
    owner.y = y;
    if (owner.x !== prevX || owner.y !== prevY) {
      UIEvent.dispatchUIEvent(owner, UIEvent.MOVE);
    }
  }
  getLayoutBounds(bounds) {
    const v = this._v;
    const w = v[
      27
      /* K.layoutWidthExplicitlySet */
    ] ? v[
      10
      /* K.width */
    ] : isNaN(this._owner.$explicitWidth) ? v[
      16
      /* K.measuredWidth */
    ] : this._owner.$explicitWidth;
    const h = v[
      28
      /* K.layoutHeightExplicitlySet */
    ] ? v[
      11
      /* K.height */
    ] : isNaN(this._owner.$explicitHeight) ? v[
      17
      /* K.measuredHeight */
    ] : this._owner.$explicitHeight;
    this._applyMatrix(bounds, w, h);
  }
  getPreferredBounds(bounds) {
    this._applyMatrix(bounds, this._preferredUWidth(), this._preferredUHeight());
  }
  _invalidateParentLayout() {
    const parent = this._owner.parent;
    if (!parent || !this._includeInLayout || !isUIComponent(parent))
      return;
    parent.invalidateSize();
    parent.invalidateDisplayList();
  }
  // ── Private methods ───────────────────────────────────────────────────
  _checkInvalidateFlag() {
    const v = this._v;
    const owner = this._owner;
    if (v[
      24
      /* K.invalidatePropertiesFlag */
    ])
      validator.invalidateProperties(owner);
    if (v[
      25
      /* K.invalidateSizeFlag */
    ])
      validator.invalidateSize(owner);
    if (v[
      26
      /* K.invalidateDisplayListFlag */
    ])
      validator.invalidateDisplayList(owner);
  }
  _preferredUWidth() {
    return isNaN(this._owner.$explicitWidth) ? this._v[
      16
      /* K.measuredWidth */
    ] : this._owner.$explicitWidth;
  }
  _preferredUHeight() {
    return isNaN(this._owner.$explicitHeight) ? this._v[
      17
      /* K.measuredHeight */
    ] : this._owner.$explicitHeight;
  }
  _setActualSize(w, h) {
    const v = this._v;
    let changed = false;
    if (v[
      10
      /* K.width */
    ] !== w) {
      v[
        10
        /* K.width */
      ] = w;
      changed = true;
    }
    if (v[
      11
      /* K.height */
    ] !== h) {
      v[
        11
        /* K.height */
      ] = h;
      changed = true;
    }
    if (changed) {
      this.invalidateDisplayList();
      this._owner.dispatchEventWith(Event2.RESIZE);
    }
  }
  _validateSizeNow() {
    this.validateSize(true);
    this._updateFinalSize();
  }
  _updateFinalSize() {
    const v = this._v;
    const w = v[
      27
      /* K.layoutWidthExplicitlySet */
    ] ? v[
      10
      /* K.width */
    ] : isNaN(this._owner.$explicitWidth) ? v[
      16
      /* K.measuredWidth */
    ] : this._owner.$explicitWidth;
    const h = v[
      28
      /* K.layoutHeightExplicitlySet */
    ] ? v[
      11
      /* K.height */
    ] : isNaN(this._owner.$explicitHeight) ? v[
      17
      /* K.measuredHeight */
    ] : this._owner.$explicitHeight;
    this._setActualSize(w, h);
  }
  _measureSizes() {
    const v = this._v;
    if (!v[
      25
      /* K.invalidateSizeFlag */
    ])
      return false;
    if (isNaN(this._owner.$explicitWidth) || isNaN(this._owner.$explicitHeight)) {
      this._owner.measure();
      v[
        16
        /* K.measuredWidth */
      ] = Math.max(Math.min(v[
        16
        /* K.measuredWidth */
      ], v[
        13
        /* K.maxWidth */
      ]), v[
        12
        /* K.minWidth */
      ]);
      v[
        17
        /* K.measuredHeight */
      ] = Math.max(Math.min(v[
        17
        /* K.measuredHeight */
      ], v[
        15
        /* K.maxHeight */
      ]), v[
        14
        /* K.minHeight */
      ]);
    }
    const pw = this._preferredUWidth();
    const ph = this._preferredUHeight();
    if (pw !== v[
      18
      /* K.oldPreferWidth */
    ] || ph !== v[
      19
      /* K.oldPreferHeight */
    ]) {
      v[
        18
        /* K.oldPreferWidth */
      ] = pw;
      v[
        19
        /* K.oldPreferHeight */
      ] = ph;
      return true;
    }
    return false;
  }
  _applyMatrix(bounds, w, h) {
    bounds.setTo(0, 0, w, h);
    const m = this._anchorMatrix();
    if (isDeltaIdentity(m)) {
      bounds.x += m.tx;
      bounds.y += m.ty;
    } else {
      const { a, b, c, d, tx, ty } = m;
      const x1 = tx, y1 = ty;
      const x2 = a * w + tx, y2 = b * w + ty;
      const x3 = c * h + tx, y3 = d * h + ty;
      const x4 = a * w + c * h + tx, y4 = b * w + d * h + ty;
      bounds.x = Math.min(x1, x2, x3, x4);
      bounds.y = Math.min(y1, y2, y3, y4);
      bounds.width = Math.max(x1, x2, x3, x4) - bounds.x;
      bounds.height = Math.max(y1, y2, y3, y4) - bounds.y;
    }
  }
  _anchorMatrix() {
    const m = this._owner.matrix;
    const ox = this._owner.anchorOffsetX, oy = this._owner.anchorOffsetY;
    if (ox === 0 && oy === 0)
      return m;
    return new Matrix(m.a, m.b, m.c, m.d, m.a * -ox + m.c * -oy + m.tx, m.b * -ox + m.d * -oy + m.ty);
  }
};
function isUIComponent(obj) {
  return obj != null && typeof obj === "object" && "ui" in obj;
}
function fitBounds(_layoutW, _layoutH, _matrix, explicitW, explicitH, preferredW, preferredH, minW, minH, maxW, maxH) {
  const w = isNaN(explicitW) ? Math.max(minW, Math.min(maxW, preferredW)) : Math.max(minW, Math.min(maxW, explicitW));
  const h = isNaN(explicitH) ? Math.max(minH, Math.min(maxH, preferredH)) : Math.max(minH, Math.min(maxH, explicitH));
  return { w, h };
}

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/core/Direction.js
var Direction = class {
  static LTR = "ltr";
  static RTL = "rtl";
  static TTB = "ttb";
  static BTT = "btt";
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/core/ScrollPolicy.js
var ScrollPolicy = class {
  static AUTO = "auto";
  static OFF = "off";
  static ON = "on";
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/core/DefaultAssetAdapter.js
import { Texture, ImageLoader, Event as Event3 } from "@blakron/core";
var DefaultAssetAdapter = class {
  // ── Public methods ────────────────────────────────────────────────────
  getAsset(source, callback) {
    const loader = new ImageLoader();
    loader.addEventListener(Event3.COMPLETE, () => {
      if (!loader.data) {
        callback(void 0, source);
        return;
      }
      const texture = new Texture();
      texture.setBitmapData(loader.data);
      callback(texture, source);
    });
    loader.load(source);
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/core/AssetAdapterRegistry.js
var _adapter = new DefaultAssetAdapter();
function setAssetAdapter(adapter) {
  _adapter = adapter;
}
function getAssetAdapter() {
  return _adapter;
}

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/core/Theme.js
import { EventDispatcher as EventDispatcher2, Event as Event4 } from "@blakron/core";
var Theme = class extends EventDispatcher2 {
  // ── Instance fields ───────────────────────────────────────────────────
  _configURL;
  _initialized;
  _skinMap = {};
  _styles = {};
  _delayList = [];
  _adapter;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor(configURL, adapter) {
    super();
    this._configURL = configURL;
    this._initialized = !configURL;
    this._adapter = adapter;
    setTheme(this);
    console.log(`[Theme] Created, configURL: ${configURL || "(none)"}`);
    if (configURL)
      this._load(configURL);
  }
  // ── Public methods ────────────────────────────────────────────────────
  /**
   * Map a default skin class name for a host component class name.
   * @param hostComponentKey  e.g. "eui.Button" or "app.MyButton"
   * @param skinName          e.g. "skins.ButtonSkin"
   */
  mapSkin(hostComponentKey, skinName) {
    if (!hostComponentKey || !skinName)
      return;
    this._skinMap[hostComponentKey] = skinName;
  }
  /**
   * Look up the default skin name for a component instance.
   * Search order: hostComponentKey → class name → parent class names up to Component.
   */
  getSkinName(client) {
    if (!this._initialized) {
      if (!this._delayList.includes(client))
        this._delayList.push(client);
      return "";
    }
    return this._skinMap[client.hostComponentKey] ?? this._findSkinName(client);
  }
  getStyleConfig(style) {
    return this._styles[style];
  }
  // ── Private methods ───────────────────────────────────────────────────
  _load(url) {
    console.log(`[Theme] Loading: ${url}`);
    const adapter = this._adapter ?? _defaultThemeAdapter;
    adapter.getTheme(url, (data) => {
      console.log(`[Theme] Fetched OK, data length: ${typeof data === "string" ? data.length : "object"}`);
      this._onConfigLoaded(data);
    }, (err) => {
      console.error("[Theme] Failed to load theme:", url, err);
    });
  }
  _onConfigLoaded(raw) {
    let data;
    if (typeof raw === "string") {
      try {
        data = JSON.parse(raw);
      } catch {
        console.error("[Theme] Invalid JSON in theme config");
        return;
      }
    } else {
      data = raw;
    }
    if (data.skins) {
      const keys = Object.keys(data.skins);
      console.log(`[Theme] Loaded ${keys.length} skin mapping(s)`);
      for (const [key, val] of Object.entries(data.skins)) {
        if (!this._skinMap[key])
          this.mapSkin(key, val);
      }
    }
    if (data.styles)
      this._styles = data.styles;
    if (data.skinsJs) {
      this._loadSkinsModule(data.skinsJs).finally(() => this._onLoaded());
    } else {
      this._onLoaded();
    }
  }
  /** Dynamically imports the compiled skins module (resolves relative to the theme URL). */
  async _loadSkinsModule(skinsJs) {
    try {
      const base = new URL(this._configURL, globalThis.location?.href ?? "http://localhost/");
      const moduleUrl = new URL(skinsJs, base).href;
      await import(
        /* @vite-ignore */
        moduleUrl
      );
      console.log(`[Theme] Loaded skins module: ${skinsJs}`);
    } catch (e) {
      console.error("[Theme] Failed to load skins module:", skinsJs, e);
    }
  }
  _onLoaded() {
    this._initialized = true;
    console.log(`[Theme] Initialized, ${this._delayList.length} component(s) waiting for skin`);
    this._handleDelayList();
    this.dispatchEventWith(Event4.COMPLETE);
  }
  _handleDelayList() {
    const list = this._delayList;
    for (const client of list) {
      if (!client.skinNameExplicitlySet) {
        const skinName = this.getSkinName(client);
        if (skinName) {
          client._applySkinName(skinName);
        }
      }
    }
    list.length = 0;
  }
  _findSkinName(proto) {
    if (!proto || proto === Object.prototype)
      return "";
    const ctor = proto.constructor;
    const key = ctor?.name;
    if (!key || key === "Component")
      return "";
    const name = this._skinMap[key];
    if (name)
      return name;
    return this._findSkinName(Object.getPrototypeOf(proto));
  }
};
var _defaultThemeAdapter = {
  getTheme(url, onSuccess, onError) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "text";
    xhr.onload = () => onSuccess(xhr.responseText);
    xhr.onerror = () => onError(new Error(`Failed to load: ${url}`));
    xhr.send();
  }
};
var _currentTheme;
function setTheme(theme) {
  _currentTheme = theme;
}
function getTheme() {
  return _currentTheme;
}

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/core/DefaultThemeAdapter.js
var DefaultThemeAdapter = class {
  // ── Public methods ────────────────────────────────────────────────────
  getTheme(url, onSuccess, onError) {
    fetch(url).then((response) => {
      if (!response.ok)
        throw new Error(`HTTP ${response.status}`);
      return response.text();
    }).then((text) => {
      try {
        const data = JSON.parse(text);
        onSuccess(data);
      } catch (_e) {
        onSuccess(text);
      }
    }).catch((err) => {
      onError(err);
    });
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/layouts/LayoutBase.js
import { EventDispatcher as EventDispatcher3 } from "@blakron/core";
var LayoutBase = class extends EventDispatcher3 {
  // ── Instance fields ───────────────────────────────────────────────────
  target;
  typicalWidth = 71;
  typicalHeight = 22;
  _useVirtualLayout = false;
  // ── Getters / Setters ─────────────────────────────────────────────────
  get useVirtualLayout() {
    return this._useVirtualLayout;
  }
  set useVirtualLayout(value) {
    value = !!value;
    if (this._useVirtualLayout === value)
      return;
    this._useVirtualLayout = value;
    this.dispatchEventWith("useVirtualLayoutChanged");
    if (!value)
      this.clearVirtualLayoutCache();
    if (this.target)
      this.target.invalidateDisplayList();
  }
  // ── Public methods ────────────────────────────────────────────────────
  setTypicalSize(width, height) {
    width = +width || 71;
    height = +height || 22;
    if (width !== this.typicalWidth || height !== this.typicalHeight) {
      this.typicalWidth = width;
      this.typicalHeight = height;
      this.target?.invalidateSize();
    }
  }
  scrollPositionChanged() {
  }
  clearVirtualLayoutCache() {
  }
  elementAdded(_index) {
  }
  elementRemoved(_index) {
  }
  getElementIndicesInView() {
    return [];
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/layouts/BasicLayout.js
import { Rectangle as Rectangle2 } from "@blakron/core";
var BasicLayout = class extends LayoutBase {
  // ── Getters / Setters ─────────────────────────────────────────────────
  get useVirtualLayout() {
    return false;
  }
  set useVirtualLayout(_v) {
  }
  // ── Override methods ──────────────────────────────────────────────────
  measure() {
    const target = this.target;
    if (!target)
      return;
    let width = 0;
    let height = 0;
    const bounds = new Rectangle2();
    const count = target.numChildren;
    for (let i = 0; i < count; i++) {
      const child = target.getChildAt(i);
      if (!child || !isUIComponent(child) || !child.includeInLayout)
        continue;
      const left = +child.left;
      const right = +child.right;
      const top = +child.top;
      const bottom = +child.bottom;
      const hCenter = +child.horizontalCenter;
      const vCenter = +child.verticalCenter;
      child.getPreferredBounds(bounds);
      let extX;
      if (!isNaN(left) && !isNaN(right)) {
        extX = left + right;
      } else if (!isNaN(hCenter)) {
        extX = Math.abs(hCenter) * 2;
      } else if (!isNaN(left) || !isNaN(right)) {
        extX = (isNaN(left) ? 0 : left) + (isNaN(right) ? 0 : right);
      } else {
        extX = bounds.x;
      }
      let extY;
      if (!isNaN(top) && !isNaN(bottom)) {
        extY = top + bottom;
      } else if (!isNaN(vCenter)) {
        extY = Math.abs(vCenter) * 2;
      } else if (!isNaN(top) || !isNaN(bottom)) {
        extY = (isNaN(top) ? 0 : top) + (isNaN(bottom) ? 0 : bottom);
      } else {
        extY = bounds.y;
      }
      width = Math.ceil(Math.max(width, extX + bounds.width));
      height = Math.ceil(Math.max(height, extY + bounds.height));
    }
    target.setMeasuredSize(width, height);
  }
  updateDisplayList(unscaledWidth, unscaledHeight) {
    const target = this.target;
    if (!target)
      return;
    let maxX = 0;
    let maxY = 0;
    const bounds = new Rectangle2();
    const count = target.numChildren;
    for (let i = 0; i < count; i++) {
      const child = target.getChildAt(i);
      if (!child || !isUIComponent(child) || !child.includeInLayout)
        continue;
      const left = fmt(child.left, unscaledWidth);
      const right = fmt(child.right, unscaledWidth);
      const top = fmt(child.top, unscaledHeight);
      const bottom = fmt(child.bottom, unscaledHeight);
      const hCenter = fmt(child.horizontalCenter, unscaledWidth * 0.5);
      const vCenter = fmt(child.verticalCenter, unscaledHeight * 0.5);
      const pctW = child.percentWidth;
      const pctH = child.percentHeight;
      let childW = NaN;
      let childH = NaN;
      if (!isNaN(left) && !isNaN(right)) {
        childW = unscaledWidth - right - left;
      } else if (!isNaN(pctW)) {
        childW = Math.round(unscaledWidth * Math.min(pctW * 0.01, 1));
      }
      if (!isNaN(top) && !isNaN(bottom)) {
        childH = unscaledHeight - bottom - top;
      } else if (!isNaN(pctH)) {
        childH = Math.round(unscaledHeight * Math.min(pctH * 0.01, 1));
      }
      child.setLayoutBoundsSize(childW, childH);
      child.getLayoutBounds(bounds);
      let childX;
      if (!isNaN(hCenter)) {
        childX = Math.round((unscaledWidth - bounds.width) / 2 + hCenter);
      } else if (!isNaN(left)) {
        childX = left;
      } else if (!isNaN(right)) {
        childX = unscaledWidth - bounds.width - right;
      } else {
        childX = bounds.x;
      }
      let childY;
      if (!isNaN(vCenter)) {
        childY = Math.round((unscaledHeight - bounds.height) / 2 + vCenter);
      } else if (!isNaN(top)) {
        childY = top;
      } else if (!isNaN(bottom)) {
        childY = unscaledHeight - bounds.height - bottom;
      } else {
        childY = bounds.y;
      }
      child.setLayoutBoundsPosition(childX, childY);
      maxX = Math.max(maxX, childX + bounds.width);
      maxY = Math.max(maxY, childY + bounds.height);
    }
    target.setContentSize(Math.ceil(maxX), Math.ceil(maxY));
  }
};
function fmt(value, total) {
  if (typeof value === "number" || !value)
    return +value;
  const s = value;
  const pct = s.indexOf("%");
  if (pct === -1)
    return +s;
  return +s.substring(0, pct) * 0.01 * total;
}

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/layouts/LinearLayoutBase.js
var LinearLayoutBase = class extends LayoutBase {
  // ── Instance fields ───────────────────────────────────────────────────
  _horizontalAlign = "left";
  _verticalAlign = "top";
  _gap = 6;
  _paddingLeft = 0;
  _paddingRight = 0;
  _paddingTop = 0;
  _paddingBottom = 0;
  elementSizeTable = [];
  maxElementSize = 0;
  startIndex = -1;
  endIndex = -1;
  indexInViewCalculated = false;
  // ── Getters / Setters ─────────────────────────────────────────────────
  get horizontalAlign() {
    return this._horizontalAlign;
  }
  set horizontalAlign(value) {
    if (this._horizontalAlign === value)
      return;
    this._horizontalAlign = value;
    if (this.target)
      this.target.invalidateDisplayList();
  }
  get verticalAlign() {
    return this._verticalAlign;
  }
  set verticalAlign(value) {
    if (this._verticalAlign === value)
      return;
    this._verticalAlign = value;
    if (this.target)
      this.target.invalidateDisplayList();
  }
  get gap() {
    return this._gap;
  }
  set gap(value) {
    value = +value || 0;
    if (this._gap === value)
      return;
    this._gap = value;
    this._invalidateTargetLayout();
  }
  get paddingLeft() {
    return this._paddingLeft;
  }
  set paddingLeft(value) {
    value = +value || 0;
    if (this._paddingLeft === value)
      return;
    this._paddingLeft = value;
    this._invalidateTargetLayout();
  }
  get paddingRight() {
    return this._paddingRight;
  }
  set paddingRight(value) {
    value = +value || 0;
    if (this._paddingRight === value)
      return;
    this._paddingRight = value;
    this._invalidateTargetLayout();
  }
  get paddingTop() {
    return this._paddingTop;
  }
  set paddingTop(value) {
    value = +value || 0;
    if (this._paddingTop === value)
      return;
    this._paddingTop = value;
    this._invalidateTargetLayout();
  }
  get paddingBottom() {
    return this._paddingBottom;
  }
  set paddingBottom(value) {
    value = +value || 0;
    if (this._paddingBottom === value)
      return;
    this._paddingBottom = value;
    this._invalidateTargetLayout();
  }
  // ── Override methods ──────────────────────────────────────────────────
  clearVirtualLayoutCache() {
    if (!this._useVirtualLayout)
      return;
    this.elementSizeTable = [];
    this.maxElementSize = 0;
  }
  elementRemoved(index) {
    if (!this._useVirtualLayout)
      return;
    super.elementRemoved(index);
    this.elementSizeTable.splice(index, 1);
  }
  scrollPositionChanged() {
    super.scrollPositionChanged();
    if (this._useVirtualLayout) {
      const changed = this.getIndexInView();
      if (changed) {
        this.indexInViewCalculated = true;
        this.target?.invalidateDisplayList();
      }
    }
  }
  measure() {
    if (!this.target)
      return;
    if (this._useVirtualLayout) {
      this.measureVirtual();
    } else {
      this.measureReal();
    }
  }
  updateDisplayList(width, height) {
    const target = this.target;
    if (!target)
      return;
    if (target.numChildren === 0) {
      target.setContentSize(Math.ceil(this._paddingLeft + this._paddingRight), Math.ceil(this._paddingTop + this._paddingBottom));
      return;
    }
    if (this._useVirtualLayout) {
      this.updateDisplayListVirtual(width, height);
    } else {
      this.updateDisplayListReal(width, height);
    }
  }
  // ── Protected methods ─────────────────────────────────────────────────
  measureReal() {
  }
  measureVirtual() {
  }
  updateDisplayListReal(_width, _height) {
  }
  updateDisplayListVirtual(_width, _height) {
  }
  getStartPosition(_index) {
    return 0;
  }
  getElementSize(_index) {
    return 0;
  }
  getElementTotalSize() {
    return 0;
  }
  /**
   * Binary search to find the element index at a given position.
   */
  findIndexAt(x, i0, i1) {
    const index = (i0 + i1) * 0.5 | 0;
    const elementX = this.getStartPosition(index);
    const elementWidth = this.getElementSize(index);
    if (x >= elementX && x < elementX + elementWidth + this._gap)
      return index;
    else if (i0 === i1)
      return -1;
    else if (x < elementX)
      return this.findIndexAt(x, i0, Math.max(i0, index - 1));
    else
      return this.findIndexAt(x, Math.min(index + 1, i1), i1);
  }
  getIndexInView() {
    return false;
  }
  /**
   * Distribute available space among percent-sized $children,
   * respecting min/max constraints.
   */
  flexChildrenProportionally(spaceForChildren, spaceToDistribute, totalPercent, childInfoArray) {
    let numElements = childInfoArray.length;
    let done;
    do {
      done = true;
      let unused = spaceToDistribute - spaceForChildren * totalPercent / 100;
      if (unused > 0)
        spaceToDistribute -= unused;
      else
        unused = 0;
      const spacePerPercent = spaceToDistribute / totalPercent;
      for (let i = 0; i < numElements; i++) {
        const childInfo = childInfoArray[i];
        const size = childInfo.percent * spacePerPercent;
        if (size < childInfo.min) {
          const min = childInfo.min;
          childInfo.size = min;
          childInfoArray[i] = childInfoArray[--numElements];
          childInfoArray[numElements] = childInfo;
          totalPercent -= childInfo.percent;
          if (unused >= min) {
            unused -= min;
          } else {
            spaceToDistribute -= min - unused;
            unused = 0;
          }
          done = false;
          break;
        } else if (size > childInfo.max) {
          const max = childInfo.max;
          childInfo.size = max;
          childInfoArray[i] = childInfoArray[--numElements];
          childInfoArray[numElements] = childInfo;
          totalPercent -= childInfo.percent;
          if (unused >= max) {
            unused -= max;
          } else {
            spaceToDistribute -= max - unused;
            unused = 0;
          }
          done = false;
          break;
        } else {
          childInfo.size = size;
        }
      }
    } while (!done);
  }
  // ── Private methods ───────────────────────────────────────────────────
  _invalidateTargetLayout() {
    const target = this.target;
    if (target) {
      target.invalidateSize();
      target.invalidateDisplayList();
    }
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/layouts/JustifyAlign.js
var JustifyAlign = class {
  static JUSTIFY = "justify";
  static CONTENT_JUSTIFY = "contentJustify";
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/layouts/VerticalLayout.js
import { Rectangle as Rectangle3 } from "@blakron/core";
var tmpBounds = new Rectangle3();
var VerticalLayout = class extends LinearLayoutBase {
  // ── Override methods ──────────────────────────────────────────────────
  elementAdded(index) {
    if (!this._useVirtualLayout)
      return;
    super.elementAdded(index);
    this.elementSizeTable.splice(index, 0, this.typicalHeight);
  }
  measureReal() {
    const target = this.target;
    const count = target.numChildren;
    let numElements = count;
    let measuredWidth = 0;
    let measuredHeight = 0;
    for (let i = 0; i < count; i++) {
      const el = asLayoutElement(target, i);
      if (!el || !el.includeInLayout) {
        numElements--;
        continue;
      }
      el.getPreferredBounds(tmpBounds);
      measuredHeight += tmpBounds.height;
      measuredWidth = Math.max(measuredWidth, tmpBounds.width);
    }
    measuredHeight += (numElements - 1) * this._gap;
    const hPadding = this._paddingLeft + this._paddingRight;
    const vPadding = this._paddingTop + this._paddingBottom;
    target.setMeasuredSize(measuredWidth + hPadding, measuredHeight + vPadding);
  }
  measureVirtual() {
    const target = this.target;
    const typicalHeight = this.typicalHeight;
    let measuredHeight = this.getElementTotalSize();
    let measuredWidth = Math.max(this.maxElementSize, this.typicalWidth);
    const elementSizeTable = this.elementSizeTable;
    for (let index = this.startIndex; index < this.endIndex; index++) {
      const el = asLayoutElement(target, index);
      if (!el || !el.includeInLayout)
        continue;
      el.getPreferredBounds(tmpBounds);
      measuredHeight += tmpBounds.height;
      measuredHeight -= isNaN(elementSizeTable[index]) ? typicalHeight : elementSizeTable[index];
      measuredWidth = Math.max(measuredWidth, tmpBounds.width);
    }
    const hPadding = this._paddingLeft + this._paddingRight;
    const vPadding = this._paddingTop + this._paddingBottom;
    target.setMeasuredSize(measuredWidth + hPadding, measuredHeight + vPadding);
  }
  updateDisplayListReal(width, height) {
    const target = this.target;
    const paddingL = this._paddingLeft;
    const paddingR = this._paddingRight;
    const paddingT = this._paddingTop;
    const paddingB = this._paddingBottom;
    const gap = this._gap;
    const targetWidth = Math.max(0, width - paddingL - paddingR);
    const targetHeight = Math.max(0, height - paddingT - paddingB);
    const vJustify = this._verticalAlign === JustifyAlign.JUSTIFY;
    const hJustify = this._horizontalAlign === JustifyAlign.JUSTIFY || this._horizontalAlign === JustifyAlign.CONTENT_JUSTIFY;
    const contentJustify = this._horizontalAlign === JustifyAlign.CONTENT_JUSTIFY;
    let hAlign = 0;
    if (!hJustify) {
      if (this._horizontalAlign === "center")
        hAlign = 0.5;
      else if (this._horizontalAlign === "right")
        hAlign = 1;
    }
    const count = target.numChildren;
    let numElements = count;
    let x = paddingL;
    let y = paddingT;
    let totalPreferredHeight = 0;
    let totalPercentHeight = 0;
    const childInfoArray = [];
    let heightToDistribute = targetHeight;
    let maxElementWidth = this.maxElementSize;
    for (let i = 0; i < count; i++) {
      const el = asLayoutElement(target, i);
      if (!el || !el.includeInLayout) {
        numElements--;
        continue;
      }
      el.getPreferredBounds(tmpBounds);
      maxElementWidth = Math.max(maxElementWidth, tmpBounds.width);
      if (vJustify) {
        totalPreferredHeight += tmpBounds.height;
      } else {
        if (!isNaN(el.percentHeight)) {
          totalPercentHeight += el.percentHeight;
          childInfoArray.push({
            layoutElement: el,
            size: 0,
            percent: el.percentHeight,
            min: el.minHeight,
            max: el.maxHeight
          });
        } else {
          heightToDistribute -= tmpBounds.height;
        }
      }
    }
    heightToDistribute -= gap * (numElements - 1);
    heightToDistribute = Math.max(0, heightToDistribute);
    const excessSpace = targetHeight - totalPreferredHeight - gap * (numElements - 1);
    let averageHeight;
    let largeChildrenCount = numElements;
    const heightDic = /* @__PURE__ */ new Map();
    if (vJustify) {
      if (excessSpace < 0) {
        averageHeight = heightToDistribute / numElements;
        for (let i = 0; i < count; i++) {
          const el = asLayoutElement(target, i);
          if (!el || !el.includeInLayout)
            continue;
          el.getPreferredBounds(tmpBounds);
          if (tmpBounds.height <= averageHeight) {
            heightToDistribute -= tmpBounds.height;
            largeChildrenCount--;
          }
        }
        heightToDistribute = Math.max(0, heightToDistribute);
      }
    } else {
      if (totalPercentHeight > 0) {
        this.flexChildrenProportionally(targetHeight, heightToDistribute, totalPercentHeight, childInfoArray);
        let roundOff2 = 0;
        for (const ci of childInfoArray) {
          const childSize = Math.round(ci.size + roundOff2);
          roundOff2 += ci.size - childSize;
          heightDic.set(ci.layoutElement, childSize);
          heightToDistribute -= childSize;
        }
        heightToDistribute = Math.max(0, heightToDistribute);
      }
    }
    if (this._verticalAlign === "middle") {
      y = paddingT + heightToDistribute * 0.5;
    } else if (this._verticalAlign === "bottom") {
      y = paddingT + heightToDistribute;
    }
    let maxX = paddingL;
    let maxY = paddingT;
    let justifyWidth = Math.ceil(targetWidth);
    if (contentJustify)
      justifyWidth = Math.ceil(Math.max(targetWidth, maxElementWidth));
    let roundOff = 0;
    for (let i = 0; i < count; i++) {
      const el = asLayoutElement(target, i);
      if (!el || !el.includeInLayout)
        continue;
      el.getPreferredBounds(tmpBounds);
      let layoutElementHeight;
      if (vJustify) {
        let childHeight;
        if (excessSpace > 0) {
          childHeight = heightToDistribute * tmpBounds.height / totalPreferredHeight;
        } else if (excessSpace < 0 && averageHeight !== void 0 && tmpBounds.height > averageHeight) {
          childHeight = heightToDistribute / largeChildrenCount;
        }
        if (childHeight !== void 0) {
          layoutElementHeight = Math.round(childHeight + roundOff);
          roundOff += childHeight - layoutElementHeight;
        }
      } else {
        layoutElementHeight = heightDic.get(el);
      }
      if (hJustify) {
        x = paddingL;
        el.setLayoutBoundsSize(justifyWidth, layoutElementHeight ?? NaN);
        el.getLayoutBounds(tmpBounds);
      } else {
        let layoutElementWidth;
        if (!isNaN(el.percentWidth)) {
          const percent = Math.min(100, el.percentWidth);
          layoutElementWidth = Math.round(targetWidth * percent * 0.01);
        }
        el.setLayoutBoundsSize(layoutElementWidth ?? NaN, layoutElementHeight ?? NaN);
        el.getLayoutBounds(tmpBounds);
        const excessW = Math.max(0, (targetWidth - tmpBounds.width) * hAlign);
        x = paddingL + excessW;
      }
      el.setLayoutBoundsPosition(Math.round(x), Math.round(y));
      const dx = Math.ceil(tmpBounds.width);
      const dy = Math.ceil(tmpBounds.height);
      maxX = Math.max(maxX, x + dx);
      maxY = Math.max(maxY, y + dy);
      y += dy + gap;
    }
    this.maxElementSize = maxElementWidth;
    target.setContentSize(maxX + paddingR, maxY + paddingB);
  }
  updateDisplayListVirtual(width, height) {
    const target = this.target;
    if (this.indexInViewCalculated)
      this.indexInViewCalculated = false;
    else
      this.getIndexInView();
    const paddingB = this._paddingBottom;
    const paddingL = this._paddingLeft;
    const gap = this._gap;
    const numElements = target.numElements;
    if (this.startIndex === -1 || this.endIndex === -1) {
      const contentHeight2 = this.getStartPosition(numElements) - gap + paddingB;
      target.setContentSize(target.contentWidth || width, contentHeight2);
      return;
    }
    target.setVirtualElementIndicesInView(this.startIndex, this.endIndex);
    const endIdx = this.endIndex;
    const justify = this._horizontalAlign === JustifyAlign.JUSTIFY || this._horizontalAlign === JustifyAlign.CONTENT_JUSTIFY;
    const contentJustify = this._horizontalAlign === JustifyAlign.CONTENT_JUSTIFY;
    let hAlign = 0;
    if (!justify) {
      if (this._horizontalAlign === "center")
        hAlign = 0.5;
      else if (this._horizontalAlign === "right")
        hAlign = 1;
    }
    const targetWidth = Math.max(0, width - paddingL - this._paddingRight);
    let justifyWidth = Math.ceil(targetWidth);
    const typicalH = this.typicalHeight;
    let maxElementWidth = this.maxElementSize;
    const oldMaxW = Math.max(this.typicalWidth, this.maxElementSize);
    if (contentJustify) {
      for (let index = this.startIndex; index <= endIdx; index++) {
        const el = asVirtualLayoutElement(target, index);
        if (!el || !el.includeInLayout)
          continue;
        el.getPreferredBounds(tmpBounds);
        maxElementWidth = Math.max(maxElementWidth, tmpBounds.width);
      }
      justifyWidth = Math.ceil(Math.max(targetWidth, maxElementWidth));
    }
    let x = 0;
    let contentWidth = 0;
    let needInvalidateSize = false;
    const elementSizeTable = this.elementSizeTable;
    for (let i = this.startIndex; i <= endIdx; i++) {
      const el = asVirtualLayoutElement(target, i);
      if (!el || !el.includeInLayout)
        continue;
      el.getPreferredBounds(tmpBounds);
      if (!contentJustify) {
        maxElementWidth = Math.max(maxElementWidth, tmpBounds.width);
      }
      if (justify) {
        x = paddingL;
        el.setLayoutBoundsSize(justifyWidth, NaN);
        el.getLayoutBounds(tmpBounds);
      } else {
        el.getLayoutBounds(tmpBounds);
        const excessW = Math.max(0, (targetWidth - tmpBounds.width) * hAlign);
        x = paddingL + excessW;
      }
      contentWidth = Math.max(contentWidth, tmpBounds.width);
      if (!needInvalidateSize) {
        const oldSize = isNaN(elementSizeTable[i]) ? typicalH : elementSizeTable[i];
        if (oldSize !== tmpBounds.height)
          needInvalidateSize = true;
      }
      elementSizeTable[i] = tmpBounds.height;
      const yPos = this.getStartPosition(i);
      el.setLayoutBoundsPosition(Math.round(x), Math.round(yPos));
    }
    contentWidth += paddingL + this._paddingRight;
    const contentHeight = this.getStartPosition(numElements) - gap + paddingB;
    this.maxElementSize = maxElementWidth;
    target.setContentSize(contentWidth, contentHeight);
    if (needInvalidateSize || oldMaxW < this.maxElementSize) {
      target.invalidateSize();
    }
  }
  getStartPosition(index) {
    if (!this._useVirtualLayout && this.target) {
      const el = asLayoutElement(this.target, index);
      if (el) {
        const b = new Rectangle3();
        el.getLayoutBounds(b);
        return b.y;
      }
    }
    const typicalH = this.typicalHeight;
    let startPos = this._paddingTop;
    const gap = this._gap;
    for (let i = 0; i < index; i++) {
      let h = this.elementSizeTable[i];
      if (isNaN(h))
        h = typicalH;
      startPos += h + gap;
    }
    return startPos;
  }
  getElementSize(index) {
    if (this._useVirtualLayout) {
      const size = this.elementSizeTable[index];
      return isNaN(size) ? this.typicalHeight : size;
    }
    if (this.target) {
      const el = asLayoutElement(this.target, index);
      if (el) {
        el.getLayoutBounds(tmpBounds);
        return tmpBounds.height;
      }
      return 0;
    }
    return 0;
  }
  getElementTotalSize() {
    const typicalH = this.typicalHeight;
    const gap = this._gap;
    let totalSize = 0;
    const length = this.target.numElements;
    for (let i = 0; i < length; i++) {
      let h = this.elementSizeTable[i];
      if (isNaN(h))
        h = typicalH;
      totalSize += h + gap;
    }
    totalSize -= gap;
    return totalSize;
  }
  getIndexInView() {
    const target = this.target;
    if (!target || target.numElements === 0) {
      this.startIndex = this.endIndex = -1;
      return false;
    }
    if (target.width === 0 || target.height === 0) {
      this.startIndex = this.endIndex = -1;
      return false;
    }
    const numElements = target.numElements;
    const lastSize = this.elementSizeTable[numElements - 1];
    const contentHeight = this.getStartPosition(numElements - 1) + (isNaN(lastSize) ? this.typicalHeight : lastSize) + this._paddingBottom;
    const minVisibleY = target.scrollV ?? 0;
    if (minVisibleY > contentHeight - this._paddingBottom) {
      this.startIndex = this.endIndex = -1;
      return false;
    }
    const maxVisibleY = minVisibleY + target.height;
    if (maxVisibleY < this._paddingTop) {
      this.startIndex = this.endIndex = -1;
      return false;
    }
    const oldStart = this.startIndex;
    const oldEnd = this.endIndex;
    this.startIndex = this.findIndexAt(minVisibleY, 0, numElements - 1);
    if (this.startIndex === -1)
      this.startIndex = 0;
    this.endIndex = this.findIndexAt(maxVisibleY, 0, numElements - 1);
    if (this.endIndex === -1)
      this.endIndex = numElements - 1;
    return oldStart !== this.startIndex || oldEnd !== this.endIndex;
  }
};
function asLayoutElement(target, index) {
  const child = target.getChildAt(index);
  if (!child)
    return void 0;
  const el = child;
  if (typeof el.getPreferredBounds === "function")
    return el;
  return void 0;
}
function asVirtualLayoutElement(target, index) {
  const child = target.getVirtualElementAt(index);
  if (!child)
    return void 0;
  const el = child;
  if (typeof el.getPreferredBounds === "function")
    return el;
  return void 0;
}

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/layouts/HorizontalLayout.js
import { Rectangle as Rectangle4 } from "@blakron/core";
var tmpBounds2 = new Rectangle4();
var HorizontalLayout = class extends LinearLayoutBase {
  // ── Override methods ──────────────────────────────────────────────────
  elementAdded(index) {
    if (!this._useVirtualLayout)
      return;
    super.elementAdded(index);
    this.elementSizeTable.splice(index, 0, this.typicalWidth);
  }
  measureReal() {
    const target = this.target;
    const count = target.numChildren;
    let numElements = count;
    let measuredWidth = 0;
    let measuredHeight = 0;
    for (let i = 0; i < count; i++) {
      const el = asLayoutElement2(target, i);
      if (!el || !el.includeInLayout) {
        numElements--;
        continue;
      }
      el.getPreferredBounds(tmpBounds2);
      measuredWidth += tmpBounds2.width;
      measuredHeight = Math.max(measuredHeight, tmpBounds2.height);
    }
    measuredWidth += (numElements - 1) * this._gap;
    const hPadding = this._paddingLeft + this._paddingRight;
    const vPadding = this._paddingTop + this._paddingBottom;
    target.setMeasuredSize(measuredWidth + hPadding, measuredHeight + vPadding);
  }
  measureVirtual() {
    const target = this.target;
    const typicalWidth = this.typicalWidth;
    let measuredWidth = this.getElementTotalSize();
    let measuredHeight = Math.max(this.maxElementSize, this.typicalHeight);
    const elementSizeTable = this.elementSizeTable;
    for (let index = this.startIndex; index < this.endIndex; index++) {
      const el = asLayoutElement2(target, index);
      if (!el || !el.includeInLayout)
        continue;
      el.getPreferredBounds(tmpBounds2);
      measuredWidth += tmpBounds2.width;
      measuredWidth -= isNaN(elementSizeTable[index]) ? typicalWidth : elementSizeTable[index];
      measuredHeight = Math.max(measuredHeight, tmpBounds2.height);
    }
    const hPadding = this._paddingLeft + this._paddingRight;
    const vPadding = this._paddingTop + this._paddingBottom;
    target.setMeasuredSize(measuredWidth + hPadding, measuredHeight + vPadding);
  }
  updateDisplayListReal(width, height) {
    const target = this.target;
    const paddingL = this._paddingLeft;
    const paddingR = this._paddingRight;
    const paddingT = this._paddingTop;
    const paddingB = this._paddingBottom;
    const gap = this._gap;
    const targetWidth = Math.max(0, width - paddingL - paddingR);
    const targetHeight = Math.max(0, height - paddingT - paddingB);
    const hJustify = this._horizontalAlign === JustifyAlign.JUSTIFY;
    const vJustify = this._verticalAlign === JustifyAlign.JUSTIFY || this._verticalAlign === JustifyAlign.CONTENT_JUSTIFY;
    const contentJustify = this._verticalAlign === JustifyAlign.CONTENT_JUSTIFY;
    let vAlign = 0;
    if (!vJustify) {
      if (this._verticalAlign === "middle")
        vAlign = 0.5;
      else if (this._verticalAlign === "bottom")
        vAlign = 1;
    }
    const count = target.numChildren;
    let numElements = count;
    let x = paddingL;
    let y = paddingT;
    let totalPreferredWidth = 0;
    let totalPercentWidth = 0;
    const childInfoArray = [];
    let widthToDistribute = targetWidth;
    let maxElementHeight = this.maxElementSize;
    for (let i = 0; i < count; i++) {
      const el = asLayoutElement2(target, i);
      if (!el || !el.includeInLayout) {
        numElements--;
        continue;
      }
      el.getPreferredBounds(tmpBounds2);
      maxElementHeight = Math.max(maxElementHeight, tmpBounds2.height);
      if (hJustify) {
        totalPreferredWidth += tmpBounds2.width;
      } else {
        if (!isNaN(el.percentWidth)) {
          totalPercentWidth += el.percentWidth;
          childInfoArray.push({
            layoutElement: el,
            size: 0,
            percent: el.percentWidth,
            min: el.minWidth,
            max: el.maxWidth
          });
        } else {
          widthToDistribute -= tmpBounds2.width;
        }
      }
    }
    widthToDistribute -= gap * (numElements - 1);
    widthToDistribute = Math.max(0, widthToDistribute);
    const excessSpace = targetWidth - totalPreferredWidth - gap * (numElements - 1);
    let averageWidth;
    let largeChildrenCount = numElements;
    const widthDic = /* @__PURE__ */ new Map();
    if (hJustify) {
      if (excessSpace < 0) {
        averageWidth = widthToDistribute / numElements;
        for (let i = 0; i < count; i++) {
          const el = asLayoutElement2(target, i);
          if (!el || !el.includeInLayout)
            continue;
          el.getPreferredBounds(tmpBounds2);
          if (tmpBounds2.width <= averageWidth) {
            widthToDistribute -= tmpBounds2.width;
            largeChildrenCount--;
          }
        }
        widthToDistribute = Math.max(0, widthToDistribute);
      }
    } else {
      if (totalPercentWidth > 0) {
        this.flexChildrenProportionally(targetWidth, widthToDistribute, totalPercentWidth, childInfoArray);
        let roundOff2 = 0;
        for (const ci of childInfoArray) {
          const childSize = Math.round(ci.size + roundOff2);
          roundOff2 += ci.size - childSize;
          widthDic.set(ci.layoutElement, childSize);
          widthToDistribute -= childSize;
        }
        widthToDistribute = Math.max(0, widthToDistribute);
      }
    }
    if (this._horizontalAlign === "center") {
      x = paddingL + widthToDistribute * 0.5;
    } else if (this._horizontalAlign === "right") {
      x = paddingL + widthToDistribute;
    }
    let maxX = paddingL;
    let maxY = paddingT;
    let justifyHeight = Math.ceil(targetHeight);
    if (contentJustify)
      justifyHeight = Math.ceil(Math.max(targetHeight, maxElementHeight));
    let roundOff = 0;
    for (let i = 0; i < count; i++) {
      const el = asLayoutElement2(target, i);
      if (!el || !el.includeInLayout)
        continue;
      el.getPreferredBounds(tmpBounds2);
      let layoutElementWidth;
      if (hJustify) {
        let childWidth;
        if (excessSpace > 0) {
          childWidth = widthToDistribute * tmpBounds2.width / totalPreferredWidth;
        } else if (excessSpace < 0 && averageWidth !== void 0 && tmpBounds2.width > averageWidth) {
          childWidth = widthToDistribute / largeChildrenCount;
        }
        if (childWidth !== void 0) {
          layoutElementWidth = Math.round(childWidth + roundOff);
          roundOff += childWidth - layoutElementWidth;
        }
      } else {
        layoutElementWidth = widthDic.get(el);
      }
      if (vJustify) {
        y = paddingT;
        el.setLayoutBoundsSize(layoutElementWidth ?? NaN, justifyHeight);
        el.getLayoutBounds(tmpBounds2);
      } else {
        let layoutElementHeight;
        if (!isNaN(el.percentHeight)) {
          const percent = Math.min(100, el.percentHeight);
          layoutElementHeight = Math.round(targetHeight * percent * 0.01);
        }
        el.setLayoutBoundsSize(layoutElementWidth ?? NaN, layoutElementHeight ?? NaN);
        el.getLayoutBounds(tmpBounds2);
        const excessH = Math.max(0, (targetHeight - tmpBounds2.height) * vAlign);
        y = paddingT + excessH;
      }
      el.setLayoutBoundsPosition(Math.round(x), Math.round(y));
      const dx = Math.ceil(tmpBounds2.width);
      const dy = Math.ceil(tmpBounds2.height);
      maxX = Math.max(maxX, x + dx);
      maxY = Math.max(maxY, y + dy);
      x += dx + gap;
    }
    this.maxElementSize = maxElementHeight;
    target.setContentSize(maxX + paddingR, maxY + paddingB);
  }
  updateDisplayListVirtual(width, height) {
    const target = this.target;
    if (this.indexInViewCalculated)
      this.indexInViewCalculated = false;
    else
      this.getIndexInView();
    const paddingR = this._paddingRight;
    const paddingT = this._paddingTop;
    const gap = this._gap;
    const numElements = target.numElements;
    if (this.startIndex === -1 || this.endIndex === -1) {
      const contentWidth2 = this.getStartPosition(numElements) - gap + paddingR;
      target.setContentSize(contentWidth2, target.contentHeight || height);
      return;
    }
    target.setVirtualElementIndicesInView(this.startIndex, this.endIndex);
    const endIdx = this.endIndex;
    const justify = this._verticalAlign === JustifyAlign.JUSTIFY || this._verticalAlign === JustifyAlign.CONTENT_JUSTIFY;
    const contentJustify = this._verticalAlign === JustifyAlign.CONTENT_JUSTIFY;
    let vAlign = 0;
    if (!justify) {
      if (this._verticalAlign === "middle")
        vAlign = 0.5;
      else if (this._verticalAlign === "bottom")
        vAlign = 1;
    }
    const targetHeight = Math.max(0, height - paddingT - this._paddingBottom);
    let justifyHeight = Math.ceil(targetHeight);
    const typicalW = this.typicalWidth;
    let maxElementHeight = this.maxElementSize;
    const oldMaxH = Math.max(this.typicalHeight, this.maxElementSize);
    if (contentJustify) {
      for (let index = this.startIndex; index <= endIdx; index++) {
        const el = asVirtualLayoutElement2(target, index);
        if (!el || !el.includeInLayout)
          continue;
        el.getPreferredBounds(tmpBounds2);
        maxElementHeight = Math.max(maxElementHeight, tmpBounds2.height);
      }
      justifyHeight = Math.ceil(Math.max(targetHeight, maxElementHeight));
    }
    let y = 0;
    let contentHeight = 0;
    let needInvalidateSize = false;
    const elementSizeTable = this.elementSizeTable;
    for (let i = this.startIndex; i <= endIdx; i++) {
      const el = asVirtualLayoutElement2(target, i);
      if (!el || !el.includeInLayout)
        continue;
      el.getPreferredBounds(tmpBounds2);
      if (!contentJustify) {
        maxElementHeight = Math.max(maxElementHeight, tmpBounds2.height);
      }
      if (justify) {
        y = paddingT;
        el.setLayoutBoundsSize(NaN, justifyHeight);
        el.getLayoutBounds(tmpBounds2);
      } else {
        el.getLayoutBounds(tmpBounds2);
        const excessH = Math.max(0, (targetHeight - tmpBounds2.height) * vAlign);
        y = paddingT + excessH;
      }
      contentHeight = Math.max(contentHeight, tmpBounds2.height);
      if (!needInvalidateSize) {
        const oldSize = isNaN(elementSizeTable[i]) ? typicalW : elementSizeTable[i];
        if (oldSize !== tmpBounds2.width)
          needInvalidateSize = true;
      }
      elementSizeTable[i] = tmpBounds2.width;
      const xPos = this.getStartPosition(i);
      el.setLayoutBoundsPosition(Math.round(xPos), Math.round(y));
    }
    contentHeight += paddingT + this._paddingBottom;
    const contentWidth = this.getStartPosition(numElements) - gap + paddingR;
    this.maxElementSize = maxElementHeight;
    target.setContentSize(contentWidth, contentHeight);
    if (needInvalidateSize || oldMaxH < this.maxElementSize) {
      target.invalidateSize();
    }
  }
  getStartPosition(index) {
    if (!this._useVirtualLayout && this.target) {
      const el = asLayoutElement2(this.target, index);
      if (el) {
        const b = new Rectangle4();
        el.getLayoutBounds(b);
        return b.x;
      }
    }
    const typicalW = this.typicalWidth;
    let startPos = this._paddingLeft;
    const gap = this._gap;
    for (let i = 0; i < index; i++) {
      let w = this.elementSizeTable[i];
      if (isNaN(w))
        w = typicalW;
      startPos += w + gap;
    }
    return startPos;
  }
  getElementSize(index) {
    if (this._useVirtualLayout) {
      const size = this.elementSizeTable[index];
      return isNaN(size) ? this.typicalWidth : size;
    }
    if (this.target) {
      const el = asLayoutElement2(this.target, index);
      if (el) {
        el.getLayoutBounds(tmpBounds2);
        return tmpBounds2.width;
      }
      return 0;
    }
    return 0;
  }
  getElementTotalSize() {
    const typicalW = this.typicalWidth;
    const gap = this._gap;
    let totalSize = 0;
    const length = this.target.numElements;
    for (let i = 0; i < length; i++) {
      let w = this.elementSizeTable[i];
      if (isNaN(w))
        w = typicalW;
      totalSize += w + gap;
    }
    totalSize -= gap;
    return totalSize;
  }
  getIndexInView() {
    const target = this.target;
    if (!target || target.numElements === 0) {
      this.startIndex = this.endIndex = -1;
      return false;
    }
    if (target.width === 0 || target.height === 0) {
      this.startIndex = this.endIndex = -1;
      return false;
    }
    const numElements = target.numElements;
    const lastSize = this.elementSizeTable[numElements - 1];
    const contentWidth = this.getStartPosition(numElements - 1) + (isNaN(lastSize) ? this.typicalWidth : lastSize) + this._paddingRight;
    const minVisibleX = target.scrollH ?? 0;
    if (minVisibleX > contentWidth - this._paddingRight) {
      this.startIndex = this.endIndex = -1;
      return false;
    }
    const maxVisibleX = minVisibleX + target.width;
    if (maxVisibleX < this._paddingLeft) {
      this.startIndex = this.endIndex = -1;
      return false;
    }
    const oldStart = this.startIndex;
    const oldEnd = this.endIndex;
    this.startIndex = this.findIndexAt(minVisibleX, 0, numElements - 1);
    if (this.startIndex === -1)
      this.startIndex = 0;
    this.endIndex = this.findIndexAt(maxVisibleX, 0, numElements - 1);
    if (this.endIndex === -1)
      this.endIndex = numElements - 1;
    return oldStart !== this.startIndex || oldEnd !== this.endIndex;
  }
};
function asLayoutElement2(target, index) {
  const child = target.getChildAt(index);
  if (!child)
    return void 0;
  const el = child;
  if (typeof el.getPreferredBounds === "function")
    return el;
  return void 0;
}
function asVirtualLayoutElement2(target, index) {
  const child = target.getVirtualElementAt(index);
  if (!child)
    return void 0;
  const el = child;
  if (typeof el.getPreferredBounds === "function")
    return el;
  return void 0;
}

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/layouts/ColumnAlign.js
var ColumnAlign = class {
  static LEFT = "left";
  static JUSTIFY_USING_GAP = "justifyUsingGap";
  static JUSTIFY_USING_WIDTH = "justifyUsingWidth";
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/layouts/RowAlign.js
var RowAlign = class {
  static TOP = "top";
  static JUSTIFY_USING_GAP = "justifyUsingGap";
  static JUSTIFY_USING_HEIGHT = "justifyUsingHeight";
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/layouts/TileOrientation.js
var TileOrientation = class {
  static ROWS = "rows";
  static COLUMNS = "columns";
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/layouts/TileLayout.js
import { Rectangle as Rectangle5 } from "@blakron/core";
var tmpBounds3 = new Rectangle5();
var TileLayout = class extends LayoutBase {
  // ── Instance fields ───────────────────────────────────────────────────
  _horizontalGap = 6;
  _explicitHorizontalGap = NaN;
  _verticalGap = 6;
  _explicitVerticalGap = NaN;
  _columnCount = -1;
  _requestedColumnCount = 0;
  _rowCount = -1;
  _requestedRowCount = 0;
  _columnWidth = NaN;
  _explicitColumnWidth = NaN;
  _rowHeight = NaN;
  _explicitRowHeight = NaN;
  _paddingLeft = 0;
  _paddingRight = 0;
  _paddingTop = 0;
  _paddingBottom = 0;
  _horizontalAlign = JustifyAlign.JUSTIFY;
  _verticalAlign = JustifyAlign.JUSTIFY;
  _columnAlign = ColumnAlign.LEFT;
  _rowAlign = RowAlign.TOP;
  _orientation = TileOrientation.ROWS;
  _maxElementWidth = 0;
  _maxElementHeight = 0;
  _startIndex = -1;
  _endIndex = -1;
  _indexInViewCalculated = false;
  // ── Getters / Setters ─────────────────────────────────────────────────
  get horizontalGap() {
    return this._horizontalGap;
  }
  set horizontalGap(value) {
    value = +value;
    if (value === this._horizontalGap)
      return;
    this._explicitHorizontalGap = value;
    this._horizontalGap = value;
    this._invalidateTargetLayout();
  }
  get verticalGap() {
    return this._verticalGap;
  }
  set verticalGap(value) {
    value = +value;
    if (value === this._verticalGap)
      return;
    this._explicitVerticalGap = value;
    this._verticalGap = value;
    this._invalidateTargetLayout();
  }
  get columnCount() {
    return this._columnCount;
  }
  get requestedColumnCount() {
    return this._requestedColumnCount;
  }
  set requestedColumnCount(value) {
    value = +value || 0;
    if (this._requestedColumnCount === value)
      return;
    this._requestedColumnCount = value;
    this._columnCount = value;
    this._invalidateTargetLayout();
  }
  get rowCount() {
    return this._rowCount;
  }
  get requestedRowCount() {
    return this._requestedRowCount;
  }
  set requestedRowCount(value) {
    value = +value || 0;
    if (this._requestedRowCount === value)
      return;
    this._requestedRowCount = value;
    this._rowCount = value;
    this._invalidateTargetLayout();
  }
  get columnWidth() {
    return this._columnWidth;
  }
  set columnWidth(value) {
    value = +value;
    if (value === this._columnWidth)
      return;
    this._explicitColumnWidth = value;
    this._columnWidth = value;
    this._invalidateTargetLayout();
  }
  get rowHeight() {
    return this._rowHeight;
  }
  set rowHeight(value) {
    value = +value;
    if (value === this._rowHeight)
      return;
    this._explicitRowHeight = value;
    this._rowHeight = value;
    this._invalidateTargetLayout();
  }
  get paddingLeft() {
    return this._paddingLeft;
  }
  set paddingLeft(value) {
    value = +value || 0;
    if (this._paddingLeft === value)
      return;
    this._paddingLeft = value;
    this._invalidateTargetLayout();
  }
  get paddingRight() {
    return this._paddingRight;
  }
  set paddingRight(value) {
    value = +value || 0;
    if (this._paddingRight === value)
      return;
    this._paddingRight = value;
    this._invalidateTargetLayout();
  }
  get paddingTop() {
    return this._paddingTop;
  }
  set paddingTop(value) {
    value = +value || 0;
    if (this._paddingTop === value)
      return;
    this._paddingTop = value;
    this._invalidateTargetLayout();
  }
  get paddingBottom() {
    return this._paddingBottom;
  }
  set paddingBottom(value) {
    value = +value || 0;
    if (this._paddingBottom === value)
      return;
    this._paddingBottom = value;
    this._invalidateTargetLayout();
  }
  get horizontalAlign() {
    return this._horizontalAlign;
  }
  set horizontalAlign(value) {
    if (this._horizontalAlign === value)
      return;
    this._horizontalAlign = value;
    this._invalidateTargetLayout();
  }
  get verticalAlign() {
    return this._verticalAlign;
  }
  set verticalAlign(value) {
    if (this._verticalAlign === value)
      return;
    this._verticalAlign = value;
    this._invalidateTargetLayout();
  }
  get columnAlign() {
    return this._columnAlign;
  }
  set columnAlign(value) {
    if (this._columnAlign === value)
      return;
    this._columnAlign = value;
    this._invalidateTargetLayout();
  }
  get rowAlign() {
    return this._rowAlign;
  }
  set rowAlign(value) {
    if (this._rowAlign === value)
      return;
    this._rowAlign = value;
    this._invalidateTargetLayout();
  }
  get orientation() {
    return this._orientation;
  }
  set orientation(value) {
    if (this._orientation === value)
      return;
    this._orientation = value;
    this._invalidateTargetLayout();
  }
  // ── Override methods ──────────────────────────────────────────────────
  clearVirtualLayoutCache() {
    super.clearVirtualLayoutCache();
    this._maxElementWidth = 0;
    this._maxElementHeight = 0;
  }
  scrollPositionChanged() {
    if (this._useVirtualLayout) {
      const changed = this._getIndexInView();
      if (changed) {
        this._indexInViewCalculated = true;
        this.target?.invalidateDisplayList();
      }
    }
  }
  measure() {
    const target = this.target;
    const savedColumnCount = this._columnCount;
    const savedRowCount = this._rowCount;
    const savedColumnWidth = this._columnWidth;
    const savedRowHeight = this._rowHeight;
    let measuredWidth = 0;
    let measuredHeight = 0;
    this._calculateRowAndColumn(target.$explicitWidth, target.$explicitHeight);
    const columnCount = this._requestedColumnCount > 0 ? this._requestedColumnCount : this._columnCount;
    const rowCount = this._requestedRowCount > 0 ? this._requestedRowCount : this._rowCount;
    const hGap = isNaN(this._horizontalGap) ? 0 : this._horizontalGap;
    const vGap = isNaN(this._verticalGap) ? 0 : this._verticalGap;
    if (columnCount > 0) {
      measuredWidth = columnCount * (this._columnWidth + hGap) - hGap;
    }
    if (rowCount > 0) {
      measuredHeight = rowCount * (this._rowHeight + vGap) - vGap;
    }
    const hPadding = this._paddingLeft + this._paddingRight;
    const vPadding = this._paddingTop + this._paddingBottom;
    target.setMeasuredSize(measuredWidth + hPadding, measuredHeight + vPadding);
    this._columnCount = savedColumnCount;
    this._rowCount = savedRowCount;
    this._columnWidth = savedColumnWidth;
    this._rowHeight = savedRowHeight;
  }
  updateDisplayList(width, height) {
    const target = this.target;
    if (!target)
      return;
    const paddingL = this._paddingLeft;
    const paddingR = this._paddingRight;
    const paddingT = this._paddingTop;
    const paddingB = this._paddingBottom;
    if (this._indexInViewCalculated) {
      this._indexInViewCalculated = false;
    } else {
      this._calculateRowAndColumn(width, height);
      if (this._rowCount === 0 || this._columnCount === 0) {
        target.setContentSize(paddingL + paddingR, paddingT + paddingB);
        return;
      }
      this._adjustForJustify(width, height);
      this._getIndexInView();
    }
    if (this._useVirtualLayout) {
      this._calculateRowAndColumn(width, height);
      this._adjustForJustify(width, height);
    }
    if (this._startIndex === -1 || this._endIndex === -1) {
      target.setContentSize(0, 0);
      return;
    }
    const endIdx = this._endIndex;
    const orientedByColumns = this._orientation === TileOrientation.COLUMNS;
    let index = this._startIndex;
    const hGap = isNaN(this._horizontalGap) ? 0 : this._horizontalGap;
    const vGap = isNaN(this._verticalGap) ? 0 : this._verticalGap;
    const rowCount = this._rowCount;
    const columnCount = this._columnCount;
    const columnWidth = this._columnWidth;
    const rowHeight = this._rowHeight;
    for (let i = this._startIndex; i <= endIdx; i++) {
      const el = asLayoutElement3(target, i);
      if (!el || !el.includeInLayout) {
        continue;
      }
      let columnIndex;
      let rowIndex;
      if (orientedByColumns) {
        columnIndex = Math.ceil((index + 1) / rowCount) - 1;
        rowIndex = Math.ceil((index + 1) % rowCount) - 1;
        if (rowIndex === -1)
          rowIndex = rowCount - 1;
      } else {
        columnIndex = Math.ceil((index + 1) % columnCount) - 1;
        if (columnIndex === -1)
          columnIndex = columnCount - 1;
        rowIndex = Math.ceil((index + 1) / columnCount) - 1;
      }
      let x;
      switch (this._horizontalAlign) {
        case "right":
          x = width - (columnIndex + 1) * (columnWidth + hGap) + hGap - paddingR;
          break;
        case "left":
          x = columnIndex * (columnWidth + hGap) + paddingL;
          break;
        default:
          x = columnIndex * (columnWidth + hGap) + paddingL;
      }
      let y;
      switch (this._verticalAlign) {
        case "top":
          y = rowIndex * (rowHeight + vGap) + paddingT;
          break;
        case "bottom":
          y = height - (rowIndex + 1) * (rowHeight + vGap) + vGap - paddingB;
          break;
        default:
          y = rowIndex * (rowHeight + vGap) + paddingT;
      }
      this._sizeAndPositionElement(el, x, y, columnWidth, rowHeight);
      index++;
    }
    const hPadding = paddingL + paddingR;
    const vPadding = paddingT + paddingB;
    const contentWidth = (columnWidth + hGap) * columnCount - hGap;
    const contentHeight = (rowHeight + vGap) * rowCount - vGap;
    target.setContentSize(contentWidth + hPadding, contentHeight + vPadding);
  }
  // ── Private methods ───────────────────────────────────────────────────
  _invalidateTargetLayout() {
    if (this.target) {
      this.target.invalidateSize();
      this.target.invalidateDisplayList();
    }
  }
  _updateMaxElementSize() {
    if (!this.target)
      return;
    if (this._useVirtualLayout) {
      this._maxElementWidth = Math.max(this._maxElementWidth, this.typicalWidth);
      this._maxElementHeight = Math.max(this._maxElementHeight, this.typicalHeight);
      this._doUpdateMaxElementSize(this._startIndex, this._endIndex);
    } else {
      this._doUpdateMaxElementSize(0, this.target.numChildren - 1);
    }
  }
  _doUpdateMaxElementSize(startIdx, endIdx) {
    let maxW = this._maxElementWidth;
    let maxH = this._maxElementHeight;
    if (startIdx !== -1 && endIdx !== -1) {
      for (let i = startIdx; i <= endIdx; i++) {
        const el = asLayoutElement3(this.target, i);
        if (!el || !el.includeInLayout)
          continue;
        el.getPreferredBounds(tmpBounds3);
        maxW = Math.max(maxW, tmpBounds3.width);
        maxH = Math.max(maxH, tmpBounds3.height);
      }
    }
    this._maxElementWidth = maxW;
    this._maxElementHeight = maxH;
  }
  _calculateRowAndColumn($explicitWidth, $explicitHeight) {
    const target = this.target;
    const hGap = isNaN(this._horizontalGap) ? 0 : this._horizontalGap;
    const vGap = isNaN(this._verticalGap) ? 0 : this._verticalGap;
    this._rowCount = this._columnCount = -1;
    let numElements = target.numChildren;
    for (let i = 0; i < target.numChildren; i++) {
      const el = asLayoutElement3(target, i);
      if (el && !el.includeInLayout)
        numElements--;
    }
    if (numElements === 0) {
      this._rowCount = this._columnCount = 0;
      return;
    }
    if (isNaN(this._explicitColumnWidth) || isNaN(this._explicitRowHeight)) {
      this._updateMaxElementSize();
    }
    this._columnWidth = isNaN(this._explicitColumnWidth) ? this._maxElementWidth : this._explicitColumnWidth;
    this._rowHeight = isNaN(this._explicitRowHeight) ? this._maxElementHeight : this._explicitRowHeight;
    let itemWidth = this._columnWidth + hGap;
    if (itemWidth <= 0)
      itemWidth = 1;
    let itemHeight = this._rowHeight + vGap;
    if (itemHeight <= 0)
      itemHeight = 1;
    const orientedByColumns = this._orientation === TileOrientation.COLUMNS;
    const widthHasSet = !isNaN($explicitWidth);
    const heightHasSet = !isNaN($explicitHeight);
    if (this._requestedColumnCount > 0 || this._requestedRowCount > 0) {
      if (this._requestedRowCount > 0)
        this._rowCount = Math.min(this._requestedRowCount, numElements);
      if (this._requestedColumnCount > 0)
        this._columnCount = Math.min(this._requestedColumnCount, numElements);
    } else if (!widthHasSet && !heightHasSet) {
      const side = Math.sqrt(numElements * itemWidth * itemHeight);
      if (orientedByColumns) {
        this._rowCount = Math.max(1, Math.round(side / itemHeight));
      } else {
        this._columnCount = Math.max(1, Math.round(side / itemWidth));
      }
    } else if (widthHasSet && (!heightHasSet || !orientedByColumns)) {
      const targetWidth = Math.max(0, $explicitWidth - this._paddingLeft - this._paddingRight);
      this._columnCount = Math.floor((targetWidth + hGap) / itemWidth);
      this._columnCount = Math.max(1, Math.min(this._columnCount, numElements));
    } else {
      const targetHeight = Math.max(0, $explicitHeight - this._paddingTop - this._paddingBottom);
      this._rowCount = Math.floor((targetHeight + vGap) / itemHeight);
      this._rowCount = Math.max(1, Math.min(this._rowCount, numElements));
    }
    if (this._rowCount === -1)
      this._rowCount = Math.max(1, Math.ceil(numElements / this._columnCount));
    if (this._columnCount === -1)
      this._columnCount = Math.max(1, Math.ceil(numElements / this._rowCount));
    if (this._requestedColumnCount > 0 && this._requestedRowCount > 0) {
      if (this._orientation === TileOrientation.ROWS) {
        this._rowCount = Math.max(1, Math.ceil(numElements / this._requestedColumnCount));
      } else {
        this._columnCount = Math.max(1, Math.ceil(numElements / this._requestedRowCount));
      }
    }
  }
  _getIndexInView() {
    const target = this.target;
    if (!target || target.numChildren === 0) {
      this._startIndex = this._endIndex = -1;
      return false;
    }
    const numElements = target.numChildren;
    if (!this._useVirtualLayout) {
      this._startIndex = 0;
      this._endIndex = numElements - 1;
      return false;
    }
    if (target.width === 0 || target.height === 0) {
      this._startIndex = this._endIndex = -1;
      return false;
    }
    const oldStartIndex = this._startIndex;
    const oldEndIndex = this._endIndex;
    const paddingL = this._paddingLeft;
    const paddingT = this._paddingTop;
    const hGap = isNaN(this._horizontalGap) ? 0 : this._horizontalGap;
    const vGap = isNaN(this._verticalGap) ? 0 : this._verticalGap;
    if (this._orientation === TileOrientation.COLUMNS) {
      const itemWidth = this._columnWidth + hGap;
      if (itemWidth <= 0) {
        this._startIndex = 0;
        this._endIndex = numElements - 1;
        return false;
      }
      const minVisibleX = target.scrollH ?? 0;
      const maxVisibleX = minVisibleX + target.width;
      let startColumn = Math.floor((minVisibleX - paddingL) / itemWidth);
      if (startColumn < 0)
        startColumn = 0;
      let endColumn = Math.ceil((maxVisibleX - paddingL) / itemWidth);
      if (endColumn < 0)
        endColumn = 0;
      this._startIndex = Math.min(numElements - 1, Math.max(0, startColumn * this._rowCount));
      this._endIndex = Math.min(numElements - 1, Math.max(0, endColumn * this._rowCount - 1));
    } else {
      const itemHeight = this._rowHeight + vGap;
      if (itemHeight <= 0) {
        this._startIndex = 0;
        this._endIndex = numElements - 1;
        return false;
      }
      const minVisibleY = target.scrollV ?? 0;
      const maxVisibleY = minVisibleY + target.height;
      let startRow = Math.floor((minVisibleY - paddingT) / itemHeight);
      if (startRow < 0)
        startRow = 0;
      let endRow = Math.ceil((maxVisibleY - paddingT) / itemHeight);
      if (endRow < 0)
        endRow = 0;
      this._startIndex = Math.min(numElements - 1, Math.max(0, startRow * this._columnCount));
      this._endIndex = Math.min(numElements - 1, Math.max(0, endRow * this._columnCount - 1));
    }
    return this._startIndex !== oldStartIndex || this._endIndex !== oldEndIndex;
  }
  _adjustForJustify(width, height) {
    const paddingL = this._paddingLeft;
    const paddingR = this._paddingRight;
    const paddingT = this._paddingTop;
    const paddingB = this._paddingBottom;
    const targetWidth = Math.max(0, width - paddingL - paddingR);
    const targetHeight = Math.max(0, height - paddingT - paddingB);
    if (!isNaN(this._explicitVerticalGap))
      this._verticalGap = this._explicitVerticalGap;
    if (!isNaN(this._explicitHorizontalGap))
      this._horizontalGap = this._explicitHorizontalGap;
    this._verticalGap = isNaN(this._verticalGap) ? 0 : this._verticalGap;
    this._horizontalGap = isNaN(this._horizontalGap) ? 0 : this._horizontalGap;
    const offsetY = targetHeight - this._rowHeight * this._rowCount;
    const offsetX = targetWidth - this._columnWidth * this._columnCount;
    if (offsetY > 0) {
      if (this._rowAlign === RowAlign.JUSTIFY_USING_GAP) {
        const gapCount = Math.max(1, this._rowCount - 1);
        this._verticalGap = offsetY / gapCount;
      } else if (this._rowAlign === RowAlign.JUSTIFY_USING_HEIGHT) {
        if (this._rowCount > 0) {
          this._rowHeight += (offsetY - (this._rowCount - 1) * this._verticalGap) / this._rowCount;
        }
      }
    }
    if (offsetX > 0) {
      if (this._columnAlign === ColumnAlign.JUSTIFY_USING_GAP) {
        const gapCount = Math.max(1, this._columnCount - 1);
        this._horizontalGap = offsetX / gapCount;
      } else if (this._columnAlign === ColumnAlign.JUSTIFY_USING_WIDTH) {
        if (this._columnCount > 0) {
          this._columnWidth += (offsetX - (this._columnCount - 1) * this._horizontalGap) / this._columnCount;
        }
      }
    }
  }
  _sizeAndPositionElement(element, cellX, cellY, cellWidth, cellHeight) {
    let elementWidth = NaN;
    let elementHeight = NaN;
    if (this._horizontalAlign === JustifyAlign.JUSTIFY) {
      elementWidth = cellWidth;
    } else if (!isNaN(element.percentWidth)) {
      elementWidth = cellWidth * element.percentWidth * 0.01;
    }
    if (this._verticalAlign === JustifyAlign.JUSTIFY) {
      elementHeight = cellHeight;
    } else if (!isNaN(element.percentHeight)) {
      elementHeight = cellHeight * element.percentHeight * 0.01;
    }
    element.setLayoutBoundsSize(Math.round(elementWidth), Math.round(elementHeight));
    let x = cellX;
    element.getLayoutBounds(tmpBounds3);
    switch (this._horizontalAlign) {
      case "right":
        x += cellWidth - tmpBounds3.width;
        break;
      case "center":
        x = cellX + (cellWidth - tmpBounds3.width) / 2;
        break;
    }
    let y = cellY;
    switch (this._verticalAlign) {
      case "bottom":
        y += cellHeight - tmpBounds3.height;
        break;
      case "middle":
        y += (cellHeight - tmpBounds3.height) / 2;
        break;
    }
    element.setLayoutBoundsPosition(Math.round(x), Math.round(y));
  }
};
function asLayoutElement3(target, index) {
  const child = target.getChildAt(index);
  if (!child)
    return void 0;
  const el = child;
  if (typeof el.getPreferredBounds === "function")
    return el;
  return void 0;
}

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/Component.js
import { Sprite, Rectangle as Rectangle6, Event as Event6 } from "@blakron/core";

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/events/PropertyEvent.js
import { Event as Event5 } from "@blakron/core";
var PropertyEvent = class _PropertyEvent extends Event5 {
  // ── Static fields ─────────────────────────────────────────────────────
  static PROPERTY_CHANGE = "propertyChange";
  // ── Instance fields ───────────────────────────────────────────────────
  property = "";
  // ── Constructor ───────────────────────────────────────────────────────
  constructor(type, bubbles = false, cancelable = false) {
    super(type, bubbles, cancelable);
  }
  // ── Public methods ────────────────────────────────────────────────────
  static dispatchPropertyEvent(target, property) {
    if (!target.hasEventListener(_PropertyEvent.PROPERTY_CHANGE))
      return true;
    const e = new _PropertyEvent(_PropertyEvent.PROPERTY_CHANGE);
    e.property = property;
    return target.dispatchEvent(e);
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/Component.js
var Component = class extends Sprite {
  // ── Instance fields ───────────────────────────────────────────────────
  ui;
  skinNameExplicitlySet = false;
  _hostComponentKey;
  _skinName;
  _skin;
  _enabled = true;
  _explicitTouchEnabled = true;
  _explicitTouchChildren = true;
  _explicitState = "";
  _stateIsDirty = false;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor() {
    super();
    this.ui = new UIState(this);
    this.touchEnabled = true;
  }
  // ── Getters / Setters ─────────────────────────────────────────────────
  /**
   * Key used to look up the default skin in the active Theme.
   * Defaults to the component's class name if not set.
   */
  get hostComponentKey() {
    return this._hostComponentKey ?? this.constructor.name ?? "";
  }
  set hostComponentKey(value) {
    this._hostComponentKey = value;
  }
  /**
   * Skin identifier. Can be:
   * - A Skin subclass constructor
   * - A Skin instance
   * - A class name string (resolved via global scope)
   */
  get skinName() {
    return this._skinName;
  }
  set skinName(value) {
    this.skinNameExplicitlySet = true;
    if (this._skinName === value)
      return;
    this._skinName = value;
    this._parseSkinName();
  }
  get skin() {
    return this._skin;
  }
  get enabled() {
    return this._enabled;
  }
  /**
   * Enable or disable this component (and its children).
   *
   * Mirrors egret's `$setEnabled`: writes `touchEnabled` / `touchChildren`
   * directly at the display-object level (via `super`) so that:
   *
   * 1. The display-layer values change immediately (disabled components are
   *    skipped in hit-testing, just like egret).
   * 2. `_explicitTouchEnabled` / `_explicitTouchChildren` survive the
   *    disable→enable cycle so the original intent is restored on re-enable.
   */
  set enabled(value) {
    value = !!value;
    if (this._enabled === value)
      return;
    this._enabled = value;
    if (value) {
      super.touchEnabled = this._explicitTouchEnabled;
      super.touchChildren = this._explicitTouchChildren;
    } else {
      super.touchEnabled = false;
      super.touchChildren = false;
    }
    this.invalidateState();
  }
  /**
   * The current view state. Setting this explicitly overrides `getCurrentState()`.
   * Set to `''` to revert to the computed state.
   */
  get currentState() {
    return this._explicitState || this.getCurrentState();
  }
  set currentState(value) {
    if (this._explicitState === value)
      return;
    this._explicitState = value;
    this.invalidateState();
  }
  get includeInLayout() {
    return this.ui.includeInLayout;
  }
  set includeInLayout(v) {
    this.ui.includeInLayout = v;
  }
  get left() {
    return this.ui.left;
  }
  set left(v) {
    this.ui.left = v;
  }
  get right() {
    return this.ui.right;
  }
  set right(v) {
    this.ui.right = v;
  }
  get top() {
    return this.ui.top;
  }
  set top(v) {
    this.ui.top = v;
  }
  get bottom() {
    return this.ui.bottom;
  }
  set bottom(v) {
    this.ui.bottom = v;
  }
  get horizontalCenter() {
    return this.ui.horizontalCenter;
  }
  set horizontalCenter(v) {
    this.ui.horizontalCenter = v;
  }
  get verticalCenter() {
    return this.ui.verticalCenter;
  }
  set verticalCenter(v) {
    this.ui.verticalCenter = v;
  }
  get percentWidth() {
    return this.ui.percentWidth;
  }
  set percentWidth(v) {
    this.ui.percentWidth = v;
  }
  get percentHeight() {
    return this.ui.percentHeight;
  }
  set percentHeight(v) {
    this.ui.percentHeight = v;
  }
  get width() {
    return this.ui.getWidth();
  }
  set width(v) {
    this.ui.setWidth(v);
  }
  get height() {
    return this.ui.getHeight();
  }
  set height(v) {
    this.ui.setHeight(v);
  }
  get minWidth() {
    return this.ui.minWidth;
  }
  set minWidth(v) {
    this.ui.minWidth = v;
  }
  get maxWidth() {
    return this.ui.maxWidth;
  }
  set maxWidth(v) {
    this.ui.maxWidth = v;
  }
  get minHeight() {
    return this.ui.minHeight;
  }
  set minHeight(v) {
    this.ui.minHeight = v;
  }
  get maxHeight() {
    return this.ui.maxHeight;
  }
  set maxHeight(v) {
    this.ui.maxHeight = v;
  }
  get numElements() {
    return this.numChildren;
  }
  get contentWidth() {
    return this.width;
  }
  get contentHeight() {
    return this.height;
  }
  get scrollH() {
    return 0;
  }
  set scrollH(_v) {
  }
  get scrollV() {
    return 0;
  }
  set scrollV(_v) {
  }
  // ── Public methods ────────────────────────────────────────────────────
  _applySkinName(skinName) {
    this._skinName = skinName;
    this._parseSkinName();
    this.invalidateProperties();
  }
  /**
   * Bind a skin part instance to this component.
   * Called automatically when a skin is attached.
   */
  setSkinPart(partName, instance) {
    const self = this;
    const old = self[partName];
    if (old)
      this.partRemoved(partName, old);
    self[partName] = instance;
    if (instance)
      this.partAdded(partName, instance);
  }
  /**
   * Whether the display object receives touch events.
   *
   * Unlike the setter, reading this property always returns the *actual*
   * display-level value — even when the component is disabled (the setter
   * deliberately preserves `_explicitTouchEnabled` for the next `enabled`
   * restore, so the getter must bypass that layer).
   */
  get touchEnabled() {
    return super.touchEnabled;
  }
  set touchEnabled(value) {
    this._explicitTouchEnabled = value;
    if (this._enabled)
      super.touchEnabled = value;
  }
  get touchChildren() {
    return super.touchChildren;
  }
  set touchChildren(value) {
    this._explicitTouchChildren = value;
    if (this._enabled)
      super.touchChildren = value;
  }
  /**
   * Mark the view state as dirty so it will be re-applied on next commit.
   */
  invalidateState() {
    if (this._stateIsDirty)
      return;
    this._stateIsDirty = true;
    this.invalidateProperties();
  }
  getElementAt(index) {
    return this.getChildAt(index);
  }
  getVirtualElementAt(index) {
    return this.getChildAt(index);
  }
  setVirtualElementIndicesInView(_startIndex, _endIndex) {
  }
  setContentSize(_w, _h) {
  }
  setMeasuredSize(w, h) {
    this.ui.setMeasuredSize(w, h);
  }
  invalidateProperties() {
    this.ui.invalidateProperties();
  }
  validateProperties() {
    this.ui.validateProperties();
  }
  invalidateSize() {
    this.ui.invalidateSize();
  }
  validateSize(recursive) {
    this.ui.validateSize(recursive);
  }
  invalidateDisplayList() {
    this.ui.invalidateDisplayList();
  }
  validateDisplayList() {
    this.ui.validateDisplayList();
  }
  validateNow() {
    this.ui.validateNow();
  }
  setLayoutBoundsSize(lw, lh) {
    this.ui.setLayoutBoundsSize(lw, lh);
  }
  setLayoutBoundsPosition(x, y) {
    this.ui.setLayoutBoundsPosition(x, y);
  }
  getLayoutBounds(bounds) {
    this.ui.getLayoutBounds(bounds);
  }
  getPreferredBounds(bounds) {
    this.ui.getPreferredBounds(bounds);
  }
  // ── Override methods ──────────────────────────────────────────────────
  $onAddToStage(stage, $nestLevel) {
    super.$onAddToStage(stage, $nestLevel);
    this.ui.$onAddToStage();
  }
  childAdded(_child, _index) {
    this.invalidateSize();
    this.invalidateDisplayList();
  }
  childRemoved(_child, _index) {
    this.invalidateSize();
    this.invalidateDisplayList();
  }
  addEventListener(type, listener, useCapture, priority) {
    super.addEventListener(type, listener, useCapture, priority);
  }
  removeEventListener(type, listener, useCapture) {
    super.removeEventListener(type, listener, useCapture);
  }
  // ── IUIOwner lifecycle ────────────────────────────────────────────────
  createChildren() {
    if (!this._skinName) {
      const theme = getTheme();
      if (theme) {
        const skinName = theme.getSkinName(this);
        if (skinName)
          this._applySkinName(skinName);
      }
    }
  }
  childrenCreated() {
  }
  commitProperties() {
    this.ui.onCommitProperties();
    if (this._stateIsDirty) {
      this._stateIsDirty = false;
      if (this._skin)
        this._skin.currentState = this.currentState;
    }
  }
  measure() {
    _basicLayout.target = this;
    _basicLayout.measure();
    _basicLayout.target = void 0;
    const skin = this._skin;
    if (!skin)
      return;
    const bounds = new Rectangle6();
    this.getPreferredBounds(bounds);
    let mw = bounds.width;
    let mh = bounds.height;
    if (!isNaN(skin.width)) {
      mw = skin.width;
    } else {
      mw = Math.max(Math.min(mw, skin.maxWidth), skin.minWidth);
    }
    if (!isNaN(skin.height)) {
      mh = skin.height;
    } else {
      mh = Math.max(Math.min(mh, skin.maxHeight), skin.minHeight);
    }
    this.setMeasuredSize(mw, mh);
  }
  updateDisplayList(w, h) {
    _basicLayout.target = this;
    _basicLayout.updateDisplayList(w, h);
    _basicLayout.target = void 0;
  }
  // ── Protected methods ─────────────────────────────────────────────────
  setSkin(skin) {
    this._setSkin(skin);
  }
  /**
   * Called when a skin part is added. Override to bind event listeners
   * or apply cached property values to the part.
   */
  partAdded(_partName, _instance) {
  }
  /**
   * Called when a skin part is removed. Override to clean up listeners
   * and cached references.
   */
  partRemoved(_partName, _instance) {
  }
  /**
   * Return the current view-state name. Override in subclasses.
   */
  getCurrentState() {
    return this._enabled ? "" : "disabled";
  }
  // ── Private methods ───────────────────────────────────────────────────
  _parseSkinName() {
    const skinName = this._skinName;
    let skin;
    if (skinName) {
      if (typeof skinName === "function") {
        skin = this._invokeSkinFactory(skinName);
      } else if (typeof skinName === "string") {
        const clazz = globalThis[skinName];
        if (clazz)
          skin = this._invokeSkinFactory(clazz);
      } else {
        skin = skinName;
      }
    }
    this._setSkin(skin);
  }
  /**
   * Invoke a skin factory function with `this` (the host component) as context.
   *
   * EXML-compiled skins are factory functions (not class constructors) that use
   * `this` for `Binding.bindProperty(this, ...)`. Calling with `.call(this)` ensures
   * the bindings watch the host component, not a `new`-target blank object.
   *
   * For genuine ES class constructors (e.g. a user-written `class MySkin extends Skin`),
   * `.call(this)` would throw `TypeError: Class constructor cannot be invoked without
   * 'new'`, so we detect class constructors by their string representation and use `new`
   * instead. This secondary path never has correct binding-`this`, so user skins should
   * always be factory functions when they contain EXML `{…}` bindings.
   */
  _invokeSkinFactory(factory) {
    const fn = factory;
    const isClass = typeof fn === "function" && /^class\s/.test(Function.prototype.toString.call(fn));
    const result = isClass ? new factory() : fn.call(this);
    return result && typeof result === "object" && "skinParts" in result ? result : void 0;
  }
  _setSkin(skin) {
    const oldSkin = this._skin;
    if (oldSkin) {
      oldSkin.unwatchAll();
      for (const partName of oldSkin.skinParts) {
        if (this[partName])
          this.setSkinPart(partName, void 0);
      }
      for (const child of oldSkin.elementsContent) {
        if (child.parent === this)
          this.removeChild(child);
      }
      oldSkin.hostComponent = void 0;
    }
    this._skin = skin;
    if (skin) {
      for (const partName of skin.skinParts) {
        const instance = skin.getPart(partName);
        if (instance)
          this.setSkinPart(partName, instance);
      }
      for (let i = skin.elementsContent.length - 1; i >= 0; i--) {
        this.addChildAt(skin.elementsContent[i], 0);
      }
      skin.hostComponent = this;
    }
    this.invalidateSize();
    this.invalidateDisplayList();
    this.dispatchEventWith(Event6.COMPLETE);
  }
};
var _basicLayout = new BasicLayout();

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/Group.js
import { Sprite as Sprite2, Rectangle as Rectangle7, Point } from "@blakron/core";

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/events/CollectionEvent.js
import { Event as Event7 } from "@blakron/core";
var CollectionEventKind = {
  ADD: "add",
  REMOVE: "remove",
  UPDATE: "update",
  RESET: "reset",
  REFRESH: "refresh",
  REPLACE: "replace",
  MOVE: "move"
};
var CollectionEvent = class _CollectionEvent extends Event7 {
  // ── Static fields ─────────────────────────────────────────────────────
  static COLLECTION_CHANGE = "collectionChange";
  // ── Instance fields ───────────────────────────────────────────────────
  kind = CollectionEventKind.ADD;
  items = [];
  oldItems = [];
  location = -1;
  oldLocation = -1;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor(type, bubbles = false, cancelable = false) {
    super(type, bubbles, cancelable);
  }
  // ── Public methods ────────────────────────────────────────────────────
  static dispatchCollectionEvent(target, kind, location = -1, oldLocation = -1, items = [], oldItems = []) {
    if (!target.hasEventListener(_CollectionEvent.COLLECTION_CHANGE))
      return true;
    const e = new _CollectionEvent(_CollectionEvent.COLLECTION_CHANGE);
    e.kind = kind;
    e.location = location;
    e.oldLocation = oldLocation;
    e.items = items;
    e.oldItems = oldItems;
    return target.dispatchEvent(e);
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/events/ItemTapEvent.js
import { Event as Event8 } from "@blakron/core";
var ItemTapEvent = class _ItemTapEvent extends Event8 {
  // ── Static fields ─────────────────────────────────────────────────────
  static ITEM_TAP = "itemTap";
  // ── Instance fields ───────────────────────────────────────────────────
  item;
  itemIndex = -1;
  itemRenderer;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor(type, bubbles = false, cancelable = false) {
    super(type, bubbles, cancelable);
  }
  // ── Public methods ────────────────────────────────────────────────────
  static dispatchItemTapEvent(target, item, itemIndex, itemRenderer) {
    if (!target.hasEventListener(_ItemTapEvent.ITEM_TAP))
      return true;
    const e = new _ItemTapEvent(_ItemTapEvent.ITEM_TAP, false, false);
    e.item = item;
    e.itemIndex = itemIndex;
    e.itemRenderer = itemRenderer;
    return target.dispatchEvent(e);
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/Group.js
var Group = class extends Sprite2 {
  // ── Instance fields ───────────────────────────────────────────────────
  ui;
  _layout;
  _contentWidth = 0;
  _contentHeight = 0;
  _scrollEnabled = false;
  _scrollH = 0;
  _scrollV = 0;
  _touchThrough = false;
  _states = [];
  _statesMap = {};
  _currentState = "";
  _oldState = "";
  _explicitState = "";
  _stateIsDirty = false;
  _stateInitialized = false;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor() {
    super();
    this.ui = new UIState(this);
    this.touchEnabled = true;
  }
  // ── Getters / Setters ─────────────────────────────────────────────────
  get layout() {
    return this._layout;
  }
  set layout(value) {
    if (this._layout === value)
      return;
    if (this._layout)
      this._layout.target = void 0;
    this._layout = value;
    if (value)
      value.target = this;
    this.invalidateSize();
    this.invalidateDisplayList();
  }
  get contentWidth() {
    return this._contentWidth;
  }
  get contentHeight() {
    return this._contentHeight;
  }
  get scrollEnabled() {
    return this._scrollEnabled;
  }
  set scrollEnabled(value) {
    value = !!value;
    if (this._scrollEnabled === value)
      return;
    this._scrollEnabled = value;
    this._updateScrollRect();
  }
  get scrollH() {
    return this._scrollH;
  }
  set scrollH(value) {
    value = +value || 0;
    if (this._scrollH === value)
      return;
    this._scrollH = value;
    if (this._updateScrollRect() && this._layout) {
      this._layout.scrollPositionChanged();
    }
    PropertyEvent.dispatchPropertyEvent(this, "scrollH");
  }
  get scrollV() {
    return this._scrollV;
  }
  set scrollV(value) {
    value = +value || 0;
    if (this._scrollV === value)
      return;
    this._scrollV = value;
    if (this._updateScrollRect() && this._layout) {
      this._layout.scrollPositionChanged();
    }
    PropertyEvent.dispatchPropertyEvent(this, "scrollV");
  }
  get touchThrough() {
    return this._touchThrough;
  }
  set touchThrough(value) {
    this._touchThrough = !!value;
  }
  get states() {
    return this._states;
  }
  set states(value) {
    if (!value)
      value = [];
    this._states = value;
    this._statesMap = {};
    for (const state of value) {
      this._statesMap[state.name] = state;
    }
    if (this._stateInitialized) {
      this._commitCurrentState();
    }
  }
  get currentState() {
    return this._currentState;
  }
  set currentState(value) {
    this._explicitState = value;
    this._currentState = value;
    this._commitCurrentState();
  }
  get numElements() {
    return this.numChildren;
  }
  get includeInLayout() {
    return this.ui.includeInLayout;
  }
  set includeInLayout(v) {
    this.ui.includeInLayout = v;
  }
  get left() {
    return this.ui.left;
  }
  set left(v) {
    this.ui.left = v;
  }
  get right() {
    return this.ui.right;
  }
  set right(v) {
    this.ui.right = v;
  }
  get top() {
    return this.ui.top;
  }
  set top(v) {
    this.ui.top = v;
  }
  get bottom() {
    return this.ui.bottom;
  }
  set bottom(v) {
    this.ui.bottom = v;
  }
  get horizontalCenter() {
    return this.ui.horizontalCenter;
  }
  set horizontalCenter(v) {
    this.ui.horizontalCenter = v;
  }
  get verticalCenter() {
    return this.ui.verticalCenter;
  }
  set verticalCenter(v) {
    this.ui.verticalCenter = v;
  }
  get percentWidth() {
    return this.ui.percentWidth;
  }
  set percentWidth(v) {
    this.ui.percentWidth = v;
  }
  get percentHeight() {
    return this.ui.percentHeight;
  }
  set percentHeight(v) {
    this.ui.percentHeight = v;
  }
  get width() {
    return this.ui.getWidth();
  }
  set width(v) {
    this.ui.setWidth(v);
  }
  get height() {
    return this.ui.getHeight();
  }
  set height(v) {
    this.ui.setHeight(v);
  }
  get minWidth() {
    return this.ui.minWidth;
  }
  set minWidth(v) {
    this.ui.minWidth = v;
  }
  get maxWidth() {
    return this.ui.maxWidth;
  }
  set maxWidth(v) {
    this.ui.maxWidth = v;
  }
  get minHeight() {
    return this.ui.minHeight;
  }
  set minHeight(v) {
    this.ui.minHeight = v;
  }
  get maxHeight() {
    return this.ui.maxHeight;
  }
  set maxHeight(v) {
    this.ui.maxHeight = v;
  }
  // ── Public methods ────────────────────────────────────────────────────
  setContentSize(w, h) {
    w = Math.ceil(+w || 0);
    h = Math.ceil(+h || 0);
    const wChanged = this._contentWidth !== w;
    const hChanged = this._contentHeight !== h;
    if (!wChanged && !hChanged)
      return;
    this._contentWidth = w;
    this._contentHeight = h;
    if (wChanged) {
      PropertyEvent.dispatchPropertyEvent(this, "contentWidth");
    }
    if (hChanged) {
      PropertyEvent.dispatchPropertyEvent(this, "contentHeight");
    }
  }
  getElementAt(index) {
    return this.getChildAt(index);
  }
  getVirtualElementAt(index) {
    return this.getElementAt(index);
  }
  setVirtualElementIndicesInView(_startIndex, _endIndex) {
  }
  set elementsContent(value) {
    if (!value)
      return;
    for (let i = 0; i < value.length; i++) {
      this.addChild(value[i]);
    }
  }
  hasState(stateName) {
    return !!this._statesMap[stateName];
  }
  invalidateState() {
    if (this._stateIsDirty)
      return;
    this._stateIsDirty = true;
    this.invalidateProperties();
  }
  setMeasuredSize(w, h) {
    this.ui.setMeasuredSize(w, h);
  }
  invalidateProperties() {
    this.ui.invalidateProperties();
  }
  validateProperties() {
    this.ui.validateProperties();
  }
  invalidateSize() {
    this.ui.invalidateSize();
  }
  validateSize(recursive) {
    this.ui.validateSize(recursive);
  }
  invalidateDisplayList() {
    this.ui.invalidateDisplayList();
  }
  validateDisplayList() {
    this.ui.validateDisplayList();
  }
  validateNow() {
    this.ui.validateNow();
  }
  setLayoutBoundsSize(lw, lh) {
    this.ui.setLayoutBoundsSize(lw, lh);
  }
  setLayoutBoundsPosition(x, y) {
    this.ui.setLayoutBoundsPosition(x, y);
  }
  getLayoutBounds(bounds) {
    this.ui.getLayoutBounds(bounds);
  }
  getPreferredBounds(bounds) {
    this.ui.getPreferredBounds(bounds);
  }
  // ── Override methods ──────────────────────────────────────────────────
  $onAddToStage(stage, $nestLevel) {
    super.$onAddToStage(stage, $nestLevel);
    this.ui.$onAddToStage();
  }
  $hitTest(stageX, stageY) {
    if (!this.visible || !this.touchEnabled && !this.touchChildren || this.scaleX === 0 || this.scaleY === 0) {
      return void 0;
    }
    const target = super.$hitTest(stageX, stageY);
    if (target || this._touchThrough)
      return target;
    const point = this.globalToLocal(stageX, stageY, new Point());
    const bounds = new Rectangle7(0, 0, this.width, this.height);
    if (this.scrollRect) {
      bounds.x = this.scrollRect.x;
      bounds.y = this.scrollRect.y;
    }
    if (bounds.contains(point.x, point.y))
      return this;
    return void 0;
  }
  childAdded(child, index) {
    super.childAdded(child, index);
    this.invalidateSize();
    this.invalidateDisplayList();
    if (this._layout)
      this._layout.elementAdded(index);
  }
  childRemoved(child, index) {
    super.childRemoved(child, index);
    this.invalidateSize();
    this.invalidateDisplayList();
    if (this._layout)
      this._layout.elementRemoved(index);
  }
  addEventListener(type, listener, useCapture, priority) {
    super.addEventListener(type, listener, useCapture, priority);
  }
  removeEventListener(type, listener, useCapture) {
    super.removeEventListener(type, listener, useCapture);
  }
  // ── IUIOwner lifecycle ────────────────────────────────────────────────
  createChildren() {
    if (!this._layout) {
      this.layout = new BasicLayout();
    }
    this._initializeStates();
  }
  childrenCreated() {
  }
  commitProperties() {
    this.ui.onCommitProperties();
    if (this._stateIsDirty) {
      this._stateIsDirty = false;
      if (!this._explicitState) {
        this._currentState = this.getCurrentState();
        this._commitCurrentState();
      }
    }
  }
  measure() {
    if (this._layout) {
      this._layout.measure();
    } else {
      this.setMeasuredSize(0, 0);
    }
  }
  updateDisplayList(w, h) {
    if (this._layout) {
      this._layout.updateDisplayList(w, h);
    }
    this._updateScrollRect();
  }
  // ── Protected methods ─────────────────────────────────────────────────
  getCurrentState() {
    return "";
  }
  // ── Private methods ───────────────────────────────────────────────────
  _updateScrollRect() {
    if (this._scrollEnabled) {
      this.scrollRect = new Rectangle7(this._scrollH, this._scrollV, this.width, this.height);
    } else if (this.scrollRect) {
      this.scrollRect = void 0;
    }
    return this._scrollEnabled;
  }
  _commitCurrentState() {
    if (!this._stateInitialized)
      return;
    const destination = this._statesMap[this._currentState];
    if (!destination) {
      if (this._states.length > 0) {
        this._currentState = this._states[0].name;
      } else {
        return;
      }
    }
    if (this._oldState === this._currentState)
      return;
    const oldStateObj = this._statesMap[this._oldState];
    if (oldStateObj) {
      for (const o of oldStateObj.overrides) {
        o.remove(this, this);
      }
    }
    this._oldState = this._currentState;
    const newStateObj = this._statesMap[this._currentState];
    if (newStateObj) {
      for (const o of newStateObj.overrides) {
        o.apply(this, this);
      }
    }
  }
  _initializeStates() {
    this._stateInitialized = true;
    this._commitCurrentState();
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/Rect.js
var Rect = class extends Component {
  // ── Instance fields ───────────────────────────────────────────────────
  _fillColor = 0;
  _fillAlpha = 1;
  _strokeColor = 4473924;
  _strokeAlpha = 1;
  _strokeWeight = 0;
  _ellipseWidth = 0;
  _ellipseHeight = 0;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor(width, height, fillColor) {
    super();
    this.touchChildren = false;
    if (width !== void 0)
      this.width = width;
    if (height !== void 0)
      this.height = height;
    if (fillColor !== void 0)
      this.fillColor = fillColor;
  }
  // ── Getters / Setters ─────────────────────────────────────────────────
  get fillColor() {
    return this._fillColor;
  }
  set fillColor(value) {
    if (value === void 0 || this._fillColor === value)
      return;
    this._fillColor = value;
    this.invalidateDisplayList();
  }
  get fillAlpha() {
    return this._fillAlpha;
  }
  set fillAlpha(value) {
    if (this._fillAlpha === value)
      return;
    this._fillAlpha = value;
    this.invalidateDisplayList();
  }
  get strokeColor() {
    return this._strokeColor;
  }
  set strokeColor(value) {
    if (this._strokeColor === value)
      return;
    this._strokeColor = value;
    this.invalidateDisplayList();
  }
  get strokeAlpha() {
    return this._strokeAlpha;
  }
  set strokeAlpha(value) {
    if (this._strokeAlpha === value)
      return;
    this._strokeAlpha = value;
    this.invalidateDisplayList();
  }
  get strokeWeight() {
    return this._strokeWeight;
  }
  set strokeWeight(value) {
    if (this._strokeWeight === value)
      return;
    this._strokeWeight = value;
    this.invalidateDisplayList();
  }
  get ellipseWidth() {
    return this._ellipseWidth;
  }
  set ellipseWidth(value) {
    if (this._ellipseWidth === value)
      return;
    this._ellipseWidth = value;
    this.invalidateDisplayList();
  }
  get ellipseHeight() {
    return this._ellipseHeight;
  }
  set ellipseHeight(value) {
    if (this._ellipseHeight === value)
      return;
    this._ellipseHeight = value;
    this.invalidateDisplayList();
  }
  // ── Override methods ──────────────────────────────────────────────────
  updateDisplayList(unscaledWidth, unscaledHeight) {
    super.updateDisplayList(unscaledWidth, unscaledHeight);
    const g = this.graphics;
    g.clear();
    if (unscaledWidth <= 0 || unscaledHeight <= 0)
      return;
    const sw = this._strokeWeight;
    const ew = this._ellipseWidth;
    const eh = this._ellipseHeight;
    const isRound = ew !== 0 || eh !== 0;
    if (sw > 0) {
      g.beginFill(this._fillColor, 0);
      g.lineStyle(sw, this._strokeColor, this._strokeAlpha);
      if (isRound) {
        g.drawRoundRect(sw / 2, sw / 2, unscaledWidth - sw, unscaledHeight - sw, ew, eh);
      } else {
        g.drawRect(sw / 2, sw / 2, unscaledWidth - sw, unscaledHeight - sw);
      }
      g.endFill();
    }
    g.beginFill(this._fillColor, this._fillAlpha);
    g.lineStyle(sw, this._strokeColor, 0);
    if (isRound) {
      g.drawRoundRect(sw, sw, unscaledWidth - sw * 2, unscaledHeight - sw * 2, ew, eh);
    } else {
      g.drawRect(sw, sw, unscaledWidth - sw * 2, unscaledHeight - sw * 2);
    }
    g.endFill();
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/Image.js
import { Event as Event9, Bitmap, BitmapFillMode } from "@blakron/core";
var Image = class extends Component {
  // ── Instance fields ───────────────────────────────────────────────────
  _source;
  _sourceChanged = false;
  _bitmap;
  _scale9Grid;
  _fillMode = BitmapFillMode.SCALE;
  _smoothing = true;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor(source) {
    super();
    if (source)
      this.source = source;
  }
  // ── Getters / Setters ─────────────────────────────────────────────────
  get source() {
    return this._source;
  }
  set source(value) {
    if (this._source === value)
      return;
    this._source = value;
    if (value && typeof value === "string") {
      this._sourceChanged = true;
      this.invalidateProperties();
    } else {
      this._applyTexture(value ?? void 0);
    }
  }
  get scale9Grid() {
    return this._scale9Grid;
  }
  set scale9Grid(value) {
    if (this._scale9Grid === value)
      return;
    this._scale9Grid = value;
    if (this._bitmap)
      this._bitmap.scale9Grid = value;
    this.invalidateDisplayList();
  }
  get fillMode() {
    return this._fillMode;
  }
  set fillMode(value) {
    if (this._fillMode === value)
      return;
    this._fillMode = value;
    if (this._bitmap)
      this._bitmap.fillMode = value;
    this.invalidateDisplayList();
  }
  get smoothing() {
    return this._smoothing;
  }
  set smoothing(value) {
    if (this._smoothing === value)
      return;
    this._smoothing = value;
    if (this._bitmap)
      this._bitmap.smoothing = value;
    this.invalidateDisplayList();
  }
  get bitmap() {
    return this._bitmap;
  }
  // ── Override methods ──────────────────────────────────────────────────
  commitProperties() {
    super.commitProperties();
    if (this._sourceChanged) {
      this._sourceChanged = false;
      this._parseSource();
    }
  }
  createChildren() {
    super.createChildren();
    if (this._sourceChanged) {
      this._sourceChanged = false;
      this._parseSource();
    }
  }
  measure() {
    const texture = this._bitmap?.texture;
    if (texture) {
      this.setMeasuredSize(texture.textureWidth, texture.textureHeight);
    } else {
      this.setMeasuredSize(0, 0);
    }
  }
  updateDisplayList(unscaledWidth, unscaledHeight) {
    super.updateDisplayList(unscaledWidth, unscaledHeight);
    if (this._bitmap) {
      this._bitmap.width = unscaledWidth;
      this._bitmap.height = unscaledHeight;
    }
  }
  // ── Private methods ───────────────────────────────────────────────────
  _parseSource() {
    const source = this._source;
    if (source && typeof source === "string") {
      const capturedSource = source;
      getAssetAdapter().getAsset(capturedSource, (content) => {
        if (this._source !== capturedSource)
          return;
        this._applyTexture(content ?? void 0);
        if (content) {
          this.dispatchEventWith(Event9.COMPLETE);
        }
      });
    } else {
      this._applyTexture(source ?? void 0);
    }
  }
  _applyTexture(texture) {
    if (!this._bitmap) {
      this._bitmap = new Bitmap();
      this._bitmap.smoothing = this._smoothing;
      this._bitmap.fillMode = this._fillMode;
      if (this._scale9Grid)
        this._bitmap.scale9Grid = this._scale9Grid;
      this.addChild(this._bitmap);
    }
    this._bitmap.texture = texture;
    this.invalidateSize();
    this.invalidateDisplayList();
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/Label.js
import { TextField } from "@blakron/core";
var Label = class extends Component {
  // ── Instance fields ───────────────────────────────────────────────────
  _textField;
  _widthConstraint = NaN;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor(text) {
    super();
    this._textField = new TextField();
    this.touchChildren = false;
    if (text)
      this.text = text;
  }
  // ── Getters / Setters ─────────────────────────────────────────────────
  get text() {
    return this._textField.text;
  }
  set text(value) {
    if (this._textField.text === value)
      return;
    this._textField.text = value;
    PropertyEvent.dispatchPropertyEvent(this, "text");
    this.invalidateSize();
    this.invalidateDisplayList();
  }
  get fontFamily() {
    return this._textField.fontFamily;
  }
  set fontFamily(value) {
    if (this._textField.fontFamily !== value) {
      this._textField.fontFamily = value;
      this.invalidateSize();
    }
  }
  get size() {
    return this._textField.size;
  }
  set size(value) {
    if (this._textField.size !== value) {
      this._textField.size = value;
      this.invalidateSize();
    }
  }
  get bold() {
    return this._textField.bold;
  }
  set bold(value) {
    if (this._textField.bold !== value) {
      this._textField.bold = value;
      this.invalidateSize();
    }
  }
  get italic() {
    return this._textField.italic;
  }
  set italic(value) {
    if (this._textField.italic !== value) {
      this._textField.italic = value;
      this.invalidateSize();
    }
  }
  get textColor() {
    return this._textField.textColor;
  }
  set textColor(value) {
    this._textField.textColor = value;
  }
  get strokeColor() {
    return this._textField.strokeColor;
  }
  set strokeColor(value) {
    this._textField.strokeColor = value;
  }
  get stroke() {
    return this._textField.stroke;
  }
  set stroke(value) {
    this._textField.stroke = value;
  }
  get textAlign() {
    return this._textField.textAlign;
  }
  set textAlign(value) {
    if (this._textField.textAlign !== value) {
      this._textField.textAlign = value;
      this.invalidateDisplayList();
    }
  }
  get verticalAlign() {
    return this._textField.verticalAlign;
  }
  set verticalAlign(value) {
    if (this._textField.verticalAlign !== value) {
      this._textField.verticalAlign = value;
      this.invalidateDisplayList();
    }
  }
  get multiline() {
    return this._textField.multiline;
  }
  set multiline(value) {
    if (this._textField.multiline !== value) {
      this._textField.multiline = value;
      this.invalidateSize();
    }
  }
  get wordWrap() {
    return this._textField.wordWrap;
  }
  set wordWrap(value) {
    if (this._textField.wordWrap !== value) {
      this._textField.wordWrap = value;
      this.invalidateSize();
    }
  }
  get lineSpacing() {
    return this._textField.lineSpacing;
  }
  set lineSpacing(value) {
    if (this._textField.lineSpacing !== value) {
      this._textField.lineSpacing = value;
      this.invalidateSize();
    }
  }
  get maxChars() {
    return this._textField.maxChars;
  }
  set maxChars(value) {
    this._textField.maxChars = value;
  }
  get displayAsPassword() {
    return this._textField.displayAsPassword;
  }
  set displayAsPassword(value) {
    this._textField.displayAsPassword = value;
  }
  // ── Override methods ──────────────────────────────────────────────────
  createChildren() {
    super.createChildren();
    this.addChild(this._textField);
  }
  measure() {
    const tf = this._textField;
    const oldWidth = tf.$explicitWidth;
    let availableWidth = NaN;
    if (!isNaN(this._widthConstraint)) {
      availableWidth = this._widthConstraint;
      this._widthConstraint = NaN;
    } else if (!isNaN(this.$explicitWidth)) {
      availableWidth = this.$explicitWidth;
    } else if (this.maxWidth !== 1e5) {
      availableWidth = this.maxWidth;
    }
    tf.width = availableWidth;
    this.setMeasuredSize(tf.textWidth, tf.textHeight);
    tf.width = oldWidth;
  }
  setLayoutBoundsSize(layoutWidth, layoutHeight) {
    super.setLayoutBoundsSize(layoutWidth, layoutHeight);
    if (isNaN(layoutWidth) || layoutWidth === this._widthConstraint || layoutWidth === 0) {
      this._widthConstraint = layoutWidth;
      return;
    }
    this._widthConstraint = layoutWidth;
    if (!isNaN(this.$explicitHeight))
      return;
    if (layoutWidth === this.measuredWidth)
      return;
    this.invalidateSize();
  }
  updateDisplayList(unscaledWidth, unscaledHeight) {
    super.updateDisplayList(unscaledWidth, unscaledHeight);
    this._textField.width = unscaledWidth;
    this._textField.height = unscaledHeight;
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/Button.js
import { Event as Event10, TouchEvent, DisplayObject } from "@blakron/core";
var Button = class extends Component {
  // ── Instance fields ───────────────────────────────────────────────────
  labelDisplay;
  iconDisplay;
  _label = "";
  _icon;
  _selected = false;
  _toggle = false;
  _touchCaptured = false;
  _touchStage;
  _stickyHighlighting = false;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor() {
    super();
    this.touchChildren = false;
    this.addEventListener(TouchEvent.TOUCH_BEGIN, this._onTouchBegin);
  }
  // ── Getters / Setters ─────────────────────────────────────────────────
  get label() {
    return this._label;
  }
  set label(value) {
    this._label = value;
    if (this.labelDisplay) {
      this.labelDisplay.text = value;
    }
  }
  get text() {
    return this._label;
  }
  get icon() {
    return this._icon;
  }
  set icon(value) {
    this._icon = value;
    if (this.iconDisplay) {
      this.iconDisplay.source = value;
    }
  }
  get selected() {
    return this._selected;
  }
  set selected(value) {
    if (this._selected === value)
      return;
    this._selected = value;
    PropertyEvent.dispatchPropertyEvent(this, "selected");
    this.invalidateState();
  }
  get toggle() {
    return this._toggle;
  }
  set toggle(value) {
    this._toggle = value;
  }
  get touchCaptured() {
    return this._touchCaptured;
  }
  get enabled() {
    return super.enabled;
  }
  set enabled(value) {
    if (this.enabled === value)
      return;
    super.enabled = value;
    this.invalidateState();
  }
  // ── Override methods ──────────────────────────────────────────────────
  partAdded(partName, instance) {
    super.partAdded(partName, instance);
    if (partName === "labelDisplay" && this.labelDisplay) {
      this.labelDisplay.text = this._label;
    } else if (partName === "iconDisplay" && this.iconDisplay) {
      this.iconDisplay.source = this._icon;
    }
  }
  $onRemoveFromStage() {
    this._cancelTouchCapture();
    super.$onRemoveFromStage();
  }
  /**
   * Return the current view state, layering the selected state on top of
   * the base up/down/disabled states.
   *
   * Matches egret `ToggleButton.getCurrentState` (L132-145): if the skin
   * does not export an `AndSelected` variant, the state falls back to `down`
   * (or `disabled`) instead of returning a skin-missing state name that
   * would leave the button visually blank.
   */
  getCurrentState() {
    let state;
    if (!this.enabled) {
      state = "disabled";
    } else if (this._touchCaptured || this._stickyHighlighting) {
      state = "down";
    } else {
      state = "up";
    }
    if (!this._selected)
      return state;
    const selectedState = state + "AndSelected";
    if (this.skin?.hasState(selectedState))
      return selectedState;
    return state === "disabled" ? "disabled" : "down";
  }
  // ── Protected methods ─────────────────────────────────────────────────
  /**
   * Called when the user taps the button (touch ends within the button bounds).
   * Subclasses should override this to perform the button action.
   * The base implementation handles toggle behavior.
   */
  buttonReleased() {
    if (this._toggle) {
      this.selected = !this.selected;
      this._stickyHighlighting = this._selected;
    } else {
      this.invalidateState();
    }
    this.dispatchEventWith(Event10.CHANGE);
  }
  // ── Private methods ───────────────────────────────────────────────────
  _onTouchBegin = (_e) => {
    if (!this.enabled)
      return;
    this._touchCaptured = true;
    this.invalidateState();
    const stage = this.stage;
    if (stage) {
      this._touchStage = stage;
      stage.addEventListener(TouchEvent.TOUCH_END, this._onStageTouchEnd);
      stage.addEventListener(TouchEvent.TOUCH_CANCEL, this._onTouchCancel);
    }
  };
  _onStageTouchEnd = (e) => {
    this._removeStageListeners();
    const target = e.target;
    if (target instanceof DisplayObject && this.contains(target)) {
      this.buttonReleased();
    }
    this._touchCaptured = false;
    this.invalidateState();
  };
  _onTouchCancel = (_e) => {
    this._cancelTouchCapture();
  };
  _removeStageListeners() {
    const stage = this._touchStage;
    if (!stage)
      return;
    stage.removeEventListener(TouchEvent.TOUCH_END, this._onStageTouchEnd);
    stage.removeEventListener(TouchEvent.TOUCH_CANCEL, this._onTouchCancel);
    this._touchStage = void 0;
  }
  _cancelTouchCapture() {
    this._removeStageListeners();
    this._touchCaptured = false;
    this.invalidateState();
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/ToggleButton.js
var ToggleButton = class extends Button {
  constructor() {
    super();
    this.toggle = true;
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/CheckBox.js
var CheckBox = class extends ToggleButton {
  constructor() {
    super();
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/RadioButton.js
import { EventDispatcher as EventDispatcher4, Event as Event11 } from "@blakron/core";
var RadioButtonGroup = class extends EventDispatcher4 {
  // ── Instance fields ───────────────────────────────────────────────────
  _radioButtons = [];
  _selectedValue;
  _selection;
  _name;
  _enabled = true;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor(name = "") {
    super();
    this._name = name;
  }
  // ── Getters / Setters ─────────────────────────────────────────────────
  get name() {
    return this._name;
  }
  get numRadioButtons() {
    return this._radioButtons.length;
  }
  /**
   * Whether the group (and therefore all its members) is enabled.
   * Toggling invalidates every member's state so skins re-render.
   */
  get enabled() {
    return this._enabled;
  }
  set enabled(value) {
    value = !!value;
    if (this._enabled === value)
      return;
    this._enabled = value;
    for (const rb of this._radioButtons) {
      rb.invalidateState();
    }
  }
  /**
   * The value of the selected radio. Falls back to the radio's `label`
   * when `value` is empty.
   */
  get selectedValue() {
    if (this._selection) {
      return this._selection.value !== "" ? this._selection.value : this._selection.label;
    }
    return this._selectedValue;
  }
  set selectedValue(value) {
    this._selectedValue = value;
    if (value === void 0) {
      this.$setSelection(void 0, false);
      return;
    }
    for (const rb of this._radioButtons) {
      if (rb.value === value || rb.label === value) {
        this.$setSelection(rb, false);
        this._selectedValue = void 0;
        PropertyEvent.dispatchPropertyEvent(this, "selectedValue");
        break;
      }
    }
  }
  get selection() {
    return this._selection;
  }
  set selection(value) {
    if (this._selection === value)
      return;
    this.$setSelection(value, false);
  }
  // ── Public methods ────────────────────────────────────────────────────
  addInstance(radioButton) {
    if (this._radioButtons.indexOf(radioButton) !== -1)
      return;
    this._radioButtons.push(radioButton);
    if (radioButton.selected) {
      this.$setSelection(radioButton, false);
    } else if (this._selectedValue !== void 0) {
      this.selectedValue = this._selectedValue;
    }
  }
  removeInstance(radioButton) {
    const idx = this._radioButtons.indexOf(radioButton);
    if (idx === -1)
      return;
    this._radioButtons.splice(idx, 1);
    if (this._selection === radioButton) {
      this._selection = void 0;
    }
  }
  /**
   * The single source of truth for changing the selection.
   *
   * @param value     The radio to select, or `undefined` to clear.
   * @param fireChange If `true`, dispatches `Event.CHANGE` — use `true` for
   *                   interactive changes (tap), `false` for programmatic ones.
   */
  $setSelection(value, fireChange) {
    if (this._selection === value)
      return false;
    if (value === void 0) {
      if (this._selection) {
        this._selection.$setSelected(false);
        this._selection = void 0;
        if (fireChange)
          this.dispatchEventWith(Event11.CHANGE);
      }
    } else {
      if (this._selection)
        this._selection.$setSelected(false);
      this._selection = value;
      this._selection.$setSelected(true);
      if (fireChange)
        this.dispatchEventWith(Event11.CHANGE);
    }
    PropertyEvent.dispatchPropertyEvent(this, "selectedValue");
    return true;
  }
};
var _groups = {};
function getGroup(name) {
  if (!_groups[name]) {
    _groups[name] = new RadioButtonGroup(name);
  }
  return _groups[name];
}
var RadioButton = class extends ToggleButton {
  // ── Instance fields ───────────────────────────────────────────────────
  _groupName = "";
  _group;
  _value = "";
  // ── Constructor ───────────────────────────────────────────────────────
  constructor() {
    super();
    this.groupName = "radioGroup";
  }
  // ── Getters / Setters ─────────────────────────────────────────────────
  /** Enabled only if both the radio itself and its group are enabled. */
  get enabled() {
    if (!super.enabled)
      return false;
    return !this._group || this._group.enabled;
  }
  set enabled(value) {
    super.enabled = value;
  }
  get group() {
    return this._group;
  }
  set group(value) {
    if (this._group === value)
      return;
    this._group?.removeInstance(this);
    this._group = value;
    this._group?.addInstance(this);
  }
  get groupName() {
    return this._groupName;
  }
  set groupName(value) {
    if (this._groupName === value)
      return;
    this._groupName = value;
    this.group = value ? getGroup(value) : void 0;
  }
  get value() {
    return this._value;
  }
  set value(val) {
    if (this._value === val)
      return;
    this._value = val;
    if (this.selected && this._group) {
      PropertyEvent.dispatchPropertyEvent(this._group, "selectedValue");
    }
  }
  get selected() {
    return super.selected;
  }
  /**
   * Keeps the group's selection in sync. Programmatic changes use
   * `fireChange=false` (no `Event.CHANGE`); interactive changes go through
   * `buttonReleased`, which dispatches `CHANGE` separately.
   */
  set selected(value) {
    if (this.selected === value)
      return;
    super.selected = value;
    if (!this._group)
      return;
    if (value) {
      this._group.$setSelection(this, false);
    } else if (this._group.selection === this) {
      this._group.$setSelection(void 0, false);
    }
  }
  /**
   * @internal Sets `selected` without triggering group sync.
   * Used by `RadioButtonGroup.$setSelection` to avoid recursion.
   */
  $setSelected(value) {
    super.selected = value;
  }
  /**
   * Interactive tap: toggle `selected` (syncs the group with no Change via
   * the setter), then dispatch `Event.CHANGE` on the group — reserved for
   * interaction, not programmatic selection.
   */
  buttonReleased() {
    if (!this.enabled || this.selected)
      return;
    if (!this._group) {
      super.buttonReleased();
      return;
    }
    super.buttonReleased();
    this._group.dispatchEventWith(Event11.CHANGE);
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/ProgressBar.js
import { Event as Event12, Rectangle as Rectangle8 } from "@blakron/core";

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/Animation.js
import { ticker, getTimer } from "@blakron/core";
var Animation = class {
  // ── Instance fields ───────────────────────────────────────────────────
  _updateFunction;
  _thisObject;
  _easerFunction = (f) => -(Math.cos(Math.PI * f) - 1) * 0.5;
  _isPlaying = false;
  _duration = 500;
  _currentValue = 0;
  _from = 0;
  _to = 0;
  _startTime = 0;
  _endFunction;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor(updateFunction, thisObject) {
    this._updateFunction = updateFunction;
    this._thisObject = thisObject;
  }
  // ── Getters / Setters ─────────────────────────────────────────────────
  get isPlaying() {
    return this._isPlaying;
  }
  get duration() {
    return this._duration;
  }
  set duration(value) {
    this._duration = value;
  }
  get currentValue() {
    return this._currentValue;
  }
  get from() {
    return this._from;
  }
  set from(value) {
    this._from = value;
  }
  get to() {
    return this._to;
  }
  set to(value) {
    this._to = value;
  }
  get endFunction() {
    return this._endFunction;
  }
  set endFunction(value) {
    this._endFunction = value;
  }
  get easerFunction() {
    return this._easerFunction;
  }
  set easerFunction(value) {
    this._easerFunction = value;
  }
  // ── Public methods ────────────────────────────────────────────────────
  play() {
    this.stop();
    this._start();
  }
  stop() {
    this._isPlaying = false;
    this._startTime = 0;
    ticker.stopTick(this._doInterval, this);
  }
  // ── Private methods ───────────────────────────────────────────────────
  _start() {
    this._isPlaying = false;
    this._currentValue = 0;
    this._startTime = getTimer();
    this._doInterval(this._startTime);
    ticker.startTick(this._doInterval, this);
  }
  _doInterval = (currentTime) => {
    const runningTime = currentTime - this._startTime;
    if (!this._isPlaying) {
      this._isPlaying = true;
    }
    const duration = this._duration;
    let fraction = duration === 0 ? 1 : Math.min(runningTime, duration) / duration;
    if (this._easerFunction) {
      fraction = this._easerFunction(fraction);
    }
    this._currentValue = this._from + (this._to - this._from) * fraction;
    this._updateFunction.call(this._thisObject, this);
    const isEnded = runningTime >= duration;
    if (isEnded) {
      this.stop();
    }
    if (isEnded && this._endFunction) {
      this._endFunction.call(this._thisObject, this);
    }
    return true;
  };
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/ProgressBar.js
var ProgressBar = class extends Component {
  // ── Instance fields ───────────────────────────────────────────────────
  thumb;
  labelDisplay;
  _minimum = 0;
  _maximum = 100;
  _value = 0;
  _direction = Direction.LTR;
  _labelFunction;
  _slideDuration = 500;
  _animationValue = 0;
  _animation;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor() {
    super();
    this._animation = new Animation(this._onAnimationUpdate, this);
  }
  // ── Getters / Setters ─────────────────────────────────────────────────
  get minimum() {
    return this._minimum;
  }
  set minimum(value) {
    if (this._minimum === value)
      return;
    this._minimum = value;
    if (this._value < value)
      this._value = value;
    this.invalidateDisplayList();
  }
  get maximum() {
    return this._maximum;
  }
  set maximum(value) {
    if (this._maximum === value)
      return;
    this._maximum = value;
    if (this._value > value)
      this._value = value;
    this.invalidateDisplayList();
  }
  get value() {
    return this._value;
  }
  set value(val) {
    val = Math.max(this._minimum, Math.min(this._maximum, val));
    if (this._value === val)
      return;
    if (this._slideDuration > 0 && this.stage) {
      this._startSlide(val);
    } else {
      this._applyValue(val);
      this.dispatchEventWith(Event12.CHANGE);
    }
  }
  _applyValue(val) {
    this._value = val;
    this._animationValue = val;
    this.invalidateDisplayList();
  }
  _startSlide(targetValue) {
    if (this._animation.isPlaying) {
      this._animation.stop();
    }
    const range = this._maximum - this._minimum;
    const distance = Math.abs(targetValue - this._animationValue);
    const duration = range > 0 ? this._slideDuration * (distance / range) : 0;
    this._animation.duration = duration === Infinity ? 0 : duration;
    this._animation.from = this._animationValue;
    this._animation.to = targetValue;
    this._animation.play();
  }
  _onAnimationUpdate = (_anim) => {
    this._animationValue = _anim.currentValue;
    this._value = _anim.currentValue;
    this.invalidateDisplayList();
  };
  get direction() {
    return this._direction;
  }
  set direction(value) {
    if (this._direction === value)
      return;
    this._direction = value;
    this.invalidateDisplayList();
  }
  get labelFunction() {
    return this._labelFunction;
  }
  set labelFunction(fn) {
    if (this._labelFunction === fn)
      return;
    this._labelFunction = fn;
    this.invalidateDisplayList();
  }
  /** Duration (ms) of the value-change slide animation. 0 = instant. @default 500 */
  get slideDuration() {
    return this._slideDuration;
  }
  set slideDuration(value) {
    value = +value || 0;
    if (this._slideDuration === value)
      return;
    this._slideDuration = value;
    if (this._animation.isPlaying) {
      this._animation.stop();
      this._applyValue(this._animation.to);
    }
  }
  get ratio() {
    const v = this._animation.isPlaying ? this._animationValue : this._value;
    const range = this._maximum - this._minimum;
    if (range <= 0)
      return 0;
    return (v - this._minimum) / range;
  }
  // ── Override methods ──────────────────────────────────────────────────
  updateDisplayList(unscaledWidth, unscaledHeight) {
    super.updateDisplayList(unscaledWidth, unscaledHeight);
    const thumb = this.thumb;
    if (thumb) {
      const thumbWidth = thumb.width;
      const thumbHeight = thumb.height;
      const r = this.ratio;
      let clipW = Math.round(r * thumbWidth);
      if (clipW < 0 || clipW === Infinity)
        clipW = 0;
      let clipH = Math.round(r * thumbHeight);
      if (clipH < 0 || clipH === Infinity)
        clipH = 0;
      const rect = thumb.scrollRect ?? new Rectangle8();
      switch (this._direction) {
        case Direction.RTL:
          rect.setTo(thumbWidth - clipW, 0, clipW, thumbHeight);
          thumb.x = thumbWidth - clipW;
          break;
        case Direction.TTB:
          rect.setTo(0, 0, thumbWidth, clipH);
          break;
        case Direction.BTT:
          rect.setTo(0, thumbHeight - clipH, thumbWidth, clipH);
          thumb.y = thumbHeight - clipH;
          break;
        default:
          rect.setTo(0, 0, clipW, thumbHeight);
          break;
      }
      thumb.scrollRect = rect;
    }
    if (this.labelDisplay) {
      const v = this._animation.isPlaying ? this._animationValue : this._value;
      this.labelDisplay.text = this._valueToLabel(v, this._maximum);
    }
  }
  // ── Protected methods ─────────────────────────────────────────────────
  /**
   * Converts the current value to display text.
   * Override this method to customize the label format.
   * The default format is `"value / maximum"`.
   */
  _valueToLabel(value, maximum) {
    if (this._labelFunction) {
      return this._labelFunction(value, maximum);
    }
    return value + " / " + maximum;
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/ViewStack.js
import { Event as Event13 } from "@blakron/core";
var ViewStack = class extends Group {
  // ── Instance fields ───────────────────────────────────────────────────
  _selectedIndex = -1;
  _selectedChild;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor() {
    super();
  }
  // ── Getters / Setters ─────────────────────────────────────────────────
  get selectedIndex() {
    return this._selectedIndex;
  }
  set selectedIndex(value) {
    value = +value | 0;
    if (this._selectedIndex === value)
      return;
    this._commitSelection(value);
    PropertyEvent.dispatchPropertyEvent(this, "selectedIndex");
    this.dispatchEventWith(Event13.CHANGE);
  }
  get selectedChild() {
    const index = this.selectedIndex;
    if (index >= 0 && index < this.numChildren)
      return this.getChildAt(index);
    return void 0;
  }
  set selectedChild(value) {
    if (!value) {
      this.selectedIndex = -1;
      return;
    }
    const index = this.getChildIndex(value);
    if (index >= 0 && index < this.numChildren) {
      this.selectedIndex = index;
    }
  }
  // ── ICollection implementation ────────────────────────────────────────
  /** The number of child views. */
  get length() {
    return this.numChildren;
  }
  /**
   * Returns the child's `name` at the given index (used by TabBar as tab label).
   */
  getItemAt(index) {
    const child = this.getChildAt(index);
    return child ? child.name : "";
  }
  /**
   * Returns the index of the child whose `name` matches the given item.
   */
  getItemIndex(item) {
    const name = String(item ?? "");
    for (let i = 0; i < this.numChildren; i++) {
      if (this.getChildAt(i)?.name === name)
        return i;
    }
    return -1;
  }
  // ── Override methods ──────────────────────────────────────────────────
  updateDisplayList(unscaledWidth, unscaledHeight) {
    super.updateDisplayList(unscaledWidth, unscaledHeight);
    if (this._selectedChild) {
      this._selectedChild.width = unscaledWidth;
      this._selectedChild.height = unscaledHeight;
    }
  }
  measure() {
    if (this._selectedChild) {
      this.setMeasuredSize(this._selectedChild.width, this._selectedChild.height);
    } else {
      this.setMeasuredSize(0, 0);
    }
  }
  childAdded(child, index) {
    super.childAdded(child, index);
    const displayChild = child;
    this._showOrHide(displayChild, false);
    if (this._selectedIndex === -1) {
      this._commitSelection(index);
    } else if (index <= this._selectedIndex) {
      this._selectedIndex++;
    }
    CollectionEvent.dispatchCollectionEvent(this, CollectionEventKind.ADD, index, -1, [displayChild.name]);
  }
  childRemoved(child, index) {
    super.childRemoved(child, index);
    const displayChild = child;
    this._showOrHide(displayChild, true);
    if (index === this._selectedIndex) {
      if (this.numChildren > 0) {
        this._commitSelection(0);
      } else {
        this._selectedChild = void 0;
        this._selectedIndex = -1;
      }
    } else if (index < this._selectedIndex) {
      this._selectedIndex--;
    } else {
      if (this._selectedChild === child) {
        this._selectedChild = void 0;
      }
    }
    this.invalidateSize();
    this.invalidateDisplayList();
    CollectionEvent.dispatchCollectionEvent(this, CollectionEventKind.REMOVE, index, -1, [displayChild.name]);
  }
  // ── Private methods ───────────────────────────────────────────────────
  _commitSelection(newIndex) {
    if (newIndex >= 0 && newIndex < this.numChildren) {
      this._selectedIndex = newIndex;
      if (this._selectedChild) {
        this._showOrHide(this._selectedChild, false);
      }
      this._selectedChild = this.getChildAt(newIndex);
      if (this._selectedChild) {
        this._showOrHide(this._selectedChild, true);
      }
    } else {
      if (this._selectedChild) {
        this._showOrHide(this._selectedChild, false);
      }
      this._selectedChild = void 0;
      this._selectedIndex = -1;
    }
    this.invalidateSize();
    this.invalidateDisplayList();
  }
  _showOrHide(child, visible) {
    child.visible = visible;
    if (isUIComponent(child)) {
      child.includeInLayout = visible;
    }
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/Skin.js
import { EventDispatcher as EventDispatcher5, Event as Event14 } from "@blakron/core";
var Skin = class extends EventDispatcher5 {
  // ── Instance fields ───────────────────────────────────────────────────
  skinParts = [];
  width = NaN;
  height = NaN;
  minWidth = 0;
  maxWidth = 1e5;
  minHeight = 0;
  maxHeight = 1e5;
  states = [];
  /**
   * Watchers created by EXML bindings (e.g. `{data}`). The runtime appends
   * every {@link Watcher} instance created by the skin factory so they can
   * be unwound together via {@link unwatchAll} when the skin is replaced.
   */
  $watchers = [];
  _elementsContent = [];
  _hostComponent;
  _currentState = "";
  _stateInitialized = false;
  // ── Getters / Setters ─────────────────────────────────────────────────
  get elementsContent() {
    return this._elementsContent;
  }
  set elementsContent(value) {
    this._elementsContent = value ?? [];
  }
  get hostComponent() {
    return this._hostComponent;
  }
  set hostComponent(value) {
    if (this._hostComponent === value)
      return;
    if (this._hostComponent) {
      this._hostComponent.removeEventListener(Event14.ADDED_TO_STAGE, this._onHostAddedToStage);
    }
    this._hostComponent = value;
    if (value) {
      this._commitCurrentState();
      if (!this._stateInitialized) {
        if (value.stage) {
          this._initializeStates();
        } else {
          value.once(Event14.ADDED_TO_STAGE, this._onHostAddedToStage);
        }
      }
    }
    PropertyEvent.dispatchPropertyEvent(this, "hostComponent");
  }
  get currentState() {
    return this._currentState;
  }
  set currentState(value) {
    if (this._currentState === value)
      return;
    const old = this._currentState;
    this._currentState = value;
    this._applyState(old, value);
  }
  // ── Public methods ────────────────────────────────────────────────────
  /**
   * Get a skin part by name. Used by Component to bind parts.
   */
  getPart(name) {
    return this[name];
  }
  /**
   * Unwatch every binding created from this skin.
   * Called by the host component when the skin is detached or replaced
   * so stale watchers don't leak or fire on the wrong host.
   */
  unwatchAll() {
    if (this.$watchers && this.$watchers.length > 0) {
      for (const watcher of this.$watchers) {
        watcher.unwatch();
      }
      this.$watchers.length = 0;
    }
  }
  hasState(stateName) {
    return this.states.some((s) => s.name === stateName);
  }
  // ── Private methods ───────────────────────────────────────────────────
  _onHostAddedToStage = () => {
    this._initializeStates();
  };
  _initializeStates() {
    if (this._stateInitialized)
      return;
    this._stateInitialized = true;
    this._applyState("", this._currentState);
  }
  _commitCurrentState() {
    if (!this._stateInitialized)
      return;
    this._applyState("", this._currentState);
  }
  _applyState(fromState, toState) {
    if (!this.states || this.states.length === 0)
      return;
    const oldState = this.states.find((s) => s.name === fromState);
    if (oldState) {
      for (const override of oldState.overrides) {
        override.remove(this._hostComponent, this);
      }
    }
    const newState = this.states.find((s) => s.name === toState);
    if (newState) {
      for (const override of newState.overrides) {
        override.apply(this._hostComponent, this);
      }
    }
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/TouchScroll.js
import { ticker as ticker2, getTimer as getTimer2 } from "@blakron/core";
var MAX_VELOCITY_COUNT = 4;
function easeOut(ratio) {
  const inv = ratio - 1;
  return inv * inv * inv + 1;
}
var TouchScroll = class {
  // ── Instance fields ───────────────────────────────────────────────────
  scrollFactor = 1;
  bounces = true;
  _updateFunction;
  _endFunction;
  _animation;
  _previousTime = 0;
  _velocity = 0;
  _previousVelocity = [];
  _currentPosition = 0;
  _previousPosition = 0;
  _currentScrollPos = 0;
  _maxScrollPos = 0;
  _offsetPoint = 0;
  _started = false;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor(updateFunction, endFunction) {
    this._updateFunction = updateFunction;
    this._endFunction = endFunction;
    this._animation = new Animation(this._onScrollingUpdate, this);
    this._animation.easerFunction = easeOut;
  }
  // ── Public methods ────────────────────────────────────────────────────
  isPlaying() {
    return this._animation.isPlaying;
  }
  stop() {
    this._animation.stop();
    ticker2.stopTick(this._onTick, this);
    this._started = false;
  }
  isStarted() {
    return this._started;
  }
  start(touchPoint) {
    this._started = true;
    this._velocity = 0;
    this._previousVelocity.length = 0;
    this._previousTime = getTimer2();
    this._previousPosition = this._currentPosition = touchPoint;
    this._offsetPoint = touchPoint;
    ticker2.startTick(this._onTick, this);
  }
  update(touchPoint, maxScrollValue, scrollValue) {
    maxScrollValue = Math.max(maxScrollValue, 0);
    this._currentPosition = touchPoint;
    this._maxScrollPos = maxScrollValue;
    const disMove = this._offsetPoint - touchPoint;
    let scrollPos = disMove + scrollValue;
    this._offsetPoint = touchPoint;
    if (scrollPos < 0) {
      if (!this.bounces) {
        scrollPos = 0;
      } else {
        scrollPos -= disMove * 0.5;
      }
    }
    if (scrollPos > maxScrollValue) {
      if (!this.bounces) {
        scrollPos = maxScrollValue;
      } else {
        scrollPos -= disMove * 0.5;
      }
    }
    this._currentScrollPos = scrollPos;
    this._updateFunction(scrollPos);
  }
  finish(currentScrollPos, maxScrollPos) {
    ticker2.stopTick(this._onTick, this);
    this._started = false;
    if (currentScrollPos < 0 || currentScrollPos > maxScrollPos) {
      const posTo = Math.max(0, Math.min(maxScrollPos, currentScrollPos));
      this._throwTo(posTo, 300);
    } else {
      this._endFunction();
    }
  }
  // ── Private methods ───────────────────────────────────────────────────
  _onTick = (timeStamp) => {
    const timeOffset = timeStamp - this._previousTime;
    if (timeOffset > 10) {
      const pv = this._previousVelocity;
      if (pv.length >= MAX_VELOCITY_COUNT) {
        pv.shift();
      }
      this._velocity = (this._currentPosition - this._previousPosition) / timeOffset;
      pv.push(this._velocity);
      this._previousTime = timeStamp;
      this._previousPosition = this._currentPosition;
    }
    return true;
  };
  _throwTo(posTo, duration = 300) {
    const hsp = this._currentScrollPos;
    if (Math.abs(hsp - posTo) < 0.5) {
      this._endFunction();
      return;
    }
    const anim = this._animation;
    anim.duration = duration;
    anim.from = hsp;
    anim.to = posTo;
    anim.play();
  }
  _onScrollingUpdate(animation) {
    this._currentScrollPos = animation.currentValue;
    this._updateFunction(animation.currentValue);
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/Range.js
var Range = class extends Component {
  // ── Instance fields ───────────────────────────────────────────────────
  _maximum = 100;
  _maxChanged = false;
  _minimum = 0;
  _minChanged = false;
  _value = 0;
  _changedValue = 0;
  _valueChanged = false;
  _snapInterval = 1;
  _snapIntervalChanged = false;
  _explicitSnapInterval = false;
  // ── Getters / Setters ─────────────────────────────────────────────────
  get maximum() {
    return this._maximum;
  }
  set maximum(value) {
    value = +value || 0;
    if (this._maximum === value)
      return;
    this._maximum = value;
    this._maxChanged = true;
    this.invalidateProperties();
    this.invalidateDisplayList();
  }
  get minimum() {
    return this._minimum;
  }
  set minimum(value) {
    value = +value || 0;
    if (this._minimum === value)
      return;
    this._minimum = value;
    this._minChanged = true;
    this.invalidateProperties();
    this.invalidateDisplayList();
  }
  get value() {
    return this._valueChanged ? this._changedValue : this._value;
  }
  set value(newValue) {
    newValue = +newValue || 0;
    this.setValuePending(newValue);
  }
  get snapInterval() {
    return this._snapInterval;
  }
  set snapInterval(value) {
    this._explicitSnapInterval = true;
    value = +value || 0;
    if (value === this._snapInterval)
      return;
    if (isNaN(value)) {
      this._snapInterval = 1;
      this._explicitSnapInterval = false;
    } else {
      this._snapInterval = value;
    }
    this._snapIntervalChanged = true;
    this.invalidateProperties();
  }
  // ── Override methods ──────────────────────────────────────────────────
  commitProperties() {
    super.commitProperties();
    if (this._minimum > this._maximum) {
      if (!this._maxChanged) {
        this._minimum = this._maximum;
      } else {
        this._maximum = this._minimum;
      }
    }
    if (this._valueChanged || this._maxChanged || this._minChanged || this._snapIntervalChanged) {
      const currentValue = this._valueChanged ? this._changedValue : this._value;
      this._valueChanged = false;
      this._maxChanged = false;
      this._minChanged = false;
      this._snapIntervalChanged = false;
      this.setValue(this.nearestValidValue(currentValue, this._snapInterval));
    }
  }
  updateDisplayList(w, h) {
    super.updateDisplayList(w, h);
    this.updateSkinDisplayList();
  }
  // ── Protected methods ─────────────────────────────────────────────────
  setValuePending(newValue) {
    if (newValue === this.value)
      return false;
    this._changedValue = newValue;
    this._valueChanged = true;
    this.invalidateProperties();
    return true;
  }
  /**
   * Returns the closest valid value to `value` that is between minimum and maximum
   * and snaps to multiples of `interval`.
   */
  nearestValidValue(value, interval) {
    if (interval === 0) {
      return Math.max(this._minimum, Math.min(this._maximum, value));
    }
    const maxValue = this._maximum - this._minimum;
    let scale = 1;
    value -= this._minimum;
    if (interval !== Math.round(interval)) {
      const parts = (1 + interval).toString().split(".");
      scale = Math.pow(10, parts[1].length);
      value = Math.round(value * scale);
      interval = Math.round(interval * scale);
    }
    const lower = Math.max(0, Math.floor(value / interval) * interval);
    const upper = Math.min(maxValue * scale, Math.floor((value + interval) / interval) * interval);
    const validValue = value - lower >= (upper - lower) / 2 ? upper : lower;
    return validValue / scale + this._minimum;
  }
  setValue(value) {
    if (this._value === value)
      return;
    if (this._maximum > this._minimum) {
      this._value = Math.min(this._maximum, Math.max(this._minimum, value));
    } else {
      this._value = value;
    }
    this._valueChanged = false;
    this.invalidateDisplayList();
    PropertyEvent.dispatchPropertyEvent(this, "value");
  }
  /**
   * Override to update skin parts based on minimum, maximum, and value.
   */
  updateSkinDisplayList() {
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/ScrollBarBase.js
import { Event as Event15 } from "@blakron/core";
var ScrollBarBase = class extends Component {
  // ── Instance fields ───────────────────────────────────────────────────
  thumb;
  autoVisibility = true;
  _viewport;
  // ── Getters / Setters ─────────────────────────────────────────────────
  get viewport() {
    return this._viewport;
  }
  set viewport(value) {
    if (value === this._viewport)
      return;
    const vp = this._viewport;
    if (vp) {
      vp.removeEventListener(PropertyEvent.PROPERTY_CHANGE, this._onPropChange);
      vp.removeEventListener(Event15.RESIZE, this._onResize);
    }
    this._viewport = value;
    if (value) {
      value.addEventListener(PropertyEvent.PROPERTY_CHANGE, this._onPropChange);
      value.addEventListener(Event15.RESIZE, this._onResize);
    }
    this.invalidateDisplayList();
  }
  // ── Protected methods ─────────────────────────────────────────────────
  /**
   * Called when viewport properties (scrollH, scrollV, contentWidth, etc.) change.
   * Override in subclasses to react.
   */
  onPropertyChanged(_event) {
  }
  // ── Private methods ───────────────────────────────────────────────────
  _onPropChange = (e) => {
    this.onPropertyChanged(e);
  };
  _onResize = (_e) => {
    this.invalidateDisplayList();
  };
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/HScrollBar.js
import { Rectangle as Rectangle9 } from "@blakron/core";
var HScrollBar = class extends ScrollBarBase {
  // ── Override methods ──────────────────────────────────────────────────
  updateDisplayList(unscaledWidth, unscaledHeight) {
    super.updateDisplayList(unscaledWidth, unscaledHeight);
    const thumb = this.thumb;
    const viewport = this.viewport;
    if (!thumb || !viewport)
      return;
    const bounds = new Rectangle9();
    thumb.getPreferredBounds(bounds);
    const minThumbWidth = bounds.width;
    const thumbY = bounds.y;
    const hsp = viewport.scrollH;
    const contentWidth = viewport.contentWidth;
    const vpBounds2 = new Rectangle9();
    viewport.getLayoutBounds(vpBounds2);
    const vpWidth = vpBounds2.width;
    const proportionalWidth = contentWidth > 0 ? Math.round(unscaledWidth * vpWidth / contentWidth) : unscaledWidth;
    const thumbWidth = Math.min(unscaledWidth, Math.max(minThumbWidth, proportionalWidth));
    if (hsp <= 0) {
      let scaleWidth = thumbWidth * (1 - -hsp / (vpWidth * 0.5));
      scaleWidth = Math.max(5, Math.round(scaleWidth));
      thumb.setLayoutBoundsSize(scaleWidth, NaN);
      thumb.setLayoutBoundsPosition(0, thumbY);
    } else if (hsp >= contentWidth - vpWidth) {
      let scaleWidth = thumbWidth * (1 - (hsp - contentWidth + vpWidth) / (vpWidth * 0.5));
      scaleWidth = Math.max(5, Math.round(scaleWidth));
      thumb.setLayoutBoundsSize(scaleWidth, NaN);
      thumb.setLayoutBoundsPosition(unscaledWidth - scaleWidth, thumbY);
    } else {
      const thumbX = (unscaledWidth - thumbWidth) * hsp / (contentWidth - vpWidth);
      thumb.setLayoutBoundsSize(thumbWidth, NaN);
      thumb.setLayoutBoundsPosition(thumbX, thumbY);
    }
  }
  onPropertyChanged(event) {
    switch (event.property) {
      case "scrollH":
      case "contentWidth":
        this.invalidateDisplayList();
        break;
    }
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/VScrollBar.js
import { Rectangle as Rectangle10 } from "@blakron/core";
var VScrollBar = class extends ScrollBarBase {
  // ── Override methods ──────────────────────────────────────────────────
  updateDisplayList(unscaledWidth, unscaledHeight) {
    super.updateDisplayList(unscaledWidth, unscaledHeight);
    const thumb = this.thumb;
    const viewport = this.viewport;
    if (!thumb || !viewport)
      return;
    const bounds = new Rectangle10();
    thumb.getPreferredBounds(bounds);
    const minThumbHeight = bounds.height;
    const thumbX = bounds.x;
    const vsp = viewport.scrollV;
    const contentHeight = viewport.contentHeight;
    const vpBounds2 = new Rectangle10();
    viewport.getLayoutBounds(vpBounds2);
    const vpHeight = vpBounds2.height;
    const proportionalHeight = contentHeight > 0 ? Math.round(unscaledHeight * vpHeight / contentHeight) : unscaledHeight;
    const thumbHeight = Math.min(unscaledHeight, Math.max(minThumbHeight, proportionalHeight));
    if (vsp <= 0) {
      let scaleHeight = thumbHeight * (1 - -vsp / (vpHeight * 0.5));
      scaleHeight = Math.max(5, Math.round(scaleHeight));
      thumb.setLayoutBoundsSize(NaN, scaleHeight);
      thumb.setLayoutBoundsPosition(thumbX, 0);
    } else if (vsp >= contentHeight - vpHeight) {
      let scaleHeight = thumbHeight * (1 - (vsp - contentHeight + vpHeight) / (vpHeight * 0.5));
      scaleHeight = Math.max(5, Math.round(scaleHeight));
      thumb.setLayoutBoundsSize(NaN, scaleHeight);
      thumb.setLayoutBoundsPosition(thumbX, unscaledHeight - scaleHeight);
    } else {
      const thumbY = (unscaledHeight - thumbHeight) * vsp / (contentHeight - vpHeight);
      thumb.setLayoutBoundsSize(NaN, thumbHeight);
      thumb.setLayoutBoundsPosition(thumbX, thumbY);
    }
  }
  onPropertyChanged(event) {
    switch (event.property) {
      case "scrollV":
      case "contentHeight":
        this.invalidateDisplayList();
        break;
    }
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/Scroller.js
import { TouchEvent as TouchEvent2, Rectangle as Rectangle11 } from "@blakron/core";
var vpBounds = new Rectangle11();
var Scroller = class _Scroller extends Component {
  // ── Static fields ─────────────────────────────────────────────────────
  static DEFAULT_THRESHOLD = 8;
  // ── Instance fields ───────────────────────────────────────────────────
  horizontalScrollBar;
  verticalScrollBar;
  scrollFactor = 1;
  bounces = true;
  _viewport;
  _horizontalScrollPolicy = ScrollPolicy.AUTO;
  _verticalScrollPolicy = ScrollPolicy.AUTO;
  _hScroll;
  _vScroll;
  _touchPointID = -1;
  _touchStage;
  _startTouchPointX = 0;
  _startTouchPointY = 0;
  _touchMoved = false;
  _touchCancelled = false;
  /**
   * Whether a CHANGE_START event has been dispatched for the current
   * scroll gesture (egret parity). Cleared when CHANGE_END fires.
   */
  _changeStartDispatched = false;
  /**
   * Timer ID for the 200 ms auto-hide timeout on the scroll bars.
   * Matches egret's {@code autoHideTimer} (a {@code egret.Timer(200, 1)}).
   */
  _autoHideTimer;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor() {
    super();
    this._hScroll = new TouchScroll(this.onHScrollUpdate, this.onHScrollEnd);
    this._vScroll = new TouchScroll(this.onVScrollUpdate, this.onVScrollEnd);
    this.touchChildren = true;
  }
  // ── Getters / Setters ─────────────────────────────────────────────────
  get viewport() {
    return this._viewport;
  }
  set viewport(value) {
    if (value === this._viewport)
      return;
    const old = this._viewport;
    if (old) {
      this._removeStageTouchListeners();
      this._hScroll.stop();
      this._vScroll.stop();
      this._touchPointID = -1;
      if (this.horizontalScrollBar)
        this.horizontalScrollBar.viewport = void 0;
      if (this.verticalScrollBar)
        this.verticalScrollBar.viewport = void 0;
      old.removeEventListener(PropertyEvent.PROPERTY_CHANGE, this._onViewportPropChange);
      old.removeEventListener(TouchEvent2.TOUCH_BEGIN, this._onTouchBeginCapture, true);
      old.removeEventListener(TouchEvent2.TOUCH_END, this._onTouchEndCapture, true);
      old.removeEventListener(TouchEvent2.TOUCH_TAP, this._onTouchTapCapture, true);
      old.scrollEnabled = false;
      const oldDisplay = old;
      if (oldDisplay.parent === this)
        this.removeChild(oldDisplay);
    }
    this._viewport = value;
    if (value) {
      this.addChildAt(value, 0);
      value.addEventListener(PropertyEvent.PROPERTY_CHANGE, this._onViewportPropChange);
      value.addEventListener(TouchEvent2.TOUCH_BEGIN, this._onTouchBeginCapture, true);
      value.addEventListener(TouchEvent2.TOUCH_END, this._onTouchEndCapture, true);
      value.addEventListener(TouchEvent2.TOUCH_TAP, this._onTouchTapCapture, true);
      value.scrollEnabled = true;
    }
    if (this.horizontalScrollBar)
      this.horizontalScrollBar.viewport = value;
    if (this.verticalScrollBar)
      this.verticalScrollBar.viewport = value;
    this.invalidateDisplayList();
  }
  get horizontalScrollPolicy() {
    return this._horizontalScrollPolicy;
  }
  set horizontalScrollPolicy(value) {
    if (this._horizontalScrollPolicy === value)
      return;
    this._horizontalScrollPolicy = value;
    this.invalidateDisplayList();
  }
  get verticalScrollPolicy() {
    return this._verticalScrollPolicy;
  }
  set verticalScrollPolicy(value) {
    if (this._verticalScrollPolicy === value)
      return;
    this._verticalScrollPolicy = value;
    this.invalidateDisplayList();
  }
  /**
   * Speed multiplier for scroll throw animation (egret parity).
   * Delegates to the underlying {@link TouchScroll} instances.
   * @default 1.0
   */
  get throwSpeed() {
    return this._hScroll.scrollFactor;
  }
  set throwSpeed(val) {
    val = +val;
    if (val < 0)
      val = 0;
    this._hScroll.scrollFactor = val;
    this._vScroll.scrollFactor = val;
    this.scrollFactor = val;
  }
  // ── Override methods ──────────────────────────────────────────────────
  partAdded(partName, instance) {
    super.partAdded(partName, instance);
    if (instance instanceof HScrollBar && partName === "horizontalScrollBar") {
      this.horizontalScrollBar = instance;
      instance.touchChildren = false;
      instance.touchEnabled = false;
      instance.viewport = this._viewport;
      if (instance.autoVisibility)
        instance.visible = false;
    } else if (instance instanceof VScrollBar && partName === "verticalScrollBar") {
      this.verticalScrollBar = instance;
      instance.touchChildren = false;
      instance.touchEnabled = false;
      instance.viewport = this._viewport;
      if (instance.autoVisibility)
        instance.visible = false;
    }
  }
  partRemoved(partName, instance) {
    super.partRemoved(partName, instance);
    if (partName === "horizontalScrollBar") {
      if (instance instanceof HScrollBar)
        instance.viewport = void 0;
      this.horizontalScrollBar = void 0;
    } else if (partName === "verticalScrollBar") {
      if (instance instanceof VScrollBar)
        instance.viewport = void 0;
      this.verticalScrollBar = void 0;
    }
  }
  updateDisplayList(unscaledWidth, unscaledHeight) {
    super.updateDisplayList(unscaledWidth, unscaledHeight);
    const vp = this._viewport;
    if (vp && isUIComponent(vp)) {
      vp.setLayoutBoundsSize(unscaledWidth, unscaledHeight);
      vp.setLayoutBoundsPosition(0, 0);
    }
    this._updateScrollBarVisibility();
  }
  setSkin(skin) {
    super.setSkin(skin);
    const vp = this._viewport;
    if (vp) {
      this.addChildAt(vp, 0);
    }
  }
  $onRemoveFromStage() {
    this._removeStageTouchListeners();
    this._hScroll.stop();
    this._vScroll.stop();
    this._touchPointID = -1;
    this._clearAutoHideTimer();
    super.$onRemoveFromStage();
  }
  // ── Private methods ───────────────────────────────────────────────────
  _updateScrollBarVisibility() {
    const vp = this._viewport;
    if (!vp)
      return;
    const b = vpBounds;
    vp.getLayoutBounds(b);
    const vpWidth = b.width;
    const vpHeight = b.height;
    const hsb = this.horizontalScrollBar;
    if (hsb) {
      const maxScrollH = Math.max(0, vp.contentWidth - vpWidth);
      const canScrollH = maxScrollH > 0;
      const policy = this._horizontalScrollPolicy;
      if (policy === ScrollPolicy.ON) {
        hsb.visible = true;
      } else if (policy === ScrollPolicy.OFF) {
        hsb.visible = false;
      } else {
        hsb.visible = canScrollH;
      }
    }
    const vsb = this.verticalScrollBar;
    if (vsb) {
      const maxScrollV = Math.max(0, vp.contentHeight - vpHeight);
      const canScrollV = maxScrollV > 0;
      const policy = this._verticalScrollPolicy;
      if (policy === ScrollPolicy.ON) {
        vsb.visible = true;
      } else if (policy === ScrollPolicy.OFF) {
        vsb.visible = false;
      } else {
        vsb.visible = canScrollV;
      }
    }
  }
  _onViewportPropChange = (e) => {
    const pe = e;
    switch (pe.property) {
      case "contentWidth":
      case "contentHeight":
        this._updateScrollBarVisibility();
        break;
    }
  };
  _onTouchBeginCapture = (e) => {
    if (!this._canScroll())
      return;
    this._touchCancelled = false;
    this._touchMoved = false;
    this._onTouchBegin(e);
  };
  _onTouchEndCapture = (e) => {
    if (this._touchCancelled) {
      e.stopPropagation();
    }
  };
  _onTouchTapCapture = (e) => {
    if (this._touchCancelled) {
      e.stopPropagation();
    }
  };
  _canScroll() {
    const vp = this._viewport;
    if (!vp)
      return false;
    const b = vpBounds;
    vp.getLayoutBounds(b);
    return vp.contentWidth > b.width || vp.contentHeight > b.height;
  }
  _onTouchBegin = (e) => {
    const te = e;
    if (this._touchPointID !== -1)
      return;
    const vp = this._viewport;
    if (!vp)
      return;
    this._touchPointID = te.touchPointID;
    this._startTouchPointX = te.stageX;
    this._startTouchPointY = te.stageY;
    this._hScroll.stop();
    this._vScroll.stop();
    this._clearAutoHideTimer();
    this._updateScrollBarVisibility();
    const stage = this.stage;
    if (stage) {
      this._touchStage = stage;
      stage.addEventListener(TouchEvent2.TOUCH_MOVE, this._onTouchMove);
      stage.addEventListener(TouchEvent2.TOUCH_END, this._onTouchEnd);
      stage.addEventListener(TouchEvent2.TOUCH_CANCEL, this._onTouchEnd);
    }
  };
  _removeStageTouchListeners() {
    const stage = this._touchStage;
    if (stage) {
      stage.removeEventListener(TouchEvent2.TOUCH_MOVE, this._onTouchMove);
      stage.removeEventListener(TouchEvent2.TOUCH_END, this._onTouchEnd);
      stage.removeEventListener(TouchEvent2.TOUCH_CANCEL, this._onTouchEnd);
    }
    this._touchStage = void 0;
  }
  _onTouchMove = (e) => {
    if (e.touchPointID !== this._touchPointID)
      return;
    const vp = this._viewport;
    if (!vp)
      return;
    const moveX = this._startTouchPointX - e.stageX;
    const moveY = this._startTouchPointY - e.stageY;
    if (!this._hScroll.isStarted() && !this._vScroll.isStarted()) {
      if (Math.abs(moveX) < _Scroller.DEFAULT_THRESHOLD && Math.abs(moveY) < _Scroller.DEFAULT_THRESHOLD) {
        return;
      }
      this._touchCancelled = true;
      this._touchMoved = true;
      if (!this._changeStartDispatched) {
        this._changeStartDispatched = true;
        UIEvent.dispatchUIEvent(this, UIEvent.CHANGE_START);
      }
      const tb = vpBounds;
      vp.getLayoutBounds(tb);
      const maxH = Math.max(0, vp.contentWidth - tb.width);
      const maxV = Math.max(0, vp.contentHeight - tb.height);
      if (maxH > 0 && Math.abs(moveX) >= Math.abs(moveY)) {
        this._hScroll.scrollFactor = this.scrollFactor;
        this._hScroll.bounces = this.bounces;
        this._hScroll.start(e.stageX);
      }
      if (maxV > 0 && Math.abs(moveY) >= Math.abs(moveX)) {
        this._vScroll.scrollFactor = this.scrollFactor;
        this._vScroll.bounces = this.bounces;
        this._vScroll.start(e.stageY);
      }
    }
    if (this._hScroll.isStarted()) {
      const b = vpBounds;
      vp.getLayoutBounds(b);
      this._hScroll.update(e.stageX, Math.max(0, vp.contentWidth - b.width), vp.scrollH);
    }
    if (this._vScroll.isStarted()) {
      const b = vpBounds;
      vp.getLayoutBounds(b);
      this._vScroll.update(e.stageY, Math.max(0, vp.contentHeight - b.height), vp.scrollV);
    }
  };
  _onTouchEnd = (e) => {
    if (e.touchPointID !== this._touchPointID)
      return;
    this._touchPointID = -1;
    this._removeStageTouchListeners();
    const vp = this._viewport;
    if (!vp)
      return;
    if (this._hScroll.isStarted()) {
      const b = vpBounds;
      vp.getLayoutBounds(b);
      this._hScroll.finish(vp.scrollH, Math.max(0, vp.contentWidth - b.width));
    }
    if (this._vScroll.isStarted()) {
      const b = vpBounds;
      vp.getLayoutBounds(b);
      this._vScroll.finish(vp.scrollV, Math.max(0, vp.contentHeight - b.height));
    }
  };
  onHScrollUpdate = (scrollPos) => {
    const vp = this._viewport;
    if (vp)
      vp.scrollH = scrollPos;
  };
  onVScrollUpdate = (scrollPos) => {
    const vp = this._viewport;
    if (vp)
      vp.scrollV = scrollPos;
  };
  /**
   * Called when a scroll throw animation ends (egret parity).
   * Dispatches CHANGE_END when both horizontal and vertical animations
   * have stopped, and starts the auto-hide timer for the scroll bars.
   */
  onHScrollEnd = () => {
    if (!this._vScroll.isStarted())
      this._onChangeEnd();
  };
  onVScrollEnd = () => {
    if (!this._hScroll.isStarted())
      this._onChangeEnd();
  };
  _onChangeEnd() {
    this._changeStartDispatched = false;
    this._scheduleAutoHide();
    UIEvent.dispatchUIEvent(this, UIEvent.CHANGE_END);
  }
  // ── Auto-hide scroll bars (egret parity) ─────────────────────────
  _scheduleAutoHide() {
    this._clearAutoHideTimer();
    this._autoHideTimer = setTimeout(() => {
      this._autoHideTimer = void 0;
      if (this.horizontalScrollBar?.autoVisibility)
        this.horizontalScrollBar.visible = false;
      if (this.verticalScrollBar?.autoVisibility)
        this.verticalScrollBar.visible = false;
    }, 200);
  }
  _clearAutoHideTimer() {
    if (this._autoHideTimer !== void 0) {
      clearTimeout(this._autoHideTimer);
      this._autoHideTimer = void 0;
    }
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/ItemRenderer.js
import { TouchEvent as TouchEvent3 } from "@blakron/core";
var ItemRenderer = class extends Component {
  // ── Instance fields ───────────────────────────────────────────────────
  itemIndex = -1;
  _data;
  _selected = false;
  _touchCaptured = false;
  _touchStage;
  /**
   * Skin part: the label. When present, `data` is auto-synced to its `text`
   * (fallback for when the EXML `{data}` binding isn't compiled in).
   */
  labelDisplay;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor() {
    super();
    this.addEventListener(TouchEvent3.TOUCH_BEGIN, this._onTouchBegin);
  }
  // ── Getters / Setters ─────────────────────────────────────────────────
  get data() {
    return this._data;
  }
  set data(value) {
    if (this._data === value)
      return;
    this._data = value;
    PropertyEvent.dispatchPropertyEvent(this, "data");
    this.dataChanged();
  }
  get selected() {
    return this._selected;
  }
  set selected(value) {
    if (this._selected === value)
      return;
    this._selected = value;
    this.invalidateState();
  }
  // ── Override methods ──────────────────────────────────────────────────
  partAdded(partName, instance) {
    super.partAdded(partName, instance);
    if (partName === "labelDisplay" && instance instanceof Label) {
      this.labelDisplay = instance;
      this._syncLabel();
    }
  }
  partRemoved(partName, instance) {
    super.partRemoved(partName, instance);
    if (partName === "labelDisplay") {
      this.labelDisplay = void 0;
    }
  }
  getCurrentState() {
    if (!this.enabled)
      return "disabled";
    if (this._touchCaptured)
      return this._selected ? "downAndSelected" : "down";
    if (this._selected) {
      if (this.skin?.hasState("upAndSelected"))
        return "upAndSelected";
      return "down";
    }
    return "up";
  }
  $onRemoveFromStage() {
    this._releaseTouchCapture();
    super.$onRemoveFromStage();
  }
  // ── Protected methods ─────────────────────────────────────────────────
  /**
   * Called after `data` changes. Override to update the view.
   */
  dataChanged() {
    this._syncLabel();
  }
  _syncLabel() {
    if (this.labelDisplay) {
      this.labelDisplay.text = this._data == null ? "" : String(this._data);
    }
  }
  // ── Private methods ───────────────────────────────────────────────────
  _onTouchBegin = (e) => {
    const stage = this.stage;
    if (!stage)
      return;
    this._touchStage = stage;
    stage.addEventListener(TouchEvent3.TOUCH_END, this._onStageTouchEnd);
    stage.addEventListener(TouchEvent3.TOUCH_CANCEL, this._onStageTouchEnd);
    this._touchCaptured = true;
    this.invalidateState();
    e.updateAfterEvent();
  };
  _onStageTouchEnd = (_e) => {
    this._releaseTouchCapture();
  };
  _releaseTouchCapture() {
    const stage = this._touchStage;
    stage?.removeEventListener(TouchEvent3.TOUCH_END, this._onStageTouchEnd);
    stage?.removeEventListener(TouchEvent3.TOUCH_CANCEL, this._onStageTouchEnd);
    this._touchStage = void 0;
    this._touchCaptured = false;
    this.invalidateState();
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/DataGroup.js
import { Rectangle as Rectangle12 } from "@blakron/core";
var DataGroup = class extends Group {
  // ── Instance fields ───────────────────────────────────────────────────────
  _dataProvider;
  _dataProviderChanged = false;
  _itemRenderer;
  _itemRendererChanged = false;
  _itemRendererFunction;
  _itemRendererSkinName;
  _itemRendererSkinNameChanged = false;
  _useVirtualLayout = false;
  _useVirtualLayoutChanged = false;
  _rendererToClass = /* @__PURE__ */ new Map();
  _freeRenderers = /* @__PURE__ */ new Map();
  _renderersBeingUpdated = false;
  _indexToRenderer = [];
  _createNewRendererFlag = false;
  _typicalLayoutRect;
  _typicalItem;
  _typicalItemChanged = false;
  _cleanFreeRenderer = false;
  // ── Getters / Setters ─────────────────────────────────────────────────────
  get dataProvider() {
    return this._dataProvider;
  }
  set dataProvider(value) {
    if (this._dataProvider === value)
      return;
    this._removeDataProviderListener();
    this._dataProvider = value;
    this._dataProviderChanged = true;
    this._cleanFreeRenderer = true;
    this.invalidateProperties();
    this.invalidateSize();
    this.invalidateDisplayList();
  }
  get itemRenderer() {
    return this._itemRenderer;
  }
  set itemRenderer(value) {
    if (this._itemRenderer === value)
      return;
    this._itemRenderer = value;
    this._itemRendererChanged = true;
    this._typicalItemChanged = true;
    this._cleanFreeRenderer = true;
    this._removeDataProviderListener();
    this.invalidateProperties();
  }
  get itemRendererFunction() {
    return this._itemRendererFunction;
  }
  set itemRendererFunction(value) {
    if (this._itemRendererFunction === value)
      return;
    this._itemRendererFunction = value;
    this._itemRendererChanged = true;
    this._typicalItemChanged = true;
    this._removeDataProviderListener();
    this.invalidateProperties();
  }
  get itemRendererSkinName() {
    return this._itemRendererSkinName;
  }
  set itemRendererSkinName(value) {
    if (this._itemRendererSkinName === value)
      return;
    this._itemRendererSkinName = value;
    this._itemRendererSkinNameChanged = true;
    this.invalidateProperties();
  }
  get useVirtualLayout() {
    const layout = this.layout;
    if (layout)
      return layout.useVirtualLayout;
    return this._useVirtualLayout;
  }
  set useVirtualLayout(value) {
    if (this._useVirtualLayout === value)
      return;
    this._useVirtualLayout = value;
    const layout = this.layout;
    if (layout)
      layout.useVirtualLayout = value;
  }
  // ── Public methods ────────────────────────────────────────────────────────
  /**
   * Update a renderer's itemIndex and data. Called by the layout system.
   */
  updateRenderer(renderer, itemIndex, data) {
    this._renderersBeingUpdated = true;
    renderer.itemIndex = itemIndex;
    if (renderer.parent === this) {
      this.setChildIndex(renderer, itemIndex);
    }
    renderer.data = data;
    this._renderersBeingUpdated = false;
    return renderer;
  }
  // ── Override methods ──────────────────────────────────────────────────────
  get numElements() {
    if (!this._dataProvider)
      return 0;
    return this._dataProvider.length;
  }
  getElementAt(index) {
    return this._indexToRenderer[index] ?? void 0;
  }
  getVirtualElementAt(index) {
    index = index | 0;
    if (!this._dataProvider || index < 0 || index >= this._dataProvider.length)
      return void 0;
    let renderer = this._indexToRenderer[index];
    if (!renderer) {
      const item = this._dataProvider.getItemAt(index);
      renderer = this._createVirtualRenderer(item);
      this._indexToRenderer[index] = renderer;
      this.updateRenderer(renderer, index, item);
      if (this._createNewRendererFlag) {
        renderer.validateNow();
        this._createNewRendererFlag = false;
        this.rendererAdded(renderer, index, item);
      }
    }
    return renderer;
  }
  setVirtualElementIndicesInView(startIndex, endIndex) {
    const layout = this.layout;
    if (!layout?.useVirtualLayout)
      return;
    const map = this._indexToRenderer;
    for (let i = 0; i < map.length; i++) {
      if (map[i] && (i < startIndex || i > endIndex)) {
        this._freeRendererByIndex(i);
      }
    }
  }
  createChildren() {
    if (!this.layout) {
      const vl = new VerticalLayout();
      vl.gap = 0;
      vl.horizontalAlign = JustifyAlign.CONTENT_JUSTIFY;
      if (this._useVirtualLayout) {
        vl.useVirtualLayout = true;
      }
      this.layout = vl;
    }
    super.createChildren();
  }
  commitProperties() {
    if (this._itemRendererChanged || this._dataProviderChanged || this._useVirtualLayoutChanged) {
      this._removeAllRenderers();
      const layout = this.layout;
      if (layout)
        layout.clearVirtualLayoutCache();
      this._setTypicalLayoutRect(void 0);
      this._useVirtualLayoutChanged = false;
      this._itemRendererChanged = false;
      if (this._dataProvider) {
        this._dataProvider.addEventListener(CollectionEvent.COLLECTION_CHANGE, this._onCollectionChange);
      }
      const useVirtual = layout ? layout.useVirtualLayout : this._useVirtualLayout;
      if (useVirtual) {
        this.invalidateSize();
        this.invalidateDisplayList();
      } else {
        this._createRenderers();
      }
      if (this._dataProviderChanged) {
        this._dataProviderChanged = false;
        this.scrollH = 0;
        this.scrollV = 0;
      }
    }
    super.commitProperties();
    if (this._typicalItemChanged) {
      this._typicalItemChanged = false;
      if (this._dataProvider && this._dataProvider.length > 0) {
        this._typicalItem = this._dataProvider.getItemAt(0);
        this._measureRendererSize();
      }
    }
    if (this._itemRendererSkinNameChanged) {
      this._itemRendererSkinNameChanged = false;
      this._applyItemRendererSkinName();
    }
  }
  measure() {
    if (this.layout?.useVirtualLayout)
      this._ensureTypicalLayoutElement();
    super.measure();
  }
  updateDisplayList(unscaledWidth, unscaledHeight) {
    const useVirtual = this.layout?.useVirtualLayout;
    if (useVirtual)
      this._ensureTypicalLayoutElement();
    super.updateDisplayList(unscaledWidth, unscaledHeight);
    if (useVirtual && this._typicalLayoutRect) {
      const r0 = this._indexToRenderer[0];
      if (r0) {
        const b = new Rectangle12();
        r0.getPreferredBounds(b);
        if (b.width !== this._typicalLayoutRect.width || b.height !== this._typicalLayoutRect.height) {
          this._typicalLayoutRect = void 0;
        }
      }
    }
  }
  // ── Protected methods (subclass hooks) ────────────────────────────────────
  itemAdded(item, index) {
    this.layout?.elementAdded(index);
    if (this.layout?.useVirtualLayout) {
      this._indexToRenderer.splice(index, 0, void 0);
      return;
    }
    const renderer = this._createVirtualRenderer(item);
    this._indexToRenderer.splice(index, 0, renderer);
    if (renderer) {
      this.updateRenderer(renderer, index, item);
      if (this._createNewRendererFlag) {
        this._createNewRendererFlag = false;
        this.rendererAdded(renderer, index, item);
      }
    }
  }
  itemRemoved(item, index) {
    this.layout?.elementRemoved(index);
    const oldRenderer = this._indexToRenderer[index];
    if (this._indexToRenderer.length > index) {
      this._indexToRenderer.splice(index, 1);
    }
    if (oldRenderer) {
      if (this.layout?.useVirtualLayout) {
        this._doFreeRenderer(oldRenderer);
      } else {
        this.rendererRemoved(oldRenderer, index, item);
        this.removeChild(oldRenderer);
      }
    }
  }
  onCollectionChange(event) {
    switch (event.kind) {
      case CollectionEventKind.ADD:
        this._itemAddedHandler(event.items, event.location);
        break;
      case CollectionEventKind.REMOVE:
        this._itemRemovedHandler(event.items, event.location);
        break;
      case CollectionEventKind.UPDATE:
      case CollectionEventKind.REPLACE:
        this._itemUpdatedHandler(event.items[0], event.location);
        break;
      case CollectionEventKind.RESET:
      case CollectionEventKind.REFRESH: {
        if (this.layout?.useVirtualLayout) {
          for (let i = this._indexToRenderer.length - 1; i >= 0; i--) {
            if (this._indexToRenderer[i])
              this._freeRendererByIndex(i);
          }
        }
        this._dataProviderChanged = true;
        this.invalidateProperties();
        break;
      }
      default:
        break;
    }
    this.invalidateSize();
    this.invalidateDisplayList();
  }
  rendererAdded(_renderer, _index, _item) {
  }
  rendererRemoved(_renderer, _index, _item) {
  }
  /**
   * Get the renderer at the given index, if one exists.
   * Used by subclasses (e.g. ListBase) to update renderer state.
   */
  getRendererAt(index) {
    return this._indexToRenderer[index];
  }
  // ── Private methods ───────────────────────────────────────────────────────
  _removeDataProviderListener() {
    if (this._dataProvider) {
      this._dataProvider.removeEventListener(CollectionEvent.COLLECTION_CHANGE, this._onCollectionChange);
    }
  }
  _onCollectionChange = (e) => {
    this.onCollectionChange(e);
  };
  _itemAddedHandler(items, index) {
    for (let i = 0; i < items.length; i++) {
      this.itemAdded(items[i], index + i);
    }
    this._resetRenderersIndices();
  }
  _itemRemovedHandler(items, location) {
    for (let i = items.length - 1; i >= 0; i--) {
      this.itemRemoved(items[i], location + i);
    }
    this._resetRenderersIndices();
  }
  _itemUpdatedHandler(item, location) {
    if (this._renderersBeingUpdated)
      return;
    const renderer = this._indexToRenderer[location];
    if (renderer) {
      this.updateRenderer(renderer, location, item);
    }
  }
  _createVirtualRenderer(item) {
    const rendererClass = this._itemToRendererClass(item);
    const pool = this._freeRenderers.get(rendererClass);
    if (pool && pool.length > 0) {
      const renderer = pool.pop();
      renderer.visible = true;
      this.invalidateDisplayList();
      return renderer;
    }
    this._createNewRendererFlag = true;
    return this._createOneRenderer(rendererClass);
  }
  _createOneRenderer(rendererClass) {
    const renderer = new rendererClass();
    this._rendererToClass.set(renderer, rendererClass);
    if (this._itemRendererSkinName) {
      this._setItemRendererSkinName(renderer, this._itemRendererSkinName);
    }
    this.addChild(renderer);
    return renderer;
  }
  _doFreeRenderer(renderer) {
    const cls = this._rendererToClass.get(renderer);
    if (!cls)
      return;
    let pool = this._freeRenderers.get(cls);
    if (!pool) {
      pool = [];
      this._freeRenderers.set(cls, pool);
    }
    pool.push(renderer);
    renderer.visible = false;
  }
  _freeRendererByIndex(index) {
    const renderer = this._indexToRenderer[index];
    if (renderer) {
      delete this._indexToRenderer[index];
      this._doFreeRenderer(renderer);
    }
  }
  _itemToRendererClass(item) {
    let cls;
    if (this._itemRendererFunction) {
      cls = this._itemRendererFunction(item);
    }
    if (!cls)
      cls = this._itemRenderer;
    if (!cls)
      cls = ItemRenderer;
    return cls;
  }
  _createRenderers() {
    if (!this._dataProvider)
      return;
    const len = this._dataProvider.length;
    for (let i = 0; i < len; i++) {
      const item = this._dataProvider.getItemAt(i);
      const cls = this._itemToRendererClass(item);
      const renderer = this._createOneRenderer(cls);
      this._indexToRenderer[i] = renderer;
      this.updateRenderer(renderer, i, item);
      this.rendererAdded(renderer, i, item);
    }
  }
  _removeAllRenderers() {
    for (let i = 0; i < this._indexToRenderer.length; i++) {
      const renderer = this._indexToRenderer[i];
      if (renderer) {
        this.rendererRemoved(renderer, renderer.itemIndex, renderer.data);
        this.removeChild(renderer);
      }
    }
    this._indexToRenderer = [];
    if (this._cleanFreeRenderer) {
      for (const pool of this._freeRenderers.values()) {
        for (const renderer of pool) {
          this.rendererRemoved(renderer, renderer.itemIndex, renderer.data);
          this.removeChild(renderer);
        }
      }
      this._freeRenderers.clear();
      this._rendererToClass.clear();
      this._cleanFreeRenderer = false;
    }
  }
  _resetRenderersIndices() {
    const map = this._indexToRenderer;
    if (map.length === 0)
      return;
    for (let i = 0; i < map.length; i++) {
      if (map[i])
        map[i].itemIndex = i;
    }
  }
  _ensureTypicalLayoutElement() {
    if (this._typicalLayoutRect)
      return;
    if (this._dataProvider && this._dataProvider.length > 0) {
      this._typicalItem = this._dataProvider.getItemAt(0);
      this._measureRendererSize();
    }
  }
  _measureRendererSize() {
    if (this._typicalItem === void 0) {
      this._setTypicalLayoutRect(void 0);
      return;
    }
    const renderer = this._createVirtualRenderer(this._typicalItem);
    this.updateRenderer(renderer, 0, this._typicalItem);
    renderer.validateNow();
    const b = new Rectangle12();
    renderer.getPreferredBounds(b);
    const rect = new Rectangle12(0, 0, b.width, b.height);
    if (this.layout?.useVirtualLayout) {
      if (this._createNewRendererFlag) {
        this.rendererAdded(renderer, 0, this._typicalItem);
      }
      this._doFreeRenderer(renderer);
    } else {
      this.removeChild(renderer);
    }
    this._setTypicalLayoutRect(rect);
    this._createNewRendererFlag = false;
  }
  _setTypicalLayoutRect(rect) {
    this._typicalLayoutRect = rect;
    if (this.layout) {
      if (rect) {
        this.layout.setTypicalSize(rect.width, rect.height);
      } else {
        this.layout.setTypicalSize(0, 0);
      }
    }
  }
  _setItemRendererSkinName(renderer, skinName) {
    if (!renderer.skinNameExplicitlySet) {
      renderer.skinName = skinName;
      renderer.skinNameExplicitlySet = false;
    }
  }
  _applyItemRendererSkinName() {
    const skinName = this._itemRendererSkinName;
    for (const renderer of this._indexToRenderer) {
      if (renderer) {
        this._setItemRendererSkinName(renderer, skinName);
      }
    }
    for (const pool of this._freeRenderers.values()) {
      for (const renderer of pool) {
        this._setItemRendererSkinName(renderer, skinName);
      }
    }
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/ListBase.js
import { Event as Event16 } from "@blakron/core";
var ListBase = class extends DataGroup {
  // ── Sentinel constants ──────────────────────────────────────────────
  /** Sentinel for "no selection" — matches egret `ListBase.NO_SELECTION`. */
  static NO_SELECTION = -1;
  // ── Instance fields ───────────────────────────────────────────────────
  _selectedIndex = -1;
  _previousSelectedIndex = -1;
  _selectedIndexChanged = false;
  _dispatchChangeAfterSelection = false;
  _requireSelection = false;
  _requireSelectionChanged = false;
  /** Item passed to selectedItem setter before dataProvider is available (egret `pendingSelectedItem`). */
  _pendingSelectedItem;
  // ── Getters / Setters ─────────────────────────────────────────────────
  get selectedIndex() {
    return this._selectedIndex;
  }
  set selectedIndex(value) {
    this.setSelectedIndex(value, false);
  }
  get selectedItem() {
    if (this._selectedIndex < 0 || !this.dataProvider)
      return void 0;
    return this.dataProvider.getItemAt(this._selectedIndex);
  }
  set selectedItem(value) {
    if (!this.dataProvider) {
      this._pendingSelectedItem = value;
      this.invalidateProperties();
      return;
    }
    this._pendingSelectedItem = void 0;
    this.selectedIndex = this.dataProvider.getItemIndex(value);
  }
  /**
   * If `true`, the list always keeps an item selected (defaults to the first).
   * Setting this to true when no item is selected selects index 0.
   */
  get requireSelection() {
    return this._requireSelection;
  }
  set requireSelection(value) {
    if (this._requireSelection === value)
      return;
    this._requireSelection = value;
    this._requireSelectionChanged = true;
    this.invalidateProperties();
  }
  // ── Override methods ──────────────────────────────────────────────────
  commitProperties() {
    if (this._requireSelectionChanged) {
      this._requireSelectionChanged = false;
      if (this._requireSelection && this._selectedIndex === -1 && this.dataProvider && this.dataProvider.length > 0) {
        this.setSelectedIndex(0, false);
      }
    }
    if (this._pendingSelectedItem !== void 0 && this.dataProvider) {
      const item = this._pendingSelectedItem;
      this._pendingSelectedItem = void 0;
      this.setSelectedIndex(this.dataProvider.getItemIndex(item), false);
    }
    if (this._selectedIndexChanged) {
      this._selectedIndexChanged = false;
      this.commitSelection();
    }
    super.commitProperties();
  }
  /**
   * Override updateRenderer to sync the renderer's `selected` state when it
   * is created/recycled (matching Egret's `itemSelected` call).
   */
  updateRenderer(renderer, itemIndex, data) {
    this.itemSelected(itemIndex, this._selectedIndex === itemIndex);
    return super.updateRenderer(renderer, itemIndex, data);
  }
  onCollectionChange(event) {
    const kind = event.kind;
    const location = event.location ?? -1;
    switch (kind) {
      case CollectionEventKind.ADD: {
        if (this._requireSelection && this._selectedIndex === -1) {
          this.adjustSelection(location, true);
        } else if (location <= this._selectedIndex) {
          this.adjustSelection(this._selectedIndex + 1, true);
        }
        break;
      }
      case CollectionEventKind.REMOVE: {
        const sel = this._selectedIndex;
        if (location < sel) {
          this.adjustSelection(sel - 1, false);
        } else if (location === sel) {
          if (this.numChildren === 0) {
            this.adjustSelection(-1, false);
          }
        }
        break;
      }
      case CollectionEventKind.RESET:
      case CollectionEventKind.REFRESH: {
        this.dataProviderRefreshed();
        break;
      }
    }
    super.onCollectionChange(event);
  }
  // ── Protected methods ─────────────────────────────────────────────────
  setSelectedIndex(value, dispatchChangeEvent = false) {
    if (this._selectedIndex === value)
      return;
    if (dispatchChangeEvent) {
      this._dispatchChangeAfterSelection = true;
    }
    this._previousSelectedIndex = this._selectedIndex;
    this._selectedIndex = value;
    this._selectedIndexChanged = true;
    this.invalidateProperties();
  }
  commitSelection() {
    const maxIndex = this.dataProvider ? this.dataProvider.length - 1 : -1;
    if (this._selectedIndex < -1)
      this._selectedIndex = -1;
    if (this._selectedIndex > maxIndex)
      this._selectedIndex = maxIndex;
    if (this._requireSelection && this._selectedIndex === -1 && this.dataProvider && this.dataProvider.length > 0) {
      this._selectedIndex = this._previousSelectedIndex;
      this._dispatchChangeAfterSelection = false;
      return false;
    }
    if (this._dispatchChangeAfterSelection && this._previousSelectedIndex !== this._selectedIndex) {
      const allowed = this.dispatchEventWith(Event16.CHANGING, false, true, true);
      if (!allowed) {
        this.itemSelected(this._selectedIndex, false);
        this._selectedIndex = this._previousSelectedIndex;
        this._dispatchChangeAfterSelection = false;
        return false;
      }
    }
    if (this._previousSelectedIndex !== this._selectedIndex) {
      this.itemSelected(this._previousSelectedIndex, false);
    }
    if (this._selectedIndex >= 0) {
      this.itemSelected(this._selectedIndex, true);
    }
    if (this._dispatchChangeAfterSelection) {
      this._dispatchChangeAfterSelection = false;
      this.dispatchEventWith(Event16.CHANGE);
    }
    PropertyEvent.dispatchPropertyEvent(this, "selectedIndex");
    PropertyEvent.dispatchPropertyEvent(this, "selectedItem");
    return true;
  }
  /**
   * Called when an item is selected or deselected.
   * Override to update renderer visual state.
   */
  itemSelected(index, selected) {
    const renderer = this.getRendererAt(index);
    if (renderer)
      renderer.selected = selected;
  }
  /**
   * Adjust the selection index in response to collection mutations without
   * dispatching events or calling `itemSelected` (egret `adjustSelection`).
   *
   * The index is mutated silently so that multiple add/remove operations
   * within a single frame only produce one final commit event when
   * `commitProperties` runs.
   */
  adjustSelection(newIndex, _add) {
    this._selectedIndex = newIndex;
  }
  /**
   * Called when the data provider is reset or refreshed (egret parity).
   * Re-applies {@link requireSelection} logic so that the first item is
   * automatically selected when the data source is replaced.
   */
  dataProviderRefreshed() {
    this._selectedIndex = -1;
    if (this._requireSelection && this.dataProvider && this.dataProvider.length > 0) {
      this.setSelectedIndex(0, false);
    }
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/List.js
import { TouchEvent as TouchEvent4 } from "@blakron/core";
var List = class extends ListBase {
  // ── Instance fields ───────────────────────────────────────────────────
  _rendererHandlers = /* @__PURE__ */ new Map();
  // ── Override methods ──────────────────────────────────────────────────
  rendererAdded(renderer, _index, _item) {
    const handler = (_e) => {
      const idx = renderer.itemIndex;
      if (idx >= 0)
        this.setSelectedIndex(idx, true);
      ItemTapEvent.dispatchItemTapEvent(this, renderer.data, idx, renderer);
    };
    this._rendererHandlers.set(renderer, handler);
    renderer.addEventListener(TouchEvent4.TOUCH_TAP, handler);
  }
  rendererRemoved(renderer, _index, _item) {
    const handler = this._rendererHandlers.get(renderer);
    if (handler) {
      this._rendererHandlers.delete(renderer);
      renderer.removeEventListener(TouchEvent4.TOUCH_TAP, handler);
    }
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/TabBar.js
import { TouchEvent as TouchEvent5, Event as Event17 } from "@blakron/core";
var TabBar = class extends ListBase {
  // ── Instance fields ───────────────────────────────────────────────────
  _rendererHandlers = /* @__PURE__ */ new Map();
  _viewStack;
  _indexBeingUpdated = false;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor() {
    super();
    this.requireSelection = true;
    this.useVirtualLayout = false;
  }
  // ── Override methods ──────────────────────────────────────────────────
  /**
   * Override dataProvider to detect ViewStack and set up bidirectional binding:
   * TabBar CHANGE → ViewStack.selectedIndex, ViewStack PropertyChange → TabBar.selectedIndex.
   */
  get dataProvider() {
    return super.dataProvider;
  }
  set dataProvider(value) {
    if (this._viewStack) {
      this._viewStack.removeEventListener(PropertyEvent.PROPERTY_CHANGE, this._onViewStackPropChange);
      this.removeEventListener(Event17.CHANGE, this._onTabBarChange);
      this._viewStack = void 0;
    }
    super.dataProvider = value;
    if (value instanceof ViewStack) {
      this._viewStack = value;
      value.addEventListener(PropertyEvent.PROPERTY_CHANGE, this._onViewStackPropChange);
      this.addEventListener(Event17.CHANGE, this._onTabBarChange);
    }
  }
  _onTabBarChange = () => {
    if (!this._viewStack)
      return;
    this._indexBeingUpdated = true;
    this._viewStack.selectedIndex = this.selectedIndex;
    this._indexBeingUpdated = false;
  };
  _onViewStackPropChange = (e) => {
    if (!this._viewStack || this._indexBeingUpdated)
      return;
    const pe = e;
    if (pe.property === "selectedIndex") {
      this.setSelectedIndex(this._viewStack.selectedIndex, false);
    }
  };
  createChildren() {
    if (!this.layout) {
      const hl = new HorizontalLayout();
      hl.gap = 0;
      hl.horizontalAlign = JustifyAlign.CONTENT_JUSTIFY;
      this.layout = hl;
    }
    super.createChildren();
  }
  rendererAdded(renderer, _index, _item) {
    const handler = (_e) => {
      const idx = renderer.itemIndex;
      if (idx >= 0)
        this.setSelectedIndex(idx, true);
      ItemTapEvent.dispatchItemTapEvent(this, renderer.data, idx, renderer);
    };
    this._rendererHandlers.set(renderer, handler);
    renderer.addEventListener(TouchEvent5.TOUCH_TAP, handler);
  }
  rendererRemoved(renderer, _index, _item) {
    const handler = this._rendererHandlers.get(renderer);
    if (handler) {
      this._rendererHandlers.delete(renderer);
      renderer.removeEventListener(TouchEvent5.TOUCH_TAP, handler);
    }
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/ToggleSwitch.js
var ToggleSwitch = class extends ToggleButton {
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/SliderBase.js
import { TouchEvent as TouchEvent6, Point as Point2, Event as Event18 } from "@blakron/core";
var SliderBase = class extends Range {
  // ── Instance fields ───────────────────────────────────────────────────
  _direction = Direction.LTR;
  _thumb;
  _track;
  _pendingValue = 0;
  _liveDragging = true;
  _isDragging = false;
  _touchStage;
  _touchOffsetX = 0;
  _touchOffsetY = 0;
  /** Scratch point reused across frame to avoid per-event allocations (egret `$TempPoint`). */
  _scratchPoint = new Point2();
  // ── Constructor ───────────────────────────────────────────────────────
  constructor() {
    super();
    this.maximum = 10;
  }
  // ── Getters / Setters ─────────────────────────────────────────────────
  get direction() {
    return this._direction;
  }
  set direction(value) {
    if (this._direction === value)
      return;
    this._direction = value;
    this.invalidateProperties();
    this.invalidateSize();
    this.invalidateDisplayList();
  }
  get thumb() {
    return this._thumb;
  }
  set thumb(value) {
    if (this._thumb === value)
      return;
    if (this._isDragging)
      this._cancelDrag();
    this._removeThumbListeners();
    this._thumb = value;
    this._addThumbListeners();
  }
  get track() {
    return this._track;
  }
  set track(value) {
    if (this._track === value)
      return;
    this._removeTrackListeners();
    this._track = value;
    this._addTrackListeners();
  }
  /** Whether `value` updates live during drag (default true). If false, value commits on release. */
  get liveDragging() {
    return this._liveDragging;
  }
  set liveDragging(value) {
    this._liveDragging = value;
  }
  /** The not-yet-committed value during interaction (egret parity). */
  get pendingValue() {
    return this._pendingValue;
  }
  set pendingValue(value) {
    this._pendingValue = value;
    this.invalidateDisplayList();
  }
  pointToValue(x, y) {
    return this.minimum;
  }
  $onRemoveFromStage() {
    this._cancelDrag();
    super.$onRemoveFromStage();
  }
  // ── Private methods ───────────────────────────────────────────────────
  _addThumbListeners() {
    if (!this._thumb)
      return;
    this._thumb.addEventListener(TouchEvent6.TOUCH_BEGIN, this._onThumbDown);
  }
  _removeThumbListeners() {
    if (!this._thumb)
      return;
    this._thumb.removeEventListener(TouchEvent6.TOUCH_BEGIN, this._onThumbDown);
  }
  _addTrackListeners() {
    if (!this._track)
      return;
    this._track.addEventListener(TouchEvent6.TOUCH_BEGIN, this._onTrackDown);
  }
  _removeTrackListeners() {
    if (!this._track)
      return;
    this._track.removeEventListener(TouchEvent6.TOUCH_BEGIN, this._onTrackDown);
  }
  _onThumbDown = (e) => {
    e.stopPropagation();
    this._isDragging = true;
    this._pendingValue = this.value;
    if (this._thumb) {
      const offset = this._thumb.globalToLocal(e.stageX, e.stageY, this._scratchPoint);
      this._touchOffsetX = offset.x;
      this._touchOffsetY = offset.y;
    }
    const stage = this.stage;
    if (stage) {
      this._touchStage = stage;
      stage.addEventListener(TouchEvent6.TOUCH_MOVE, this._onThumbMove);
      stage.addEventListener(TouchEvent6.TOUCH_END, this._onThumbUp);
      stage.addEventListener(TouchEvent6.TOUCH_CANCEL, this._onThumbCancel);
    }
    UIEvent.dispatchUIEvent(this, UIEvent.CHANGE_START);
  };
  _onThumbMove = (e) => {
    if (!this._isDragging || !this._track)
      return;
    const newValue = this._positionToValue(e.stageX, e.stageY);
    if (newValue !== this._pendingValue) {
      if (this._liveDragging) {
        this._pendingValue = newValue;
        this.value = newValue;
        this.dispatchEventWith(Event18.CHANGE);
      } else {
        this._pendingValue = newValue;
        this.invalidateDisplayList();
      }
    }
  };
  _onThumbUp = (_e) => {
    this._isDragging = false;
    this._removeStageListeners();
    UIEvent.dispatchUIEvent(this, UIEvent.CHANGE_END);
    if (!this._liveDragging && this.value !== this._pendingValue) {
      this.value = this._pendingValue;
      this.dispatchEventWith(Event18.CHANGE);
    }
  };
  _onThumbCancel = () => {
    this._cancelDrag();
  };
  _removeStageListeners() {
    const stage = this._touchStage;
    if (!stage)
      return;
    stage.removeEventListener(TouchEvent6.TOUCH_MOVE, this._onThumbMove);
    stage.removeEventListener(TouchEvent6.TOUCH_END, this._onThumbUp);
    stage.removeEventListener(TouchEvent6.TOUCH_CANCEL, this._onThumbCancel);
    this._touchStage = void 0;
  }
  _cancelDrag() {
    this._removeStageListeners();
    this._isDragging = false;
    this._pendingValue = this.value;
    this.invalidateDisplayList();
  }
  _onTrackDown = (e) => {
    e.stopPropagation();
    this._pendingValue = this.value;
    const newValue = this._positionToValue(e.stageX, e.stageY);
    if (this.value !== newValue) {
      this.value = newValue;
      this.dispatchEventWith(Event18.CHANGE);
    }
  };
  /**
   * Convert a stage-space touch coordinate to a slider value, taking into
   * account the thumb's grab offset so the handle follows the finger from
   * the exact point where it was grabbed (egret parity).
   */
  _positionToValue(stageX, stageY) {
    if (!this._track)
      return this.minimum;
    const pt = this._track.globalToLocal(stageX, stageY, this._scratchPoint);
    return this.nearestValidValue(this.pointToValue(pt.x - this._touchOffsetX, pt.y - this._touchOffsetY), this.snapInterval);
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/HSlider.js
import { Rectangle as Rectangle13 } from "@blakron/core";
var HSlider = class extends SliderBase {
  constructor() {
    super();
    this.direction = Direction.LTR;
  }
  /**
   * Range of thumb movement = track width − thumb width.
   */
  _getThumbRange() {
    const track = this.track;
    const thumb = this.thumb;
    if (!track || !thumb || !isUIComponent(track) || !isUIComponent(thumb))
      return 0;
    const b = new Rectangle13();
    track.getLayoutBounds(b);
    const trackWidth = b.width;
    thumb.getLayoutBounds(b);
    return trackWidth - b.width;
  }
  pointToValue(x, _y) {
    const range = this.maximum - this.minimum;
    const thumbRange = this._getThumbRange();
    return this.minimum + (thumbRange !== 0 ? x / thumbRange * range : 0);
  }
  updateSkinDisplayList() {
    const thumb = this.thumb;
    const track = this.track;
    if (!thumb || !track || !isUIComponent(track))
      return;
    const thumbRange = this._getThumbRange();
    const range = this.maximum - this.minimum;
    const ratio = range > 0 ? (this.value - this.minimum) / range : 0;
    const trackBounds = new Rectangle13();
    track.getLayoutBounds(trackBounds);
    thumb.x = trackBounds.x + ratio * thumbRange;
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/VSlider.js
import { Rectangle as Rectangle14 } from "@blakron/core";
var VSlider = class extends SliderBase {
  constructor() {
    super();
    this.direction = Direction.BTT;
  }
  /**
   * Range of thumb movement = track height − thumb height.
   */
  _getThumbRange() {
    const track = this.track;
    const thumb = this.thumb;
    if (!track || !thumb || !isUIComponent(track) || !isUIComponent(thumb))
      return 0;
    const b = new Rectangle14();
    track.getLayoutBounds(b);
    const trackHeight = b.height;
    thumb.getLayoutBounds(b);
    return trackHeight - b.height;
  }
  pointToValue(_x, y) {
    const range = this.maximum - this.minimum;
    const thumbRange = this._getThumbRange();
    return this.minimum + (thumbRange !== 0 ? (thumbRange - y) / thumbRange * range : 0);
  }
  updateSkinDisplayList() {
    const thumb = this.thumb;
    const track = this.track;
    if (!thumb || !track || !isUIComponent(track))
      return;
    const thumbRange = this._getThumbRange();
    const range = this.maximum - this.minimum;
    const ratio = range > 0 ? (this.value - this.minimum) / range : 0;
    const trackBounds = new Rectangle14();
    track.getLayoutBounds(trackBounds);
    thumb.y = trackBounds.y + (1 - ratio) * thumbRange;
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/Panel.js
import { DisplayObject as DisplayObject2, TouchEvent as TouchEvent7 } from "@blakron/core";
var Panel = class extends Component {
  // ── Instance fields ───────────────────────────────────────────────────
  closeButton;
  moveArea;
  _title = "";
  _titleChanged = false;
  _titleDisplay;
  _dragStartX = 0;
  _dragStartY = 0;
  _panelStartX = 0;
  _panelStartY = 0;
  _dragStage;
  // ── Default property (EXML children) ───────────────────────────────
  /**
   * Write-only: adds EXML-declared children to the panel.
   * Mirrors Egret's `registerProperty(Panel, "elementsContent", "Array", true)`.
   */
  set elementsContent(value) {
    if (!value)
      return;
    for (const child of value) {
      this.addChild(child);
    }
  }
  // ── Getters / Setters ─────────────────────────────────────────────────
  get title() {
    return this._title;
  }
  set title(value) {
    if (this._title === value)
      return;
    this._title = value;
    this._titleChanged = true;
    this.invalidateProperties();
  }
  get titleDisplay() {
    return this._titleDisplay;
  }
  set titleDisplay(value) {
    if (this._titleDisplay === value)
      return;
    this._titleDisplay = value;
    if (value && this._title)
      value.text = this._title;
  }
  // ── Override methods ──────────────────────────────────────────────────
  commitProperties() {
    super.commitProperties();
    if (this._titleChanged) {
      this._titleChanged = false;
      if (this._titleDisplay)
        this._titleDisplay.text = this._title;
    }
  }
  partAdded(partName, instance) {
    super.partAdded(partName, instance);
    if (instance instanceof Button && partName === "closeButton") {
      this.closeButton = instance;
      instance.addEventListener(TouchEvent7.TOUCH_TAP, this._onCloseButtonTap);
    } else if (instance instanceof DisplayObject2 && partName === "moveArea") {
      this.moveArea = instance;
      instance.addEventListener(TouchEvent7.TOUCH_BEGIN, this._onMoveAreaTouchBegin);
    }
  }
  partRemoved(partName, instance) {
    super.partRemoved(partName, instance);
    if (instance instanceof Button && partName === "closeButton") {
      instance.removeEventListener(TouchEvent7.TOUCH_TAP, this._onCloseButtonTap);
      this.closeButton = void 0;
    } else if (instance instanceof DisplayObject2 && partName === "moveArea") {
      this._removeDragListeners();
      instance.removeEventListener(TouchEvent7.TOUCH_BEGIN, this._onMoveAreaTouchBegin);
      this.moveArea = void 0;
    }
  }
  $onRemoveFromStage() {
    this._removeDragListeners();
    super.$onRemoveFromStage();
  }
  // ── Public methods ────────────────────────────────────────────────────
  /**
   * Close the panel by removing it from its parent.
   * Called automatically after UIEvent.CLOSING if not cancelled.
   */
  close() {
    if (this.parent)
      this.parent.removeChild(this);
  }
  // ── Private methods ───────────────────────────────────────────────────
  _onCloseButtonTap = () => {
    if (UIEvent.dispatchUIEvent(this, UIEvent.CLOSING, true, true)) {
      this.close();
    }
  };
  _onMoveAreaTouchBegin = (e) => {
    this.includeInLayout = false;
    this._dragStartX = e.stageX;
    this._dragStartY = e.stageY;
    this._panelStartX = this.x;
    this._panelStartY = this.y;
    const stage = this.stage;
    if (stage) {
      this._dragStage = stage;
      stage.addEventListener(TouchEvent7.TOUCH_MOVE, this._onMoveAreaTouchMove);
      stage.addEventListener(TouchEvent7.TOUCH_END, this._onMoveAreaTouchEnd);
      stage.addEventListener(TouchEvent7.TOUCH_CANCEL, this._onMoveAreaTouchEnd);
    }
  };
  _onMoveAreaTouchMove = (e) => {
    this.x = this._panelStartX + (e.stageX - this._dragStartX);
    this.y = this._panelStartY + (e.stageY - this._dragStartY);
  };
  _onMoveAreaTouchEnd = () => {
    this._removeDragListeners();
  };
  _removeDragListeners() {
    const stage = this._dragStage;
    if (!stage)
      return;
    stage.removeEventListener(TouchEvent7.TOUCH_MOVE, this._onMoveAreaTouchMove);
    stage.removeEventListener(TouchEvent7.TOUCH_END, this._onMoveAreaTouchEnd);
    stage.removeEventListener(TouchEvent7.TOUCH_CANCEL, this._onMoveAreaTouchEnd);
    this._dragStage = void 0;
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/UILayer.js
import { Event as Event19 } from "@blakron/core";
var UILayer = class extends Group {
  // ── Constructor ───────────────────────────────────────────────────────
  constructor() {
    super();
    this.addEventListener(Event19.ADDED_TO_STAGE, this.$onAddedToStage);
    this.addEventListener(Event19.REMOVED_FROM_STAGE, this.$onRemovedFromStage);
  }
  // ── Private methods ───────────────────────────────────────────────────
  $onAddedToStage() {
    const stage = this.stage;
    if (!stage)
      return;
    stage.addEventListener(Event19.RESIZE, this.$onResize);
    this.$onResize();
  }
  $onRemovedFromStage() {
    const stage = this.stage;
    if (stage) {
      stage.removeEventListener(Event19.RESIZE, this.$onResize);
    }
  }
  $onResize() {
    const stage = this.stage;
    if (!stage)
      return;
    this.width = stage.stageWidth;
    this.height = stage.stageHeight;
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/EditableText.js
import { Event as Event20, TextFieldType } from "@blakron/core";
var EditableText = class extends Label {
  _prompt = "";
  _promptColor = 10066329;
  _userTextColor = 16777215;
  _isShowingPrompt = false;
  _isFocused = false;
  _asPassword = false;
  constructor() {
    super();
    this._textField.type = TextFieldType.INPUT;
    this.addEventListener(Event20.FOCUS_IN, this._onFocusIn);
    this.addEventListener(Event20.FOCUS_OUT, this._onFocusOut);
  }
  get prompt() {
    return this._prompt;
  }
  set prompt(value) {
    if (this._prompt === value)
      return;
    this._prompt = value;
    if (!this._isFocused && (!this.text || this.text === this._prompt))
      this._showPrompt();
  }
  get promptColor() {
    return this._promptColor;
  }
  set promptColor(value) {
    this._promptColor = value;
    if (this._isShowingPrompt)
      this._textField.textColor = value;
  }
  get text() {
    return this._isShowingPrompt ? "" : this._textField.text;
  }
  set text(value) {
    if (this._isShowingPrompt && value === this._prompt)
      return;
    this._isShowingPrompt = false;
    this._textField.textColor = this._userTextColor;
    this._textField.displayAsPassword = this._asPassword;
    this._textField.text = value ?? "";
    PropertyEvent.dispatchPropertyEvent(this, "text");
    this.invalidateSize();
    this.invalidateDisplayList();
    if (!this._isFocused && !value)
      this._showPrompt();
  }
  get textColor() {
    return this._textField.textColor;
  }
  set textColor(value) {
    if (!this._isShowingPrompt)
      this._userTextColor = value;
    this._textField.textColor = value;
  }
  get displayAsPassword() {
    return this._textField.displayAsPassword;
  }
  set displayAsPassword(value) {
    this._asPassword = value;
    if (!this._isShowingPrompt)
      this._textField.displayAsPassword = value;
  }
  get inputType() {
    return this._textField.inputType;
  }
  set inputType(value) {
    this._textField.inputType = value;
  }
  get restrict() {
    return this._textField.restrict;
  }
  set restrict(value) {
    this._textField.restrict = value;
  }
  get selectionBeginIndex() {
    return this._textField.selectionBeginIndex;
  }
  get selectionEndIndex() {
    return this._textField.selectionEndIndex;
  }
  get caretIndex() {
    return this._textField.caretIndex;
  }
  setFocus() {
    this._textField.setFocus();
  }
  setSelection(beginIndex, endIndex) {
    this._textField.setSelection(beginIndex, endIndex);
  }
  _showPrompt() {
    if (!this._prompt)
      return;
    this._isShowingPrompt = true;
    this._textField.textColor = this._promptColor;
    this._textField.displayAsPassword = false;
    this._textField.text = this._prompt;
  }
  _onFocusIn = () => {
    this._isFocused = true;
    if (this._isShowingPrompt) {
      this._isShowingPrompt = false;
      this._textField.textColor = this._userTextColor;
      this._textField.displayAsPassword = this._asPassword;
      this._textField.text = "";
    }
  };
  _onFocusOut = () => {
    this._isFocused = false;
    if (!this._textField.text)
      this._showPrompt();
  };
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/TextInput.js
import { Event as Event21, TouchEvent as TouchEvent8 } from "@blakron/core";
var TextInput = class extends Component {
  // ── Instance fields ───────────────────────────────────────────────────
  textDisplay;
  promptDisplay;
  _prompt = "";
  _text = "";
  _textColor;
  _displayAsPassword = false;
  _maxChars = 0;
  _restrict = "";
  _inputType = "text";
  _isFocused = false;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor() {
    super();
    this.addEventListener(TouchEvent8.TOUCH_BEGIN, this._onTouchBegin);
  }
  // ── Getters / Setters ─────────────────────────────────────────────────
  get prompt() {
    return this.promptDisplay ? this.promptDisplay.text : this._prompt;
  }
  set prompt(value) {
    this._prompt = value;
    if (this.promptDisplay)
      this.promptDisplay.text = value;
    this.invalidateState();
  }
  get text() {
    return this.textDisplay ? this.textDisplay.text : this._text;
  }
  set text(value) {
    this._text = value;
    if (this.textDisplay)
      this.textDisplay.text = value;
    this.invalidateState();
  }
  get textColor() {
    return this.textDisplay ? this.textDisplay.textColor : this._textColor ?? 16777215;
  }
  set textColor(value) {
    this._textColor = value;
    if (this.textDisplay)
      this.textDisplay.textColor = value;
  }
  get displayAsPassword() {
    return this.textDisplay ? this.textDisplay.displayAsPassword : this._displayAsPassword;
  }
  set displayAsPassword(value) {
    this._displayAsPassword = value;
    if (this.textDisplay)
      this.textDisplay.displayAsPassword = value;
  }
  get maxChars() {
    return this.textDisplay ? this.textDisplay.maxChars : this._maxChars;
  }
  set maxChars(value) {
    this._maxChars = value;
    if (this.textDisplay)
      this.textDisplay.maxChars = value;
  }
  get restrict() {
    return this.textDisplay ? this.textDisplay.restrict ?? "" : this._restrict;
  }
  set restrict(value) {
    this._restrict = value;
    if (this.textDisplay)
      this.textDisplay.restrict = value;
  }
  get inputType() {
    return this.textDisplay ? this.textDisplay.inputType : this._inputType;
  }
  set inputType(value) {
    this._inputType = value;
    if (this.textDisplay)
      this.textDisplay.inputType = value;
    this.invalidateProperties();
  }
  // ── Override methods ──────────────────────────────────────────────────
  getCurrentState() {
    const hasPrompt = !!this._prompt && !this._isFocused && !this.text;
    if (!this.enabled) {
      return hasPrompt && this.skin?.hasState("disabledWithPrompt") ? "disabledWithPrompt" : "disabled";
    }
    return hasPrompt && this.skin?.hasState("normalWithPrompt") ? "normalWithPrompt" : "normal";
  }
  partAdded(partName, instance) {
    super.partAdded(partName, instance);
    if (instance instanceof EditableText && partName === "textDisplay") {
      this.textDisplay = instance;
      if (this._text)
        instance.text = this._text;
      if (this._textColor != null)
        instance.textColor = this._textColor;
      if (this._displayAsPassword)
        instance.displayAsPassword = true;
      if (this._maxChars)
        instance.maxChars = this._maxChars;
      if (this._restrict)
        instance.restrict = this._restrict;
      if (this._inputType)
        instance.inputType = this._inputType;
      instance.addEventListener(Event21.FOCUS_IN, this._onFocusIn);
      instance.addEventListener(Event21.FOCUS_OUT, this._onFocusOut);
    } else if (instance instanceof Label && partName === "promptDisplay") {
      this.promptDisplay = instance;
      instance.touchEnabled = false;
      if (this._prompt)
        instance.text = this._prompt;
    }
  }
  partRemoved(partName, instance) {
    super.partRemoved(partName, instance);
    if (instance instanceof EditableText && partName === "textDisplay") {
      this._text = instance.text;
      this._textColor = instance.textColor;
      this._displayAsPassword = instance.displayAsPassword;
      this._maxChars = instance.maxChars;
      this._restrict = instance.restrict ?? "";
      instance.removeEventListener(Event21.FOCUS_IN, this._onFocusIn);
      instance.removeEventListener(Event21.FOCUS_OUT, this._onFocusOut);
      this.textDisplay = void 0;
    } else if (instance instanceof Label && partName === "promptDisplay") {
      this._prompt = instance.text;
      this.promptDisplay = void 0;
    }
  }
  // ── Private methods ───────────────────────────────────────────────────
  _onFocusIn = () => {
    this._isFocused = true;
    this.invalidateState();
  };
  _onFocusOut = () => {
    this._isFocused = false;
    this.invalidateState();
  };
  _onTouchBegin = () => {
    this.textDisplay?.setFocus();
  };
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/components/ComboBox.js
import { TouchEvent as TouchEvent9, Event as Event22, DisplayObject as DisplayObject3 } from "@blakron/core";
var ComboBox = class extends Component {
  // ── Instance fields ───────────────────────────────────────────────────
  labelDisplay;
  button;
  dropDown;
  list;
  _dataProvider;
  _selectedIndex = -1;
  _selectedItem;
  _labelField = "label";
  _labelFunction;
  _isOpen = false;
  _prompt = "";
  _openParentIndex = -1;
  _dropDownParent;
  _dropDownParentIndex = -1;
  _dropDownLocalMatrix;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor() {
    super();
    this.touchChildren = true;
    this.addEventListener(TouchEvent9.TOUCH_TAP, this._onTriggerTap);
  }
  // ── Getters / Setters ─────────────────────────────────────────────────
  /** The data provider for the drop-down list items. */
  get dataProvider() {
    return this._dataProvider;
  }
  set dataProvider(value) {
    if (this._dataProvider === value)
      return;
    this._dataProvider = value;
    if (this.list) {
      this.list.dataProvider = value;
    }
    this.invalidateProperties();
  }
  /** Index of the currently selected item, or -1 if nothing is selected. */
  get selectedIndex() {
    return this._selectedIndex;
  }
  set selectedIndex(value) {
    if (this._selectedIndex === value)
      return;
    this._selectedIndex = value;
    this._updateSelectedItem();
    this.invalidateState();
  }
  /** The currently selected data item. */
  get selectedItem() {
    return this._selectedItem;
  }
  set selectedItem(value) {
    if (this._selectedItem === value)
      return;
    if (this._dataProvider) {
      this.selectedIndex = this._dataProvider.getItemIndex(value);
    } else {
      this._selectedItem = value;
      this._updateLabel();
      this.invalidateState();
    }
  }
  /** Whether the drop-down list is currently visible. */
  get isOpen() {
    return this._isOpen;
  }
  set isOpen(value) {
    if (this._isOpen === value)
      return;
    this._isOpen = value;
    this._updateDisplayOrder(value);
    this.invalidateState();
    if (this.dropDown) {
      this.dropDown.visible = value;
    }
  }
  /**
   * The property name on data items to use as the label.
   * Defaults to `'label'`. Used when `labelFunction` is not set.
   */
  get labelField() {
    return this._labelField;
  }
  set labelField(value) {
    if (this._labelField === value)
      return;
    this._labelField = value;
    this._updateLabel();
  }
  /**
   * A function that converts a data item to a display string.
   * When set, this takes priority over `labelField`.
   */
  get labelFunction() {
    return this._labelFunction;
  }
  set labelFunction(value) {
    if (this._labelFunction === value)
      return;
    this._labelFunction = value;
    this._updateLabel();
  }
  /** Placeholder text shown when no item is selected. */
  get prompt() {
    return this._prompt;
  }
  set prompt(value) {
    this._prompt = value;
    if (!this._selectedItem && this.labelDisplay) {
      this.labelDisplay.text = value;
    }
  }
  /** The displayed text (selected item label or prompt). */
  get text() {
    if (this.labelDisplay)
      return this.labelDisplay.text;
    return this.itemToLabel(this._selectedItem);
  }
  get textColor() {
    return this.labelDisplay?.textColor ?? 0;
  }
  set textColor(value) {
    if (this.labelDisplay) {
      this.labelDisplay.textColor = value;
    }
  }
  // ── Override methods ──────────────────────────────────────────────────
  getCurrentState() {
    if (!this.enabled)
      return "disabled";
    if (this._isOpen)
      return "open";
    return "normal";
  }
  partAdded(partName, instance) {
    super.partAdded(partName, instance);
    if (partName === "labelDisplay" && instance === this.labelDisplay) {
      this._updateLabel();
    }
    if (partName === "list" && instance instanceof List) {
      instance.dataProvider = this._dataProvider;
      instance.addEventListener(Event22.CHANGE, this._onListChange);
    }
    if (partName === "dropDown" && instance instanceof Scroller) {
      instance.visible = this._isOpen;
    }
  }
  partRemoved(partName, instance) {
    if (partName === "dropDown" && instance === this.dropDown) {
      this.close();
    }
    super.partRemoved(partName, instance);
    if (partName === "list" && instance instanceof List) {
      instance.removeEventListener(Event22.CHANGE, this._onListChange);
    }
  }
  $onRemoveFromStage() {
    this.close();
    super.$onRemoveFromStage();
  }
  commitProperties() {
    super.commitProperties();
    if (this.list && this.list.selectedIndex !== this._selectedIndex) {
      this.list.selectedIndex = this._selectedIndex;
    }
  }
  // ── Public methods ────────────────────────────────────────────────────
  /** Open the drop-down list. */
  open() {
    this.isOpen = true;
  }
  /** Close the drop-down list. */
  close() {
    this.isOpen = false;
  }
  /**
   * Convert a data item to a label string using `labelFunction` or `labelField`.
   */
  itemToLabel(item) {
    if (item == null)
      return "";
    if (this._labelFunction)
      return this._labelFunction(item);
    if (typeof item === "string")
      return item;
    if (typeof item === "number" || typeof item === "boolean")
      return String(item);
    const obj = item;
    if (this._labelField && this._labelField in obj) {
      return String(obj[this._labelField]);
    }
    return String(item);
  }
  // ── Private methods ───────────────────────────────────────────────────
  _updateSelectedItem() {
    if (this._dataProvider && this._selectedIndex >= 0 && this._selectedIndex < this._dataProvider.length) {
      this._selectedItem = this._dataProvider.getItemAt(this._selectedIndex);
    } else {
      this._selectedItem = void 0;
    }
    this._updateLabel();
    this.dispatchEventWith(Event22.CHANGE);
  }
  _updateLabel() {
    if (!this.labelDisplay)
      return;
    if (this._selectedItem != null) {
      this.labelDisplay.text = this.itemToLabel(this._selectedItem);
    } else {
      this.labelDisplay.text = this._prompt;
    }
  }
  _updateDisplayOrder(isOpen) {
    if (isOpen && this._moveDropDownToStage())
      return;
    if (!isOpen && this._restoreDropDownParent())
      return;
    const parent = this.parent;
    if (!parent)
      return;
    if (parent.layout)
      return;
    if (isOpen) {
      this._openParentIndex = parent.getChildIndex(this);
      parent.setChildIndex(this, parent.numChildren - 1);
    } else if (this._openParentIndex >= 0) {
      parent.setChildIndex(this, this._openParentIndex);
      this._openParentIndex = -1;
    }
  }
  /** Move only the popup to the stage so layout siblings cannot cover it. */
  _moveDropDownToStage() {
    const dropDown = this.dropDown;
    const stage = this.stage;
    const parent = dropDown?.parent;
    if (!dropDown || !stage || !parent || parent === stage)
      return false;
    this._dropDownParent = parent;
    this._dropDownParentIndex = parent.getChildIndex(dropDown);
    this._dropDownLocalMatrix = dropDown.$getMatrix().clone();
    const stageMatrix = dropDown.$getConcatenatedMatrix().clone();
    parent.removeChild(dropDown);
    stage.addChild(dropDown);
    dropDown.$setMatrix(stageMatrix);
    return true;
  }
  _restoreDropDownParent() {
    const dropDown = this.dropDown;
    const parent = this._dropDownParent;
    const matrix = this._dropDownLocalMatrix;
    if (!dropDown || !parent || !matrix)
      return false;
    dropDown.parent?.removeChild(dropDown);
    parent.addChildAt(dropDown, Math.min(this._dropDownParentIndex, parent.numChildren));
    dropDown.$setMatrix(matrix);
    this._dropDownParent = void 0;
    this._dropDownParentIndex = -1;
    this._dropDownLocalMatrix = void 0;
    return true;
  }
  _onTriggerTap = (e) => {
    if (this._isOpen && this.dropDown && e.target instanceof DisplayObject3 && this.dropDown.contains(e.target)) {
      return;
    }
    this.isOpen = !this._isOpen;
  };
  _onListChange = (_e) => {
    if (this.list) {
      this._selectedIndex = this.list.selectedIndex;
      this._updateSelectedItem();
    }
    this.close();
  };
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/events/ScrollerThrowEvent.js
import { Event as Event23 } from "@blakron/core";
var ScrollerThrowEvent = class extends Event23 {
  // ── Static fields ─────────────────────────────────────────────────────
  static THROW_H = "throwH";
  static THROW_V = "throwV";
  // ── Instance fields ───────────────────────────────────────────────────
  currentPos = 0;
  toPos = 0;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor(type, bubbles = false, cancelable = false) {
    super(type, bubbles, cancelable);
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/states/State.js
var State = class {
  // ── Instance fields ───────────────────────────────────────────────────
  name;
  overrides;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor(name, overrides = []) {
    this.name = name;
    this.overrides = overrides;
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/states/AddItems.js
import { DisplayObject as DisplayObject4, DisplayObjectContainer as DisplayObjectContainer3 } from "@blakron/core";
var AddItems = class {
  // ── Instance fields ───────────────────────────────────────────────────
  target;
  destination;
  position;
  propertyName;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor(target, destination, position = -1, propertyName = "") {
    this.target = target;
    this.destination = destination;
    this.position = position;
    this.propertyName = propertyName;
  }
  // ── Public methods ────────────────────────────────────────────────────
  apply(host, skin) {
    const item = skin.getPart(this.target);
    const dest = this.destination ? skin.getPart(this.destination) : host;
    if (!(item instanceof DisplayObject4) || !(dest instanceof DisplayObjectContainer3))
      return;
    if (this.position >= 0) {
      dest.addChildAt(item, this.position);
    } else {
      dest.addChild(item);
    }
  }
  remove(host, skin) {
    const item = skin.getPart(this.target);
    const dest = this.destination ? skin.getPart(this.destination) : host;
    if (!(item instanceof DisplayObject4) || !(dest instanceof DisplayObjectContainer3))
      return;
    if (item.parent === dest) {
      dest.removeChild(item);
    }
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/states/SetProperty.js
var SetProperty = class {
  // ── Instance fields ───────────────────────────────────────────────────
  target;
  name;
  value;
  _oldValue;
  _applied = false;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor(target, name, value) {
    this.target = target;
    this.name = name;
    this.value = value;
  }
  // ── Public methods ────────────────────────────────────────────────────
  apply(_host, skin) {
    const obj = this._resolve(skin);
    if (!obj)
      return;
    this._oldValue = getProp(obj, this.name);
    setProp(obj, this.name, this.value);
    this._applied = true;
  }
  remove(_host, skin) {
    if (!this._applied)
      return;
    const obj = this._resolve(skin);
    if (!obj)
      return;
    setProp(obj, this.name, this._oldValue);
    this._applied = false;
  }
  // ── Private methods ───────────────────────────────────────────────────
  _resolve(skin) {
    if (!this.target)
      return skin;
    const part = skin.getPart(this.target);
    return part != null && typeof part === "object" ? part : void 0;
  }
};
function getProp(obj, key) {
  return obj[key];
}
function setProp(obj, key, value) {
  obj[key] = value;
}

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/states/SetStateProperty.js
var SetStateProperty = class {
  // ── Instance fields ───────────────────────────────────────────────────
  name;
  value;
  _oldValue;
  _applied = false;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor(name, value) {
    this.name = name;
    this.value = value;
  }
  // ── Public methods ────────────────────────────────────────────────────
  apply(host, _skin) {
    this._oldValue = getProp2(host, this.name);
    setProp2(host, this.name, this.value);
    this._applied = true;
  }
  remove(host, _skin) {
    if (!this._applied)
      return;
    setProp2(host, this.name, this._oldValue);
    this._applied = false;
  }
};
function getProp2(obj, key) {
  return obj[key];
}
function setProp2(obj, key, value) {
  obj[key] = value;
}

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/collections/ArrayCollection.js
import { EventDispatcher as EventDispatcher6 } from "@blakron/core";
var ArrayCollection = class extends EventDispatcher6 {
  // ── Instance fields ───────────────────────────────────────────────────
  _source;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor(source) {
    super();
    this._source = source ?? [];
  }
  // ── Getters / Setters ─────────────────────────────────────────────────
  get source() {
    return this._source;
  }
  set source(value) {
    this._source = value ?? [];
    this._dispatchCoEvent(CollectionEventKind.RESET);
  }
  get length() {
    return this._source.length;
  }
  // ── Public methods ────────────────────────────────────────────────────
  getItemAt(index) {
    return this._source[index];
  }
  getItemIndex(item) {
    return this._source.indexOf(item);
  }
  addItem(item) {
    this._source.push(item);
    this._dispatchCoEvent(CollectionEventKind.ADD, this._source.length - 1, -1, [item]);
  }
  addItemAt(item, index) {
    if (index < 0 || index > this._source.length) {
      throw new RangeError(`ArrayCollection.addItemAt: index ${index} out of range`);
    }
    this._source.splice(index, 0, item);
    this._dispatchCoEvent(CollectionEventKind.ADD, index, -1, [item]);
  }
  removeItemAt(index) {
    if (index < 0 || index >= this._source.length) {
      throw new RangeError(`ArrayCollection.removeItemAt: index ${index} out of range`);
    }
    const item = this._source.splice(index, 1)[0];
    this._dispatchCoEvent(CollectionEventKind.REMOVE, index, -1, [item]);
    return item;
  }
  replaceItemAt(item, index) {
    if (index < 0 || index >= this._source.length) {
      throw new RangeError(`ArrayCollection.replaceItemAt: index ${index} out of range`);
    }
    const old = this._source.splice(index, 1, item)[0];
    this._dispatchCoEvent(CollectionEventKind.REPLACE, index, -1, [item], [old]);
    return old;
  }
  itemUpdated(item) {
    const index = this.getItemIndex(item);
    if (index !== -1) {
      this._dispatchCoEvent(CollectionEventKind.UPDATE, index, -1, [item]);
    }
  }
  removeAll() {
    const items = this._source.slice();
    this._source.length = 0;
    this._dispatchCoEvent(CollectionEventKind.REMOVE, 0, -1, items);
  }
  /**
   * Replace all items with a new source. Unlike setting `source`, this does
   * **not** reset scroll position in the view — individual add/remove events
   * are dispatched instead.
   */
  replaceAll(newSource) {
    const src = newSource ?? [];
    const newLen = src.length;
    const oldLen = this._source.length;
    for (let i = newLen; i < oldLen; i++) {
      this.removeItemAt(newLen);
    }
    for (let i = 0; i < newLen; i++) {
      if (i >= oldLen)
        this.addItemAt(src[i], i);
      else
        this.replaceItemAt(src[i], i);
    }
    this._source = src;
  }
  refresh() {
    this._dispatchCoEvent(CollectionEventKind.REFRESH);
  }
  /**
   * Sort the collection in place using a comparator function.
   * Dispatches REFRESH after sorting.
   */
  sort(compareFunction) {
    this._source.sort(compareFunction);
    this._dispatchCoEvent(CollectionEventKind.REFRESH);
  }
  /**
   * Sort the collection by a field name (Egret-compatible sortOn).
   * @param fieldName Property name to sort by.
   * @param options   Sort options: 0=ascending string, 4=descending, 16=numeric.
   */
  sortOn(fieldName, options = 0) {
    const descending = (options & 4) !== 0;
    const numeric = (options & 16) !== 0;
    this._source.sort((a, b) => {
      const va = a[fieldName];
      const vb = b[fieldName];
      let result;
      if (numeric) {
        result = (Number(va) || 0) - (Number(vb) || 0);
      } else {
        result = String(va ?? "").localeCompare(String(vb ?? ""));
      }
      return descending ? -result : result;
    });
    this._dispatchCoEvent(CollectionEventKind.REFRESH);
  }
  /**
   * Filter the collection in place, keeping only items that pass the test.
   * Dispatches REFRESH after filtering.
   * Note: items that are filtered out are removed from the source array.
   */
  filterFunction(testFn) {
    this._source = this._source.filter(testFn);
    this._dispatchCoEvent(CollectionEventKind.REFRESH);
  }
  // ── Private methods ───────────────────────────────────────────────────
  _dispatchCoEvent(kind, location = -1, oldLocation = -1, items = [], oldItems = []) {
    CollectionEvent.dispatchCollectionEvent(this, kind, location, oldLocation, items, oldItems);
  }
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/binding/Watcher.js
var Watcher = class _Watcher {
  // ── Instance fields ───────────────────────────────────────────────────
  _host;
  _property;
  _handler;
  _thisObject;
  _next;
  _isExecuting = false;
  // ── Constructor ───────────────────────────────────────────────────────
  constructor(property, handler, thisObject, next) {
    this._property = property;
    this._handler = handler;
    this._thisObject = thisObject;
    this._next = next;
  }
  // ── Public methods ────────────────────────────────────────────────────
  /**
   * Creates and starts a Watcher for a property chain.
   *
   * ```ts
   * // watches host.a.b.c
   * Watcher.watch(host, ['a', 'b', 'c'], (value) => { ... }, this);
   * ```
   *
   * @param host   Root object hosting the chain.  Must dispatch
   *               `PropertyEvent.PROPERTY_CHANGE` when its bindable
   *               properties change (i.e. implement `IEventDispatcher`).
   * @param chain  Property names forming the chain, e.g. `['a','b','c']`.
   * @param handler Called with the new leaf value whenever the chain changes.
   * @param thisObject  `this` context for the handler.
   * @returns The head Watcher, or `undefined` if `chain` is empty.
   */
  static watch(host, chain, handler, thisObject) {
    if (chain.length === 0)
      return void 0;
    const property = chain[0];
    const remaining = chain.slice(1);
    const next = remaining.length > 0 ? _Watcher.watch(void 0, remaining, handler, thisObject) : void 0;
    const watcher = new _Watcher(property, handler, thisObject, next);
    watcher.reset(host);
    return watcher;
  }
  getValue() {
    if (this._next)
      return this._next.getValue();
    return this._getHostPropertyValue();
  }
  setHandler(handler, thisObject) {
    this._handler = handler;
    this._thisObject = thisObject;
    if (this._next)
      this._next.setHandler(handler, thisObject);
  }
  /**
   * Re-points this watcher at a new host.
   * Pass `undefined` to detach from the current host.
   */
  reset(newHost) {
    if (this._host) {
      this._host.removeEventListener(PropertyEvent.PROPERTY_CHANGE, this._onPropertyChange);
    }
    this._host = newHost;
    if (this._host) {
      this._host.addEventListener(PropertyEvent.PROPERTY_CHANGE, this._onPropertyChange);
    }
    if (this._next) {
      this._next.reset(this._getHostPropertyValue());
    }
  }
  unwatch() {
    this.reset(void 0);
    this._handler = void 0;
    if (this._next)
      this._next._handler = void 0;
  }
  // ── Private methods ───────────────────────────────────────────────────
  _getHostPropertyValue() {
    return this._host ? this._host[this._property] : void 0;
  }
  _onPropertyChange = (e) => {
    if (!(e instanceof PropertyEvent))
      return;
    if (e.property !== this._property || this._isExecuting)
      return;
    try {
      this._isExecuting = true;
      if (this._next) {
        this._next.reset(this._getHostPropertyValue());
      }
      if (this._handler) {
        this._handler.call(this._thisObject, this.getValue());
      }
    } finally {
      this._isExecuting = false;
    }
  };
};

// node_modules/.pnpm/@blakron+ui@1.1.4/node_modules/@blakron/ui/dist/blakron/binding/Binding.js
var Binding = class _Binding {
  /**
   * Binds a property chain on `host` to a target property.
   *
   * ```ts
   * Binding.bindProperty(user, ['name'], label, 'text');
   * // label.text === user.name; auto-updates when user dispatches PropertyChange
   * ```
   */
  static bindProperty(host, chain, target, prop) {
    const watcher = Watcher.watch(host, chain, void 0, void 0);
    if (watcher) {
      const assign = (value) => {
        target[prop] = value;
      };
      watcher.setHandler(assign, void 0);
      assign(watcher.getValue());
    }
    return watcher;
  }
  /**
   * Binds a property chain on `host` to a handler function.
   *
   * ```ts
   * Binding.bindHandler(user, ['name'], (v) => console.log(v), null);
   * ```
   */
  static bindHandler(host, chain, handler, thisObject) {
    const watcher = Watcher.watch(host, chain, handler, thisObject);
    if (watcher) {
      handler.call(thisObject, watcher.getValue());
    }
    return watcher;
  }
  /**
   * Template-string binding used by EXML compiler.
   *
   * `templates` is a mixed array of literal strings and `Watcher` instances.
   * `chainIndex` marks which entries are dynamic (property chains).
   *
   * The result is the string concatenation of all template values, written
   * to `target[prop]`.
   */
  static bindProperties(host, templates, chainIndex, target, prop) {
    if (templates.length === 1 && chainIndex.length === 1) {
      return _Binding.bindProperty(host, templates[0].split("."), target, prop);
    }
    const assign = () => {
      target[prop] = _joinValues(templates);
    };
    let lastWatcher;
    for (const index of chainIndex) {
      const element = templates[index];
      let watcher;
      if (typeof element === "string") {
        watcher = Watcher.watch(host, element.split("."), void 0, void 0);
      } else if (element instanceof Watcher) {
        watcher = element;
        watcher.reset(host);
      }
      if (watcher) {
        templates[index] = watcher;
        watcher.setHandler(assign, void 0);
        lastWatcher = watcher;
      }
    }
    assign();
    return lastWatcher;
  }
};
function _joinValues(templates) {
  let value = "";
  for (const item of templates) {
    value += item instanceof Watcher ? String(item.getValue() ?? "") : String(item);
  }
  return value;
}
export {
  AddItems,
  Animation,
  ArrayCollection,
  BasicLayout,
  Binding,
  Button,
  CheckBox,
  CollectionEvent,
  CollectionEventKind,
  ColumnAlign,
  ComboBox,
  Component,
  DataGroup,
  DefaultAssetAdapter,
  DefaultThemeAdapter,
  Direction,
  EditableText,
  Group,
  HScrollBar,
  HSlider,
  HorizontalLayout,
  Image,
  ItemRenderer,
  ItemTapEvent,
  JustifyAlign,
  Label,
  LayoutBase,
  LinearLayoutBase,
  List,
  ListBase,
  Panel,
  ProgressBar,
  PropertyEvent,
  RadioButton,
  RadioButtonGroup,
  Range,
  Rect,
  RowAlign,
  ScrollBarBase,
  ScrollPolicy,
  Scroller,
  ScrollerThrowEvent,
  SetProperty,
  SetStateProperty,
  Skin,
  SliderBase,
  State,
  TabBar,
  TextInput,
  Theme,
  TileLayout,
  TileOrientation,
  ToggleButton,
  ToggleSwitch,
  TouchScroll,
  UIEvent,
  UILayer,
  UIState,
  VScrollBar,
  VSlider,
  Validator,
  VerticalLayout,
  ViewStack,
  Watcher,
  getAssetAdapter,
  getTheme,
  isUIComponent,
  setAssetAdapter,
  setTheme,
  validator
};
