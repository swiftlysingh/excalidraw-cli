import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const JSON_FLOW = JSON.stringify({
  nodes: [
    { id: 'start', type: 'ellipse', label: 'Start' },
    { id: 'work', type: 'rectangle', label: 'Work' },
  ],
  edges: [{ from: 'start', to: 'work', label: 'go' }],
});

function svgSize(svg: string): { width: number; height: number } {
  const width = parseFloat(svg.match(/\bwidth="([^"]+)"/)?.[1] || '0');
  const height = parseFloat(svg.match(/\bheight="([^"]+)"/)?.[1] || '0');
  return { width, height };
}

function pngSize(png: Buffer): { width: number; height: number } {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe('packed CLI', () => {
  let prefix = '';
  let work = '';
  let bin = '';

  beforeAll(() => {
    prefix = mkdtempSync(join(tmpdir(), 'excalidraw-cli-pack-'));
    work = mkdtempSync(join(tmpdir(), 'excalidraw-cli-e2e-'));
    const tarball = execFileSync('npm', ['pack', '--pack-destination', prefix], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    }).trim();
    execFileSync('npm', ['install', '--prefix', prefix, join(prefix, tarball)], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    });
    bin = join(prefix, 'node_modules', '.bin', 'excalidraw-cli');
  }, 60000);

  afterAll(() => {
    rmSync(prefix, { recursive: true, force: true });
    rmSync(work, { recursive: true, force: true });
  });

  function run(args: string[]): string {
    return execFileSync(bin, args, {
      cwd: work,
      encoding: 'utf8',
      timeout: 60000,
    });
  }

  it('creates from DSL, JSON, and DOT then converts SVG/PNG with theme, background, padding, and embed-scene', () => {
    expect(run(['create', '--inline', '(Start) -> [Process]', '-o', 'dsl.excalidraw'])).toContain(
      'Created:'
    );
    expect(
      run(['create', '--format', 'json', '--inline', JSON_FLOW, '-o', 'json.excalidraw'])
    ).toContain('Created:');
    expect(
      run([
        'create',
        '--format',
        'dot',
        '--inline',
        'digraph { A [shape=ellipse]; B [shape=box]; A -> B; }',
        '-o',
        'dot.excalidraw',
      ])
    ).toContain('Created:');

    for (const scene of ['dsl', 'json', 'dot'] as const) {
      run(['convert', `${scene}.excalidraw`, '--format', 'png', '-o', `${scene}.png`]);
      const png = readFileSync(join(work, `${scene}.png`));
      expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    }

    run(['convert', 'dsl.excalidraw', '--format', 'svg', '-o', 'dsl.svg']);
    run(['convert', 'dsl.excalidraw', '--format', 'svg', '--dark', '-o', 'dsl-dark.svg']);
    run([
      'convert',
      'dsl.excalidraw',
      '--format',
      'svg',
      '--no-export-background',
      '-o',
      'dsl-nobg.svg',
    ]);
    run(['convert', 'dsl.excalidraw', '--format', 'svg', '--padding', '50', '-o', 'dsl-pad.svg']);
    run(['convert', 'dsl.excalidraw', '--format', 'svg', '--embed-scene', '-o', 'dsl-embed.svg']);

    const defaultSvg = readFileSync(join(work, 'dsl.svg'), 'utf8');
    const darkSvg = readFileSync(join(work, 'dsl-dark.svg'), 'utf8');
    const nobgSvg = readFileSync(join(work, 'dsl-nobg.svg'), 'utf8');
    const paddedSvg = readFileSync(join(work, 'dsl-pad.svg'), 'utf8');
    const embedSvg = readFileSync(join(work, 'dsl-embed.svg'), 'utf8');

    expect(defaultSvg).toContain('<svg');
    expect(defaultSvg).toMatch(/<rect x="0" y="0"[^>]*fill="#ffffff"/);
    expect(darkSvg).not.toBe(defaultSvg);
    expect(darkSvg).toMatch(/<rect x="0" y="0"[^>]*fill="#121212"/);
    expect(darkSvg).not.toContain('filter="invert');
    expect(nobgSvg).not.toMatch(/<rect x="0" y="0"[^>]*fill="#ffffff"/);
    expect(svgSize(paddedSvg).width).toBeGreaterThan(svgSize(defaultSvg).width);
    expect(embedSvg).toMatch(/payload-type|payload-start/);

    run(['convert', 'dsl.excalidraw', '--format', 'png', '--dark', '-o', 'dsl-dark.png']);
    const darkPng = readFileSync(join(work, 'dsl-dark.png'));
    expect(darkPng.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    expect(pngSize(darkPng)).toEqual(svgSize(darkSvg));
  }, 120000);
});
