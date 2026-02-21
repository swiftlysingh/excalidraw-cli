import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { execFileSync } from 'child_process';
import { readFileSync, existsSync, unlinkSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createMinimalFile } from '../../helpers/fixtures.js';

const PROJECT_ROOT = join(import.meta.dirname, '..', '..', '..');
const CLI_PATH = join(PROJECT_ROOT, 'dist', 'cli.js');
const TMP_DIR = join(PROJECT_ROOT, 'tests', 'tmp');

// PNG magic bytes
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

/**
 * Run the CLI with given arguments.
 * Returns { stdout, stderr } or throws on non-zero exit.
 */
function runCLI(args: string[], options?: { expectError?: boolean }): {
  stdout: string;
  stderr: string;
} {
  try {
    const stdout = execFileSync('node', [CLI_PATH, ...args], {
      encoding: 'utf-8',
      cwd: TMP_DIR,
      timeout: 60000,
    });
    return { stdout, stderr: '' };
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; status?: number };
    if (options?.expectError) {
      return { stdout: err.stdout || '', stderr: err.stderr || '' };
    }
    throw error;
  }
}

/**
 * Helper to clean up temporary files after tests.
 */
const filesToClean: string[] = [];

function tmpFile(name: string): string {
  const path = join(TMP_DIR, name);
  filesToClean.push(path);
  return path;
}

beforeAll(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  for (const f of filesToClean) {
    try {
      if (existsSync(f)) unlinkSync(f);
    } catch {
      // ignore
    }
  }
  filesToClean.length = 0;
});

