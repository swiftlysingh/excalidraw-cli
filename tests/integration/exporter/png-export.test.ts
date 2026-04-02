/**
 * Integration tests for PNG export.
 *
 * Validates that {@link convertToPNG} produces valid PNG buffers and
 * that scale, background, dark-mode, and padding options behave correctly.
 */

import { describe, it, expect } from 'vitest';
import { inflateSync } from 'zlib';
import { convertToPNG, convertImage } from '../../../src/exporter/image-exporter.js';
import {
  createMinimalFile,
  createMultiElementFile,
  createFileWithBackground,
  loadExcalidrawFixture,
} from '../../helpers/fixtures.js';

// PNG magic bytes: 0x89 0x50 0x4E 0x47 (‰PNG)
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);

  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePngRgba(png: Buffer): { width: number; height: number; pixels: Buffer } {
  const signature = png.subarray(0, 8);
  expect(signature.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks: Buffer[] = [];

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const data = png.subarray(dataStart, dataEnd);
    offset = dataEnd + 4;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  expect(bitDepth).toBe(8);
  expect(colorType).toBe(6);

  const raw = inflateSync(Buffer.concat(idatChunks));
  const stride = width * 4;
  const pixels = Buffer.alloc(width * height * 4);
  let src = 0;

  for (let y = 0; y < height; y++) {
    const filter = raw[src++];
    const rowStart = y * stride;

    for (let x = 0; x < stride; x++) {
      const byte = raw[src++];
      const left = x >= 4 ? pixels[rowStart + x - 4] : 0;
      const up = y > 0 ? pixels[rowStart - stride + x] : 0;
      const upLeft = y > 0 && x >= 4 ? pixels[rowStart - stride + x - 4] : 0;

      let value = byte;
      switch (filter) {
        case 0:
          break;
        case 1:
          value = (byte + left) & 0xff;
          break;
        case 2:
          value = (byte + up) & 0xff;
          break;
        case 3:
          value = (byte + Math.floor((left + up) / 2)) & 0xff;
          break;
        case 4:
          value = (byte + paethPredictor(left, up, upLeft)) & 0xff;
          break;
        default:
          throw new Error(`Unsupported PNG filter type: ${filter}`);
      }

      pixels[rowStart + x] = value;
    }
  }

  return { width, height, pixels };
}

function getPixel(
  decoded: { width: number; height: number; pixels: Buffer },
  x: number,
  y: number
): [number, number, number, number] {
  const index = (y * decoded.width + x) * 4;
  return [
    decoded.pixels[index],
    decoded.pixels[index + 1],
    decoded.pixels[index + 2],
    decoded.pixels[index + 3],
  ];
}

describe('convertToPNG', () => {
  describe('basic PNG generation', () => {
    it('should return a Buffer', async () => {
      const file = createMinimalFile();
      const png = await convertToPNG(file);

      expect(Buffer.isBuffer(png)).toBe(true);
    }, 30000);

    it('should produce valid PNG data (magic bytes)', async () => {
      const file = createMinimalFile();
      const png = await convertToPNG(file);

      // Check PNG signature
      expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    }, 30000);

    it('should produce non-empty PNG buffer', async () => {
      const file = createMinimalFile();
      const png = await convertToPNG(file);

      expect(png.length).toBeGreaterThan(100);
    }, 30000);

    it('should handle multi-element files', async () => {
      const file = createMultiElementFile();
      const png = await convertToPNG(file);

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
      expect(png.length).toBeGreaterThan(100);
    }, 30000);
  });

  describe('scale factor', () => {
    it('should produce larger PNG with higher scale', async () => {
      const file = createMinimalFile();
      const png1x = await convertToPNG(file, { scale: 1 });
      const png2x = await convertToPNG(file, { scale: 2 });

      // 2x scale should produce a larger (more bytes) PNG
      expect(png2x.length).toBeGreaterThan(png1x.length);
    }, 30000);

    it('should produce valid PNG at lower scale', async () => {
      const file = createMinimalFile();
      const pngHalf = await convertToPNG(file, { scale: 0.5 });

      // 0.5x scale should still produce a valid PNG
      // (Note: at very small sizes, PNG compression overhead can make
      //  the file not strictly smaller, so we just validate correctness)
      expect(Buffer.isBuffer(pngHalf)).toBe(true);
      expect(pngHalf.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
      expect(pngHalf.length).toBeGreaterThan(0);
    }, 30000);

    it('should accept fractional scales', async () => {
      const file = createMinimalFile();
      const png = await convertToPNG(file, { scale: 1.5 });

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    }, 30000);
  });

  describe('background options', () => {
    it('should produce valid PNG with background disabled', async () => {
      const file = createMinimalFile();
      const png = await convertToPNG(file, { exportBackground: false });

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    }, 30000);

    it('should accept custom background color', async () => {
      const file = createMinimalFile();
      const png = await convertToPNG(file, {
        viewBackgroundColor: '#ff0000',
        exportBackground: true,
      });

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    }, 30000);

    it('should respect appState background color', async () => {
      const file = createFileWithBackground('#00ff00');
      const png = await convertToPNG(file);

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.length).toBeGreaterThan(100);
    }, 30000);
  });

  describe('dark mode', () => {
    it('should produce valid PNG in dark mode', async () => {
      const file = createMinimalFile();
      const png = await convertToPNG(file, { dark: true });

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    }, 30000);

    it('should produce different output in dark vs light mode', async () => {
      const file = createMinimalFile();
      const pngLight = await convertToPNG(file, { dark: false });
      const pngDark = await convertToPNG(file, { dark: true });

      // The buffers should differ
      expect(pngDark.equals(pngLight)).toBe(false);
    }, 30000);
  });

  describe('padding', () => {
    it('should produce valid PNG with zero padding', async () => {
      const file = createMinimalFile();
      const png = await convertToPNG(file, { padding: 0 });

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    }, 30000);

    it('should produce valid PNG with large padding', async () => {
      const file = createMinimalFile();
      const png = await convertToPNG(file, { padding: 200 });

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    }, 30000);
  });

  describe('embedded images', () => {
    it('should render embedded image content instead of placeholder squares', async () => {
      const file = loadExcalidrawFixture('embedded-image.excalidraw');
      const png = await convertToPNG(file, { exportBackground: false, padding: 0 });
      const decoded = decodePngRgba(png);

      expect(decoded.width).toBeGreaterThanOrEqual(32);
      expect(decoded.height).toBeGreaterThanOrEqual(32);

      let sawRedPixel = false;
      for (let y = 0; y < decoded.height && !sawRedPixel; y++) {
        for (let x = 0; x < decoded.width; x++) {
          const [r, g, b, a] = getPixel(decoded, x, y);
          if (r > 200 && g < 80 && b < 80 && a > 200) {
            sawRedPixel = true;
            break;
          }
        }
      }

      expect(sawRedPixel).toBe(true);
    }, 30000);
  });
});

describe('convertImage with format=png', () => {
  it('should return Buffer for PNG format', async () => {
    const file = createMinimalFile();
    const result = await convertImage(file, { format: 'png' });

    expect(Buffer.isBuffer(result)).toBe(true);
  }, 30000);

  it('should produce valid PNG via convertImage', async () => {
    const file = createMinimalFile();
    const result = await convertImage(file, { format: 'png' }) as Buffer;

    expect(result.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
  }, 30000);

  it('should pass through scale option', async () => {
    const file = createMinimalFile();
    const result1x = await convertImage(file, {
      format: 'png',
      scale: 1,
    }) as Buffer;
    const result3x = await convertImage(file, {
      format: 'png',
      scale: 3,
    }) as Buffer;

    expect(result3x.length).toBeGreaterThan(result1x.length);
  }, 30000);
});
