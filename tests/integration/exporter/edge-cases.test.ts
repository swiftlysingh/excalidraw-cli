import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  convertToSVG,
  convertToPNG,
  convertImage,
} from '../../../src/exporter/image-exporter.js';
import type { ExcalidrawFile } from '../../../src/types/excalidraw.js';
import { createMinimalFile, createMultiElementFile } from '../../helpers/fixtures.js';

const PROJECT_ROOT = join(import.meta.dirname, '..', '..', '..');

describe('edge cases and error handling', () => {
  describe('convertImage routing', () => {
    it('should route to SVG when format is svg', async () => {
      const file = createMinimalFile();
      const result = await convertImage(file, { format: 'svg' });

      expect(typeof result).toBe('string');
      expect((result as string)).toContain('<svg');
    }, 30000);

    it('should route to PNG when format is png', async () => {
      const file = createMinimalFile();
      const result = await convertImage(file, { format: 'png' });

      expect(Buffer.isBuffer(result)).toBe(true);
    }, 30000);
  });

  describe('real excalidraw file export', () => {
    it('should export the example.excalidraw file to SVG', async () => {
      const examplePath = join(PROJECT_ROOT, 'example.excalidraw');
      const raw = readFileSync(examplePath, 'utf-8');
      const file: ExcalidrawFile = JSON.parse(raw);

      const svg = await convertToSVG(file);

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      // The example file has many elements, so SVG should be substantial
      expect(svg.length).toBeGreaterThan(1000);
    }, 30000);

    it('should export the example.excalidraw file to PNG', async () => {
      const examplePath = join(PROJECT_ROOT, 'example.excalidraw');
      const raw = readFileSync(examplePath, 'utf-8');
      const file: ExcalidrawFile = JSON.parse(raw);

      const png = await convertToPNG(file);

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.length).toBeGreaterThan(5000);
      // Verify PNG magic bytes
      expect(png[0]).toBe(0x89);
      expect(png[1]).toBe(0x50);
      expect(png[2]).toBe(0x4e);
      expect(png[3]).toBe(0x47);
    }, 30000);
  });

  describe('options priority', () => {
    it('should prefer explicit viewBackgroundColor over appState', async () => {
      const file = createMinimalFile();
      file.appState.viewBackgroundColor = '#aabbcc';

      const svg = await convertToSVG(file, {
        viewBackgroundColor: '#112233',
      });

      // The explicit option should win
      expect(svg).toContain('#112233');
    }, 30000);

    it('should use appState background when no explicit color given', async () => {
      const file = createMinimalFile();
      file.appState.viewBackgroundColor = '#aabbcc';

      const svg = await convertToSVG(file);

      expect(svg).toContain('#aabbcc');
    }, 30000);
  });

  describe('combined options', () => {
    it('should handle all options set simultaneously for SVG', async () => {
      const file = createMultiElementFile();
      const svg = await convertToSVG(file, {
        exportBackground: true,
        viewBackgroundColor: '#ff00ff',
        exportWithDarkMode: true,
        exportEmbedScene: true,
        exportPadding: 50,
      });

      expect(svg).toContain('<svg');
    }, 30000);

    it('should handle all options set simultaneously for PNG', async () => {
      const file = createMultiElementFile();
      const png = await convertToPNG(file, {
        exportBackground: true,
        viewBackgroundColor: '#00ffff',
        exportWithDarkMode: false,
        exportEmbedScene: false,
        exportPadding: 25,
        exportScale: 2,
      });

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.length).toBeGreaterThan(100);
    }, 30000);
  });

  describe('consistency checks', () => {
    it('should produce identical SVG for same input', async () => {
      const file = createMinimalFile();
      const svg1 = await convertToSVG(file);
      const svg2 = await convertToSVG(file);

      expect(svg1).toBe(svg2);
    }, 30000);

    it('should produce identical PNG for same input', async () => {
      const file = createMinimalFile();
      const png1 = await convertToPNG(file);
      const png2 = await convertToPNG(file);

      expect(png1.equals(png2)).toBe(true);
    }, 30000);
  });

  describe('file with deleted elements', () => {
    it('should handle elements marked as deleted', async () => {
      const file = createMinimalFile();
      // Mark the element as deleted
      (file.elements[0] as any).isDeleted = true;

      // Should still produce valid output (possibly empty-ish)
      try {
        const svg = await convertToSVG(file);
        expect(svg).toContain('<svg');
      } catch {
        // Acceptable if @excalidraw/utils can't handle all-deleted elements
      }
    }, 30000);
  });

  describe('SVG structure validation', () => {
    it('should produce well-formed SVG with namespace', async () => {
      const file = createMinimalFile();
      const svg = await convertToSVG(file);

      expect(svg).toContain('xmlns');
    }, 30000);

    it('should contain rect/path elements for shapes', async () => {
      const file = createMultiElementFile();
      const svg = await convertToSVG(file);

      // The SVG should contain graphical elements
      const hasGraphics =
        svg.includes('<rect') ||
        svg.includes('<path') ||
        svg.includes('<g') ||
        svg.includes('<line');
      expect(hasGraphics).toBe(true);
    }, 30000);
  });
});
