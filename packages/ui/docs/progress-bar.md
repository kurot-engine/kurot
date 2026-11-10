# ProgressBar values and animation

ProgressBar keeps its existing skin parts (`thumb`, `labelDisplay`) and public
properties. Numeric progress and label formatting have separate responsibilities.

| Responsibility | Contract |
| --- | --- |
| Requested target | Each `value` assignment requests an endpoint clamped to the current range. The latest request replaces the previous one. |
| Displayed progress | Reading `value` returns the current displayed number, including fractional animation frames. Completion applies the exact requested endpoint. |
| Fill ratio | `ratio` describes the displayed number, clamped to `[0, 1]`. Skin clipping uses this ratio without resizing the thumb. |
| Label text | Default animation labels suppress interpolation noise; custom formatters receive the unrounded displayed number and `maximum`. |

## Changing ranges and targets

Use finite numeric bounds and progress values. Changing `minimum` or `maximum`
immediately constrains both the displayed number and the pending target. An
active animation restarts from that constrained display toward the constrained
target. Expanding the range keeps the current position; it does not restore an
older target that was already clamped away.

When `maximum <= minimum`, the displayed value settles at `minimum`, the ratio
is zero and no animation is started. Bounds retain their assigned values.

```ts
progress.slideDuration = 0;
progress.maximum = 2000;
progress.value = 1600;

progress.slideDuration = 500;
progress.maximum = 266;
progress.value = 120;
```

The new animation starts at 266 and ends at exactly 120. Every intermediate
display remains within the new range. Assigning the same pending target again
does not restart it; assigning the current displayed value cancels an obsolete
target.

`slideDuration` is the full-range duration. Actual duration scales with the
remaining distance divided by the range. Offstage assignments and
`slideDuration <= 0` apply immediately and stop any older animation. Changing
`slideDuration` during an animation settles its pending target, preserving the
existing behavior.

## Label precision

The default format remains `value / maximum`. While animating, its decimal
precision comes from the starting authored value, requested targets and range
bounds. Integer inputs produce integer labels. Fractional inputs retain their
decimal granularity; trailing zeroes are omitted. Retargeting does not infer
precision from a floating-point interpolation. Extremely small numbers retain
native exponent notation beyond fixed-decimal formatting limits.

Numeric `value` and `ratio` are never rounded for presentation. At rest, the
default label uses the exact endpoint's normal number representation.
`labelFunction` and the protected `_valueToLabel` override receive the full
displayed number, so callers can choose their own precision:

```ts
progress.labelFunction = (value, maximum) =>
    `${value.toFixed(3)} / ${maximum}`;
```

## Events

Event behavior is unchanged: a distinct immediate displayed-value assignment
dispatches one `Event.CHANGE`. Animated assignments, animation frames,
completion, range changes and duration changes do not dispatch it. Reassigning
an unchanged immediate value is silent. No property-change or completion event
is added.

## Verification

Run `pnpm test test/ProgressBar.test.ts test/ProgressBarAnimation.test.ts
test/ProgressBarLabelsAndEvents.test.ts` from the UI package for deterministic
clock, range, label, clipping and event regressions. After `pnpm build`, run
`pnpm exec playwright test test/browser/progress-bar.spec.ts --workers=1` for
skin-bound Canvas and WebGL 1/2 pixel checks.
