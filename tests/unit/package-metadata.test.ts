import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');

describe('package metadata', () => {
  it('requires Node 20.19.0 or newer', () => {
    const packageJsonPath = join(PROJECT_ROOT, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      engines?: { node?: string };
    };

    expect(packageJson.engines?.node).toBe('>=20.19.0');
  });
});
