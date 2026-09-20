import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const { load } = createRequire(import.meta.url)('js-yaml');
const workflow = load(readFileSync(resolve('.github/workflows/release.yml'), 'utf8'));
const steps: { name: string; run?: string }[] = workflow.jobs.release.steps;
const version = JSON.parse(readFileSync(resolve('package.json'), 'utf8')).version;
let directory: string;

function runStep(name: string, env: Record<string, string> = {}) {
  const script = steps.find((step) => step.name === name)?.run;
  if (!script) throw new Error(`Missing release step: ${name}`);
  return spawnSync('bash', ['-e', '-o', 'pipefail', '-c', script], {
    cwd: directory,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${directory}:${process.env.PATH}`,
      RUNNER_TEMP: directory,
      GITHUB_OUTPUT: join(directory, 'output'),
      RELEASE_TAG: `v${version}`,
      GITHUB_REPOSITORY: 'swiftlysingh/excalidraw-cli',
      TARBALL_URL: `https://registry.npmjs.org/@swiftlysingh/excalidraw-cli/-/excalidraw-cli-${version}.tgz`,
      TARBALL_SHA256: 'a'.repeat(64),
      NODE_AUTH_TOKEN: 'test-token',
      HOMEBREW_TAP_GITHUB_TOKEN: 'test-token',
      NPM_VERSIONS: JSON.stringify(['1.0.0']),
      NPM_VIEW_STATUS: '0',
      NPM_PUBLISH_STATUS: '0',
      ...env,
    },
  });
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'excalidraw-release-test-'));
  writeFileSync(
    join(directory, 'package.json'),
    JSON.stringify({ name: '@swiftlysingh/excalidraw-cli', version })
  );
  writeFileSync(join(directory, 'calls'), '');
  writeFileSync(
    join(directory, 'npm'),
    `#!/bin/bash
printf '%s\\n' "$*" >> "$RUNNER_TEMP/calls"
case "$1" in
  view) printf '%s\\n' "$NPM_VERSIONS"; exit "$NPM_VIEW_STATUS" ;;
  publish) exit "$NPM_PUBLISH_STATUS" ;;
  *) exit 99 ;;
esac
`,
    { mode: 0o755 }
  );
});

afterEach(() => rmSync(directory, { recursive: true, force: true }));

describe('release publishing', () => {
  it('publishes an unpublished version', () => {
    expect(runStep('Publish to npm').status).toBe(0);
    expect(readFileSync(join(directory, 'calls'), 'utf8')).toContain('publish --access public');
  });

  it('continues a partial release without republishing an existing version', () => {
    const result = runStep('Publish to npm', { NPM_VERSIONS: JSON.stringify(['1.0.0', version]) });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('already published');
    expect(readFileSync(join(directory, 'calls'), 'utf8')).not.toContain('publish --access public');
  });

  it.each([{ NPM_VIEW_STATUS: '1' }, { NPM_VERSIONS: 'not JSON' }, { NPM_VERSIONS: '{}' }])(
    'stops on registry failure or malformed metadata: %j',
    (env) => {
      expect(runStep('Publish to npm', env).status).not.toBe(0);
      expect(readFileSync(join(directory, 'calls'), 'utf8')).not.toContain(
        'publish --access public'
      );
    }
  );

  it('does not mask publishing failures', () => {
    expect(runStep('Publish to npm', { NPM_PUBLISH_STATUS: '1' }).status).not.toBe(0);
  });
});

describe('release preflight', () => {
  it('accepts the matching tag and rejects a different version', () => {
    expect(runStep('Verify tag matches package version').status).toBe(0);
    expect(
      runStep('Verify tag matches package version', { RELEASE_TAG: 'v0.0.0' }).status
    ).not.toBe(0);
  });

  it('treats manual tag input as data, never shell code', () => {
    expect(
      runStep('Resolve release tag', { RELEASE_TAG: 'v1.0.0\n$(touch injected)' }).status
    ).not.toBe(0);
    expect(() => readFileSync(join(directory, 'injected'))).toThrow();
  });

  it.each(['NODE_AUTH_TOKEN', 'HOMEBREW_TAP_GITHUB_TOKEN'])(
    'rejects missing %s before publishing',
    (secret) => {
      expect(runStep('Check release credentials', { [secret]: '' }).status).not.toBe(0);
      const names = steps.map((step) => step.name);
      expect(names.indexOf('Check release credentials')).toBeLessThan(
        names.indexOf('Publish to npm')
      );
    }
  );

  it('accepts configured credentials without printing their values', () => {
    const result = runStep('Check release credentials');
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).not.toContain('test-token');
  });
});

describe('Homebrew formula generation', () => {
  it('uses the published tarball and exposes the installed executable', () => {
    expect(runStep('Generate Homebrew formula').status).toBe(0);
    const formula = readFileSync(join(directory, 'Formula/excalidraw-cli.rb'), 'utf8');
    expect(formula).toContain(`excalidraw-cli-${version}.tgz`);
    expect(formula).toContain('bin.install_symlink Dir["#{libexec}/bin/*"]');
    expect(formula).toContain('sha256 "' + 'a'.repeat(64) + '"');
  });

  it.each([
    { TARBALL_URL: 'https://registry.npmjs.org/$(touch injected).tgz' },
    { TARBALL_SHA256: 'not-a-checksum' },
  ])('rejects invalid artifact metadata without executing it: %j', (env) => {
    expect(runStep('Generate Homebrew formula', env).status).not.toBe(0);
    expect(() => readFileSync(join(directory, 'injected'))).toThrow();
    expect(() => readFileSync(join(directory, 'Formula/excalidraw-cli.rb'))).toThrow();
  });
});

describe('Homebrew validation before tap publication', () => {
  it.each(['', 'install', 'test'])('propagates Homebrew failures: %s', (failure) => {
    expect(runStep('Generate Homebrew formula').status).toBe(0);
    writeFileSync(
      join(directory, 'brew'),
      `#!/bin/bash
printf '%s\\n' "$*" >> "$RUNNER_TEMP/calls"
case "$1" in
  shellenv) exit 0 ;;
  tap-new) mkdir -p "$RUNNER_TEMP/tap/Formula" ;;
  --repository) printf '%s\\n' "$RUNNER_TEMP/tap" ;;
  install|test) if [ "$1" = "$BREW_FAILURE" ]; then exit 1; fi ;;
  *) exit 99 ;;
esac
`,
      { mode: 0o755 }
    );
    const result = runStep('Validate Homebrew formula', { BREW_FAILURE: failure });
    expect(result.status).toBe(failure ? 1 : 0);
    expect(readFileSync(join(directory, 'tap/Formula/excalidraw-cli.rb'), 'utf8')).toBe(
      readFileSync(join(directory, 'Formula/excalidraw-cli.rb'), 'utf8')
    );
    const calls = readFileSync(join(directory, 'calls'), 'utf8');
    expect(calls).toContain('install --build-from-source local/release-check/excalidraw-cli');
    if (failure !== 'install') expect(calls).toContain('test local/release-check/excalidraw-cli');
    else expect(calls).not.toContain('test local/release-check/excalidraw-cli');
    const names = steps.map((step) => step.name);
    expect(names.indexOf('Generate Homebrew formula')).toBeLessThan(
      names.indexOf('Validate Homebrew formula')
    );
    expect(names.indexOf('Validate Homebrew formula')).toBeLessThan(
      names.indexOf('Push Homebrew formula to tap')
    );
  });
});
