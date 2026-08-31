# Changelog

## 1.3.0 - 2026-08-31

### Breaking Changes

- Drop Node 18 support and raise the minimum supported Node.js version to `>=20.19.0`.

### Changed

- Scope the DOM polyfill to each export so browser globals and `console.error` are restored after export completes.
- Keep `@excalidraw/utils` because the exporter still depends on `exportToSvg()` and the packaged font assets used for server-side rendering.
- Make the exporter polyfill compatible with modern Node runtimes where globals such as `navigator` may be exposed as getter-only properties.
- Build the CLI before Homebrew installs it from a source archive.

### Fixed

- Exclude deleted elements from SVG and PNG export bounds.
