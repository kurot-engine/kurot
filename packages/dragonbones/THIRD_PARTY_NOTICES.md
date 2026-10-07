# Third-party notices

DragonBones 5.7.000 is provided under the MIT license by the DragonBones team.
Source: https://github.com/DragonBones/DragonBonesJS
Pinned commit: `64b6c69ae35777c2404be68c9192e2c56906079e`.

The TypeScript runtime sources are maintained in `src/runtime` and adapted
from the pinned commit. `upstream.json` records the original source paths and
SHA-256 hashes for provenance; the adapted files are not byte-for-byte copies.

The source port replaces namespace boundaries with ESM imports and named
exports, removes legacy global/CommonJS/AMD and old-browser bootstrap, adds
definite-assignment assertions for pool-initialized fields and explicit
override modifiers. Original animation algorithms, types and nullable pool
contracts are preserved. No Egret adapter is included.

Runtime TypeScript is compiled together with the Kurot adapter. JavaScript
and declarations are emitted only into `dist`; the original MIT notices and
runtime license are included in the package.
