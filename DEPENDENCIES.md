# Dependency Notes

## @excalidraw/utils — pinned to `0.1.3-test32`

### Why the prerelease tag?

Despite its prerelease-looking version string, **`0.1.3-test32` is the npm
`latest` dist-tag** — running `npm install @excalidraw/utils` installs this
exact version. The Excalidraw team has been iterating on a full rewrite of the
utils package through the `0.1.3-test*` series and has promoted `test32` as the
current recommended release.

### Why can't we use the stable `0.1.2`?

`0.1.2` ships a single minified bundle (`dist/excalidraw-utils.min.js`) with a
completely different API surface and **no `exportToSvg`** function. It also
lacks:

- Bundled font assets (TTFs for Excalifont, Virgil, etc.) required for
  server-side text rendering
- TypeScript type declarations
- ESM entry points (`dist/prod/index.js`)

Our image-export pipeline depends on all of these. Downgrading to `0.1.2` would
break the `convert` command entirely.

### What does `0.1.3-test32` provide?

| Feature | `0.1.2` | `0.1.3-test32` |
|---------|---------|----------------|
| `exportToSvg()` | ✗ | ✓ |
| Bundled TTF fonts | ✗ | ✓ (7 font files) |
| TypeScript types | ✗ | ✓ |
| ESM exports map | ✗ | ✓ |
| Package size | ~430 KB | ~75 MB |

### When can we move to a stable release?

When the Excalidraw team publishes a stable `0.2.0` (or similar) that ships the
same `exportToSvg` API and bundled fonts, we should upgrade. Track progress at:

- <https://github.com/excalidraw/excalidraw/tree/master/packages/utils>
- <https://www.npmjs.com/package/@excalidraw/utils?activeTab=versions>

### Pinning strategy

The version is pinned **without a caret** (`"0.1.3-test32"` not
`"^0.1.3-test32"`) to prevent accidental upgrades to untested prerelease
iterations (e.g., a hypothetical `0.1.3-test33` that could introduce breaking
changes).
