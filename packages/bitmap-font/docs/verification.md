# Bitmap-font verification

From the package directory:

```sh
pnpm build
pnpm test
```

Verify parsing, validation, immutable snapshots, serialization round trips,
code-point wrapping, kerning, complete-line height clipping, negative bearings,
zero advances and supplementary characters. The public root must import in Node
without DOM, image-decoding or engine dependencies.

When changing shared geometry, also run Core glyph/layout tests and the relevant
bitmap-font browser cases. Exercise GPU and Canvas rendering, independent
measurement, font/page ownership, configured resources, asynchronous failures,
stale requests, clipping, clearing and capture. UI BitmapLabel checks cover its
layout constraints, cached fonts and error notifications.

Package checks should use a local tarball in a strict NodeNext/ES2022 consumer
and confirm that public parsing, layout and serialization work without source.
Real game font assets remain application-owned and are supplied read-only.
