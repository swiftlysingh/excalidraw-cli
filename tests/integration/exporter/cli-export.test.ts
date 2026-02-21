/**
 * Integration tests for the CLI convert command.
 *
 * Spawns the compiled CLI binary (`dist/cli.js`) in a subprocess and
 * verifies that the standalone `convert` command produces valid SVG / PNG
 * output files with the expected options applied.
 */

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

/** Accumulator of file paths to delete in the `afterEach` hook. */
const filesToClean: string[] = [];

/**
 * Register a temporary file path for automatic cleanup after each test.
 *
 * @param name - File name (relative to `TMP_DIR`).
 * @returns The absolute path to the temporary file.
 */
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

  describe('standalone convert command', () => {
    it('should export existing .excalidraw to SVG', () => {
      // First, write a test .excalidraw file
      const inputFile = tmpFile('export-test.excalidraw');
      writeFileSync(inputFile, JSON.stringify(createMinimalFile()), 'utf-8');

      const svgFile = tmpFile('export-test.svg');

      runCLI(['convert', inputFile, '--format', 'svg', '-o', svgFile]);

      expect(existsSync(svgFile)).toBe(true);
      const svgContent = readFileSync(svgFile, 'utf-8');
      expect(svgContent).toContain('<svg');
    }, 60000);

    it('should export existing .excalidraw to PNG', () => {
      const inputFile = tmpFile('export-test-png.excalidraw');
      writeFileSync(inputFile, JSON.stringify(createMinimalFile()), 'utf-8');

      const pngFile = tmpFile('export-test-png.png');

      runCLI(['convert', inputFile, '--format', 'png', '-o', pngFile]);

      expect(existsSync(pngFile)).toBe(true);
      const pngData = readFileSync(pngFile);
      expect(pngData.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    }, 60000);

    it('should auto-name output file from input when -o not provided', () => {
      const inputFile = tmpFile('autoname.excalidraw');
      writeFileSync(inputFile, JSON.stringify(createMinimalFile()), 'utf-8');

      runCLI(['convert', inputFile, '--format', 'svg']);

      const autoSvg = inputFile.replace('.excalidraw', '.svg');
      filesToClean.push(autoSvg);
      expect(existsSync(autoSvg)).toBe(true);
    }, 60000);

    it('should export with --verbose flag', () => {
      const inputFile = tmpFile('verbose-test.excalidraw');
      writeFileSync(inputFile, JSON.stringify(createMinimalFile()), 'utf-8');

      const svgFile = tmpFile('verbose-test.svg');

      const { stdout } = runCLI([
        'convert',
        inputFile,
        '--format',
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
        ['convert', inputFile, '--format', 'bmp'],
        { expectError: true }
      );

      expect(stderr).toContain('--format must be "png" or "svg"');
    }, 60000);

    it('should fail when input file does not exist', () => {
      const { stderr } = runCLI(
        ['convert', 'nonexistent.excalidraw', '--format', 'svg'],
        { expectError: true }
      );

      expect(stderr.length).toBeGreaterThan(0);
    }, 60000);

    it('should fail when input is invalid JSON', () => {
      const inputFile = tmpFile('invalid.excalidraw');
      writeFileSync(inputFile, 'this is not json', 'utf-8');

      const { stderr } = runCLI(
        ['convert', inputFile, '--format', 'svg'],
        { expectError: true }
      );

      expect(stderr.length).toBeGreaterThan(0);
    }, 60000);

    it('should export with dark mode and no background', () => {
      const inputFile = tmpFile('dark-nobg.excalidraw');
      writeFileSync(inputFile, JSON.stringify(createMinimalFile()), 'utf-8');

      const svgFile = tmpFile('dark-nobg.svg');

      runCLI([
        'convert',
        inputFile,
        '--format',
        'svg',
        '-o',
        svgFile,
        '--dark',
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
        'convert',
        inputFile,
        '--format',
        'png',
        '-o',
        pngFile,
        '--scale',
        '3',
      ]);

      expect(existsSync(pngFile)).toBe(true);
      const pngData = readFileSync(pngFile);
      expect(pngData.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    }, 60000);
  });

});
