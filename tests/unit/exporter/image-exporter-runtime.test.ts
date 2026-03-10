import { describe, it, expect } from 'vitest';
import { convertToSVG, convertToPNG } from '../../../src/exporter/image-exporter.js';
import { createMinimalFile } from '../../helpers/fixtures.js';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe('image exporter runtime safety', () => {
  it('restores console.error after SVG export', async () => {
    const originalConsoleError = console.error;
    const customConsoleError = (..._args: unknown[]) => undefined;
    console.error = customConsoleError;

    try {
      const svg = await convertToSVG(createMinimalFile());
      expect(svg).toContain('<svg');
      expect(console.error).toBe(customConsoleError);
    } finally {
      console.error = originalConsoleError;
    }
  }, 30000);

  it('restores temporary globals after PNG export', async () => {
    const beforeWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const beforeDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const beforeNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const beforeFetch = globalThis.fetch;

    const png = await convertToPNG(createMinimalFile());

    expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    expect(globalThis.fetch).toBe(beforeFetch);

    if (beforeWindow) {
      expect(Object.getOwnPropertyDescriptor(globalThis, 'window')).toEqual(beforeWindow);
    } else {
      expect(Object.prototype.hasOwnProperty.call(globalThis, 'window')).toBe(false);
    }

    if (beforeDocument) {
      expect(Object.getOwnPropertyDescriptor(globalThis, 'document')).toEqual(beforeDocument);
    } else {
      expect(Object.prototype.hasOwnProperty.call(globalThis, 'document')).toBe(false);
    }

    if (beforeNavigator) {
      expect(Object.getOwnPropertyDescriptor(globalThis, 'navigator')).toEqual(beforeNavigator);
    } else {
      expect(Object.prototype.hasOwnProperty.call(globalThis, 'navigator')).toBe(false);
    }
  }, 30000);
});
