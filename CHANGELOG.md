# Changelog

## Unreleased

### Breaking Changes

- Raise the minimum supported Node.js version from Node 18 to `>=20.19.0`.
- Ship the image exporter Node support change as the next major release.

### Changed

- Scope the DOM polyfill to each export so browser globals and `console.error` are restored after export completes.
- Keep `@excalidraw/utils` because the exporter still depends on `exportToSvg()` and the packaged font assets used for server-side rendering.
- Make the exporter polyfill compatible with modern Node runtimes where globals such as `navigator` may be exposed as getter-only properties.
