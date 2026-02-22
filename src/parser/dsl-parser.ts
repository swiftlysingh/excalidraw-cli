/**
 * DSL Parser for Flowchart Syntax
 *
 * Syntax:
 *   [Label]        - Rectangle (process step)
 *   {Label}        - Diamond (decision)
 *   (Label)        - Ellipse (start/end)
 *   [[Label]]      - Database
 *   ![path]        - Image element
 *   ![path](WxH)   - Image with dimensions
 *   A -> B         - Forward arrow
 *   A <- B         - Reverse arrow
 *   A <-> B        - Bidirectional arrow
 *   A --> B        - Dashed forward arrow
 *   A <-- B        - Dashed reverse arrow
 *   A <--> B       - Dashed bidirectional arrow
 *   A -> "label" -> B  - Labeled connection
 *
 * Directives:
 *   @direction TB  - Set flow direction (TB, BT, LR, RL)
 *   @spacing N     - Set node spacing
 *   @image path at X,Y           - Position image at absolute coordinates
 *   @image path near (NodeLabel) - Position image near a node
 *   @decorate path anchor        - Attach decoration to preceding node
 *   @sticker name [at X,Y]       - Add sticker from library
 *   @library path                - Set custom sticker library path
 *   @scatter path count:N        - Scatter images across canvas
 */

import { nanoid } from 'nanoid';
import type {
  FlowchartGraph,
  GraphNode,
  GraphEdge,
  LayoutOptions,
  NodeType,
  PositionedImage,
  ScatterConfig,
  DecorationAnchor,
  ImageSource,
  EdgeStyle,
} from '../types/dsl.js';
import { DEFAULT_LAYOUT_OPTIONS } from '../types/dsl.js';

interface Token {
  type: 'node' | 'arrow' | 'label' | 'directive' | 'newline' | 'image' | 'decorate';
  value: string;
  nodeType?: NodeType;
  dashed?: boolean;
  // Arrow direction properties
  bidirectional?: boolean;
  reversed?: boolean;
  // Image-specific properties
  imageSrc?: string;
  imageWidth?: number;
  imageHeight?: number;
  // Decoration-specific properties
  decorationAnchor?: DecorationAnchor;
}

/**
 * Tokenize DSL input into tokens
 */
