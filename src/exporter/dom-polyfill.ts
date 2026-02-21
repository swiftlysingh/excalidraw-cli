/**
 * DOM Polyfill for Node.js
 *
 * Sets up the minimum browser globals required by @excalidraw/utils
 * to render SVGs in a Node.js environment using jsdom.
 *
 * Key features:
 * - jsdom for core DOM (document, window, DOMParser, etc.)
 * - Path2D stub for roughjs shape generation
 * - FontFace polyfill that works with @excalidraw/utils font loading
 * - document.fonts (FontFaceSet) polyfill for font registration
 * - fetch() override to load font files from disk via file:// URLs
 * - EXCALIDRAW_ASSET_PATH pointing to bundled font assets
 */

import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';

/** Fake base URL used to route font fetches through our local file override */
const FONT_PROXY_BASE = 'https://excalidraw-fonts.local/';

let polyfillApplied = false;

/**
 * Resolve the absolute path to the `@excalidraw/utils` bundled font
 * assets directory (contains `.ttf` / `.woff2` files).
 *
 * @returns Absolute path to the assets directory.
 */
function getAssetsDir(): string {
  const require = createRequire(import.meta.url);
  const utilsEntry = require.resolve('@excalidraw/utils');
  // Navigate from the entry point to the assets directory
  // Typical structure: .../dist/prod/index.js → .../dist/prod/assets/
  const utilsDir = dirname(utilsEntry);
  return resolve(utilsDir, 'assets');
}

/**
 * Initialise the minimal browser-like environment that @excalidraw/utils
 * requires to render SVGs in Node.js.
 *
 * This is idempotent — calling it more than once is a no-op.
 *
 * What gets polyfilled:
 * - Core DOM globals via jsdom (`window`, `document`, `navigator`, etc.)
 * - `Path2D` stub for roughjs shape generation
 * - `FontFace` constructor with `unicodeRange` support
 * - `document.fonts` (`FontFaceSet`) for font registration
 * - `fetch()` override to load bundled font files from disk
 * - `EXCALIDRAW_ASSET_PATH` pointed at the local font proxy URL
 *
 * @returns A promise that resolves once the polyfill is in place.
 */
export async function ensureDOMPolyfill(): Promise<void> {
  if (polyfillApplied) return;

  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'https://localhost',
    pretendToBeVisual: true,
  });

  const g = globalThis as Record<string, unknown>;
  const win = dom.window as unknown as Record<string, unknown>;

  // Core DOM globals
  g.window = dom.window;
  g.document = dom.window.document;
  g.navigator = dom.window.navigator;
  g.DOMParser = dom.window.DOMParser;
  g.Node = dom.window.Node;

  // Canvas/rendering globals
  g.devicePixelRatio = 1;

  // Path2D polyfill (used by roughjs shape generation in excalidraw)
  g.Path2D = class Path2D {
    d: string;
    constructor(path?: string) {
      this.d = path || '';
    }
    addPath() { /* no-op */ }
    moveTo() { /* no-op */ }
    lineTo() { /* no-op */ }
    bezierCurveTo() { /* no-op */ }
    quadraticCurveTo() { /* no-op */ }
    arc() { /* no-op */ }
    arcTo() { /* no-op */ }
    ellipse() { /* no-op */ }
    rect() { /* no-op */ }
    closePath() { /* no-op */ }
  };

  // FontFace polyfill with real data tracking
  // @excalidraw/utils reads: fontFace.family, fontFace.unicodeRange
  const FontFaceImpl = class FontFace {
    family: string;
    source: string;
    descriptors: Record<string, string>;
    status = 'loaded';
    loaded: Promise<FontFace>;
    display: string;
    style: string;
    weight: string;
    unicodeRange: string;
    featureSettings: string;

    constructor(family: string, source: string | ArrayBuffer, descriptors?: Record<string, string>) {
      this.family = family;
      this.source = typeof source === 'string' ? source : 'arraybuffer';
      this.descriptors = descriptors || {};
      this.display = descriptors?.display || 'swap';
      this.style = descriptors?.style || 'normal';
      this.weight = descriptors?.weight || '400';
      // unicodeRange is critical: @excalidraw/utils calls fontFace.unicodeRange.split(...)
      this.unicodeRange = descriptors?.unicodeRange || 'U+0000-FFFF';
      this.featureSettings = descriptors?.featureSettings || '';
      this.loaded = Promise.resolve(this);
    }
    load(): Promise<FontFace> {
      return Promise.resolve(this);
    }
  };
  g.FontFace = FontFaceImpl;

  // FontFaceSet polyfill — tracks registered FontFace instances
  // @excalidraw/utils uses document.fonts.add(), .has(), .check(), .load()
  const fontSet = new Set<InstanceType<typeof FontFaceImpl>>();
  const fontFaceSet = {
    add(face: InstanceType<typeof FontFaceImpl>) {
      fontSet.add(face);
    },
    has(face: InstanceType<typeof FontFaceImpl>) {
      return fontSet.has(face);
    },
    delete(face: InstanceType<typeof FontFaceImpl>) {
      return fontSet.delete(face);
    },
    // check() and load() return true/resolved — we pretend all fonts are available
    check(_font: string, _text?: string) {
      return true;
    },
    load(_font: string, _text?: string) {
      return Promise.resolve([]);
    },
    forEach(cb: (face: InstanceType<typeof FontFaceImpl>) => void) {
      fontSet.forEach(cb);
    },
    get size() {
      return fontSet.size;
    },
    get status() {
      return 'loaded';
    },
    ready: Promise.resolve(),
    [Symbol.iterator]() {
      return fontSet[Symbol.iterator]();
    },
  };

  // Assign document.fonts
  const doc = dom.window.document as unknown as Record<string, unknown>;
  Object.defineProperty(doc, 'fonts', {
    value: fontFaceSet,
    writable: true,
    configurable: true,
  });

  // Also set on window for @excalidraw/utils access patterns
  win.EXCALIDRAW_ASSET_PATH = FONT_PROXY_BASE;

  // Resolve the local assets directory for font file loading
  const assetsDir = getAssetsDir();

  // Override global fetch to intercept font requests
  // @excalidraw/utils calls fetch(url) to load font data — we redirect
  // requests for our proxy base URL to local disk reads
  const originalFetch = globalThis.fetch ?? (() => { throw new Error('fetch not available'); });
  g.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : (input as Request).url;

    if (url.startsWith(FONT_PROXY_BASE)) {
      // Extract font filename from the URL
      const fontFile = decodeURIComponent(url.slice(FONT_PROXY_BASE.length));
      const fontPath = resolve(assetsDir, fontFile);

      try {
        const data = await readFile(fontPath);
        return new Response(data, {
          status: 200,
          headers: {
            'Content-Type': 'font/ttf',
          },
        });
      } catch {
        return new Response(null, { status: 404, statusText: 'Font not found' });
      }
    }

    // Pass through all other requests to the real fetch
    return originalFetch(input, init);
  };

  polyfillApplied = true;
}
