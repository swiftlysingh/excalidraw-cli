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
export { exportToSVG, exportToPNG, exportImage, swapExtension } from './exporter/index.js';
export type { ExportOptions } from './exporter/index.js';

// Default options
export { DEFAULT_LAYOUT_OPTIONS } from './types/dsl.js';
export { DEFAULT_APP_STATE, DEFAULT_ELEMENT_STYLE } from './types/excalidraw.js';

/**
 * High-level API: Create an Excalidraw flowchart from DSL string
 */
export async function createFlowchartFromDSL(dsl: string): Promise<string> {
  const graph = (await import('./parser/dsl-parser.js')).parseDSL(dsl);
  const layoutedGraph = await (await import('./layout/elk-layout.js')).layoutGraph(graph);
  const excalidrawFile = (await import('./generator/excalidraw-generator.js')).generateExcalidraw(
    layoutedGraph
  );
  return (await import('./generator/excalidraw-generator.js')).serializeExcalidraw(excalidrawFile);
}

/**
 * High-level API: Create an Excalidraw flowchart from JSON input
 */
export async function createFlowchartFromJSON(input: import('./types/dsl.js').FlowchartInput): Promise<string> {
  const graph = (await import('./parser/json-parser.js')).parseJSON(input);
  const layoutedGraph = await (await import('./layout/elk-layout.js')).layoutGraph(graph);
  const excalidrawFile = (await import('./generator/excalidraw-generator.js')).generateExcalidraw(
    layoutedGraph
  );
  return (await import('./generator/excalidraw-generator.js')).serializeExcalidraw(excalidrawFile);
}