function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    // Skip whitespace (except newlines)
    if (input[i] === ' ' || input[i] === '\t') {
      i++;
      continue;
    }

    // Newline
    if (input[i] === '\n') {
      tokens.push({ type: 'newline', value: '\n' });
      i++;
      continue;
    }

    // Comment (skip rest of line)
    if (input[i] === '#') {
      while (i < len && input[i] !== '\n') i++;
      continue;
    }

    // Image ![path] or ![path](WxH)
    if (input[i] === '!' && input[i + 1] === '[') {
      i += 2; // skip ![
      let src = '';
      while (i < len && input[i] !== ']') {
        src += input[i];
        i++;
      }
      i++; // skip ]

      let width: number | undefined;
      let height: number | undefined;

      // Check for optional dimensions (WxH)
      if (i < len && input[i] === '(') {
        i++; // skip (
        let dims = '';
        while (i < len && input[i] !== ')') {
          dims += input[i];
          i++;
        }
        i++; // skip )
        const match = dims.match(/^(\d+)\s*[xX]\s*(\d+)$/);
        if (match) {
          width = parseInt(match[1], 10);
          height = parseInt(match[2], 10);
        }
      }

      tokens.push({
        type: 'image',
        value: src.trim(),
        imageSrc: src.trim(),
        imageWidth: width,
        imageHeight: height,
      });
      continue;
    }

    // Check if @ is a directive
    if (input[i] === '@') {
      // This is a directive: @direction, @spacing, etc.
      let directive = '';
      i++; // skip @
      while (i < len && /[a-zA-Z0-9]/.test(input[i])) {
        directive += input[i];
        i++;
      }
      // Get directive value
      while (i < len && (input[i] === ' ' || input[i] === '\t')) i++;
      let value = '';
      
      // For directives, stop at newline, comment, or another @
      while (i < len && input[i] !== '\n' && input[i] !== '#' && input[i] !== '@') {
        value += input[i];
        i++;
      }

      // Handle @decorate as a special token type (attaches to preceding node)
      if (directive === 'decorate') {
        // Parse: @decorate path anchor
        const parts = value.trim().split(/\s+/);
        const src = parts[0] || '';
        const anchor = (parts[1] || 'top-right') as DecorationAnchor;
        tokens.push({
          type: 'decorate',
          value: src,
          imageSrc: src,
          decorationAnchor: anchor,
        });
      } else {
        tokens.push({ type: 'directive', value: `${directive} ${value.trim()}` });
      }
      continue;
    }

    // Database [[Label]]
    if (input[i] === '[' && input[i + 1] === '[') {
      i += 2;
      let label = '';
      while (i < len && !(input[i] === ']' && input[i + 1] === ']')) {
        label += input[i];
        i++;
      }
      i += 2; // skip ]]
      tokens.push({ type: 'node', value: label.trim(), nodeType: 'database' });
      continue;
    }

    // Rectangle [Label]
    if (input[i] === '[') {
      i++;
      let label = '';
      let depth = 1;
      while (i < len && depth > 0) {
        if (input[i] === '[') depth++;
        else if (input[i] === ']') depth--;
        if (depth > 0) label += input[i];
        i++;
      }
      tokens.push({ type: 'node', value: label.trim(), nodeType: 'rectangle' });
      continue;
    }

    // Diamond {Label}
    if (input[i] === '{') {
      i++;
      let label = '';
      let depth = 1;
      while (i < len && depth > 0) {
        if (input[i] === '{') depth++;
        else if (input[i] === '}') depth--;
        if (depth > 0) label += input[i];
        i++;
      }
      tokens.push({ type: 'node', value: label.trim(), nodeType: 'diamond' });
      continue;
    }

    // Ellipse (Label)
    if (input[i] === '(') {
      i++;
      let label = '';
      let depth = 1;
      while (i < len && depth > 0) {
        if (input[i] === '(') depth++;
        else if (input[i] === ')') depth--;
        if (depth > 0) label += input[i];
        i++;
      }
      tokens.push({ type: 'node', value: label.trim(), nodeType: 'ellipse' });
      continue;
    }

    // Bidirectional dashed arrow <-->
    if (
      input[i] === '<' &&
      input[i + 1] === '-' &&
      input[i + 2] === '-' &&
      input[i + 3] === '>'
    ) {
      tokens.push({
        type: 'arrow',
        value: '<-->',
        dashed: true,
        bidirectional: true,
      });
      i += 4;
      continue;
    }

    // Bidirectional solid arrow <->
    if (input[i] === '<' && input[i + 1] === '-' && input[i + 2] === '>') {
      tokens.push({
        type: 'arrow',
        value: '<->',
        bidirectional: true,
      });
      i += 3;
      continue;
    }

    // Reverse dashed arrow <--
    if (input[i] === '<' && input[i + 1] === '-' && input[i + 2] === '-') {
      tokens.push({
        type: 'arrow',
        value: '<--',
        dashed: true,
        reversed: true,
      });
      i += 3;
      continue;
    }

    // Reverse solid arrow <-
    if (input[i] === '<' && input[i + 1] === '-') {
      tokens.push({
        type: 'arrow',
        value: '<-',
        reversed: true,
      });
      i += 2;
      continue;
    }

    // Dashed arrow -->
    if (input[i] === '-' && input[i + 1] === '-' && input[i + 2] === '>') {
      tokens.push({ type: 'arrow', value: '-->', dashed: true });
      i += 3;
      continue;
    }

    // Arrow ->
    if (input[i] === '-' && input[i + 1] === '>') {
      tokens.push({ type: 'arrow', value: '->' });
      i += 2;
      continue;
    }

    // Quoted label "text"
    if (input[i] === '"') {
      i++;
      let label = '';
      while (i < len && input[i] !== '"') {
        if (input[i] === '\\' && i + 1 < len) {
          i++;
          label += input[i];
        } else {
          label += input[i];
        }
        i++;
      }
      i++; // skip closing "
      tokens.push({ type: 'label', value: label });
      continue;
    }

    // Skip unknown characters
    i++;
  }

  return tokens;
}

