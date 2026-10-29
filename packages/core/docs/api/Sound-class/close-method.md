# close

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
close(): void;
```

Invalidates pending load callbacks and releases this Sound's loaded data.
It does not abort every pending network/decode operation or stop previously
returned SoundChannels; stop each owned channel separately.
