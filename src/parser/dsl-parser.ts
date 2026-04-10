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
 *   A -> B         - Connection
 *   A -> "label" -> B  - Labeled connection
 *   A --> B        - Dashed connection
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
  NodeStyle,
  PositionedImage,
  ScatterConfig,
  DecorationAnchor,
  ImageSource,
  FillStyle,
  StrokeStyle,
} from '../types/dsl.js';
import { DEFAULT_LAYOUT_OPTIONS } from '../types/dsl.js';

interface Token {
  type: 'node' | 'arrow' | 'label' | 'directive' | 'newline' | 'image' | 'decorate';
  value: string;
  nodeType?: NodeType;
  nodeStyle?: NodeStyle;
  dashed?: boolean;
  raw?: string;
  // Image-specific properties
  imageSrc?: string;
  imageWidth?: number;
  imageHeight?: number;
  // Decoration-specific properties
  decorationAnchor?: DecorationAnchor;
}

const SUPPORTED_NODE_STYLE_KEYS = [
  'fillStyle',
  'backgroundColor',
  'strokeColor',
  'strokeWidth',
  'strokeStyle',
  'roughness',
  'opacity',
] as const;

type SupportedNodeStyleKey = (typeof SUPPORTED_NODE_STYLE_KEYS)[number];

interface NodeSelector {
  label: string;
  type: NodeType;
}

interface PreprocessedDSL {
  content: string;
  nodeStyles: Map<string, NodeStyle>;
}

function isSupportedNodeStyleKey(key: string): key is SupportedNodeStyleKey {
  return SUPPORTED_NODE_STYLE_KEYS.includes(key as SupportedNodeStyleKey);
}

function parseNumericNodeStyleValue(key: SupportedNodeStyleKey, value: string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`Invalid numeric value for ${key}: ${value}`);
  }
  return numeric;
}

function parseNodeStyleValue(key: SupportedNodeStyleKey, rawValue: string): Partial<NodeStyle> {
  const value = rawValue.trim();
  if (!value) {
    throw new Error(`Missing value for node style key: ${key}`);
  }

  switch (key) {
    case 'fillStyle': {
      const validFillStyles: FillStyle[] = ['solid', 'hachure', 'cross-hatch'];
      if (!validFillStyles.includes(value as FillStyle)) {
        throw new Error(`Invalid fillStyle value: ${value}`);
      }
      return { fillStyle: value as FillStyle };
    }
    case 'strokeStyle': {
      const validStrokeStyles: StrokeStyle[] = ['solid', 'dashed', 'dotted'];
      if (!validStrokeStyles.includes(value as StrokeStyle)) {
        throw new Error(`Invalid strokeStyle value: ${value}`);
      }
      return { strokeStyle: value as StrokeStyle };
    }
    case 'backgroundColor':
      return { backgroundColor: value };
    case 'strokeColor':
      return { strokeColor: value };
    case 'strokeWidth':
      return { strokeWidth: parseNumericNodeStyleValue(key, value) };
    case 'roughness':
      return { roughness: parseNumericNodeStyleValue(key, value) };
    case 'opacity':
      return { opacity: parseNumericNodeStyleValue(key, value) };
    default:
      return {};
  }
}

function parseNodeStyleEntries(entries: Array<[string, string]>, context: string): NodeStyle {
  let style: NodeStyle = {};

  for (const [key, rawValue] of entries) {
    if (!isSupportedNodeStyleKey(key)) {
      throw new Error(`Unsupported node style key "${key}" in ${context}`);
    }

    style = { ...style, ...parseNodeStyleValue(key, rawValue) };
  }

  return style;
}

function mergeNodeStyles(base?: NodeStyle, overrides?: NodeStyle): NodeStyle | undefined {
  if (!base && !overrides) return undefined;
  return {
    ...(base ?? {}),
    ...(overrides ?? {}),
  };
}

function getNodeKey(label: string, type: NodeType): string {
  return `${type}:${label}`;
}