/**
 * Parse @image directive value
 * Formats:
 *   @image path at X,Y
 *   @image path near (NodeLabel)
 *   @image path near (NodeLabel) anchor
 */
function parseImageDirective(value: string): PositionedImage | null {
  // Match: path at X,Y
  const atMatch = value.match(/^(.+?)\s+at\s+(\d+)\s*,\s*(\d+)$/i);
  if (atMatch) {
    return {
      id: nanoid(10),
      src: atMatch[1].trim(),
      position: {
        type: 'absolute',
        x: parseInt(atMatch[2], 10),
        y: parseInt(atMatch[3], 10),
      },
    };
  }

  // Match: path near (NodeLabel) [anchor]
  const nearMatch = value.match(/^(.+?)\s+near\s+\(([^)]+)\)(?:\s+(\S+))?$/i);
  if (nearMatch) {
    return {
      id: nanoid(10),
      src: nearMatch[1].trim(),
      position: {
        type: 'near',
        nodeLabel: nearMatch[2].trim(),
        anchor: (nearMatch[3] as DecorationAnchor) || undefined,
      },
    };
  }

  return null;
}

/**
 * Parse @scatter directive value
 * Format: @scatter path count:N [width:W] [height:H]
 */
function parseScatterDirective(value: string): ScatterConfig | null {
  const parts = value.trim().split(/\s+/);
  if (parts.length < 2) return null;

  const src = parts[0];
  let count = 10; // default
  let width: number | undefined;
  let height: number | undefined;

  for (let i = 1; i < parts.length; i++) {
    const [key, val] = parts[i].split(':');
    if (key === 'count' && val) count = parseInt(val, 10);
    if (key === 'width' && val) width = parseInt(val, 10);
    if (key === 'height' && val) height = parseInt(val, 10);
  }

  return { src, count, width, height };
}

/**
 * Parse tokens into a FlowchartGraph
 */
