/**
 * DOT/Graphviz Parser
 *
 * Parses DOT language syntax and converts to FlowchartGraph.
 * Uses ts-graphviz library for parsing.
 *
 * Supported DOT features:
 *   - digraph and graph declarations
 *   - Node declarations with labels and shapes
 *   - Edges: A -> B (directed) and A -- B (undirected)
 *   - Edge labels: [label="text"]
 *   - Node shapes: [shape=diamond|ellipse|box|cylinder]
 *   - Graph direction: rankdir=TB|BT|LR|RL
 *   - Dashed edges: [style=dashed]
 *   - Subgraphs (flattened to regular nodes)
 *   - Color attributes (fillcolor, color)
 */

import { fromDot, type RootGraphModel, type NodeModel, type EdgeModel, type SubgraphModel } from 'ts-graphviz';
import { nanoid } from 'nanoid';
import type {
  FlowchartGraph,
  GraphNode,
  GraphEdge,
  LayoutOptions,
  NodeType,
  FlowDirection,
  NodeStyle,
  EdgeStyle,
} from '../types/dsl.js';
import { DEFAULT_LAYOUT_OPTIONS } from '../types/dsl.js';

/**
 * Map of DOT node IDs to their explicit NodeModel (if declared explicitly)
 */
type ExplicitNodeMap = Map<string, NodeModel>;

/**
 * Map DOT shape names to our NodeType
 */
function mapDotShape(dotShape: string | undefined): NodeType {
  if (!dotShape) return 'rectangle';

  const shape = dotShape.toLowerCase();

  switch (shape) {
    case 'ellipse':
    case 'oval':
    case 'circle':
      return 'ellipse';
    case 'diamond':
      return 'diamond';
    case 'cylinder':
    case 'record':
    case 'mrecord':
      return 'database';
    case 'box':
    case 'rect':
    case 'rectangle':
    case 'square':
    default:
      return 'rectangle';
  }
}

/**
 * Map DOT rankdir to our FlowDirection
 */
function mapRankDir(rankdir: string | undefined): FlowDirection | undefined {
  if (!rankdir) return undefined;

  const dir = rankdir.toUpperCase();
  if (dir === 'TB' || dir === 'BT' || dir === 'LR' || dir === 'RL') {
    return dir as FlowDirection;
  }
  return undefined;
}

/**
 * Check if a DOT style attribute contains a specific style value.
 * DOT style attributes can be comma-separated (e.g., "filled,dashed").
 * This function splits by comma and checks for exact matches to avoid
 * false positives like "dashedline" matching "dashed".
 */
function hasStyleValue(styleAttr: string, value: string): boolean {
  const styles = styleAttr.split(',').map((s) => s.trim().toLowerCase());
  return styles.includes(value.toLowerCase());
}

/**
 * Extract node style from DOT attributes
 */
function extractNodeStyle(node: NodeModel): NodeStyle | undefined {
  const style: NodeStyle = {};
  let hasStyle = false;

  const fillcolor = node.attributes.get('fillcolor');
  if (fillcolor && typeof fillcolor === 'string') {
    style.backgroundColor = fillcolor;
    hasStyle = true;
  }

  const color = node.attributes.get('color');
  if (color && typeof color === 'string') {
    style.strokeColor = color;
    hasStyle = true;
  }

  const styleAttr = node.attributes.get('style');
  if (styleAttr && typeof styleAttr === 'string') {
    if (hasStyleValue(styleAttr, 'dashed')) {
      style.strokeStyle = 'dashed';
      hasStyle = true;
    } else if (hasStyleValue(styleAttr, 'dotted')) {
      style.strokeStyle = 'dotted';
      hasStyle = true;
    }
  }

  return hasStyle ? style : undefined;
}

/**
 * Extract edge style from DOT attributes
 */
function extractEdgeStyle(edge: EdgeModel): EdgeStyle | undefined {
  const style: EdgeStyle = {};
  let hasStyle = false;

  const color = edge.attributes.get('color');
  if (color && typeof color === 'string') {
    style.strokeColor = color;
    hasStyle = true;
  }

  const styleAttr = edge.attributes.get('style');
  if (styleAttr && typeof styleAttr === 'string') {
    if (hasStyleValue(styleAttr, 'dashed')) {
      style.strokeStyle = 'dashed';
      hasStyle = true;
    } else if (hasStyleValue(styleAttr, 'dotted')) {
      style.strokeStyle = 'dotted';
      hasStyle = true;
    }
  }

  return hasStyle ? style : undefined;
}

/**
 * Get the node ID from an edge target (handles NodeModel and ForwardRefNode/plain objects)
 */
function getNodeIdFromTarget(target: unknown): string | null {
  if (!target) return null;

  // Handle NodeModel or ForwardRefNode (both have id property)
  if (typeof target === 'object' && 'id' in target && typeof (target as { id: unknown }).id === 'string') {
    return (target as { id: string }).id;
  }

  return null;
}

/**
 * Recursively collect all explicit nodes from a graph and its subgraphs
 */
