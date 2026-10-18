# DragonBones verification

Run from this package directory:

```sh
pnpm build
pnpm typecheck
pnpm test
pnpm verify:project /path/to/resource/assets/texture/armature
```

Unit checks cover ESM isolation, atlas UV/trim/rotation, weighted and unweighted
meshes, deform, nested armatures, events, clock drivers, disposal during callbacks,
borrowed textures, replacement atlases and custom displays.

The optional project validator reads supplied DBDT resources without copying or
modifying them. It advances animations and checks finite coordinates/UV/matrices,
valid index ranges, complete events, released display trees and live borrowed
atlas pages after disposal. Numeric checks do not establish artwork correctness.

Use the browser example to compare ordinary/rotated/trimmed and animated Mesh
attachments in WebGL and Canvas. Check rendered pixels and a cleared display
count/tree after disposal. Canvas does not execute GPU color filters; compare
only the backend behavior actually supported by Core.

Verify a local tarball with a strict NodeNext consumer, skipLibCheck=false,
shared constructor identity between the root/runtime subpath and one accepted
Core instance. Include declarations, upstream provenance and licenses; exclude
game images, tests and local tooling. Provenance hashes identify upstream inputs,
not equality between upstream and adapted source.
