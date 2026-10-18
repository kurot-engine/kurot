# createChildren

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
createChildren(): void;
```

One-time initialization hook on first stage attachment. Applies the active
theme's skin when no explicit skin is set. Call super.createChildren() when
overriding; stage reattachment does not call this hook again.
