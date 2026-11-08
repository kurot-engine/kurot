# textHeight

Package: `@kurot/core@3.2.3`. Generated from public declarations and JSDoc.

```ts
get textHeight(): number;
```

Laid-out content height in logical units, including inter-row spacing.
Dynamic rows contain their largest run size and full font ascent/descent.
Single-line INPUT reports its nominal font size. This differs from an explicit
viewport height and from painted ink/outline bounds.
