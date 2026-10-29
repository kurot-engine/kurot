# drawArc

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
drawArc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise: boolean): void;
```

Appends a circular arc centered at local logical (x, y). Radius is logical;
startAngle/endAngle are radians, not display-object degrees. anticlockwise
defaults to false. Negative radius or equal angles do nothing rather than throw.

**Default anticlockwise:** `false`
