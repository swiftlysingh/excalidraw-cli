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

function readJson(relativePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(PROJECT_ROOT, relativePath), 'utf8')) as Record<
    string,
    unknown
  >;
}

function declaredDependencyVersion(packageJson: Record<string, unknown>, name: string): string {
  const dependencies = packageJson.dependencies as Record<string, string> | undefined;
  const version = dependencies?.[name];
  if (!version) {
    throw new Error(`missing ${name} dependency`);
  }
  return version;
}

function lockedPackageVersion(lockfile: Record<string, unknown>, name: string): string {
  const packages = lockfile.packages as Record<string, { version?: string }> | undefined;
  const version = packages?.[`node_modules/${name}`]?.version;
  if (!version) {
    throw new Error(`missing ${name} lockfile entry`);
  }
  return version;
}

/** True for versions like 0.1.3-test32; false for 0.1.5 or ^0.1.5. */
function isPrereleaseRange(version: string): boolean {
  const stripped = version.replace(/^[~^>=<\s]+/, '');
  return stripped.includes('-');
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

  it('pins @excalidraw/utils to a released version, not a test prerelease', () => {
    const pkg = readJson('package.json');
    const lockfile = readJson('package-lock.json');
    const declared = declaredDependencyVersion(pkg, '@excalidraw/utils');
    const locked = lockedPackageVersion(lockfile, '@excalidraw/utils');

    expect(isPrereleaseRange(declared)).toBe(false);
    expect(isPrereleaseRange(locked)).toBe(false);
    expect(locked).toBe(declared.replace(/^[~^>=<\s]+/, ''));
  });
});