export function parseDSL(input: string): FlowchartGraph {
  const tokens = tokenize(input);

  const nodes: Map<string, GraphNode> = new Map();
  const edges: GraphEdge[] = [];
  const options: LayoutOptions = { ...DEFAULT_LAYOUT_OPTIONS };
  const images: PositionedImage[] = [];
  const scatter: ScatterConfig[] = [];
  let library: string | undefined;

  // Helper to get or create node by label
  function getOrCreateNode(
    label: string,
    type: NodeType,
    imageData?: ImageSource
  ): GraphNode {
    // Use label as key for deduplication
    const key = `${type}:${label}`;
    if (!nodes.has(key)) {
      const node: GraphNode = {
        id: nanoid(10),
        type,
        label,
      };
      if (imageData) {
        node.image = imageData;
      }
      nodes.set(key, node);
    }
    return nodes.get(key)!;
  }

  /**
   * Build EdgeStyle from pending arrow state
   */
  function buildEdgeStyle(
    dashed: boolean,
    bidirectional: boolean,
    reversed: boolean
  ): EdgeStyle | undefined {
    const edgeStyle: EdgeStyle = {};

    if (dashed) {
      edgeStyle.strokeStyle = 'dashed';
    }

    if (bidirectional) {
      edgeStyle.startArrowhead = 'arrow';
      edgeStyle.endArrowhead = 'arrow';
    } else if (reversed) {
      edgeStyle.startArrowhead = 'arrow';
      edgeStyle.endArrowhead = null;
    } else {
      // Default: forward arrow
      edgeStyle.startArrowhead = null;
      edgeStyle.endArrowhead = 'arrow';
    }

    return Object.keys(edgeStyle).length > 0 ? edgeStyle : undefined;
  }

  let i = 0;
  let lastNode: GraphNode | null = null;
  let pendingLabel: string | null = null;
  let pendingDashed = false;
  let pendingBidirectional = false;
  let pendingReversed = false;
  let pendingArrow = false; // Track if an arrow token was seen

  while (i < tokens.length) {
    const token = tokens[i];

    if (token.type === 'newline') {
      lastNode = null;
      pendingLabel = null;
      pendingDashed = false;
      pendingBidirectional = false;
      pendingReversed = false;
      pendingArrow = false;
      i++;
      continue;
    }

    if (token.type === 'directive') {
      const [directive, ...valueParts] = token.value.split(' ');
      const value = valueParts.join(' ');

      if (directive === 'direction') {
        const dir = value.toUpperCase();
        if (dir === 'TB' || dir === 'BT' || dir === 'LR' || dir === 'RL') {
          options.direction = dir;
        }
      } else if (directive === 'spacing') {
        const spacing = parseInt(value, 10);
        if (!isNaN(spacing)) {
          options.nodeSpacing = spacing;
        }
      } else if (directive === 'image') {
        const img = parseImageDirective(value);
        if (img) images.push(img);
      } else if (directive === 'scatter') {
        const cfg = parseScatterDirective(value);
        if (cfg) scatter.push(cfg);
      } else if (directive === 'library') {
        library = value.trim();
      } else if (directive === 'sticker') {
        // Stickers are resolved later using the library path
        // For now, treat as positioned image with sticker: prefix
        const parts = value.trim().split(/\s+/);
        const stickerName = parts[0];
        if (stickerName) {
          // Check for positioning (at or near)
          const restValue = parts.slice(1).join(' ');
          if (restValue.includes('at') || restValue.includes('near')) {
            const img = parseImageDirective(`sticker:${stickerName} ${restValue}`);
            if (img) images.push(img);
          } else {
            // Standalone sticker - will be placed at default position
            images.push({
              id: nanoid(10),
              src: `sticker:${stickerName}`,
              position: { type: 'absolute', x: 0, y: 0 }, // Will be resolved later
            });
          }
        }
      }
      i++;
      continue;
    }

    if (token.type === 'image') {
      // Create an image node
      const imageData: ImageSource = {
        src: token.imageSrc!,
        width: token.imageWidth,
        height: token.imageHeight,
      };
      const node = getOrCreateNode(token.value, 'image', imageData);

      // Only create edge if there was an explicit arrow token
      if (lastNode && pendingArrow) {
        edges.push({
          id: nanoid(10),
          source: lastNode.id,
          target: node.id,
          label: pendingLabel || undefined,
          style: buildEdgeStyle(pendingDashed, pendingBidirectional, pendingReversed),
        });
        pendingLabel = null;
        pendingDashed = false;
        pendingBidirectional = false;
        pendingReversed = false;
        pendingArrow = false;
      }

      lastNode = node;
      i++;
      continue;
    }

    if (token.type === 'decorate') {
      // Attach decoration to the last node
      if (lastNode) {
        if (!lastNode.decorations) {
          lastNode.decorations = [];
        }
        lastNode.decorations.push({
          src: token.imageSrc!,
          anchor: token.decorationAnchor || 'top-right',
        });
      }
      i++;
      continue;
    }

    if (token.type === 'node') {
      const node = getOrCreateNode(token.value, token.nodeType!);

      // Only create edge if there was an explicit arrow token
      if (lastNode && pendingArrow) {
        edges.push({
          id: nanoid(10),
          source: lastNode.id,
          target: node.id,
          label: pendingLabel || undefined,
          style: buildEdgeStyle(pendingDashed, pendingBidirectional, pendingReversed),
        });
        pendingLabel = null;
        pendingDashed = false;
        pendingBidirectional = false;
        pendingReversed = false;
        pendingArrow = false;
      }

      lastNode = node;
      i++;
      continue;
    }

    if (token.type === 'arrow') {
      pendingDashed = token.dashed || false;
      pendingBidirectional = token.bidirectional || false;
      pendingReversed = token.reversed || false;
      pendingArrow = true; // Mark that we saw an arrow
      i++;
      continue;
    }

    if (token.type === 'label') {
      pendingLabel = token.value;
      i++;
      continue;
    }

    i++;
  }

  const result: FlowchartGraph = {
    nodes: Array.from(nodes.values()),
    edges,
    options,
  };

  if (images.length > 0) result.images = images;
  if (scatter.length > 0) result.scatter = scatter;
  if (library) result.library = library;

  return result;
}

// Re-export DEFAULT_LAYOUT_OPTIONS
export { DEFAULT_LAYOUT_OPTIONS } from '../types/dsl.js';
