/**
 * Excalidraw Generator
 *
 * Assembles a complete Excalidraw file from a layouted graph.
 */

import { nanoid } from 'nanoid';
import {
  createNode,
  createArrow,
  createNodeLabel,
  createEdgeLabel,
  resetIndexCounter,
  createImageElement,
  createPositionedImageElement,
  createFileData,
  generateFileId,
  getImageDimensions,
} from '../factory/index.js';
import type {
  ExcalidrawFile,
  ExcalidrawElement,
  ExcalidrawBoundElement,
  ExcalidrawFileData,
} from '../types/excalidraw.js';
import { DEFAULT_APP_STATE } from '../types/excalidraw.js';
import type {
  LayoutedGraph,
  LayoutedNode,
  LayoutedImage,
  ScatterConfig,
  DecorationAnchor,
} from '../types/dsl.js';

const SOURCE_URL = 'https://github.com/swiftlysingh/excalidraw-cli';

/**
 * Calculate decoration position offset
 */
function getDecorationOffset(
  anchor: DecorationAnchor,
  nodeWidth: number,
  nodeHeight: number,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number } {
  const margin = 5;

  switch (anchor) {
    case 'top':
      return { x: (nodeWidth - imageWidth) / 2, y: -imageHeight - margin };
    case 'bottom':
      return { x: (nodeWidth - imageWidth) / 2, y: nodeHeight + margin };
    case 'left':
      return { x: -imageWidth - margin, y: (nodeHeight - imageHeight) / 2 };
    case 'right':
      return { x: nodeWidth + margin, y: (nodeHeight - imageHeight) / 2 };
    case 'top-left':
      return { x: -imageWidth / 2, y: -imageHeight / 2 };
    case 'top-right':
      return { x: nodeWidth - imageWidth / 2, y: -imageHeight / 2 };
    case 'bottom-left':
      return { x: -imageWidth / 2, y: nodeHeight - imageHeight / 2 };
    case 'bottom-right':
      return { x: nodeWidth - imageWidth / 2, y: nodeHeight - imageHeight / 2 };
    default:
      return { x: nodeWidth - imageWidth / 2, y: -imageHeight / 2 };
  }
}

/**
 * Generate scattered images across the canvas
 */
function generateScatteredImages(
  scatter: ScatterConfig[],
  canvasWidth: number,
  canvasHeight: number,
  elements: ExcalidrawElement[],
  files: Record<string, ExcalidrawFileData>,
  libraryPath?: string
): void {
  for (const config of scatter) {
    const width = config.width || 30;
    const height = config.height || 30;

    // Generate random positions avoiding the center area
    for (let i = 0; i < config.count; i++) {
      const x = Math.random() * (canvasWidth - width);
      const y = Math.random() * (canvasHeight - height);

      const fileId = generateFileId();
      const imageId = nanoid(10);

      // Create file data
      const fileData = createFileData(config.src, fileId, libraryPath);
      if (fileData) {
        files[fileId] = fileData;

        // Create image element
        const imageElement = createPositionedImageElement(
          { id: imageId, src: config.src, x, y, width, height },
          fileId
        );
        elements.unshift(imageElement); // Add at beginning for lower z-index
      }
    }
  }
}

/**
 * Generate an Excalidraw file from a layouted graph
 */
export function generateExcalidraw(graph: LayoutedGraph): ExcalidrawFile {
  // Reset index counter for fresh ordering
  resetIndexCounter();

  const elements: ExcalidrawElement[] = [];
  const files: Record<string, ExcalidrawFileData> = {};

  // Build a map of node IDs to nodes for quick lookup
  const nodeMap = new Map<string, LayoutedNode>();
  for (const node of graph.nodes) {
    nodeMap.set(node.id, node);
  }

  // Calculate bound elements for each node (only for non-image nodes)
  const nodeBoundElements = new Map<string, ExcalidrawBoundElement[]>();

  for (const edge of graph.edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    // Only bind arrows to shape nodes, not image nodes
    if (sourceNode && sourceNode.type !== 'image') {
      if (!nodeBoundElements.has(edge.source)) {
        nodeBoundElements.set(edge.source, []);
      }
      nodeBoundElements.get(edge.source)!.push({ id: edge.id, type: 'arrow' });
    }

    if (targetNode && targetNode.type !== 'image') {
      if (!nodeBoundElements.has(edge.target)) {
        nodeBoundElements.set(edge.target, []);
      }
      nodeBoundElements.get(edge.target)!.push({ id: edge.id, type: 'arrow' });
    }
  }

  // Create elements for nodes
  for (const node of graph.nodes) {
    if (node.type === 'image' && node.image) {
      // Create image element
      const fileId = generateFileId();
      const fileData = createFileData(node.image.src, fileId, graph.library);
      if (fileData) {
        files[fileId] = fileData;
        const imageElement = createImageElement(node, fileId);
        elements.push(imageElement);
      }
    } else {
      // Create shape element
      const boundElements = nodeBoundElements.get(node.id);
      const shapeElement = createNode(node, boundElements);
      elements.push(shapeElement);

      // Create text label for the node
      const textElement = createNodeLabel(node);
      elements.push(textElement);

      // Create decoration images for this node
      if (node.decorations) {
        for (const decoration of node.decorations) {
          const dims = getImageDimensions(decoration.src, decoration.width, decoration.height);
          const offset = getDecorationOffset(
            decoration.anchor,
            node.width,
            node.height,
            dims.width,
            dims.height
          );

          const fileId = generateFileId();
          const fileData = createFileData(decoration.src, fileId, graph.library);
          if (fileData) {
            files[fileId] = fileData;

            const decorationImage: LayoutedImage = {
              id: nanoid(10),
              src: decoration.src,
              x: node.x + offset.x,
              y: node.y + offset.y,
              width: dims.width,
              height: dims.height,
            };
            const imageElement = createPositionedImageElement(decorationImage, fileId);
            elements.push(imageElement);
          }
        }
      }
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
      (textElement as { id: string }).id = `text-${edge.id}`;
      elements.push(textElement);
    }
  }

  // Create positioned images (from @image directives)
  if (graph.images) {
    for (const image of graph.images) {
      const fileId = generateFileId();
      const fileData = createFileData(image.src, fileId, graph.library);
      if (fileData) {
        files[fileId] = fileData;
        const imageElement = createPositionedImageElement(image, fileId);
        elements.push(imageElement);
      }
    }
  }

  // Generate scattered images (from @scatter directives)
  if (graph.scatter && graph.scatter.length > 0) {
    generateScatteredImages(
      graph.scatter,
      graph.width,
      graph.height,
      elements,
      files,
      graph.library
    );
  }

  return {
    type: 'excalidraw',
    version: 2,
    source: SOURCE_URL,
    elements,
    appState: { ...DEFAULT_APP_STATE },
    files,
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
