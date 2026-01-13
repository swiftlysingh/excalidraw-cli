/**
 * ELK.js Layout Engine
 *
 * Uses ELK (Eclipse Layout Kernel) for automatic graph layout.
 */

import _ELK from 'elkjs/lib/elk.bundled.js';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ELK = _ELK as any;
import type {
  FlowchartGraph,
  LayoutedGraph,
  LayoutedNode,
  LayoutedEdge,
  LayoutedImage,
  LayoutOptions,
  GraphNode,
  PositionedImage,
  DecorationAnchor,
} from '../types/dsl.js';
import { getImageDimensions } from '../factory/image-factory.js';

// ELK types
interface ElkNode {
  id: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  labels?: Array<{ text: string }>;
}

interface ElkEdge {
  id: string;
  sources: string[];
  targets: string[];
  labels?: Array<{ text: string }>;
  sections?: Array<{
    startPoint: { x: number; y: number };
    endPoint: { x: number; y: number };
    bendPoints?: Array<{ x: number; y: number }>;
  }>;
}

interface ElkGraph {
  id: string;
  layoutOptions: Record<string, string>;
  children: ElkNode[];
  edges: ElkEdge[];
}

/**
 * Calculate node dimensions based on label and type
 */
function calculateNodeDimensions(node: GraphNode): { width: number; height: number } {
  // Handle image nodes specially
  if (node.type === 'image' && node.image) {
    return getImageDimensions(node.image.src, node.image.width, node.image.height);
  }

  const lines = node.label.split('\n');
  const maxLineLength = Math.max(...lines.map((l) => l.length));
  const lineCount = lines.length;

  // Base character width (approximate)
  const charWidth = 10;
  const lineHeight = 25;
  const paddingX = 40;
  const paddingY = 30;

  let width = maxLineLength * charWidth + paddingX;
  let height = lineCount * lineHeight + paddingY;

  // Minimum dimensions based on node type
  const minDimensions: Record<string, { width: number; height: number }> = {
    rectangle: { width: 100, height: 60 },
    diamond: { width: 120, height: 80 },
    ellipse: { width: 100, height: 60 },
    database: { width: 100, height: 70 },
  };

  const min = minDimensions[node.type] || minDimensions.rectangle;
  width = Math.max(width, min.width);
  height = Math.max(height, min.height);

  // Diamonds need extra space for the rotated shape
  if (node.type === 'diamond') {
    width = Math.max(width * 1.4, 140);
    height = Math.max(height * 1.4, 100);
  }

  return { width, height };
}

/**
 * Convert flow direction to ELK direction
 */
function getElkDirection(direction: LayoutOptions['direction']): string {
  const mapping: Record<string, string> = {
    TB: 'DOWN',
    BT: 'UP',
    LR: 'RIGHT',
    RL: 'LEFT',
  };
  return mapping[direction] || 'DOWN';
}

/**
 * Layout a flowchart graph using ELK
 */
