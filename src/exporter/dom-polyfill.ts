/**
 * DOM polyfill utilities for image export.
 *
 * `@excalidraw/utils.exportToSvg()` expects a browser-ish environment even when
 * running in Node. We provide that environment only for the duration of an
 * export so host globals such as `window`, `document`, `navigator`, and `fetch`
 * are restored afterwards.
 */

import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

/** Fake base URL used to route bundled font requests through the file loader. */
const FONT_PROXY_BASE = 'https://excalidraw-fonts.local/';

let cachedAssetsDir: string | null = null;
let exportScopeQueue: Promise<void> = Promise.resolve();

type Restorer = () => void;

/**
 * Resolve the bundled `@excalidraw/utils` asset directory.
 *
 * The exporter still depends on this package for two things:
 * - `exportToSvg()` for SVG generation
 * - bundled font files used by both the DOM polyfill and PNG rasterization
 */
export function getExcalidrawAssetDir(): string {
  if (cachedAssetsDir) return cachedAssetsDir;

  const require = createRequire(import.meta.url);
  const utilsEntry = require.resolve('@excalidraw/utils');
  cachedAssetsDir = resolve(dirname(utilsEntry), 'assets');
  return cachedAssetsDir;
}

/**
 * Run a callback with temporary browser globals installed.
 *
 * Exports are serialized because the polyfill touches process-wide globals.
 * Serializing the critical section guarantees each export sees a consistent
 * environment and that the host globals are restored cleanly afterwards.
 */
export async function withDOMPolyfill<T>(callback: () => Promise<T>): Promise<T> {
  const previousRun = exportScopeQueue;
  let releaseQueue!: () => void;

  exportScopeQueue = new Promise<void>((resolveQueue) => {
    releaseQueue = resolveQueue;
  });

  await previousRun;

  try {
    const restore = await installDOMPolyfill();
    try {
      return await callback();
    } finally {
      restore();
    }
  } finally {
    releaseQueue();
  }
}

async function installDOMPolyfill(): Promise<Restorer> {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'https://localhost',
    pretendToBeVisual: true,
  });

  const restoreGlobals: Restorer[] = [];
  const assetsDir = getExcalidrawAssetDir();
  const win = dom.window as unknown as Record<string, unknown>;
  const doc = dom.window.document;

  const Path2DImpl = class Path2D {
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

    constructor(
      family: string,
      source: string | ArrayBuffer,
      descriptors?: Record<string, string>
    ) {
      this.family = family;
      this.source = typeof source === 'string' ? source : 'arraybuffer';
      this.descriptors = descriptors || {};
      this.display = descriptors?.display || 'swap';
      this.style = descriptors?.style || 'normal';
      this.weight = descriptors?.weight || '400';
      this.unicodeRange = descriptors?.unicodeRange || 'U+0000-FFFF';
      this.featureSettings = descriptors?.featureSettings || '';
      this.loaded = Promise.resolve(this);
    }

    load(): Promise<FontFace> {
      return Promise.resolve(this);
    }
  };

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

  Object.defineProperty(doc, 'fonts', {
    value: fontFaceSet,
    writable: true,
    configurable: true,
  });

  win.EXCALIDRAW_ASSET_PATH = FONT_PROXY_BASE;

  const originalFetch = globalThis.fetch?.bind(globalThis);
  const fetchOverride = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

    if (url.startsWith(FONT_PROXY_BASE)) {
      const fontFile = decodeURIComponent(url.slice(FONT_PROXY_BASE.length));
      if (fontFile.includes('..') || fontFile.startsWith('/') || fontFile.includes('\\')) {
        return new Response(null, { status: 400, statusText: 'Invalid font path' });
      }

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

    if (!originalFetch) {
      throw new Error('fetch is not available in this Node runtime');
    }

    return originalFetch(input, init);
  };

  restoreGlobals.push(overrideGlobal('window', dom.window));
  restoreGlobals.push(overrideGlobal('document', doc));
  restoreGlobals.push(overrideGlobal('navigator', dom.window.navigator));
  restoreGlobals.push(overrideGlobal('DOMParser', dom.window.DOMParser));
  restoreGlobals.push(overrideGlobal('Node', dom.window.Node));
  restoreGlobals.push(overrideGlobal('devicePixelRatio', 1));
  restoreGlobals.push(overrideGlobal('Path2D', Path2DImpl));
  restoreGlobals.push(overrideGlobal('FontFace', FontFaceImpl));
  restoreGlobals.push(overrideGlobal('fetch', fetchOverride));

  return () => {
    for (let i = restoreGlobals.length - 1; i >= 0; i--) {
      restoreGlobals[i]();
    }
    dom.window.close();
  };
}

function overrideGlobal(key: string, value: unknown): Restorer {
  const globalObject = globalThis as Record<string, unknown>;
  const existing = Object.getOwnPropertyDescriptor(globalThis, key);

  if (existing && existing.configurable === false) {
    if ('writable' in existing && existing.writable) {
      const previousValue = globalObject[key];
      globalObject[key] = value;
      return () => {
        globalObject[key] = previousValue;
      };
    }

    throw new Error(`Cannot temporarily override globalThis.${String(key)}`);
  }

  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value,
  });

  return () => {
    if (existing) {
      Object.defineProperty(globalThis, key, existing);
      return;
    }
    delete globalObject[key];
  };
}
