'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MANIFESTS = ['.claude-plugin/plugin.json', 'gemini-extension.json'];

function syncManifestVersions(root = process.cwd()) {
  const pkgPath = path.join(root, 'package.json');
  const version = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
  if (typeof version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
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
  process.stdout.write(
    updated.length
      ? `Synced ${updated.join(', ')} to ${version}\n`
      : `Manifest versions already ${version}\n`
  );
}

module.exports = { syncManifestVersions };
