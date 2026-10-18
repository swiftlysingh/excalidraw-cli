'use strict';

const fs = require('node:fs');

function parse(value) {
  const match = String(value).match(
    /^(?:v)?(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/
  );
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function compare(a, b) {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

function format([major, minor, patch]) {
  return `${major}.${minor}.${patch}`;
}

function tagOf(version) {
  return `v${format(version)}`;
}

function nextMinorAfter([major, minor], used) {
  let nextMinor = minor + 1;
  while (used.has(`${major}.${nextMinor}.0`)) {
    nextMinor += 1;
  }
  return `${major}.${nextMinor}.0`;
}

function nextReleaseVersion(tagText, npmVersions) {
  if (!Array.isArray(npmVersions) || !npmVersions.every((value) => typeof value === 'string')) {
    throw new Error('Unexpected npm versions response');
  }
  const fromTags = String(tagText).split(/\r?\n/).map(parse).filter(Boolean);
  const fromNpm = npmVersions.map(parse).filter(Boolean);
  const versions = [...fromTags, ...fromNpm].sort((a, b) => compare(b, a));
  if (!versions.length) throw new Error('No stable release version found.');
  const used = new Set(versions.map(format));
  return nextMinorAfter(versions[0], used);
}

function flattenReleases(payload) {
  if (!Array.isArray(payload)) {
    throw new Error('Unexpected GitHub releases response');
  }
  const releases = payload.every(Array.isArray) ? payload.flat() : payload;
  if (!releases.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
    throw new Error('Unexpected GitHub releases response');
  }
  return releases;
}

function isPublishedRelease(release) {
  return (
    release.draft !== true &&
    release.prerelease !== true &&
    release.isDraft !== true &&
    release.isPrerelease !== true
  );
}

function previousReleaseTag(currentTag, releasesPayload) {
  const current = parse(currentTag);
  if (!current) throw new Error(`Invalid release tag: ${currentTag}`);
  const previous = flattenReleases(releasesPayload)
    .filter(isPublishedRelease)
    .map((release) => parse(release.tag_name || release.tagName))
    .filter(Boolean)
    .filter((version) => compare(version, current) < 0)
    .sort(compare)
    .at(-1);
  return previous ? tagOf(previous) : '';
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function main(command) {
  switch (command) {
    case 'next': {
      const tagText = fs.readFileSync(`${process.env.RUNNER_TEMP}/release-tags`, 'utf8');
      const npmVersions = readJson(`${process.env.RUNNER_TEMP}/npm-versions.json`);
      process.stdout.write(`${nextReleaseVersion(tagText, npmVersions)}\n`);
      return;
    }
    case 'previous': {
      const releases = readJson(`${process.env.RUNNER_TEMP}/github-releases.json`);
      process.stdout.write(`${previousReleaseTag(process.env.RELEASE_TAG, releases)}\n`);
      return;
    }
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

if (require.main === module) {
  main(process.argv[2]);
}

module.exports = {
  nextMinorAfter,
  nextReleaseVersion,
  parse,
  previousReleaseTag,
};