function collectExplicitNodes(
  graph: RootGraphModel | SubgraphModel,
  explicitNodes: ExplicitNodeMap
): void {
  // Process explicit nodes in this graph
  for (const node of graph.nodes) {
    if (!explicitNodes.has(node.id)) {
      explicitNodes.set(node.id, node);
    }
  }

  // Recursively process subgraphs
  for (const subgraph of graph.subgraphs) {
    collectExplicitNodes(subgraph, explicitNodes);
  }
}

/**
 * Recursively collect all node IDs referenced in edges
 */
function collectNodeIdsFromEdges(
  graph: RootGraphModel | SubgraphModel,
  nodeIds: Set<string>
): void {
  for (const edge of graph.edges) {
    const targets = edge.targets;
    if (!targets) continue;

    for (const target of targets) {
      const id = getNodeIdFromTarget(target);
      if (id) {
        nodeIds.add(id);
      }
    }
  }

  // Recursively process subgraphs
  for (const subgraph of graph.subgraphs) {
    collectNodeIdsFromEdges(subgraph, nodeIds);
  }
}

/**
 * Recursively collect all edges from a graph and its subgraphs
 */
function collectEdges(
  graph: RootGraphModel | SubgraphModel,
  nodeMap: Map<string, GraphNode>,
  edges: GraphEdge[]
): void {
  // Process edges in this graph
  for (const edge of graph.edges) {
    const targets = edge.targets;
    if (!targets || targets.length < 2) continue;

    // Process edge chain (A -> B -> C becomes A->B and B->C)
    for (let i = 0; i < targets.length - 1; i++) {
      const sourceId = getNodeIdFromTarget(targets[i]);
      const targetId = getNodeIdFromTarget(targets[i + 1]);

      if (!sourceId || !targetId) continue;

      const sourceNode = nodeMap.get(sourceId);
      const targetNode = nodeMap.get(targetId);

      if (!sourceNode || !targetNode) continue;

      const label = edge.attributes.get('label');
      const edgeStyle = extractEdgeStyle(edge);

      edges.push({
        id: nanoid(10),
        source: sourceNode.id,
        target: targetNode.id,
        label: typeof label === 'string' ? label : undefined,
        style: edgeStyle,
      });
    }
  }

  // Recursively process subgraphs
  for (const subgraph of graph.subgraphs) {
    collectEdges(subgraph, nodeMap, edges);
  }
}

/**
 * Parse DOT string into a FlowchartGraph
 */
export function parseDOT(input: string): FlowchartGraph {
  let rootGraph: RootGraphModel;

  try {
    rootGraph = fromDot(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid DOT syntax: ${message}`);
  }

  const options: LayoutOptions = { ...DEFAULT_LAYOUT_OPTIONS };

  // Extract graph-level attributes using get() on the root graph
  const rankdir = rootGraph.get('rankdir');
  const direction = mapRankDir(typeof rankdir === 'string' ? rankdir : undefined);
  if (direction) {
    options.direction = direction;
  }

  const nodesep = rootGraph.get('nodesep');
  if (typeof nodesep === 'number') {
    // nodesep is in inches, convert to approximate pixels (72 dpi)
    options.nodeSpacing = Math.round(nodesep * 72);
  }

  const ranksep = rootGraph.get('ranksep');
  if (typeof ranksep === 'number') {
    // ranksep is in inches, convert to approximate pixels (72 dpi)
    options.rankSpacing = Math.round(ranksep * 72);
  }

  // Step 1: Collect all explicit nodes (declared with attributes)
  const explicitNodes: ExplicitNodeMap = new Map();
  collectExplicitNodes(rootGraph, explicitNodes);

  // Step 2: Collect all node IDs referenced in edges (including implicit nodes)
  const allNodeIds = new Set<string>();
  collectNodeIdsFromEdges(rootGraph, allNodeIds);

  // Also add explicit node IDs
  for (const nodeId of explicitNodes.keys()) {
    allNodeIds.add(nodeId);
  }

  // Step 3: Build the node map (merging explicit attributes with implicit nodes)
  const nodeMap = new Map<string, GraphNode>();
  for (const nodeId of allNodeIds) {
    const explicitNode = explicitNodes.get(nodeId);

    if (explicitNode) {
      // Node was explicitly declared - use its attributes
      const label = explicitNode.attributes.get('label');
      const shape = explicitNode.attributes.get('shape');
      const nodeStyle = extractNodeStyle(explicitNode);

      nodeMap.set(nodeId, {
        id: nanoid(10),
        type: mapDotShape(typeof shape === 'string' ? shape : undefined),
        label: typeof label === 'string' ? label : nodeId,
        style: nodeStyle,
      });
    } else {
      // Implicit node (only referenced in edges) - use defaults
      nodeMap.set(nodeId, {
        id: nanoid(10),
        type: 'rectangle',
        label: nodeId,
      });
    }
  }

  // Step 4: Collect all edges
  const edges: GraphEdge[] = [];
  collectEdges(rootGraph, nodeMap, edges);

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
    options,
  };
}
