/**
 * JSON Parser for Flowchart Input
 *
 * Accepts structured JSON input for programmatic flowchart creation.
 */

import { nanoid } from 'nanoid';
import type {
  FlowchartGraph,
  FlowchartInput,
  GraphNode,
  GraphEdge,
  NodeType,
} from '../types/dsl.js';
import { DEFAULT_LAYOUT_OPTIONS } from '../types/dsl.js';

/**
 * Validate node type
 */
function isValidNodeType(type: string): type is NodeType {
  return ['rectangle', 'diamond', 'ellipse', 'database', 'image'].includes(type);
}

/**
 * Parse JSON input into FlowchartGraph
 */
export function parseJSON(input: FlowchartInput): FlowchartGraph {
  const nodeMap = new Map<string, GraphNode>();

  // Process nodes
  for (const nodeInput of input.nodes) {
    const type = isValidNodeType(nodeInput.type) ? nodeInput.type : 'rectangle';

    const node: GraphNode = {
      id: nodeInput.id || nanoid(10),
      type,
      label: nodeInput.label,
      style: nodeInput.style,
    };

    nodeMap.set(nodeInput.id, node);
  }

  // Process edges
  const edges: GraphEdge[] = input.edges.map((edgeInput) => {
    const sourceNode = nodeMap.get(edgeInput.from);
    const targetNode = nodeMap.get(edgeInput.to);

    if (!sourceNode) {
      throw new Error(`Edge references unknown source node: ${edgeInput.from}`);
    }
    if (!targetNode) {
      throw new Error(`Edge references unknown target node: ${edgeInput.to}`);
    }

    return {
      id: nanoid(10),
      source: sourceNode.id,
      target: targetNode.id,
      label: edgeInput.label,
      style: edgeInput.style,
    };
  });

  // Merge options with defaults
  const options = {
    ...DEFAULT_LAYOUT_OPTIONS,
    ...input.options,
  };

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
    options,
  };
}

/**
 * Parse JSON string into FlowchartGraph
 */
export function parseJSONString(jsonString: string): FlowchartGraph {
  try {
    const input = JSON.parse(jsonString) as FlowchartInput;
    return parseJSON(input);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
    throw error;
  }
}

// Re-export
export { DEFAULT_LAYOUT_OPTIONS } from '../types/dsl.js';
