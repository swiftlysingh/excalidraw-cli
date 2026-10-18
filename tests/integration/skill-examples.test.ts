import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI_PATH = join(PROJECT_ROOT, 'dist', 'cli.js');
const SKILL_DIR = join(PROJECT_ROOT, 'skills', 'excalidraw');
const SKILL_PATH = join(SKILL_DIR, 'SKILL.md');
const EXAMPLES_DIR = join(SKILL_DIR, 'examples');

function extractFencedBlocks(markdown: string): Array<{ lang: string; body: string }> {
  const blocks: Array<{ lang: string; body: string }> = [];
  const fence = /```([^\n]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(markdown)) !== null) {
    blocks.push({ lang: match[1].trim(), body: match[2].replace(/\n$/, '') });
  }
  return blocks;
}

function runBash(script: string, cwd: string): { status: number; stdout: string; stderr: string } {
  const result = spawnSync('bash', ['-lc', script], {
    cwd,
    encoding: 'utf8',
    timeout: 60000,
    env: {
      ...process.env,
      PATH: `${cwd}/bin:${process.env.PATH ?? ''}`,
    },
  });
  if (result.error) throw result.error;
  return {
    status: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

describe('agent skill examples', () => {
  const skill = readFileSync(SKILL_PATH, 'utf8');
  const blocks = extractFencedBlocks(skill);

  it('keeps Agent Skills frontmatter valid', () => {
    expect(skill.startsWith('---\n')).toBe(true);
    expect(skill).toMatch(/^name: excalidraw$/m);
    expect(skill).toMatch(/^description: .+/m);
    expect(skill).toMatch(/^license: MIT$/m);
  });

  it('runs every bash example against the built CLI', { timeout: 180000 }, () => {
    const work = mkdtempSync(join(tmpdir(), 'excalidraw-skill-'));
    const bin = join(work, 'bin');
    mkdirSync(bin, { recursive: true });
    writeFileSync(
      join(bin, 'excalidraw-cli'),
      `#!/usr/bin/env bash\nexec ${JSON.stringify(process.execPath)} ${JSON.stringify(CLI_PATH)} "$@"\n`
    );
    chmodSync(join(bin, 'excalidraw-cli'), 0o755);

    try {
      const bashBlocks = blocks.filter((block) => block.lang === 'bash');
      expect(bashBlocks.length).toBeGreaterThan(0);

      for (const [index, block] of bashBlocks.entries()) {
        const result = runBash(block.body, work);
        expect(result.status, `bash block ${index + 1} failed:\n${block.body}\n${result.stderr}`).toBe(
          0
        );
      }
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });

  it('parses DSL, JSON, and example files from the skill', { timeout: 60000 }, () => {
    const work = mkdtempSync(join(tmpdir(), 'excalidraw-skill-parse-'));

    try {
      const snippetBlocks = blocks.filter((block) => block.lang === '' || block.lang === 'json');
      expect(snippetBlocks.length).toBeGreaterThan(0);

      for (const [index, block] of snippetBlocks.entries()) {
        const format = block.lang === 'json' ? 'json' : 'dsl';
        const input = join(work, `snippet-${index}.${format === 'json' ? 'json' : 'dsl'}`);
        writeFileSync(input, `${block.body}\n`);
        const result = spawnSync(process.execPath, [CLI_PATH, 'parse', input, '--format', format], {
          cwd: work,
          encoding: 'utf8',
        });
        expect(
          result.status,
          `snippet ${index + 1} (${format}) failed:\n${block.body}\n${result.stderr}`
        ).toBe(0);
        expect(result.stdout).toContain('Parse successful!');
      }

      const exampleFiles = readdirSync(EXAMPLES_DIR).filter((name) =>
        /\.(dsl|dot|gv|json)$/.test(name)
      );
      expect(exampleFiles.length).toBeGreaterThan(0);

      for (const name of exampleFiles) {
        const input = join(EXAMPLES_DIR, name);
        const parsed = spawnSync(process.execPath, [CLI_PATH, 'parse', input], {
          cwd: work,
          encoding: 'utf8',
        });
        expect(parsed.status, `${name} parse failed:\n${parsed.stderr}`).toBe(0);

        const output = join(work, `${name}.excalidraw`);
        const created = spawnSync(process.execPath, [CLI_PATH, 'create', input, '-o', output], {
          cwd: work,
          encoding: 'utf8',
        });
        expect(created.status, `${name} create failed:\n${created.stderr}`).toBe(0);
        expect(created.stdout).toContain(`Created: ${output}`);
        expect(JSON.parse(readFileSync(output, 'utf8')).type).toBe('excalidraw');
      }
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });
});
