/**
 * Connection Factory
 *
 * Creates Excalidraw arrow elements for connections between nodes.
 */

import { createBaseElement } from './element-factory.js';
import { calculateStartBinding, calculateEndBinding } from '../layout/arrow-router.js';
import type {
  ExcalidrawArrow,
  ExcalidrawArrowBinding,
  ExcalidrawBoundElement,
} from '../types/excalidraw.js';
import type { LayoutedEdge, LayoutedNode, EdgeStyle } from '../types/dsl.js';

/**
 * Map DSL edge style to Excalidraw properties
 */
function mapEdgeStyle(style?: EdgeStyle): Partial<ExcalidrawArrow> {
  if (!style) return {};

  return {
    strokeColor: style.strokeColor,
    strokeWidth: style.strokeWidth,
    strokeStyle: style.strokeStyle,
    roughness: style.roughness,
    // Use === undefined to allow explicit null values (needed for reverse arrows)
    startArrowhead: style.startArrowhead === undefined ? null : style.startArrowhead,
    endArrowhead: style.endArrowhead === undefined ? 'arrow' : style.endArrowhead,
  };
}

/**
 * Create an arrow element
 */
export function createArrow(
  edge: LayoutedEdge,
  sourceNode: LayoutedNode,
  targetNode: LayoutedNode,
  boundElements?: ExcalidrawBoundElement[]
): ExcalidrawArrow {
  const styleProps = mapEdgeStyle(edge.style);

  // Calculate bindings
  const startBindingInfo = calculateStartBinding(sourceNode, targetNode);
  const endBindingInfo = calculateEndBinding(sourceNode, targetNode);

  // Use the source point as arrow position
  const x = edge.sourcePoint.x;
  const y = edge.sourcePoint.y;

  // Calculate bounding box for width/height
  let minX = 0,
    maxX = 0,
    minY = 0,
    maxY = 0;
  for (const [px, py] of edge.points) {
    minX = Math.min(minX, px);
    maxX = Math.max(maxX, px);
    minY = Math.min(minY, py);
    maxY = Math.max(maxY, py);
  }

  const width = maxX - minX;
  const height = maxY - minY;

  return {
    ...createBaseElement('arrow', x, y, width, height, {
      id: edge.id,
      roundness: { type: 2 }, // Proportional roundness for smooth curves
      boundElements: boundElements || null,
      ...styleProps,
    }),
    type: 'arrow',
    points: edge.points,
    lastCommittedPoint: null,
    startBinding: startBindingInfo.binding,
    endBinding: endBindingInfo.binding,
    startArrowhead: styleProps.startArrowhead ?? null,
    endArrowhead: styleProps.endArrowhead ?? 'arrow',
    elbowed: false,
  } as ExcalidrawArrow;
}

/**
 * Create arrow with explicit bindings
 */
export function createArrowWithBindings(
  id: string,
  x: number,
  y: number,
  points: Array<[number, number]>,
  startBinding: ExcalidrawArrowBinding | null,
  endBinding: ExcalidrawArrowBinding | null,
  boundElements?: ExcalidrawBoundElement[],
  style?: EdgeStyle
): ExcalidrawArrow {
  const styleProps = mapEdgeStyle(style);

  // Calculate bounding box
  let minX = 0,
    maxX = 0,
    minY = 0,
    maxY = 0;
  for (const [px, py] of points) {
    minX = Math.min(minX, px);
    maxX = Math.max(maxX, px);
    minY = Math.min(minY, py);
    maxY = Math.max(maxY, py);
  }

  return {
    ...createBaseElement('arrow', x, y, maxX - minX, maxY - minY, {
      id,
      roundness: { type: 2 },
      boundElements: boundElements || null,
      ...styleProps,
    }),
    type: 'arrow',
    points,
    lastCommittedPoint: null,
    startBinding,
    endBinding,
    startArrowhead: styleProps.startArrowhead ?? null,
    endArrowhead: styleProps.endArrowhead ?? 'arrow',
    elbowed: false,
  } as ExcalidrawArrow;
}
