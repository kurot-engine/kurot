# from

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
from(props: Record<string, number>, duration: number, ease?: EaseFunction): this;
```

Adds an interpolation from explicit values to the target's initial values.
The original end values are captured once and reused by later cycles.

**Parameter duration:** Finite, non-negative milliseconds; invalid values throw RangeError.

Related types: [EaseFunction](../EaseFunction-typealias.md).
