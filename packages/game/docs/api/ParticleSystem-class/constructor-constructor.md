# constructor

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
constructor(texture: Texture, emissionRate: number);
```

Create a stopped system borrowing a texture. emissionRate is an interval
in milliseconds, not a particles-per-second count. Non-finite or negative
intervals throw RangeError; 0 disables emission.

Related types: [ParticleSystem](../ParticleSystem-class.md), [Texture](../../../../core/docs/api/Texture-class.md).
