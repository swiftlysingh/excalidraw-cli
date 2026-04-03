# Changelog

## Unreleased

### Breaking Changes

- Drop Node 18 support and raise the minimum supported Node.js version to `>=20.19.0`.

### Changed

- Scope the DOM polyfill to each export so browser globals and `console.error` are restored after export completes.
- Keep `@excalidraw/utils` because the exporter still depends on `exportToSvg()` and the packaged font assets used for server-side rendering.
- Make the exporter polyfill compatible with modern Node runtimes where globals such as `navigator` may be exposed as getter-only properties.
- Add a Homebrew formula that installs the published npm tarball, so `brew install` stays aligned with the tagged release artifacts.
