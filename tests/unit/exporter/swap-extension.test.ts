/**
 * Unit tests for the {@link swapExtension} utility.
 *
 * Covers basic swaps, paths with directories, filenames with multiple dots,
 * dotfiles, and various target extensions.
 */

import { describe, it, expect } from 'vitest';
import { swapExtension } from '../../../src/exporter/image-exporter.js';

describe('swapExtension', () => {
  describe('basic extension swapping', () => {
    it('should swap .excalidraw to .svg', () => {
      expect(swapExtension('flowchart.excalidraw', 'svg')).toBe('flowchart.svg');
    });

    it('should swap .excalidraw to .png', () => {
      expect(swapExtension('flowchart.excalidraw', 'png')).toBe('flowchart.png');
    });

    it('should swap .json to .svg', () => {
      expect(swapExtension('diagram.json', 'svg')).toBe('diagram.svg');
    });

    it('should swap .txt to .png', () => {
      expect(swapExtension('notes.txt', 'png')).toBe('notes.png');
    });
  });

  describe('paths with directories', () => {
    it('should handle relative paths', () => {
      expect(swapExtension('./output/diagram.excalidraw', 'svg')).toBe('./output/diagram.svg');
    });

    it('should handle absolute paths', () => {
      expect(swapExtension('/home/user/docs/chart.excalidraw', 'png')).toBe(
        '/home/user/docs/chart.png'
      );
    });

    it('should handle nested directory paths', () => {
      expect(swapExtension('a/b/c/d.excalidraw', 'svg')).toBe('a/b/c/d.svg');
    });
  });

  describe('edge cases with dots', () => {
    it('should handle filenames with multiple dots', () => {
      // swaps from last dot
      expect(swapExtension('my.flow.chart.excalidraw', 'svg')).toBe('my.flow.chart.svg');
    });

    it('should handle directories with dots in names', () => {
      expect(swapExtension('./v1.2/output.excalidraw', 'png')).toBe('./v1.2/output.png');
    });

    it('should handle filenames with no extension', () => {
      // lastDot is -1, base = filePath
      expect(swapExtension('noextension', 'svg')).toBe('noextension.svg');
    });

    it('should handle dotfiles (dot at position 0)', () => {
      // lastDot is 0, condition `lastDot > 0` is false, so base = filePath
      expect(swapExtension('.gitignore', 'svg')).toBe('.gitignore.svg');
    });
  });

  describe('various new extensions', () => {
    it('should work with longer extensions', () => {
      expect(swapExtension('file.excalidraw', 'webp')).toBe('file.webp');
    });

    it('should work with uppercase extensions', () => {
      expect(swapExtension('file.excalidraw', 'PNG')).toBe('file.PNG');
    });

    it('should handle empty-string extension', () => {
      expect(swapExtension('file.excalidraw', '')).toBe('file.');
    });
  });
});
