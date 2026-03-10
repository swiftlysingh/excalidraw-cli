import { describe, it, expect } from 'vitest';
import { withDOMPolyfill } from '../../../src/exporter/dom-polyfill.js';

describe('withDOMPolyfill', () => {
  it('supports getter-only navigator overrides and restores globals afterwards', async () => {
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const originalFetch = globalThis.fetch;

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      get() {
        return { userAgent: 'getter-only-test' };
      },
    });

    try {
      await withDOMPolyfill(async () => {
        expect(globalThis.window).toBeDefined();
        expect(globalThis.document).toBeDefined();
        expect(globalThis.navigator).toBeDefined();
        expect(globalThis.fetch).not.toBe(originalFetch);
      });

      const restoredNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
      expect(restoredNavigator?.get).toBeDefined();
      expect(restoredNavigator?.set).toBeUndefined();

      if (originalWindow) {
        expect(Object.getOwnPropertyDescriptor(globalThis, 'window')).toEqual(originalWindow);
      } else {
        expect(Object.prototype.hasOwnProperty.call(globalThis, 'window')).toBe(false);
      }

      if (originalDocument) {
        expect(Object.getOwnPropertyDescriptor(globalThis, 'document')).toEqual(originalDocument);
      } else {
        expect(Object.prototype.hasOwnProperty.call(globalThis, 'document')).toBe(false);
      }

      expect(globalThis.fetch).toBe(originalFetch);
    } finally {
      if (originalNavigator) {
        Object.defineProperty(globalThis, 'navigator', originalNavigator);
      } else {
        delete globalThis.navigator;
      }
    }
  });
});
