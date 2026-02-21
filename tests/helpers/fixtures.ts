/**
 * Test helpers for exporter tests.
 * Provides minimal valid ExcalidrawFile fixtures.
 */

import type { ExcalidrawFile } from '../../src/types/excalidraw.js';

/**
 * Create a minimal ExcalidrawFile with a single rectangle element.
 * Suitable for basic export tests.
 */
export function createMinimalFile(): ExcalidrawFile {
  return {
    type: 'excalidraw',
    version: 2,
    source: 'test',
    elements: [
      {
        id: 'test-rect-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: 'a0',
        roundness: { type: 3 },
        seed: 12345,
        version: 1,
        versionNonce: 1,
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
      },
    ],
    appState: {
      gridSize: 20,
      gridStep: 5,
      gridModeEnabled: false,
      viewBackgroundColor: '#ffffff',
      lockedMultiSelections: {},
    },
    files: {},
  };
}

/**
 * Create an ExcalidrawFile with multiple elements:
 * - A rectangle
 * - A diamond
 * - An arrow connecting them
 * - A text label
 */
export function createMultiElementFile(): ExcalidrawFile {
  return {
    type: 'excalidraw',
    version: 2,
    source: 'test',
    elements: [
      {
        id: 'rect-1',
        type: 'rectangle',
        x: 50,
        y: 50,
        width: 150,
        height: 80,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: '#a5d8ff',
        fillStyle: 'solid',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: 'a0',
        roundness: { type: 3 },
        seed: 111,
        version: 1,
        versionNonce: 1,
        isDeleted: false,
        boundElements: [{ id: 'arrow-1', type: 'arrow' }],
        updated: Date.now(),
        link: null,
        locked: false,
      },
      {
        id: 'diamond-1',
        type: 'diamond',
        x: 300,
        y: 40,
        width: 120,
        height: 100,
        angle: 0,
        strokeColor: '#e03131',
        backgroundColor: '#ffc9c9',
        fillStyle: 'hachure',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: 'a1',
        roundness: { type: 2 },
        seed: 222,
        version: 1,
        versionNonce: 2,
        isDeleted: false,
        boundElements: [{ id: 'arrow-1', type: 'arrow' }],
        updated: Date.now(),
        link: null,
        locked: false,
      },
      {
        id: 'arrow-1',
        type: 'arrow',
        x: 200,
        y: 90,
        width: 100,
        height: 0,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: 'a2',
        roundness: { type: 2 },
        seed: 333,
        version: 1,
        versionNonce: 3,
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        points: [
          [0, 0],
          [100, 0],
        ],
        lastCommittedPoint: null,
        startBinding: {
          elementId: 'rect-1',
          mode: 'orbit',
          fixedPoint: [1, 0.5],
        },
        endBinding: {
          elementId: 'diamond-1',
          mode: 'orbit',
          fixedPoint: [0, 0.5],
        },
        startArrowhead: null,
        endArrowhead: 'arrow',
        elbowed: false,
      },
      {
        id: 'text-1',
        type: 'text',
        x: 80,
        y: 75,
        width: 90,
        height: 25,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: 'a3',
        roundness: null,
        seed: 444,
        version: 1,
        versionNonce: 4,
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        text: 'Start Here',
        fontSize: 20,
        fontFamily: 5,
        textAlign: 'center',
        verticalAlign: 'middle',
        containerId: null,
        originalText: 'Start Here',
        autoResize: true,
        lineHeight: 1.25,
      },
    ],
    appState: {
      gridSize: 20,
      gridStep: 5,
      gridModeEnabled: false,
      viewBackgroundColor: '#f0f0f0',
      lockedMultiSelections: {},
    },
    files: {},
  };
}

/**
 * Create an empty ExcalidrawFile with no elements.
 * Useful for testing edge cases.
 */
export function createEmptyFile(): ExcalidrawFile {
  return {
    type: 'excalidraw',
    version: 2,
    source: 'test',
    elements: [],
    appState: {
      gridSize: 20,
      gridStep: 5,
      gridModeEnabled: false,
      viewBackgroundColor: '#ffffff',
      lockedMultiSelections: {},
    },
    files: {},
  };
}

/**
 * Create an ExcalidrawFile with custom background color.
 */
export function createFileWithBackground(color: string): ExcalidrawFile {
  const file = createMinimalFile();
  file.appState.viewBackgroundColor = color;
  return file;
}
