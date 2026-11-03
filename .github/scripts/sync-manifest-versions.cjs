'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const MANIFESTS = ['.claude-plugin/plugin.json', 'gemini-extension.json'];

// SemVer 2.0.0, including prerelease and build metadata: https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

function isSemVer(version) {
  return typeof version === 'string' && SEMVER.test(version);
}

function syncManifestVersions(root = process.cwd()) {
  const pkgPath = path.join(root, 'package.json');
  const version = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
  if (!isSemVer(version)) {
    throw new Error(`Invalid package.json version: ${version}`);
  }

  const updated = [];
  for (const relative of MANIFESTS) {
    const file = path.join(root, relative);
    if (!fs.existsSync(file)) continue;

    const source = fs.readFileSync(file, 'utf8');
    const manifest = JSON.parse(source);
    if (typeof manifest.version !== 'string') {
      throw new Error(`${relative} is missing a version`);
    }
    if (manifest.version === version) continue;

    const next = source.replace(/("version"\s*:\s*")(?:\\.|[^"\\])*(")/, `$1${version}$2`);
    const parsed = JSON.parse(next);
    if (parsed.version !== version) {
      throw new Error(`Failed to update version in ${relative}`);
    }
    fs.writeFileSync(file, next);
    updated.push(relative);
  }

  return { version, updated };
}

if (require.main === module) {
  const { version, updated } = syncManifestVersions();
  // Match npm's package-root repository check, including worktree .git files.
  if (process.argv.includes('--stage') && fs.existsSync('.git')) {
    const manifests = MANIFESTS.filter((file) => fs.existsSync(file));
    if (manifests.length) execFileSync('git', ['add', '--', ...manifests], { stdio: 'inherit' });
  }
  process.stdout.write(
    updated.length
      ? `Synced ${updated.join(', ')} to ${version}\n`
      : `Manifest versions already ${version}\n`
  );
}

module.exports = { MANIFESTS, isSemVer, syncManifestVersions };
