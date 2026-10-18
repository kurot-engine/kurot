# verticalAlign

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get verticalAlign(): "top" | "middle" | "bottom";
set verticalAlign(value: "top" | "middle" | "bottom");
```

Text-block alignment inherited from Core (middle on 2.5.3+, top on older
compatible versions). Invalid strings throw RangeError. Set top explicitly for
a HUD whose text should begin at the top of a taller box.