function parseNodeBody(rawLabel: string): { label: string; style?: NodeStyle } {
  const trimmed = rawLabel.trim();
  if (!trimmed) {
    throw new Error('Node label cannot be empty');
  }

  let working = trimmed;
  const styleEntries: Array<[string, string]> = [];

  while (true) {
    const match = working.match(/^(.*\S)\s+@([A-Za-z][A-Za-z0-9]*):(\S+)$/);
    if (!match) {
      break;
    }

    const [, precedingLabel, key, value] = match;
    if (!isSupportedNodeStyleKey(key)) {
      throw new Error(`Unsupported node style key "${key}" in node "${trimmed}"`);
    }

    styleEntries.unshift([key, value]);
    working = precedingLabel;
  }

  const label = working.trim();
  if (!label) {
    throw new Error(`Node label cannot be empty in node "${trimmed}"`);
  }

  return {
    label,
    style: styleEntries.length > 0 ? parseNodeStyleEntries(styleEntries, `node "${label}"`) : undefined,
  };
}

function parseNodeSelector(selector: string): NodeSelector {
  const trimmed = selector.trim();
  let rawLabel = '';
  let type: NodeType;

  if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
    rawLabel = trimmed.slice(2, -2);
    type = 'database';
  } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    rawLabel = trimmed.slice(1, -1);
    type = 'rectangle';
  } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    rawLabel = trimmed.slice(1, -1);
    type = 'diamond';
  } else if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    rawLabel = trimmed.slice(1, -1);
    type = 'ellipse';
  } else {
    throw new Error(`Invalid @node selector: ${selector}`);
  }

  const { label, style } = parseNodeBody(rawLabel);
  if (style) {
    throw new Error(`@node selector cannot include inline styles: ${selector}`);
  }

  return { label, type };
}

function preprocessNodeStyleBlocks(input: string): PreprocessedDSL {
  const lines = input.split('\n');
  const outputLines: string[] = [];
  const nodeStyles = new Map<string, NodeStyle>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed.startsWith('@node ')) {
      outputLines.push(line);
      continue;
    }

    const selector = trimmed.slice('@node'.length).trim();
    const { label, type } = parseNodeSelector(selector);
    let blockStyle: NodeStyle | undefined;
    let hasStyleLine = false;

    outputLines.push('');

    while (i + 1 < lines.length && /^[\t ]+/.test(lines[i + 1])) {
      i++;
      const styleLine = lines[i].trim();
      outputLines.push('');

      if (!styleLine || styleLine.startsWith('#')) {
        continue;
      }

      const separatorIndex = styleLine.indexOf(':');
      if (separatorIndex === -1) {
        throw new Error(`Invalid @node style entry: ${styleLine}`);
      }

      const key = styleLine.slice(0, separatorIndex).trim();
      const value = styleLine.slice(separatorIndex + 1).trim();
      blockStyle = mergeNodeStyles(
        blockStyle,
        parseNodeStyleEntries([[key, value]], `@node ${selector}`)
      );
      hasStyleLine = true;
    }

    if (!hasStyleLine) {
      throw new Error(`@node ${selector} must include at least one indented style line`);
    }

    const nodeKey = getNodeKey(label, type);
    nodeStyles.set(nodeKey, mergeNodeStyles(nodeStyles.get(nodeKey), blockStyle)!);
  }

  return {
    content: outputLines.join('\n'),
    nodeStyles,
  };
}

function createNodeToken(rawLabel: string, nodeType: NodeType): Token {
  const { label, style } = parseNodeBody(rawLabel);
  return {
    type: 'node',
    value: label,
    nodeType,
    nodeStyle: style,
  };
}

/**
 * Tokenize DSL input into tokens
 */
