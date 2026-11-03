import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const SCRIPT_PATH = resolve('.github/scripts/sync-manifest-versions.cjs');
const {
  MANIFESTS,
  isSemVer,
  syncManifestVersions,
} = createRequire(import.meta.url)(SCRIPT_PATH) as {
  MANIFESTS: string[];
  isSemVer: (version: unknown) => boolean;
  syncManifestVersions: (root?: string) => { version: string; updated: string[] };
};

describe('isSemVer', () => {
  it('accepts stable versions, prereleases, and build metadata', () => {
    expect(isSemVer('1.5.1')).toBe(true);
    expect(isSemVer('1.5.2-0')).toBe(true);
    expect(isSemVer('1.5.1-alpha.1')).toBe(true);
    expect(isSemVer('1.5.1-unreleased')).toBe(true);
    expect(isSemVer('1.5.1+build.5')).toBe(true);
    expect(isSemVer('1.5.1-alpha.1+build.5')).toBe(true);
  });

  it('rejects invalid SemVer strings', () => {
    expect(isSemVer('1.5')).toBe(false);
    expect(isSemVer('v1.5.1')).toBe(false);
    expect(isSemVer('01.5.1')).toBe(false);
    expect(isSemVer('1.5.1-')).toBe(false);
    expect(isSemVer('1.5.1-01')).toBe(false);
  });
});

describe('syncManifestVersions', () => {
  let directory: string;

  afterEach(() => {
    if (directory) rmSync(directory, { recursive: true, force: true });
  });

  function setup(files: Record<string, string>) {
    directory = mkdtempSync(join(tmpdir(), 'sync-manifest-versions-'));
    for (const [relative, contents] of Object.entries(files)) {
      const file = join(directory, relative);
      mkdirSync(join(file, '..'), { recursive: true });
      writeFileSync(file, contents);
    }
    return directory;
  }

  it('copies package.json version into plugin and Gemini manifests', () => {
    const root = setup({
      'package.json': JSON.stringify({ name: 'demo', version: '1.6.0' }),
      '.claude-plugin/plugin.json': '{\n  "name": "excalidraw-cli",\n  "version": "1.0.0"\n}\n',
      'gemini-extension.json': '{\n  "name": "excalidraw-cli",\n  "version": "1.0.0"\n}\n',
    });

    expect(syncManifestVersions(root)).toEqual({
      version: '1.6.0',
      updated: ['.claude-plugin/plugin.json', 'gemini-extension.json'],
    });
    expect(JSON.parse(readFileSync(join(root, '.claude-plugin/plugin.json'), 'utf8')).version).toBe(
      '1.6.0'
    );
    expect(JSON.parse(readFileSync(join(root, 'gemini-extension.json'), 'utf8')).version).toBe(
      '1.6.0'
    );
  });

  it('syncs SemVer prerelease versions such as 1.5.2-0', () => {
    const root = setup({
      'package.json': JSON.stringify({ name: 'demo', version: '1.5.2-0' }),
      '.claude-plugin/plugin.json': '{\n  "name": "excalidraw-cli",\n  "version": "1.5.1"\n}\n',
      'gemini-extension.json': '{\n  "name": "excalidraw-cli",\n  "version": "1.5.1"\n}\n',
    });

    expect(syncManifestVersions(root)).toEqual({
      version: '1.5.2-0',
      updated: MANIFESTS,
    });
    expect(JSON.parse(readFileSync(join(root, '.claude-plugin/plugin.json'), 'utf8')).version).toBe(
      '1.5.2-0'
    );
    expect(JSON.parse(readFileSync(join(root, 'gemini-extension.json'), 'utf8')).version).toBe(
      '1.5.2-0'
    );
  });

  it('skips missing manifests and already-matching versions', () => {
    const root = setup({
      'package.json': JSON.stringify({ name: 'demo', version: '1.5.1' }),
      'gemini-extension.json': '{"name":"excalidraw-cli","version":"1.5.1"}\n',
    });

    expect(syncManifestVersions(root)).toEqual({ version: '1.5.1', updated: [] });
  });

  it('rejects an invalid package version', () => {
    const root = setup({
      'package.json': JSON.stringify({ name: 'demo', version: 'v1.5.1' }),
    });

    expect(() => syncManifestVersions(root)).toThrow('Invalid package.json version');
  });
});