export async function layoutGraph(graph: FlowchartGraph): Promise<LayoutedGraph> {
  const elk = new ELK();

  // Build ELK graph
  const elkGraph: ElkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': getElkDirection(graph.options.direction),
      'elk.spacing.nodeNode': String(graph.options.nodeSpacing),
      'elk.layered.spacing.baseValue': String(graph.options.rankSpacing),
      'elk.layered.spacing.edgeNodeBetweenLayers': String(graph.options.nodeSpacing),
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    },
    children: graph.nodes.map((node) => {
      const dims = calculateNodeDimensions(node);
      return {
        id: node.id,
        width: dims.width,
        height: dims.height,
        labels: [{ text: node.label }],
      };
    }),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
      labels: edge.label ? [{ text: edge.label }] : undefined,
    })),
  };

  // Run ELK layout
  const layoutResult = await elk.layout(elkGraph);

  // Build node map for lookups
  const nodeMap = new Map<string, GraphNode>();
  for (const node of graph.nodes) {
    nodeMap.set(node.id, node);
  }

  // Extract layouted nodes
  const layoutedNodes: LayoutedNode[] = [];
  const elkNodeMap = new Map<string, ElkNode>();

  for (const elkNode of layoutResult.children || []) {
    elkNodeMap.set(elkNode.id, elkNode);
    const originalNode = nodeMap.get(elkNode.id);
    if (originalNode) {
      layoutedNodes.push({
        ...originalNode,
        x: (elkNode.x || 0) + graph.options.padding,
        y: (elkNode.y || 0) + graph.options.padding,
        width: elkNode.width || 100,
        height: elkNode.height || 60,
      });
    }
  }

  // Extract layouted edges
  const layoutedEdges: LayoutedEdge[] = [];
  for (const elkEdge of (layoutResult.edges as ElkEdge[]) || []) {
    const originalEdge = graph.edges.find((e) => e.id === elkEdge.id);
    if (!originalEdge) continue;

    const section = elkEdge.sections?.[0];
    let points: Array<[number, number]> = [];
    let sourcePoint = { x: 0, y: 0 };
    let targetPoint = { x: 0, y: 0 };

    if (section) {
      sourcePoint = {
        x: section.startPoint.x + graph.options.padding,
        y: section.startPoint.y + graph.options.padding,
      };
      targetPoint = {
        x: section.endPoint.x + graph.options.padding,
        y: section.endPoint.y + graph.options.padding,
      };

      // Build points array (relative to start point for Excalidraw)
      points = [[0, 0]];

      if (section.bendPoints) {
        for (const bend of section.bendPoints) {
          points.push([
            bend.x + graph.options.padding - sourcePoint.x,
            bend.y + graph.options.padding - sourcePoint.y,
          ]);
        }
      }

      points.push([targetPoint.x - sourcePoint.x, targetPoint.y - sourcePoint.y]);
    } else {
      // Fallback: calculate direct line between node centers
      const sourceElk = elkNodeMap.get(originalEdge.source);
      const targetElk = elkNodeMap.get(originalEdge.target);

      if (sourceElk && targetElk) {
        const sx = (sourceElk.x || 0) + (sourceElk.width || 0) / 2 + graph.options.padding;
        const sy = (sourceElk.y || 0) + (sourceElk.height || 0) / 2 + graph.options.padding;
        const tx = (targetElk.x || 0) + (targetElk.width || 0) / 2 + graph.options.padding;
        const ty = (targetElk.y || 0) + (targetElk.height || 0) / 2 + graph.options.padding;

        sourcePoint = { x: sx, y: sy };
        targetPoint = { x: tx, y: ty };
        points = [
          [0, 0],
          [tx - sx, ty - sy],
        ];
      }
    }

    layoutedEdges.push({
      ...originalEdge,
      points,
      sourcePoint,
      targetPoint,
    });
  }

  // Calculate total dimensions
  let maxX = 0;
  let maxY = 0;
  for (const node of layoutedNodes) {
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  const canvasWidth = maxX + graph.options.padding;
  const canvasHeight = maxY + graph.options.padding;

  // Resolve positioned images
  const layoutedImages = resolvePositionedImages(
    graph.images || [],
    layoutedNodes,
    canvasWidth,
    canvasHeight
  );

  const result: LayoutedGraph = {
    nodes: layoutedNodes,
    edges: layoutedEdges,
    options: graph.options,
    width: canvasWidth,
    height: canvasHeight,
  };

  if (layoutedImages.length > 0) result.images = layoutedImages;
  if (graph.scatter && graph.scatter.length > 0) result.scatter = graph.scatter;
  if (graph.library) result.library = graph.library;

  return result;
}

/**
 * Calculate position offset for decoration anchor
 */
function getAnchorOffset(
  anchor: DecorationAnchor | undefined,
  nodeWidth: number,
  nodeHeight: number,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number } {
  const margin = 5; // Small margin from node edge

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
      // Default to top-right
      return { x: nodeWidth - imageWidth / 2, y: -imageHeight / 2 };
  }
}

/**
 * Resolve positioned images to absolute coordinates
 */
function resolvePositionedImages(
  images: PositionedImage[],
  layoutedNodes: LayoutedNode[],
  _canvasWidth: number,
  _canvasHeight: number
): LayoutedImage[] {
  const result: LayoutedImage[] = [];
  const defaultSize = 50;

  // Build node lookup by label
  const nodeByLabel = new Map<string, LayoutedNode>();
  for (const node of layoutedNodes) {
    nodeByLabel.set(node.label, node);
  }

  for (const image of images) {
    const width = image.width || defaultSize;
    const height = image.height || defaultSize;

    if (image.position.type === 'absolute') {
      result.push({
        id: image.id,
        src: image.src,
        x: image.position.x,
        y: image.position.y,
        width,
        height,
      });
    } else if (image.position.type === 'near') {
      const node = nodeByLabel.get(image.position.nodeLabel);
      if (node) {
        const offset = getAnchorOffset(
          image.position.anchor,
          node.width,
          node.height,
          width,
          height
        );
        result.push({
          id: image.id,
          src: image.src,
          x: node.x + offset.x,
          y: node.y + offset.y,
          width,
          height,
        });
      } else {
        // Node not found, place at origin
        console.warn(`Node "${image.position.nodeLabel}" not found for positioned image`);
        result.push({
          id: image.id,
          src: image.src,
          x: 0,
          y: 0,
          width,
          height,
        });
      }
    }
  }

  return result;
}
