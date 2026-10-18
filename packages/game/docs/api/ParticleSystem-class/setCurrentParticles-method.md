# setCurrentParticles

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
setCurrentParticles(num: number): void;
```

Add particles until the requested count or maxParticles is reached. Requests
below the current count do not remove particles; use stop(true) to clear them.