describe('CLI export command', () => {
  // Ensure tmp dir exists before tests
  it('should have a working CLI binary', () => {
    expect(existsSync(CLI_PATH)).toBe(true);
  });

  describe('create command with --export-as', () => {
    it('should create both .excalidraw and .svg when --export-as svg', () => {
      const outFile = tmpFile('cli-test.excalidraw');

      runCLI([
        'create',
        '--inline',
        '[A] -> [B]',
        '-o',
        outFile,
        '--export-as',
        'svg',
      ]);

      // Should create the .excalidraw file
      expect(existsSync(outFile)).toBe(true);

      // Should also create the .svg file
      const svgFile = outFile.replace('.excalidraw', '.svg');
      filesToClean.push(svgFile);
      expect(existsSync(svgFile)).toBe(true);

      // Verify SVG content
      const svgContent = readFileSync(svgFile, 'utf-8');
      expect(svgContent).toContain('<svg');
      expect(svgContent).toContain('</svg>');
    }, 60000);

    it('should create both .excalidraw and .png when --export-as png', () => {
      const outFile = tmpFile('cli-test-png.excalidraw');

      runCLI([
        'create',
        '--inline',
        '[A] -> [B]',
        '-o',
        outFile,
        '--export-as',
        'png',
      ]);

      expect(existsSync(outFile)).toBe(true);

      const pngFile = outFile.replace('.excalidraw', '.png');
      filesToClean.push(pngFile);
      expect(existsSync(pngFile)).toBe(true);

      // Verify PNG magic bytes
      const pngData = readFileSync(pngFile);
      expect(pngData.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    }, 60000);

    it('should respect --dark-mode flag in create command', () => {
      const outFile = tmpFile('cli-dark.excalidraw');

      runCLI([
        'create',
        '--inline',
        '[A] -> [B]',
        '-o',
        outFile,
        '--export-as',
        'svg',
        '--dark-mode',
      ]);

      const svgFile = outFile.replace('.excalidraw', '.svg');
      filesToClean.push(svgFile);
      expect(existsSync(svgFile)).toBe(true);

      const svgContent = readFileSync(svgFile, 'utf-8');
      expect(svgContent).toContain('<svg');
    }, 60000);

    it('should respect --no-export-background in create command', () => {
      const outFile = tmpFile('cli-nobg.excalidraw');

      runCLI([
        'create',
        '--inline',
        '[A] -> [B]',
        '-o',
        outFile,
        '--export-as',
        'svg',
        '--no-export-background',
      ]);

      const svgFile = outFile.replace('.excalidraw', '.svg');
      filesToClean.push(svgFile);
      expect(existsSync(svgFile)).toBe(true);
    }, 60000);

    it('should respect --export-scale in create command', () => {
      const outFile = tmpFile('cli-scale.excalidraw');

      runCLI([
        'create',
        '--inline',
        '[A] -> [B]',
        '-o',
        outFile,
        '--export-as',
        'png',
        '--export-scale',
        '2',
      ]);

      const pngFile = outFile.replace('.excalidraw', '.png');
      filesToClean.push(pngFile);
      expect(existsSync(pngFile)).toBe(true);

      const pngData = readFileSync(pngFile);
      expect(pngData.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
      // Scale 2 should produce a larger file
      expect(pngData.length).toBeGreaterThan(1000);
    }, 60000);

    it('should fail with invalid --export-as format', () => {
      const outFile = tmpFile('cli-bad-format.excalidraw');

      const { stderr } = runCLI(
        [
          'create',
          '--inline',
          '[A] -> [B]',
          '-o',
          outFile,
          '--export-as',
          'gif',
        ],
        { expectError: true }
      );

      expect(stderr).toContain('--export-as must be "png" or "svg"');
    }, 60000);
  });

  describe('standalone export command', () => {
    it('should export existing .excalidraw to SVG', () => {
      // First, write a test .excalidraw file
      const inputFile = tmpFile('export-test.excalidraw');
      writeFileSync(inputFile, JSON.stringify(createMinimalFile()), 'utf-8');

      const svgFile = tmpFile('export-test.svg');

      runCLI(['export', inputFile, '-F', 'svg', '-o', svgFile]);

      expect(existsSync(svgFile)).toBe(true);
      const svgContent = readFileSync(svgFile, 'utf-8');
      expect(svgContent).toContain('<svg');
    }, 60000);

    it('should export existing .excalidraw to PNG', () => {
      const inputFile = tmpFile('export-test-png.excalidraw');
      writeFileSync(inputFile, JSON.stringify(createMinimalFile()), 'utf-8');

      const pngFile = tmpFile('export-test-png.png');

      runCLI(['export', inputFile, '-F', 'png', '-o', pngFile]);

      expect(existsSync(pngFile)).toBe(true);
      const pngData = readFileSync(pngFile);
      expect(pngData.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    }, 60000);

    it('should auto-name output file from input when -o not provided', () => {
      const inputFile = tmpFile('autoname.excalidraw');
      writeFileSync(inputFile, JSON.stringify(createMinimalFile()), 'utf-8');

      runCLI(['export', inputFile, '-F', 'svg']);

      const autoSvg = inputFile.replace('.excalidraw', '.svg');
      filesToClean.push(autoSvg);
      expect(existsSync(autoSvg)).toBe(true);
    }, 60000);

    it('should export with --verbose flag', () => {
      const inputFile = tmpFile('verbose-test.excalidraw');
      writeFileSync(inputFile, JSON.stringify(createMinimalFile()), 'utf-8');

      const svgFile = tmpFile('verbose-test.svg');

      const { stdout } = runCLI([
        'export',
        inputFile,
        '-F',
        'svg',
        '-o',
        svgFile,
        '--verbose',
      ]);

      expect(stdout).toContain('Input:');
      expect(stdout).toContain('Elements:');
      expect(stdout).toContain('Exported:');
    }, 60000);

    it('should fail with invalid format', () => {
      const inputFile = tmpFile('bad-format.excalidraw');
      writeFileSync(inputFile, JSON.stringify(createMinimalFile()), 'utf-8');

      const { stderr } = runCLI(
        ['export', inputFile, '-F', 'bmp'],
        { expectError: true }
      );

      expect(stderr).toContain('--format must be "png" or "svg"');
    }, 60000);

    it('should fail when input file does not exist', () => {
      const { stderr } = runCLI(
        ['export', 'nonexistent.excalidraw', '-F', 'svg'],
        { expectError: true }
      );

      expect(stderr.length).toBeGreaterThan(0);
    }, 60000);

    it('should fail when input is invalid JSON', () => {
      const inputFile = tmpFile('invalid.excalidraw');
      writeFileSync(inputFile, 'this is not json', 'utf-8');

      const { stderr } = runCLI(
        ['export', inputFile, '-F', 'svg'],
        { expectError: true }
      );

      expect(stderr.length).toBeGreaterThan(0);
    }, 60000);

    it('should export with dark mode and no background', () => {
      const inputFile = tmpFile('dark-nobg.excalidraw');
      writeFileSync(inputFile, JSON.stringify(createMinimalFile()), 'utf-8');

      const svgFile = tmpFile('dark-nobg.svg');

      runCLI([
        'export',
        inputFile,
        '-F',
        'svg',
        '-o',
        svgFile,
        '--dark-mode',
        '--no-export-background',
      ]);

      expect(existsSync(svgFile)).toBe(true);
      const svgContent = readFileSync(svgFile, 'utf-8');
      expect(svgContent).toContain('<svg');
    }, 60000);

    it('should export PNG with custom scale', () => {
      const inputFile = tmpFile('scaled.excalidraw');
      writeFileSync(inputFile, JSON.stringify(createMinimalFile()), 'utf-8');

      const pngFile = tmpFile('scaled.png');

      runCLI([
        'export',
        inputFile,
        '-F',
        'png',
        '-o',
        pngFile,
        '--export-scale',
        '3',
      ]);

      expect(existsSync(pngFile)).toBe(true);
      const pngData = readFileSync(pngFile);
      expect(pngData.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    }, 60000);
  });

  describe('create command with --export-as and complex DSL', () => {
    it('should handle decision tree DSL with SVG export', () => {
      const outFile = tmpFile('complex.excalidraw');
      const dsl = '(Start) -> {Decision?} -> "yes" -> [End]';

      runCLI([
        'create',
        '--inline',
        dsl,
        '-o',
        outFile,
        '--export-as',
        'svg',
      ]);

      const svgFile = outFile.replace('.excalidraw', '.svg');
      filesToClean.push(svgFile);
      expect(existsSync(svgFile)).toBe(true);

      const svgContent = readFileSync(svgFile, 'utf-8');
      expect(svgContent).toContain('<svg');
    }, 60000);

    it('should handle multi-line DSL from input file with PNG export', () => {
      const dslFile = tmpFile('flow.dsl');
      writeFileSync(
        dslFile,
        '@direction LR\n[A] -> [B] -> [C]\n[B] -> [D]',
        'utf-8'
      );

      const outFile = tmpFile('flow.excalidraw');

      runCLI([
        'create',
        dslFile,
        '-o',
        outFile,
        '--export-as',
        'png',
      ]);

      const pngFile = outFile.replace('.excalidraw', '.png');
      filesToClean.push(pngFile);
      expect(existsSync(pngFile)).toBe(true);
    }, 60000);
  });
});
