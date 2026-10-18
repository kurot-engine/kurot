# setFrameLabel

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
setFrameLabel(name: string, startFrame: number, endFrame: number): void;
```

Add or replace an inclusive label range, using 0-based integer indices.
Unlike MovieClip's navigation methods, these indices are not 1-based.

**throws**

RangeError For blank names, invalid indices or endFrame before startFrame.

**Parameter name:** Non-blank label name.

**Parameter startFrame:** First frame, within the existing frame array.

**Parameter endFrame:** Last frame, defaulting to startFrame.

**Default endFrame:** `startFrame`
