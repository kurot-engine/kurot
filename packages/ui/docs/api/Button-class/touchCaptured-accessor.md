# touchCaptured

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get touchCaptured(): boolean;
```

Whether a press is in progress, initially false. Stage removal cancels
capture and detaches internal stage handlers. Application event handlers remain
owned by the game and must be removed when their round/view ends.
