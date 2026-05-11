# AGENTS.md

## Cursor Cloud specific instructions

This is a single-package Node.js/TypeScript CLI tool (`excalidraw-cli`). No external services, databases, or Docker are required.

### Key commands

All standard commands are in `package.json` scripts:

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Build | `npm run build` |
| Dev (watch) | `npm run dev` |
| Lint | `npm run lint` |
| Test (watch) | `npm test` |
| Test (single run) | `npm run test:run` |
| Format | `npm run format` |

### Notes

- The project is ESM (`"type": "module"`). Always use ESM imports in source and tests.
- `npm run build` compiles `src/` to `dist/` via `tsc`. The CLI entry point is `dist/cli.js`.
- Lint produces `@typescript-eslint/no-explicit-any` warnings in `src/exporter/image-exporter.ts`; these are pre-existing and expected.
- Tests use Vitest. All test files are in `tests/` and follow the pattern `tests/**/*.test.ts`.
- To run the CLI locally after building: `node dist/cli.js <command>`.
- Node.js >= 20.19.0 is required (see `engines` in `package.json`).
