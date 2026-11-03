import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const SCRIPT_PATH = resolve('.github/scripts/sync-manifest-versions.cjs');
const realPackage = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const manifests = ['.claude-plugin/plugin.json', 'gemini-extension.json'];

describe('npm version lifecycle', () => {
  let directory: string;

  afterEach(() => {
    if (directory) rmSync(directory, { recursive: true, force: true });
  });

  it.each([true, false])('syncs manifests with a Git repository: %s', (withGit) => {
    directory = mkdtempSync(join(tmpdir(), 'npm-version-'));
    writeFileSync(
      join(directory, 'package.json'),
      `${JSON.stringify(
        {
          name: 'demo',
          version: '1.5.1',
          scripts: {
            'sync-manifest-versions': `node ${JSON.stringify(SCRIPT_PATH)}`,
            version: realPackage.scripts.version,
          },
        },
        null,
        2
      )}\n`
    );
    mkdirSync(join(directory, '.claude-plugin'));
    for (const manifest of manifests) {
      writeFileSync(join(directory, manifest), '{"name":"excalidraw-cli","version":"1.0.0"}\n');
    }

    function git(...args: string[]) {
      const result = spawnSync('git', args, { cwd: directory, encoding: 'utf8' });
      if (result.status !== 0) throw new Error(result.stderr || result.stdout);
      return result.stdout.trim();
    }

    if (withGit) {
      git('init', '-b', 'main');
      git('config', 'user.name', 'Version test');
      git('config', 'user.email', 'version@example.com');
      git('config', 'commit.gpgSign', 'false');
      git('config', 'tag.gpgSign', 'false');
      git('add', 'package.json', ...manifests);
      git('commit', '-m', 'Initial package');
    }

    const bumped = spawnSync(
      'npm',
      ['version', 'prerelease', '--git-tag-version', '--no-sign-git-tag'],
      {
        cwd: directory,
        encoding: 'utf8',
        shell: process.platform === 'win32',
      }
    );
    expect(bumped.status, bumped.error?.message || bumped.stderr || bumped.stdout).toBe(0);
    for (const file of ['package.json', ...manifests]) {
      expect(JSON.parse(readFileSync(join(directory, file), 'utf8')).version).toBe('1.5.2-0');
    }
    if (withGit) {
      for (const manifest of manifests) {
        expect(JSON.parse(git('show', `HEAD:${manifest}`)).version).toBe('1.5.2-0');
        expect(JSON.parse(git('show', `v1.5.2-0:${manifest}`)).version).toBe('1.5.2-0');
      }
      expect(git('status', '--porcelain')).toBe('');
    }
  });
});
