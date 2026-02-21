/**
 * Image Exporter
 *
 * Exports Excalidraw files to SVG and PNG image formats.
 * Uses @excalidraw/utils for SVG rendering and @resvg/resvg-js for PNG rasterization.
 */

import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { ensureDOMPolyfill } from './dom-polyfill.js';
import type { ExcalidrawFile } from '../types/excalidraw.js';

/**
 * Export options matching Excalidraw website capabilities
 */
export interface ExportOptions {
  /** Output format: 'svg' or 'png' */
  format: 'svg' | 'png';

  /** Whether to include the background in the export (default: true) */
  exportBackground?: boolean;

  /** Background color (default: from appState or '#ffffff') */
  viewBackgroundColor?: string;

  /** Export with dark mode (default: false) */
  exportWithDarkMode?: boolean;

  /** Embed scene data into the exported image (default: false) */
  exportEmbedScene?: boolean;

  /** Padding around the exported content in pixels (default: 10) */
  exportPadding?: number;

  /** Scale factor for PNG export (default: 1). Higher values = higher resolution */
  exportScale?: number;
}

/**
 * Default export options
 */
export const DEFAULT_EXPORT_OPTIONS: Required<ExportOptions> = {
  format: 'svg',
  exportBackground: true,
  viewBackgroundColor: '#ffffff',
  exportWithDarkMode: false,
  exportEmbedScene: false,
  exportPadding: 10,
  exportScale: 1,
};

/**
 * Merge user options with defaults, applying appState values where appropriate
 */
function resolveOptions(
  file: ExcalidrawFile,
  options: ExportOptions
): Required<ExportOptions> {
  return {
    ...DEFAULT_EXPORT_OPTIONS,
    // Use appState background color if available
    viewBackgroundColor:
      options.viewBackgroundColor ??
      file.appState?.viewBackgroundColor ??
      DEFAULT_EXPORT_OPTIONS.viewBackgroundColor,
    ...options,
  };
}

/**
 * Export an Excalidraw file to SVG string
 */
export async function convertToSVG(
  file: ExcalidrawFile,
  options?: Partial<ExportOptions>
): Promise<string> {
  const opts = resolveOptions(file, { format: 'svg', ...options });

  // Ensure DOM polyfills are applied before importing @excalidraw/utils
  await ensureDOMPolyfill();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const utils = await import('@excalidraw/utils') as any;
  const exportToSvg = utils.exportToSvg as (opts: {
    elements: unknown[];
    appState: Record<string, unknown>;
    files: Record<string, unknown> | null;
    exportPadding?: number;
  }) => Promise<{ outerHTML: string }>;

  const appState = {
    ...file.appState,
    exportBackground: opts.exportBackground,
    viewBackgroundColor: opts.viewBackgroundColor,
    exportWithDarkMode: opts.exportWithDarkMode,
    exportEmbedScene: opts.exportEmbedScene,
  };

  // Suppress noisy @excalidraw/utils font/Path2D warnings during export
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const msg = String(args[0] || '');
    if (msg.includes('font-face') || msg.includes('Path2D')) return;
    originalError.apply(console, args);
  };

  try {
    const svg = await exportToSvg({
      elements: file.elements as unknown[],
      appState: appState as Record<string, unknown>,
      files: (file.files || {}) as Record<string, unknown>,
      exportPadding: opts.exportPadding,
    });

    return svg.outerHTML;
  } finally {
    console.error = originalError;
  }
}

/**
 * Get the directory containing @excalidraw/utils bundled font assets (TTF files).
 * These are needed by resvg-js for text rendering since it doesn't
 * parse @font-face CSS from SVG — fonts must be provided via fontDirs.
 */
let cachedFontDir: string | null = null;
function getExcalidrawFontDir(): string {
  if (cachedFontDir) return cachedFontDir;

  const require = createRequire(import.meta.url);
  const utilsEntry = require.resolve('@excalidraw/utils');
  cachedFontDir = resolve(dirname(utilsEntry), 'assets');

  return cachedFontDir;
}

/**
 * Export an Excalidraw file to PNG buffer
 */
export async function convertToPNG(
  file: ExcalidrawFile,
  options?: Partial<ExportOptions>
): Promise<Buffer> {
  const opts = resolveOptions(file, { format: 'png', ...options });

  // First generate SVG
  const svgString = await convertToSVG(file, opts);

  // Use @resvg/resvg-js to convert SVG → PNG
  const { Resvg } = await import('@resvg/resvg-js');

  // Parse the SVG to get its natural dimensions
  const widthMatch = svgString.match(/width="([^"]+)"/);
  const heightMatch = svgString.match(/height="([^"]+)"/);
  const naturalWidth = widthMatch ? parseFloat(widthMatch[1]) : 800;
  const naturalHeight = heightMatch ? parseFloat(heightMatch[1]) : 600;

  const scaledWidth = Math.round(naturalWidth * opts.exportScale);

  // Load Excalidraw font files for text rendering.
  // resvg-js does NOT parse @font-face CSS from SVG — fonts must be
  // provided via fontDirs for text to render correctly.
  const fontDir = getExcalidrawFontDir();

  const resvg = new Resvg(svgString, {
    fitTo: {
      mode: 'width' as const,
      value: scaledWidth,
    },
    background: opts.exportBackground ? opts.viewBackgroundColor : undefined,
    font: {
      loadSystemFonts: false,
      fontDirs: [fontDir],
    },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return Buffer.from(pngBuffer);
}

/**
 * Export an Excalidraw file to the specified format
 * Returns either an SVG string or a PNG Buffer
 */
export async function convertImage(
  file: ExcalidrawFile,
  options: ExportOptions
): Promise<string | Buffer> {
  if (options.format === 'png') {
    return convertToPNG(file, options);
  }
  return convertToSVG(file, options);
}

/**
 * Swap a file path's extension
 */
export function swapExtension(filePath: string, newExt: string): string {
  const lastDot = filePath.lastIndexOf('.');
  const base = lastDot > 0 ? filePath.substring(0, lastDot) : filePath;
  return `${base}.${newExt}`;
}
