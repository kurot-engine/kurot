# to

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
to(props: Record<string, number>, duration: number, ease?: EaseFunction): this;
```

Adds a property interpolation step. Start values are sampled on first use
and then retained, keeping repeat and yoyo cycles continuous.

**Parameter duration:** Finite, non-negative milliseconds; invalid values throw RangeError.

Related types: [EaseFunction](../EaseFunction-typealias.md).
