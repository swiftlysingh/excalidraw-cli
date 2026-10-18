import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');

function parseStableVersion(value: string): [number, number, number] | null {
  const match = value.trim().match(/^(?:v)?(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

describe('package metadata', () => {
  const packageJson = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf8')) as {
    version: string;
    engines?: { node?: string };
  };

  it('requires Node 20.19.0 or newer', () => {
    expect(packageJson.engines?.node).toBe('>=20.19.0');
  });

  it('keeps package.json, changelog, and the man page on the same unreleased version', () => {
    const changelog = readFileSync(join(PROJECT_ROOT, 'CHANGELOG.md'), 'utf8');
    const heading = changelog.match(/^## (\S+) - Unreleased$/m);
    const manPage = readFileSync(join(PROJECT_ROOT, 'man/excalidraw-cli.1'), 'utf8');

    expect(heading?.[1]).toBe(packageJson.version);
    expect(manPage).toContain(`excalidraw-cli ${packageJson.version}`);
  });

  it('stays ahead of every stable git tag so the next release cannot reuse one', () => {
    const pkg = parseStableVersion(packageJson.version);
    expect(pkg).not.toBeNull();

    const tags = spawnSync('git', ['tag', '--list'], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    });
    expect(tags.status, tags.stderr).toBe(0);

    const tagged = tags.stdout
      .split('\n')
      .map(parseStableVersion)
      .filter((value): value is [number, number, number] => value !== null);
    expect(tagged.length).toBeGreaterThan(0);

    for (const tag of tagged) {
      expect(pkg![0] - tag[0] || pkg![1] - tag[1] || pkg![2] - tag[2]).toBeGreaterThan(0);
    }
  });
});
