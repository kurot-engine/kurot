# Versioned release assets

Enable content-addressed release packaging in `kurot.config.ts`:

```ts
export default {
	output: { dir: 'bin-debug', versionedAssets: true },
	// Keep the project's other settings.
};
```

The option requires CLI >= 3.7.0 within 3.x. It defaults to false and is ignored
by development/watch builds.
An index query string does not propagate to requests for resources.

## Output and URLs

```text
bin-release/web/<timestamp>/
├── index.html
├── manifest.json
└── assets/<hash>/
    ├── js/
    ├── resource/
    └── <files copied beside the HTML template>
```

The hash is the first 32 hexadecimal characters of SHA-256 over sorted output
paths, file sizes and bytes, including generated HTML, theme JSON and scripts.
Any changed file changes the complete build's version. Identical builds retain
their URL; unchanged individual files also get new URLs when another file changes.
This trades granular cache reuse for one consistent release across all loaders.

The CLI inserts `<base href="./assets/<hash>/">` first inside `<head>`. A request
for `resource/assets/atlas.png` then resolves under the version directory, even
when the entry is `/game/index.html?launch=...`. Atlas `file` references, bitmap
font pages, stylesheet fonts, relative imports and direct browser requests use
that directory without rewriting authored resources or keys. The release manifest
stays at the root with prefixed script paths. Source maps move with their scripts.

Custom templates must have an explicit `<head>` and no `<base>` element. The
CLI inserts the base at the parsed start tag's source location without
reserializing the template. Quoted attributes and script/style text are preserved.
The build rejects symbolic links and other nonregular output files. Relative URLs
must refer to files inside the build; root-relative URLs, remote URLs, and URLs
explicitly based on location.href remain outside this mechanism. Applications
that construct URLs should use document.baseURI for build assets. Relative links
and forms also inherit the base; use explicit destinations for application navigation.
If hosting has a CSP base-uri directive, it must allow this same-origin base.

## Theme loading with existing UI

UI runtimes that resolve a relative Theme config against location.href need an
absolute config URL. The game starter uses:

```ts
const theme = new Theme(new URL('resource/default.thm.json', document.baseURI).href);
```

Use the same pattern in existing projects. This keeps the theme's `skinsJs`
import inside the version directory without requiring a UI runtime update.

## Deployment

Upload the complete generated directory, including `assets/<hash>/`. Upload new
asset directories first, then replace root manifest.json and index.html. Keep
previous version directories available while older sessions may request assets;
avoid deploy commands that delete those directories immediately. Publish the
entry at a directory URL ending in `/` or at its actual `index.html` URL.

Serve index.html with revalidation, for example `Cache-Control: no-cache`.
Serve `assets/<hash>/**` with `Cache-Control: public, max-age=31536000, immutable`.
If a launcher reads root manifest.json, give it revalidation too. These are server
settings; the CLI writes static files and cannot set response headers. Never
overwrite files inside an already published hash directory. Rollback replaces
the root entry files with those of the previous complete release.
