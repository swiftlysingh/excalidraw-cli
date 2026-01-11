/**
 * Flowchart DSL Type Definitions
 */

export type NodeType = 'rectangle' | 'diamond' | 'ellipse' | 'database' | 'image';

export type FlowDirection = 'TB' | 'BT' | 'LR' | 'RL';

export type LayoutAlgorithm = 'layered' | 'tree' | 'force';

export type ArrowheadType = 'arrow' | 'bar' | 'dot' | 'triangle' | null;

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';

export type FillStyle = 'solid' | 'hachure' | 'cross-hatch';

/**
 * Node style configuration
 */
export interface NodeStyle {
  backgroundColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  strokeStyle?: StrokeStyle;
  fillStyle?: FillStyle;
  opacity?: number;
  fontSize?: number;
  fontFamily?: number;
  roughness?: number;
}

/**
 * Edge style configuration
 */
export interface EdgeStyle {
  strokeColor?: string;
  strokeWidth?: number;
  strokeStyle?: StrokeStyle;
  startArrowhead?: ArrowheadType;
  endArrowhead?: ArrowheadType;
  roughness?: number;
}

/**
 * Image source configuration
 */
export interface ImageSource {
  src: string; // File path or URL
  width?: number; // Explicit width (optional)
  height?: number; // Explicit height (optional)
}

/**
 * Decoration position anchors
 */
export type DecorationAnchor =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

/**
 * Decoration attached to a node
 */
export interface NodeDecoration {
  src: string;
  anchor: DecorationAnchor;
  width?: number;
  height?: number;
}

/**
 * A node in the flowchart graph
 */
export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  style?: NodeStyle;
  image?: ImageSource; // For image nodes
  decorations?: NodeDecoration[]; // Decorations attached to this node
}

/**
 * An edge (connection) between nodes
 */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  style?: EdgeStyle;
}

/**
 * Layout configuration options
 */
export interface LayoutOptions {
  algorithm: LayoutAlgorithm;
  direction: FlowDirection;
  nodeSpacing: number;
  rankSpacing: number;
  padding: number;
}

/**
 * Positioned image (decoration placed at absolute or relative position)
 */
export interface PositionedImage {
  id: string;
  src: string;
  position:
    | { type: 'absolute'; x: number; y: number }
    | { type: 'near'; nodeLabel: string; anchor?: DecorationAnchor };
  width?: number;
  height?: number;
}

/**
 * Scatter configuration for distributing images across the canvas
 */
export interface ScatterConfig {
  src: string;
  count: number;
  width?: number;
  height?: number;
}

/**
 * Complete flowchart graph representation
 */
export interface FlowchartGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  options: LayoutOptions;
  images?: PositionedImage[]; // @image directives
  scatter?: ScatterConfig[]; // @scatter directives
  library?: string; // @library path
}

/**
 * Default layout options
 */
export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  algorithm: 'layered',
  direction: 'TB',
  nodeSpacing: 50,
  rankSpacing: 80,
  padding: 50,
};

/**
 * JSON input format for programmatic API
 */
export interface FlowchartInput {
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    style?: NodeStyle;
  }>;
  edges: Array<{
    from: string;
    to: string;
    label?: string;
    style?: EdgeStyle;
  }>;
  options?: Partial<LayoutOptions>;
}

/**
 * Node with computed layout position
 */
export interface LayoutedNode extends GraphNode {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Edge with computed layout points
 */
export interface LayoutedEdge extends GraphEdge {
  points: Array<[number, number]>;
  sourcePoint: { x: number; y: number };
  targetPoint: { x: number; y: number };
}

/**
 * Layouted positioned image with resolved coordinates
 */
export interface LayoutedImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Layouted flowchart graph
 */
export interface LayoutedGraph {
  nodes: LayoutedNode[];
  edges: LayoutedEdge[];
  options: LayoutOptions;
  width: number;
  height: number;
  images?: LayoutedImage[]; // Resolved positioned images
  scatter?: ScatterConfig[]; // Scatter configs for post-layout generation
  library?: string; // Library path
}
