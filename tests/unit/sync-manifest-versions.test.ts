import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const { syncManifestVersions } = createRequire(import.meta.url)(
  resolve('.github/scripts/sync-manifest-versions.cjs')
) as {
  syncManifestVersions: (root?: string) => { version: string; updated: string[] };
};

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

  it('skips missing manifests and already-matching versions', () => {
    const root = setup({
      'package.json': JSON.stringify({ name: 'demo', version: '1.5.1' }),
      'gemini-extension.json': '{"name":"excalidraw-cli","version":"1.5.1"}\n',
    });

    expect(syncManifestVersions(root)).toEqual({ version: '1.5.1', updated: [] });
  });

  it('rejects an invalid package version', () => {
    const root = setup({
      'package.json': JSON.stringify({ name: 'demo', version: '1.5.1-unreleased' }),
    });

    expect(() => syncManifestVersions(root)).toThrow('Invalid package.json version');
  });
});
