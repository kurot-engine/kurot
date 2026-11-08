# curveTo

Package: `@kurot/core@3.2.3`. Generated from public declarations and JSDoc.

```ts
curveTo(controlX: number, controlY: number, anchorX: number, anchorY: number): void;
```

Appends a quadratic Bezier from the cursor through one control point to
an anchor point. All coordinates use local logical units; the cursor ends
at the anchor, and existing geometry is retained.
