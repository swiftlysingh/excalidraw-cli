/**
 * Integration tests for edge cases and error handling in the image exporter.
 *
 * Covers format routing, real file exports, option priority, combined options,
 * consistency (deterministic output), deleted elements, and SVG structure.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  convertToSVG,
  convertToPNG,
  convertImage,
} from '../../../src/exporter/image-exporter.js';
import type { ExcalidrawFile } from '../../../src/types/excalidraw.js';
import { createMinimalFile, createMultiElementFile } from '../../helpers/fixtures.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..', '..');

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
        dark: true,
        exportEmbedScene: true,
        padding: 50,
      });

      expect(svg).toContain('<svg');
    }, 30000);

    it('should handle all options set simultaneously for PNG', async () => {
      const file = createMultiElementFile();
      const png = await convertToPNG(file, {
        exportBackground: true,
        viewBackgroundColor: '#00ffff',
        dark: false,
        exportEmbedScene: false,
        padding: 25,
        scale: 2,
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
    it('should exclude deleted elements from the exported bounds', async () => {
      const file = createMinimalFile();
      const baselineSvg = await convertToSVG(file);
      file.elements.push({
        ...file.elements[0],
        id: 'deleted-distant-rect',
        x: 10000,
        y: 10000,
        isDeleted: true,
      });

      const svg = await convertToSVG(file);
      const bounds = (markup: string) => ({
        viewBox: markup.match(/viewBox="([^"]+)"/)?.[1],
        width: markup.match(/width="([^"]+)"/)?.[1],
        height: markup.match(/height="([^"]+)"/)?.[1],
      });

      const baselineBounds = bounds(baselineSvg);
      expect(Object.values(baselineBounds)).not.toContain(undefined);
      expect(bounds(svg)).toEqual(baselineBounds);
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
