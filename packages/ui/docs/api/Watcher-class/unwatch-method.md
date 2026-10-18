# unwatch

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
unwatch(): void;
```

Detach property-change listeners throughout the chain and clear this watcher's
handler. Call on round/view disposal; removing a display object does not unwatch
manual bindings. Does not dispose the observed data or target.
