/**
 * Excalidraw Generator
 *
 * Assembles a complete Excalidraw file from a layouted graph.
 */

import { createNode, createArrow, createNodeLabel, createEdgeLabel, resetIndexCounter } from '../factory/index.js';
import type {
  ExcalidrawFile,
  ExcalidrawElement,
  ExcalidrawBoundElement,
  DEFAULT_APP_STATE,
} from '../types/excalidraw.js';
import type { LayoutedGraph, LayoutedNode, LayoutedEdge } from '../types/dsl.js';

const SOURCE_URL = 'https://github.com/swiftlysingh/excalidraw-cli';

/**
 * Generate an Excalidraw file from a layouted graph
 */
export function generateExcalidraw(graph: LayoutedGraph): ExcalidrawFile {
  // Reset index counter for fresh ordering
  resetIndexCounter();

  const elements: ExcalidrawElement[] = [];

  // Build a map of node IDs to nodes for quick lookup
  const nodeMap = new Map<string, LayoutedNode>();
  for (const node of graph.nodes) {
    nodeMap.set(node.id, node);
  }

  // Calculate bound elements for each node
  const nodeBoundElements = new Map<string, ExcalidrawBoundElement[]>();

  for (const edge of graph.edges) {
    // Add arrow as bound element to source node
    if (!nodeBoundElements.has(edge.source)) {
      nodeBoundElements.set(edge.source, []);
    }
    nodeBoundElements.get(edge.source)!.push({ id: edge.id, type: 'arrow' });

    // Add arrow as bound element to target node
    if (!nodeBoundElements.has(edge.target)) {
      nodeBoundElements.set(edge.target, []);
    }
    nodeBoundElements.get(edge.target)!.push({ id: edge.id, type: 'arrow' });
  }

  // Create shape elements for nodes
  for (const node of graph.nodes) {
    const boundElements = nodeBoundElements.get(node.id);
    const shapeElement = createNode(node, boundElements);
    elements.push(shapeElement);

    // Create text label for the node
    const textElement = createNodeLabel(node);
    elements.push(textElement);
  }

  // Calculate bound elements for arrows (text labels)
  const arrowBoundElements = new Map<string, ExcalidrawBoundElement[]>();

  for (const edge of graph.edges) {
    if (edge.label) {
      if (!arrowBoundElements.has(edge.id)) {
        arrowBoundElements.set(edge.id, []);
      }
      // Text element ID will be generated when we create it
    }
  }

  // Create arrow elements for edges
  for (const edge of graph.edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode || !targetNode) {
      console.warn(`Skipping edge ${edge.id}: missing source or target node`);
      continue;
    }

    // Create arrow with bound text if it has a label
    const boundElements = edge.label ? [{ id: `text-${edge.id}`, type: 'text' as const }] : undefined;
    const arrowElement = createArrow(edge, sourceNode, targetNode, boundElements);
    elements.push(arrowElement);

    // Create text label for the edge if it has one
    if (edge.label) {
      const textElement = createEdgeLabel(
        edge.label,
        edge.points,
        edge.sourcePoint.x,
        edge.sourcePoint.y,
        edge.id
      );
      // Override the text element ID to match what we bound
      (textElement as any).id = `text-${edge.id}`;
      elements.push(textElement);
    }
  }

  return {
    type: 'excalidraw',
    version: 2,
    source: SOURCE_URL,
    elements,
    appState: { ...DEFAULT_APP_STATE },
    files: {},
  };
}

/**
 * Serialize an Excalidraw file to JSON string
 */
export function serializeExcalidraw(file: ExcalidrawFile, pretty = true): string {
  return JSON.stringify(file, null, pretty ? 2 : undefined);
}

// Re-export
export { DEFAULT_APP_STATE } from '../types/excalidraw.js';
