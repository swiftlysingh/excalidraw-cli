/**
 * Unit tests for {@link DEFAULT_EXPORT_OPTIONS} and the {@link ExportOptions} type.
 *
 * Ensures the default values are sensible and that the type allows both
 * minimal (format-only) and fully-specified option objects.
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_EXPORT_OPTIONS } from '../../../src/exporter/image-exporter.js';
import type { ExportOptions } from '../../../src/exporter/image-exporter.js';

describe('DEFAULT_EXPORT_OPTIONS', () => {
  it('should have svg as default format', () => {
    expect(DEFAULT_EXPORT_OPTIONS.format).toBe('svg');
  });

  it('should have exportBackground true by default', () => {
    expect(DEFAULT_EXPORT_OPTIONS.exportBackground).toBe(true);
  });

  it('should have white as default background color', () => {
    expect(DEFAULT_EXPORT_OPTIONS.viewBackgroundColor).toBe('#ffffff');
  });

  it('should have dark mode disabled by default', () => {
    expect(DEFAULT_EXPORT_OPTIONS.dark).toBe(false);
  });

  it('should have embed scene disabled by default', () => {
    expect(DEFAULT_EXPORT_OPTIONS.exportEmbedScene).toBe(false);
  });

  it('should have 10px padding by default', () => {
    expect(DEFAULT_EXPORT_OPTIONS.exportPadding).toBe(10);
  });

  it('should have scale 1 by default', () => {
    expect(DEFAULT_EXPORT_OPTIONS.scale).toBe(1);
  });

  it('should have all required properties', () => {
    // Ensure no properties are undefined
    const keys: (keyof Required<ExportOptions>)[] = [
      'format',
      'exportBackground',
      'viewBackgroundColor',
      'dark',
      'exportEmbedScene',
      'exportPadding',
      'scale',
    ];
    for (const key of keys) {
      expect(DEFAULT_EXPORT_OPTIONS[key]).toBeDefined();
    }
  });
});

describe('ExportOptions type', () => {
  it('should allow minimal options with only format', () => {
    const opts: ExportOptions = { format: 'svg' };
    expect(opts.format).toBe('svg');
    expect(opts.exportBackground).toBeUndefined();
  });

  it('should allow png format', () => {
    const opts: ExportOptions = { format: 'png' };
    expect(opts.format).toBe('png');
  });

  it('should allow full options', () => {
    const opts: ExportOptions = {
      format: 'png',
      exportBackground: false,
      viewBackgroundColor: '#000000',
      dark: true,
      exportEmbedScene: true,
      exportPadding: 20,
      scale: 2,
    };
    expect(opts.format).toBe('png');
    expect(opts.exportBackground).toBe(false);
    expect(opts.viewBackgroundColor).toBe('#000000');
    expect(opts.dark).toBe(true);
    expect(opts.exportEmbedScene).toBe(true);
    expect(opts.exportPadding).toBe(20);
    expect(opts.scale).toBe(2);
  });
});
