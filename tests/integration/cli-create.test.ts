import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI_PATH = join(PROJECT_ROOT, 'dist', 'cli.js');

function runCLI(args: string[]) {
  const result = spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  });

  if (result.error) throw result.error;
  return result;
}

function nodePositions(output: string): Array<{ x: number; y: number }> {
  const file = JSON.parse(output);
  return file.elements
    .filter((element: { type: string }) => element.type === 'rectangle')
    .map((element: { x: number; y: number }) => ({ x: element.x, y: element.y }));
}

describe('CLI create options', () => {
  it('reports the package version', () => {
    const result = runCLI(['--version']);

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('1.3.0');
  });

  it('preserves input spacing unless --spacing is supplied', () => {
    const inline = '@spacing 200\n[A] -> [B]\n[A] -> [C]';
    const inputSpacing = runCLI(['create', '--inline', inline, '--output', '-']);
    const sameExplicitSpacing = runCLI([
      'create',
      '--inline',
      inline,
      '--spacing',
      '200',
      '--output',
      '-',
    ]);
    const overriddenSpacing = runCLI([
      'create',
      '--inline',
      inline,
      '--spacing',
      '10',
      '--output',
      '-',
    ]);

    expect(inputSpacing.status).toBe(0);
    expect(nodePositions(inputSpacing.stdout)).toEqual(nodePositions(sameExplicitSpacing.stdout));
    expect(nodePositions(inputSpacing.stdout)).not.toEqual(nodePositions(overriddenSpacing.stdout));
  });

  it('creates undirected DOT edges without arrowheads', () => {
    const result = runCLI([
      'create',
      '--inline',
      'graph { A -- B }',
      '--format',
      'dot',
      '--output',
      '-',
    ]);
    const file = JSON.parse(result.stdout);
    const arrow = file.elements.find((element: { type: string }) => element.type === 'arrow');

    expect(result.status).toBe(0);
    expect(arrow).toMatchObject({ startArrowhead: null, endArrowhead: null });
  });

  it.each([
    [['create', '--inline', '[A]', '--format', 'yaml'], '--format must be'],
    [['parse', 'package.json', '--format', 'yaml'], '--format must be'],
    [['create', '--inline', '[A]', '--direction', 'sideways'], '--direction must be'],
    [['create', '--inline', '[A]', '--spacing', '12px'], '--spacing must be'],
    [['create', '--inline', '[A]', '--spacing', '-1'], '--spacing must be'],
  ])('rejects invalid options: %j', (args, message) => {
    const result = runCLI(args);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(message);
  });
});
