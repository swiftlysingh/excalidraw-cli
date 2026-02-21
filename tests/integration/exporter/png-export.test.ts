import { describe, it, expect } from 'vitest';
import { exportToPNG, exportImage } from '../../../src/exporter/image-exporter.js';
import {
  createMinimalFile,
  createMultiElementFile,
  createFileWithBackground,
} from '../../helpers/fixtures.js';

// PNG magic bytes: 0x89 0x50 0x4E 0x47 (‰PNG)
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe('exportToPNG', () => {
  describe('basic PNG generation', () => {
    it('should return a Buffer', async () => {
      const file = createMinimalFile();
      const png = await exportToPNG(file);

      expect(Buffer.isBuffer(png)).toBe(true);
    }, 30000);

    it('should produce valid PNG data (magic bytes)', async () => {
      const file = createMinimalFile();
      const png = await exportToPNG(file);

      // Check PNG signature
      expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    }, 30000);

    it('should produce non-empty PNG buffer', async () => {
      const file = createMinimalFile();
      const png = await exportToPNG(file);

      expect(png.length).toBeGreaterThan(100);
    }, 30000);

    it('should handle multi-element files', async () => {
      const file = createMultiElementFile();
      const png = await exportToPNG(file);

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
      expect(png.length).toBeGreaterThan(100);
    }, 30000);
  });

  describe('scale factor', () => {
    it('should produce larger PNG with higher scale', async () => {
      const file = createMinimalFile();
      const png1x = await exportToPNG(file, { exportScale: 1 });
      const png2x = await exportToPNG(file, { exportScale: 2 });

      // 2x scale should produce a larger (more bytes) PNG
      expect(png2x.length).toBeGreaterThan(png1x.length);
    }, 30000);

    it('should produce valid PNG at lower scale', async () => {
      const file = createMinimalFile();
      const pngHalf = await exportToPNG(file, { exportScale: 0.5 });

      // 0.5x scale should still produce a valid PNG
      // (Note: at very small sizes, PNG compression overhead can make
      //  the file not strictly smaller, so we just validate correctness)
      expect(Buffer.isBuffer(pngHalf)).toBe(true);
      expect(pngHalf.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
      expect(pngHalf.length).toBeGreaterThan(0);
    }, 30000);

    it('should accept fractional scales', async () => {
      const file = createMinimalFile();
      const png = await exportToPNG(file, { exportScale: 1.5 });

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    }, 30000);
  });

  describe('background options', () => {
    it('should produce valid PNG with background disabled', async () => {
      const file = createMinimalFile();
      const png = await exportToPNG(file, { exportBackground: false });

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    }, 30000);

    it('should accept custom background color', async () => {
      const file = createMinimalFile();
      const png = await exportToPNG(file, {
        viewBackgroundColor: '#ff0000',
        exportBackground: true,
      });

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    }, 30000);

    it('should respect appState background color', async () => {
      const file = createFileWithBackground('#00ff00');
      const png = await exportToPNG(file);

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.length).toBeGreaterThan(100);
    }, 30000);
  });

  describe('dark mode', () => {
    it('should produce valid PNG in dark mode', async () => {
      const file = createMinimalFile();
      const png = await exportToPNG(file, { exportWithDarkMode: true });

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    }, 30000);

    it('should produce different output in dark vs light mode', async () => {
      const file = createMinimalFile();
      const pngLight = await exportToPNG(file, { exportWithDarkMode: false });
      const pngDark = await exportToPNG(file, { exportWithDarkMode: true });

      // The buffers should differ
      expect(pngDark.equals(pngLight)).toBe(false);
    }, 30000);
  });

  describe('padding', () => {
    it('should produce valid PNG with zero padding', async () => {
      const file = createMinimalFile();
      const png = await exportToPNG(file, { exportPadding: 0 });

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    }, 30000);

    it('should produce valid PNG with large padding', async () => {
      const file = createMinimalFile();
      const png = await exportToPNG(file, { exportPadding: 200 });

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    }, 30000);
  });
});

describe('exportImage with format=png', () => {
  it('should return Buffer for PNG format', async () => {
    const file = createMinimalFile();
    const result = await exportImage(file, { format: 'png' });

    expect(Buffer.isBuffer(result)).toBe(true);
  }, 30000);

  it('should produce valid PNG via exportImage', async () => {
    const file = createMinimalFile();
    const result = await exportImage(file, { format: 'png' }) as Buffer;

    expect(result.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
  }, 30000);

  it('should pass through scale option', async () => {
    const file = createMinimalFile();
    const result1x = await exportImage(file, {
      format: 'png',
      exportScale: 1,
    }) as Buffer;
    const result3x = await exportImage(file, {
      format: 'png',
      exportScale: 3,
    }) as Buffer;

    expect(result3x.length).toBeGreaterThan(result1x.length);
  }, 30000);
});
