# Changelog

## 1.3.0 - 2026-08-31

### Breaking Changes

- Drop Node 18 support and raise the minimum supported Node.js version to `>=20.19.0`.

### Changed

- Scope the DOM polyfill to each export so browser globals and `console.error` are restored after export completes.
- Keep `@excalidraw/utils` because the exporter still depends on `exportToSvg()` and the packaged font assets used for server-side rendering.
- Make the exporter polyfill compatible with modern Node runtimes where globals such as `navigator` may be exposed as getter-only properties.
- Generate the Homebrew formula from the built npm release artifact.

### Fixed

- Exclude deleted elements from SVG and PNG export bounds.
- Preserve input-defined spacing unless `--spacing` is explicitly provided.
- Render reverse DSL arrows and undirected DOT edges with the correct arrowheads.
- Reject malformed DSL and invalid CLI format, direction, and spacing values.
- Report version 1.3.0 consistently from the CLI.
