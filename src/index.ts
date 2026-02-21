/**
 * Excalidraw CLI - Programmatic API
 *
 * Create Excalidraw flowcharts programmatically.
 */

// Type exports
export type {
  FlowchartGraph,
  FlowchartInput,
  GraphNode,
  GraphEdge,
  LayoutOptions,
  LayoutedGraph,
  LayoutedNode,
  LayoutedEdge,
  NodeType,
  NodeStyle,
  EdgeStyle,
  FlowDirection,
} from './types/dsl.js';

export type {
  ExcalidrawFile,
  ExcalidrawElement,
  ExcalidrawRectangle,
  ExcalidrawDiamond,
  ExcalidrawEllipse,
  ExcalidrawText,
  ExcalidrawArrow,
  ExcalidrawAppState,
} from './types/excalidraw.js';

// Parser exports
export { parseDSL } from './parser/dsl-parser.js';
export { parseJSON, parseJSONString } from './parser/json-parser.js';

// Layout exports
export { layoutGraph } from './layout/elk-layout.js';

// Generator exports
export { generateExcalidraw, serializeExcalidraw } from './generator/excalidraw-generator.js';

// Factory exports (for advanced usage)
export { createNode, createArrow, createText } from './factory/index.js';

// Exporter exports
export { convertToSVG, convertToPNG, convertImage, swapExtension } from './exporter/index.js';
export type { ExportOptions } from './exporter/index.js';

// Default options
export { DEFAULT_LAYOUT_OPTIONS } from './types/dsl.js';
export { DEFAULT_APP_STATE, DEFAULT_ELEMENT_STYLE } from './types/excalidraw.js';

import { parseDSL as _parseDSL } from './parser/dsl-parser.js';
import { parseJSON as _parseJSON } from './parser/json-parser.js';
import { layoutGraph as _layoutGraph } from './layout/elk-layout.js';
import {
  generateExcalidraw as _generateExcalidraw,
  serializeExcalidraw as _serializeExcalidraw,
} from './generator/excalidraw-generator.js';
import type { FlowchartInput } from './types/dsl.js';

/**
 * High-level API: Create an Excalidraw flowchart from DSL string
 */
export async function createFlowchartFromDSL(dsl: string): Promise<string> {
  const graph = _parseDSL(dsl);
  const layoutedGraph = await _layoutGraph(graph);
  const excalidrawFile = _generateExcalidraw(layoutedGraph);
  return _serializeExcalidraw(excalidrawFile);
}

/**
 * High-level API: Create an Excalidraw flowchart from JSON input
 */
export async function createFlowchartFromJSON(input: FlowchartInput): Promise<string> {
  const graph = _parseJSON(input);
  const layoutedGraph = await _layoutGraph(graph);
  const excalidrawFile = _generateExcalidraw(layoutedGraph);
  return _serializeExcalidraw(excalidrawFile);
}