function parseQuotedLabel(input: string, startIndex: number): { value: string; raw: string; nextIndex: number } {
  const quote = input[startIndex];
  let i = startIndex + 1;
  let value = '';

  while (i < input.length) {
    const char = input[i];

    if (char === '\\') {
      if (i + 1 >= input.length) {
        throw new Error(`Unterminated escape sequence in edge label starting at index ${startIndex}`);
      }

      const escaped = input[i + 1];
      if (escaped === quote || escaped === '\\') {
        value += escaped;
      } else {
        value += escaped;
      }
      i += 2;
      continue;
    }

    if (char === quote) {
      return {
        value,
        raw: input.slice(startIndex, i + 1),
        nextIndex: i + 1,
      };
    }

    value += char;
    i++;
  }

  throw new Error(`Unterminated edge label starting at index ${startIndex}`);
}

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

    // Directive (@direction, @spacing, @image, @decorate, @sticker, @library, @scatter)
    if (input[i] === '@') {
      let directive = '';
      i++; // skip @
      while (i < len && /[a-zA-Z0-9]/.test(input[i])) {
        directive += input[i];
        i++;
      }
      // Get directive value (stop at newline, comment, or another @)
      while (i < len && (input[i] === ' ' || input[i] === '\t')) i++;
      let value = '';
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
      tokens.push(createNodeToken(label, 'database'));
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
      tokens.push(createNodeToken(label, 'rectangle'));
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
      tokens.push(createNodeToken(label, 'diamond'));
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
      tokens.push(createNodeToken(label, 'ellipse'));
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

    // Quoted label "text" or 'text'
    if (input[i] === '"' || input[i] === "'") {
      const parsed = parseQuotedLabel(input, i);
      tokens.push({ type: 'label', value: parsed.value, raw: parsed.raw });
      i = parsed.nextIndex;
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
  const { content, nodeStyles } = preprocessNodeStyleBlocks(input);
  const tokens = tokenize(content);

  function formatArrowToken(token: Token | undefined): string {
    if (!token || token.type !== 'arrow') return '<missing arrow>';
    return token.value;
  }

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
    imageData?: ImageSource,
    inlineStyle?: NodeStyle
  ): GraphNode {
    // Use label as key for deduplication
    const key = getNodeKey(label, type);
    if (!nodes.has(key)) {
      const node: GraphNode = {
        id: nanoid(10),
        type,
        label,
        style: mergeNodeStyles(nodeStyles.get(key), inlineStyle),
      };
      if (imageData) {
        node.image = imageData;
      }
      nodes.set(key, node);
    }

    const node = nodes.get(key)!;
    if (!node.style && nodeStyles.has(key)) {
      node.style = mergeNodeStyles(node.style, nodeStyles.get(key));
    }
    if (inlineStyle) {
      node.style = mergeNodeStyles(node.style, inlineStyle);
    }
    return node;
  }

  let i = 0;
  let lastNode: GraphNode | null = null;
  let pendingLabel: string | null = null;
  let pendingDashed = false;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token.type === 'newline') {
      lastNode = null;
      pendingLabel = null;
      pendingDashed = false;
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

      if (lastNode) {
        edges.push({
          id: nanoid(10),
          source: lastNode.id,
          target: node.id,
          label: pendingLabel || undefined,
          style: pendingDashed ? { strokeStyle: 'dashed' } : undefined,
        });
        pendingLabel = null;
        pendingDashed = false;
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
      const node = getOrCreateNode(token.value, token.nodeType!, undefined, token.nodeStyle);

      if (lastNode) {
        // Create edge from lastNode to this node
        edges.push({
          id: nanoid(10),
          source: lastNode.id,
          target: node.id,
          label: pendingLabel || undefined,
          style: pendingDashed ? { strokeStyle: 'dashed' } : undefined,
        });
        pendingLabel = null;
        pendingDashed = false;
      }

      lastNode = node;
      i++;
      continue;
    }

    if (token.type === 'arrow') {
      const nextToken = tokens[i + 1];
      if (nextToken?.type === 'label') {
        const trailingArrow = tokens[i + 2];
        const targetNodeToken = tokens[i + 3];

        if (token.value !== '->' || trailingArrow?.type !== 'arrow' || trailingArrow.value !== '->') {
          const rawLabel = nextToken.raw ?? JSON.stringify(nextToken.value);
          throw new Error(
            `Invalid labeled edge syntax around ${rawLabel}: expected [A] -> ${rawLabel} -> [B], got ${formatArrowToken(token)} ${rawLabel} ${formatArrowToken(trailingArrow)}`
          );
        }

        if (!targetNodeToken || (targetNodeToken.type !== 'node' && targetNodeToken.type !== 'image')) {
          const rawLabel = nextToken.raw ?? JSON.stringify(nextToken.value);
          throw new Error(`Invalid labeled edge syntax around ${rawLabel}: missing target node after label`);
        }

        pendingDashed = false;
        pendingLabel = nextToken.value;
        i += 3;
        continue;
      }

      pendingDashed = token.dashed || false;
      i++;
      continue;
    }

    if (token.type === 'label') {
      const rawLabel = token.raw ?? JSON.stringify(token.value);
      throw new Error(`Edge label ${rawLabel} must appear between arrows as [A] -> ${rawLabel} -> [B]`);
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
