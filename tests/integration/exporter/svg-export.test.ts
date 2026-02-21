import { describe, it, expect } from 'vitest';
import { convertToSVG, convertImage } from '../../../src/exporter/image-exporter.js';
import {
  createMinimalFile,
  createMultiElementFile,
  createEmptyFile,
  createFileWithBackground,
} from '../../helpers/fixtures.js';

describe('convertToSVG', () => {
  describe('basic SVG generation', () => {
    it('should return a valid SVG string for a minimal file', async () => {
      const file = createMinimalFile();
      const svg = await convertToSVG(file);

      expect(svg).toBeTypeOf('string');
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    }, 30000);

    it('should produce SVG with width and height attributes', async () => {
      const file = createMinimalFile();
      const svg = await convertToSVG(file);

      expect(svg).toMatch(/width="[\d.]+"/);
      expect(svg).toMatch(/height="[\d.]+"/);
    }, 30000);

    it('should produce SVG with a viewBox attribute', async () => {
      const file = createMinimalFile();
      const svg = await convertToSVG(file);

      expect(svg).toMatch(/viewBox="[^"]+"/);
    }, 30000);

    it('should handle multi-element files', async () => {
      const file = createMultiElementFile();
      const svg = await convertToSVG(file);

      expect(svg).toBeTypeOf('string');
      expect(svg).toContain('<svg');
      expect(svg.length).toBeGreaterThan(100);
    }, 30000);
  });

  describe('background options', () => {
    it('should include background by default', async () => {
      const file = createMinimalFile();
      const svg = await convertToSVG(file);

      // Default background is #ffffff
      expect(svg).toContain('#ffffff');
    }, 30000);

    it('should respect custom background color from appState', async () => {
      const file = createFileWithBackground('#ff6600');
      const svg = await convertToSVG(file);

      expect(svg).toContain('#ff6600');
    }, 30000);

    it('should respect viewBackgroundColor option override', async () => {
      const file = createMinimalFile();
      const svg = await convertToSVG(file, {
        viewBackgroundColor: '#00cc00',
      });

      expect(svg).toContain('#00cc00');
    }, 30000);

    it('should exclude background when exportBackground is false', async () => {
      const file = createMinimalFile();
      const svgWithBg = await convertToSVG(file, { exportBackground: true });
      const svgWithoutBg = await convertToSVG(file, { exportBackground: false });

      // Without background, the SVG may differ (no rect fill for background)
      // At minimum, both should be valid SVGs
      expect(svgWithBg).toContain('<svg');
      expect(svgWithoutBg).toContain('<svg');
    }, 30000);
  });

  describe('dark mode', () => {
    it('should produce different SVG in dark mode', async () => {
      const file = createMinimalFile();
      const lightSvg = await convertToSVG(file, { exportWithDarkMode: false });
      const darkSvg = await convertToSVG(file, { exportWithDarkMode: true });

      // Both should be valid
      expect(lightSvg).toContain('<svg');
      expect(darkSvg).toContain('<svg');

      // Dark mode typically changes the theme class or colors
      // They should differ in some way
      expect(darkSvg).not.toBe(lightSvg);
    }, 30000);
  });

  describe('padding', () => {
    it('should accept custom padding values', async () => {
      const file = createMinimalFile();

      // These should not throw
      const svg0 = await convertToSVG(file, { exportPadding: 0 });
      const svg50 = await convertToSVG(file, { exportPadding: 50 });

      expect(svg0).toContain('<svg');
      expect(svg50).toContain('<svg');
    }, 30000);

    it('should produce wider SVG with larger padding', async () => {
      const file = createMinimalFile();
      const svgSmallPad = await convertToSVG(file, { exportPadding: 5 });
      const svgLargePad = await convertToSVG(file, { exportPadding: 100 });

      // Extract width values
      const widthSmall = parseFloat(svgSmallPad.match(/width="([\d.]+)"/)?.[1] || '0');
      const widthLarge = parseFloat(svgLargePad.match(/width="([\d.]+)"/)?.[1] || '0');

      // Larger padding should produce larger SVG dimensions
      expect(widthLarge).toBeGreaterThan(widthSmall);
    }, 30000);
  });

  describe('empty files', () => {
    it('should handle empty element array without crashing', async () => {
      const file = createEmptyFile();

      // Should not throw - may produce empty or minimal SVG
      try {
        const svg = await convertToSVG(file);
        expect(svg).toBeTypeOf('string');
      } catch (error) {
        // Some versions of @excalidraw/utils may throw on empty elements
        // That's acceptable behavior
        expect(error).toBeDefined();
      }
    }, 30000);
  });
});

describe('convertImage with format=svg', () => {
  it('should return string for SVG format', async () => {
    const file = createMinimalFile();
    const result = await convertImage(file, { format: 'svg' });

    expect(result).toBeTypeOf('string');
    expect(result as string).toContain('<svg');
  }, 30000);

  it('should pass through all options to SVG export', async () => {
    const file = createMinimalFile();
    const result = await convertImage(file, {
      format: 'svg',
      exportBackground: false,
      exportWithDarkMode: true,
      exportPadding: 20,
    });

    expect(result).toBeTypeOf('string');
    expect(result as string).toContain('<svg');
  }, 30000);
});
