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

/** Native `console.error` captured at module load so concurrent calls cannot corrupt each other. */
const NATIVE_CONSOLE_ERROR = console.error;

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
  dark?: boolean;

  /** Embed scene data into the exported image (default: false) */
  exportEmbedScene?: boolean;

  /** Padding around the exported content in pixels (default: 10) */
  padding?: number;

  /** Scale factor for PNG export (default: 1). Higher values = higher resolution */
  scale?: number;
}

/**
 * Default export options
 */
export const DEFAULT_EXPORT_OPTIONS: Required<ExportOptions> = {
  format: 'svg',
  exportBackground: true,
  viewBackgroundColor: '#ffffff',
  dark: false,
  exportEmbedScene: false,
  padding: 10,
  scale: 1,
};

/**
 * Merge user options with defaults, applying appState values where appropriate.
 *
 * Priority order (highest → lowest):
 * 1. Explicitly provided options
 * 2. Values from the file's `appState` (e.g. `viewBackgroundColor`)
 * 3. `DEFAULT_EXPORT_OPTIONS`
 *
 * @param file    - The Excalidraw file whose `appState` supplies fallback values.
 * @param options - Partial options supplied by the caller.
 * @returns Fully-resolved options with every field populated.
 */
function resolveOptions(
  file: ExcalidrawFile,
  options: ExportOptions
): Required<ExportOptions> {
  return {
    ...DEFAULT_EXPORT_OPTIONS,
    ...options,
    // Use appState background color if available
    viewBackgroundColor:
      options.viewBackgroundColor ??
      file.appState?.viewBackgroundColor ??
      DEFAULT_EXPORT_OPTIONS.viewBackgroundColor,
  };
}

/**
 * Convert an Excalidraw file to an SVG string.
 *
 * Internally initialises the DOM polyfill (if not already done) and
 * delegates to `@excalidraw/utils.exportToSvg` for the actual rendering.
 * Console noise from font / Path2D warnings is suppressed during the call.
 *
 * @param file    - The Excalidraw file to convert.
 * @param options - Optional overrides for background, dark-mode, padding, etc.
 * @returns The rendered SVG markup as a string.
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
    exportWithDarkMode: opts.dark,
    exportEmbedScene: opts.exportEmbedScene,
  };

  // Suppress noisy @excalidraw/utils font/Path2D warnings during export.
  // Uses the module-level NATIVE_CONSOLE_ERROR so concurrent calls don't
  // capture each other's patched version.
  console.error = (...args: unknown[]) => {
    const msg = String(args[0] || '');
    if (msg.includes('font-face') || msg.includes('Path2D')) return;
    NATIVE_CONSOLE_ERROR.apply(console, args);
  };

  try {
    const svg = await exportToSvg({
      elements: file.elements as unknown[],
      appState: appState as Record<string, unknown>,
      files: (file.files || {}) as Record<string, unknown>,
      exportPadding: opts.padding,
    });

    return svg.outerHTML;
  } finally {
    console.error = NATIVE_CONSOLE_ERROR;
  }
}

/**
 * Get the directory containing @excalidraw/utils bundled font assets (TTF files).
 *
 * These are needed by resvg-js for text rendering since it doesn't
 * parse `@font-face` CSS from SVG — fonts must be provided via `fontDirs`.
 * The result is cached after the first call.
 *
 * @returns Absolute path to the assets directory.
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
 * Convert an Excalidraw file to a PNG image buffer.
 *
 * Pipeline: Excalidraw → SVG (via {@link convertToSVG}) → PNG (via resvg-js).
 * The `scale` option controls the output resolution.
 *
 * Font rendering note: `@resvg/resvg-js` ignores `@font-face` CSS inside the
 * SVG, so bundled TTF font files are provided through the `fontDirs` option.
 *
 * @param file    - The Excalidraw file to convert.
 * @param options - Optional overrides for scale, background, dark-mode, etc.
 * @returns A Buffer containing the PNG image data.
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

  // Parse the SVG to get its natural width for scaling
  const widthMatch = svgString.match(/width="([^"]+)"/);
  const naturalWidth = widthMatch ? parseFloat(widthMatch[1]) : 800;

  // Sanitize scale to avoid zero, negative, non-finite, or extreme values.
  const scale =
    typeof opts.scale === 'number' && Number.isFinite(opts.scale)
      ? opts.scale
      : 1;
  const safeScale = Math.min(Math.max(scale, 0.1), 10);
  const scaledWidth = Math.max(1, Math.round(naturalWidth * safeScale));

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
 * Convert an Excalidraw file to the specified image format.
 *
 * This is the main entry-point that routes to {@link convertToSVG} or
 * {@link convertToPNG} based on `options.format`.
 *
 * @param file    - The Excalidraw file to convert.
 * @param options - Export options; `format` is required (`'svg'` | `'png'`).
 * @returns An SVG string when `format` is `'svg'`, or a PNG `Buffer` when `'png'`.
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
 * Replace a file path's extension with a new one.
 *
 * If the path has no extension (no dot, or dot at position 0 like `.gitignore`),
 * the new extension is appended instead.
 *
 * @param filePath - The original file path (may include directories).
 * @param newExt   - The new extension **without** the leading dot (e.g. `'svg'`).
 * @returns The file path with its extension swapped.
 *
 * @example
 * swapExtension('diagram.excalidraw', 'png') // → 'diagram.png'
 * swapExtension('/tmp/out.json', 'svg')       // → '/tmp/out.svg'
 */
export function swapExtension(filePath: string, newExt: string): string {
  const lastDot = filePath.lastIndexOf('.');
  const base = lastDot > 0 ? filePath.substring(0, lastDot) : filePath;
  return `${base}.${newExt}`;
}
