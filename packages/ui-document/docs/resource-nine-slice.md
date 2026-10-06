# Resource default nine-slice grids

This is a **breaking resource format change**, introduced with Core 2.0,
CLI 3.0, ui-document 0.7 and ui-runtime 0.6. Later releases retain the same
object-valued frame map and local-override rules. CLI 3.2.0 and ui-runtime 0.8.1
use ui-document `^0.10.0`; UI's Rectangle setter needs no additional API.

## Authored configuration

```json
{
	"resources": [
		{ "name": "logo", "type": "image", "url": "assets/logo.png", "scale9grid": "10,10,20,20" },
		{
			"name": "atlas",
			"type": "sheet",
			"url": "assets/atlas.json",
			"subkeys": {
				"panel": { "scale9grid": "85,0,10,60" },
				"button": {}
			}
		}
	],
	"groups": [{ "name": "main", "keys": "atlas,logo" }]
}
```

`subkeys` is a map of frame names to metadata. An empty object registers a frame
without a default. Unknown metadata remains intact. Groups retain comma-separated
keys and their order. Grid coordinates describe the **untrimmed** image, using a
sheet frame's `sourceW`/`sourceH`; atlas x/y and trimming offsets are not grid
coordinates. Coordinates are nonnegative finite numbers, width/height positive.
Editor writes additionally validate the grid against current texture dimensions.

## Resolution and authoring

`parseUIResourceConfigEntries()` validates the new format. It rejects old string
subkeys, duplicate resource names, malformed frame metadata and invalid grids.
`getUIResourceNineSlice()` resolves exact resource names first, then bare frame
names in manifest order, then `sheetName.frameName` aliases. Exact resource
identities shadow frame aliases even when they have no grid.

`resolveUIResourceDefaults(document, resources)` returns a disposable document
copy. Image-local `scale9Grid` takes priority; absent local configuration inherits
the resource default. `scale9Grid="false"` explicitly disables inheritance.
Removing a local override restores inheritance. Existing XML rectangles are
normalized to rectangle objects in the copy; authored XML/history are untouched.

Source overrides in states/variants receive paired grids. A source with no
resource default gets `false`, so a previous grid cannot leak into an ordinary
texture; exiting a state restores its previous grid. Explicit local or
state/variant grid overrides retain priority. Resolve each registered appearance
or reusable asset before materialization, as well as the main document.

CLI resolves defaults when building Skin factories and emits native Rectangle
assignments. ui-runtime applies resolved rectangles/false to UI Images. Core
indexes object subkeys but does **not** apply metadata to arbitrary Bitmap
instances or arbitrary runtime source changes. Runtime code that changes source
outside compiled states must update its grid explicitly.

## Explicit conversion

The Editor accepts old comma strings solely as conversion input. Opening a
project, observing external edits, group operations and saving Skin XML never
upgrade the resource manifest. **Refresh sheet** regenerates the selected sheet's
map from its registered atlas JSON, preserves metadata for surviving frames,
adds empty objects for new frames and removes retired frame metadata. Other
sheets, groups, XML and atlas JSON/PNG are untouched. The resource detail field
still displays frame names joined with commas.

Before building with the new Core/CLI, explicitly refresh every old sheet in the
Editor. No project-wide migration, alternate schema or runtime string fallback
is provided.

## Release boundary

Core's exported `ResourceConfigEntry.subkeys` changes from a string to an object.
CLI now validates resource manifests before installing Skin bundles. ui-document
adds the parser/resolver and permits `false` for Image rectangles; ui-runtime
consumes that opt-out. A failed manifest rebuild retains the last good Skin
bundle in watch mode. Manifest edits rebuild all dependent Skin factories;
resource/component watch builds are serialized.

CLI 3.2.0 and ui-runtime 0.8.1 require ui-document `^0.10.0`. UI 3.1.0 and
ui-runtime 0.8.1 require Core `^2.1.0`; ui-runtime also requires UI `^3.1.0`.
Game 2.0.0 accepts Core `^2.0.0`. Core 2.1.1 adds the nested/rotated scroll
clipping fix without changing this resource contract.

ui-runtime 0.8.1 is published and installed by Editor 0.12.1. The KUI sample and
engine examples use the published CLI 3.2.0. Convert old sheets in the Editor before
moving applications to the new package set. Old EXML projects can remain on CLI 1.3.x.
