import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const {
  nextMinorAfter,
  nextReleaseVersion,
  previousReleaseTag,
} = createRequire(import.meta.url)(resolve('.github/scripts/release-version.cjs')) as {
  nextMinorAfter: (highest: [number, number, number], used: Set<string>) => string;
  nextReleaseVersion: (tagText: string, npmVersions: string[]) => string;
  previousReleaseTag: (currentTag: string, releases: unknown) => string;
};

describe('nextMinorAfter', () => {
  it('does not skip an extra minor when the next computed version is already taken', () => {
    expect(nextMinorAfter([1, 4, 0], new Set(['1.4.0', '1.5.0']))).toBe('1.6.0');
    expect(nextMinorAfter([1, 4, 0], new Set(['1.4.0', '1.5.0', '1.6.0']))).toBe('1.7.0');
  });
});

describe('nextReleaseVersion', () => {
  it('increments the highest stable minor from tags and npm', () => {
    expect(nextReleaseVersion('v1.2.0\nv99.0.0-beta.1\n', ['1.0.0'])).toBe('1.3.0');
    expect(nextReleaseVersion('v1.9.5\nv1.10.2\n', ['1.0.0'])).toBe('1.11.0');
    expect(nextReleaseVersion('v1.2.0\nv1.3.0\n', ['1.1.0', '1.2.0', '1.4.0'])).toBe('1.5.0');
  });

  it('uses the next free minor after a leftover occupied version', () => {
    expect(nextReleaseVersion('v1.2.0\nv1.5.0\n', ['1.2.0', '1.4.0', '1.5.0'])).toBe('1.6.0');
  });
});

describe('previousReleaseTag', () => {
  const published = [
    { tag_name: 'v1.5.0', draft: false, prerelease: false },
    { tag_name: 'v1.4.0', draft: false, prerelease: false },
    { tag_name: 'v1.2.0', draft: false, prerelease: false },
    { tag_name: 'v1.0.0', draft: false, prerelease: false },
  ];

  it('picks the highest published GitHub release lower than the new version', () => {
    expect(previousReleaseTag('v1.5.0', [published])).toBe('v1.4.0');
    expect(previousReleaseTag('v1.6.0', published)).toBe('v1.5.0');
  });

  it('ignores leftover tags and unpublished GitHub releases', () => {
    expect(
      previousReleaseTag('v1.5.0', [
        ...published,
        { tag_name: 'v1.4.1', draft: true, prerelease: false },
        { tag_name: 'v1.4.2', draft: false, prerelease: true },
      ])
    ).toBe('v1.4.0');
  });

  it('returns empty for the first published release', () => {
    expect(previousReleaseTag('v1.0.0', published)).toBe('');
    expect(previousReleaseTag('v0.1.0', [])).toBe('');
  });

  it('rejects malformed release payloads', () => {
    expect(() => previousReleaseTag('v1.5.0', { tag_name: 'v1.4.0' })).toThrow(
      'Unexpected GitHub releases response'
    );
    expect(() => previousReleaseTag('not-a-tag', published)).toThrow('Invalid release tag');
  });
});
