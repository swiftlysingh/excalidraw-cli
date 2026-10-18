# Changelog

## 1.5.0 - Unreleased

### Changed

- Keep package.json, git tags, the changelog, and the release workflow on one version line so the next release cannot skip a published version.
- Wait for npm release artifacts to become available before hashing them.
- Configure Git identity before creating the Homebrew tap.

## 1.4.0 - 2026-09-21

### Changed

- Add inline node styling with `@node` defaults and per-node overrides.
- Add reverse, bidirectional, and dashed arrow syntax, plus escaped quoted edge labels.
- Make the release workflow safe to retry after npm has published the version.
- Generate the Homebrew formula from the published npm artifact and test diagram creation plus PNG/SVG export.

### Fixed

- Render embedded images in PNG exports instead of placeholder squares.
- Exclude deleted elements from SVG and PNG export bounds.
- Preserve input-defined spacing unless `--spacing` is explicitly provided.
- Render reverse DSL arrows and undirected DOT edges with the correct arrowheads.
- Reject malformed DSL and invalid CLI format, direction, and spacing values.
- Report the package version consistently from the CLI.

## 1.3.0 - Skipped

- Tagged in git as v1.3.0 but never published to npm. The work shipped as 1.4.0.

## 1.2.0 - 2026-03-16

### Breaking Changes

- Drop Node 18 support and raise the minimum supported Node.js version to `>=20.19.0`.

### Changed

- Scope the DOM polyfill to each export so browser globals and `console.error` are restored after export completes.
- Keep `@excalidraw/utils` because the exporter still depends on `exportToSvg()` and the packaged font assets used for server-side rendering.
- Make the exporter polyfill compatible with modern Node runtimes where globals such as `navigator` may be exposed as getter-only properties.
- Add PNG and SVG export from Excalidraw files.
