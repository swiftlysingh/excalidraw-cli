/**
 * Text Factory
 *
 * Creates Excalidraw text elements for labels.
 */

import { nanoid } from 'nanoid';
import { createBaseElement } from './element-factory.js';
import type {
  ExcalidrawText,
  ExcalidrawTextAlign,
  ExcalidrawVerticalAlign,
} from '../types/excalidraw.js';
import type { LayoutedNode } from '../types/dsl.js';

/**
 * Default font settings
 */
const DEFAULT_FONT_SIZE = 20;
const DEFAULT_FONT_FAMILY = 5; // Excalifont
const DEFAULT_LINE_HEIGHT = 1.25;

/**
 * Calculate text dimensions
 */
function calculateTextDimensions(
  text: string,
  fontSize: number
): { width: number; height: number } {
  const lines = text.split('\n');
  const lineCount = lines.length;
  const maxLineLength = Math.max(...lines.map((l) => l.length));

  // Approximate character width (varies by font)
  const charWidth = fontSize * 0.6;
  const lineHeight = fontSize * DEFAULT_LINE_HEIGHT;

  return {
    width: maxLineLength * charWidth,
    height: lineCount * lineHeight,
  };
}

/**
 * Create a standalone text element
 */
export function createText(
  text: string,
  x: number,
  y: number,
  options?: {
    id?: string;
    fontSize?: number;
    fontFamily?: number;
    textAlign?: ExcalidrawTextAlign;
    verticalAlign?: ExcalidrawVerticalAlign;
    strokeColor?: string;
  }
): ExcalidrawText {
  const fontSize = options?.fontSize ?? DEFAULT_FONT_SIZE;
  const dims = calculateTextDimensions(text, fontSize);

  return {
    ...createBaseElement('text', x, y, dims.width, dims.height, {
      id: options?.id || nanoid(21),
      roundness: null,
      strokeColor: options?.strokeColor,
    }),
    type: 'text',
    text,
    fontSize,
    fontFamily: options?.fontFamily ?? DEFAULT_FONT_FAMILY,
    textAlign: options?.textAlign ?? 'center',
    verticalAlign: options?.verticalAlign ?? 'middle',
    containerId: null,
    originalText: text,
    autoResize: true,
    lineHeight: DEFAULT_LINE_HEIGHT,
  } as ExcalidrawText;
}

/**
 * Create a text element bound to a container (shape or arrow)
 */
export function createBoundText(
  text: string,
  containerId: string,
  centerX: number,
  centerY: number,
  options?: {
    id?: string;
    fontSize?: number;
    fontFamily?: number;
    textAlign?: ExcalidrawTextAlign;
    verticalAlign?: ExcalidrawVerticalAlign;
    strokeColor?: string;
  }
): ExcalidrawText {
  const fontSize = options?.fontSize ?? DEFAULT_FONT_SIZE;
  const dims = calculateTextDimensions(text, fontSize);

  // Center text on the given coordinates
  const x = centerX - dims.width / 2;
  const y = centerY - dims.height / 2;

  return {
    ...createBaseElement('text', x, y, dims.width, dims.height, {
      id: options?.id || nanoid(21),
      roundness: null,
      strokeColor: options?.strokeColor,
    }),
    type: 'text',
    text,
    fontSize,
    fontFamily: options?.fontFamily ?? DEFAULT_FONT_FAMILY,
    textAlign: options?.textAlign ?? 'center',
    verticalAlign: options?.verticalAlign ?? 'middle',
    containerId,
    originalText: text,
    autoResize: true,
    lineHeight: DEFAULT_LINE_HEIGHT,
  } as ExcalidrawText;
}

/**
 * Create a text label for a node (centered inside the shape)
 */
export function createNodeLabel(node: LayoutedNode, options?: { fontSize?: number }): ExcalidrawText {
  const fontSize = options?.fontSize ?? DEFAULT_FONT_SIZE;
  const dims = calculateTextDimensions(node.label, fontSize);

  // Center text inside the node
  const x = node.x + (node.width - dims.width) / 2;
  const y = node.y + (node.height - dims.height) / 2;

  return {
    ...createBaseElement('text', x, y, dims.width, dims.height, {
      roundness: null,
    }),
    type: 'text',
    text: node.label,
    fontSize,
    fontFamily: DEFAULT_FONT_FAMILY,
    textAlign: 'center',
    verticalAlign: 'middle',
    containerId: null, // Standalone text, positioned over the shape
    originalText: node.label,
    autoResize: true,
    lineHeight: DEFAULT_LINE_HEIGHT,
  } as ExcalidrawText;
}

/**
 * Create a text label for an edge (positioned at midpoint)
 */
export function createEdgeLabel(
  label: string,
  points: Array<[number, number]>,
  startX: number,
  startY: number,
  arrowId: string,
  options?: { fontSize?: number }
): ExcalidrawText {
  const fontSize = options?.fontSize ?? DEFAULT_FONT_SIZE;
  const dims = calculateTextDimensions(label, fontSize);

  // Find midpoint of the arrow path
  let midX = 0;
  let midY = 0;

  if (points.length === 2) {
    // Simple two-point arrow
    midX = startX + (points[0][0] + points[1][0]) / 2;
    midY = startY + (points[0][1] + points[1][1]) / 2;
  } else if (points.length > 2) {
    // Multi-point arrow - use middle point or interpolate
    const midIndex = Math.floor(points.length / 2);
    midX = startX + points[midIndex][0];
    midY = startY + points[midIndex][1];
  } else {
    midX = startX;
    midY = startY;
  }

  // Position text centered at midpoint
  const x = midX - dims.width / 2;
  const y = midY - dims.height / 2;

  return {
    ...createBaseElement('text', x, y, dims.width, dims.height, {
      roundness: null,
    }),
    type: 'text',
    text: label,
    fontSize,
    fontFamily: DEFAULT_FONT_FAMILY,
    textAlign: 'center',
    verticalAlign: 'middle',
    containerId: arrowId, // Bound to the arrow
    originalText: label,
    autoResize: true,
    lineHeight: DEFAULT_LINE_HEIGHT,
  } as ExcalidrawText;
}
