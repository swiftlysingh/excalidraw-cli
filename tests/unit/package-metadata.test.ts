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

function rootLockfileDependencyVersion(lockfile: Record<string, unknown>, name: string): string {
  const packages = lockfile.packages as
    | Record<string, { dependencies?: Record<string, string> }>
    | undefined;
  const version = packages?.['']?.dependencies?.[name];
  if (!version) {
    throw new Error(`missing ${name} root lockfile dependency`);
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
    author?: { name?: string; email?: string; url?: string };
    keywords?: string[];
    scripts?: Record<string, string>;
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

  it('keeps Claude plugin and Gemini extension versions in sync with package.json', () => {
    const plugin = readJson('.claude-plugin/plugin.json');
    const gemini = readJson('gemini-extension.json');

    expect(plugin.version).toBe(packageJson.version);
    expect(gemini.version).toBe(packageJson.version);
  });

  it('stages plugin and Gemini manifests from the npm version lifecycle', () => {
    expect(packageJson.scripts?.version).toContain('sync-manifest-versions');
    expect(packageJson.scripts?.version).toContain('--stage');
  });

  it('declares npm author metadata and discovery keywords', () => {
    expect(packageJson.author?.name).toBe('Pushpinder Singh');
    expect(packageJson.author?.email).toBe('sayhi@swiftlysingh.com');
    expect(packageJson.author?.url).toBe('https://github.com/swiftlysingh');
    expect(packageJson.keywords).toEqual(
      expect.arrayContaining([
        'excalidraw',
        'diagram',
        'cli',
        'svg',
        'png',
        'dot',
        'graphviz',
        'text-to-diagram',
        'diagram-as-code',
        'agent-skill',
        'claude-code',
        'gemini-cli',
        'codex',
      ])
    );
    expect(packageJson.keywords).not.toContain('mcp-alternative');
  });

  it('is not behind any stable git tag', () => {
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

    // Off-main releases leave package.json on main equal to the latest tag.
    // Reuse is prevented by the release workflow, which picks the next unused
    // minor from tags and npm. This only fails when main has gone backwards.
    for (const tag of tagged) {
      expect(pkg![0] - tag[0] || pkg![1] - tag[1] || pkg![2] - tag[2]).toBeGreaterThanOrEqual(0);
    }
  });

  it('pins @excalidraw/utils to a released version, not a test prerelease', () => {
    const pkg = readJson('package.json');
    const lockfile = readJson('package-lock.json');
    const declared = declaredDependencyVersion(pkg, '@excalidraw/utils');
    const lockfileDeclared = rootLockfileDependencyVersion(lockfile, '@excalidraw/utils');
    const locked = lockedPackageVersion(lockfile, '@excalidraw/utils');

    expect(isPrereleaseRange(declared)).toBe(false);
    expect(isPrereleaseRange(lockfileDeclared)).toBe(false);
    expect(isPrereleaseRange(locked)).toBe(false);
    expect(locked).toBe(declared.replace(/^[~^>=<\s]+/, ''));
  });
});
