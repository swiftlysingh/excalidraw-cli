/**
 * Node Factory
 *
 * Creates Excalidraw shape elements (rectangle, diamond, ellipse).
 */

import { createBaseElement } from './element-factory.js';
import type {
  ExcalidrawRectangle,
  ExcalidrawDiamond,
  ExcalidrawEllipse,
  ExcalidrawBoundElement,
} from '../types/excalidraw.js';
import type { LayoutedNode, NodeStyle } from '../types/dsl.js';

/**
 * Map DSL style to Excalidraw properties
 */
function mapStyle(style?: NodeStyle): Partial<ExcalidrawRectangle> {
  if (!style) return {};

  const result: Partial<ExcalidrawRectangle> = {};
  if (style.strokeColor !== undefined) result.strokeColor = style.strokeColor;
  if (style.backgroundColor !== undefined) result.backgroundColor = style.backgroundColor;
  if (style.strokeWidth !== undefined) result.strokeWidth = style.strokeWidth;
  if (style.strokeStyle !== undefined) result.strokeStyle = style.strokeStyle;
  if (style.fillStyle !== undefined) result.fillStyle = style.fillStyle;
  if (style.opacity !== undefined) result.opacity = style.opacity;
  if (style.roughness !== undefined) result.roughness = style.roughness;
  return result;
}

/**
 * Create a rectangle element
 */
export function createRectangle(
  node: LayoutedNode,
  boundElements?: ExcalidrawBoundElement[]
): ExcalidrawRectangle {
  const styleProps = mapStyle(node.style);

  return {
    ...createBaseElement('rectangle', node.x, node.y, node.width, node.height, {
      id: node.id,
      roundness: { type: 3 }, // Adaptive roundness
      boundElements: boundElements || null,
      ...styleProps,
    }),
    type: 'rectangle',
  } as ExcalidrawRectangle;
}

/**
 * Create a diamond element
 */
export function createDiamond(
  node: LayoutedNode,
  boundElements?: ExcalidrawBoundElement[]
): ExcalidrawDiamond {
  const styleProps = mapStyle(node.style);

  return {
    ...createBaseElement('diamond', node.x, node.y, node.width, node.height, {
      id: node.id,
      roundness: { type: 2 }, // Proportional roundness
      boundElements: boundElements || null,
      ...styleProps,
    }),
    type: 'diamond',
  } as ExcalidrawDiamond;
}

/**
 * Create an ellipse element
 */
export function createEllipse(
  node: LayoutedNode,
  boundElements?: ExcalidrawBoundElement[]
): ExcalidrawEllipse {
  const styleProps = mapStyle(node.style);

  return {
    ...createBaseElement('ellipse', node.x, node.y, node.width, node.height, {
      id: node.id,
      roundness: null, // Ellipses don't use roundness
      boundElements: boundElements || null,
      ...styleProps,
    }),
    type: 'ellipse',
  } as ExcalidrawEllipse;
}

/**
 * Create a node element based on type
 */
export function createNode(
  node: LayoutedNode,
  boundElements?: ExcalidrawBoundElement[]
): ExcalidrawRectangle | ExcalidrawDiamond | ExcalidrawEllipse {
  switch (node.type) {
    case 'diamond':
      return createDiamond(node, boundElements);
    case 'ellipse':
      return createEllipse(node, boundElements);
    case 'database':
      // Database is rendered as rectangle with special styling
      return createRectangle(node, boundElements);
    case 'rectangle':
    default:
      return createRectangle(node, boundElements);
  }
}
