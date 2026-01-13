import { describe, it, expect } from 'vitest';
import { parseDOT } from '../../../src/parser/dot-parser.js';

describe('DOT Parser', () => {
  describe('node parsing', () => {
    it('should parse nodes from a simple digraph', () => {
      const result = parseDOT('digraph { A; B; C; }');
      expect(result.nodes).toHaveLength(3);
      expect(result.nodes.map((n) => n.label).sort()).toEqual(['A', 'B', 'C']);
    });

    it('should parse rectangle nodes (default shape)', () => {
      const result = parseDOT('digraph { A [shape=box]; }');
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('rectangle');
    });

    it('should parse rectangle nodes with rect shape', () => {
      const result = parseDOT('digraph { A [shape=rect]; }');
      expect(result.nodes[0].type).toBe('rectangle');
    });

    it('should parse ellipse nodes', () => {
      const result = parseDOT('digraph { Start [shape=ellipse]; }');
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('ellipse');
      expect(result.nodes[0].label).toBe('Start');
    });

    it('should parse oval nodes as ellipse', () => {
      const result = parseDOT('digraph { End [shape=oval]; }');
      expect(result.nodes[0].type).toBe('ellipse');
    });

    it('should parse circle nodes as ellipse', () => {
      // Note: 'node' (case-insensitive) is a DOT keyword for setting default node attributes
      const result = parseDOT('digraph { MyNode [shape=circle]; }');
      expect(result.nodes[0].type).toBe('ellipse');
    });

    it('should parse diamond nodes', () => {
      const result = parseDOT('digraph { Decision [shape=diamond]; }');
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('diamond');
    });

    it('should parse cylinder nodes as database', () => {
      const result = parseDOT('digraph { DB [shape=cylinder]; }');
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('database');
    });

    it('should parse record nodes as database', () => {
      const result = parseDOT('digraph { Storage [shape=record]; }');
      expect(result.nodes[0].type).toBe('database');
    });

    it('should use label attribute when provided', () => {
      const result = parseDOT('digraph { A [label="Process Step"]; }');
      expect(result.nodes[0].label).toBe('Process Step');
    });

    it('should use node ID as label when no label attribute', () => {
      const result = parseDOT('digraph { ProcessStep; }');
      expect(result.nodes[0].label).toBe('ProcessStep');
    });

    it('should handle quoted node IDs', () => {
      const result = parseDOT('digraph { "Node With Spaces"; }');
      expect(result.nodes[0].label).toBe('Node With Spaces');
    });
  });

  describe('edge parsing', () => {
    it('should parse simple directed edges', () => {
      const result = parseDOT('digraph { A -> B; }');
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);

      const sourceNode = result.nodes.find((n) => n.label === 'A');
      const targetNode = result.nodes.find((n) => n.label === 'B');
      expect(result.edges[0].source).toBe(sourceNode?.id);
      expect(result.edges[0].target).toBe(targetNode?.id);
    });

    it('should parse edge chains', () => {
      const result = parseDOT('digraph { A -> B -> C; }');
      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
    });

    it('should parse multiple edges', () => {
      const result = parseDOT('digraph { A -> B; B -> C; C -> A; }');
      expect(result.edges).toHaveLength(3);
    });

    it('should parse labeled edges', () => {
      const result = parseDOT('digraph { A -> B [label="yes"]; }');
      expect(result.edges[0].label).toBe('yes');
    });

    it('should parse dashed edges', () => {
      const result = parseDOT('digraph { A -> B [style=dashed]; }');
      expect(result.edges[0].style?.strokeStyle).toBe('dashed');
    });

    it('should parse dotted edges', () => {
      const result = parseDOT('digraph { A -> B [style=dotted]; }');
      expect(result.edges[0].style?.strokeStyle).toBe('dotted');
    });

    it('should parse edge color', () => {
      const result = parseDOT('digraph { A -> B [color=red]; }');
      expect(result.edges[0].style?.strokeColor).toBe('red');
    });

    it('should parse undirected graph edges', () => {
      const result = parseDOT('graph { A -- B; }');
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
    });
  });

  describe('direction/layout options', () => {
    it('should parse rankdir TB', () => {
      const result = parseDOT('digraph { rankdir=TB; A -> B; }');
      expect(result.options.direction).toBe('TB');
    });

    it('should parse rankdir LR', () => {
      const result = parseDOT('digraph { rankdir=LR; A -> B; }');
      expect(result.options.direction).toBe('LR');
    });

    it('should parse rankdir BT', () => {
      const result = parseDOT('digraph { rankdir=BT; A -> B; }');
      expect(result.options.direction).toBe('BT');
    });

    it('should parse rankdir RL', () => {
      const result = parseDOT('digraph { rankdir=RL; A -> B; }');
      expect(result.options.direction).toBe('RL');
    });

    it('should default to TB when no rankdir specified', () => {
      const result = parseDOT('digraph { A -> B; }');
      expect(result.options.direction).toBe('TB');
    });
  });

  describe('node styles', () => {
    it('should parse fillcolor attribute', () => {
      const result = parseDOT('digraph { A [fillcolor=lightblue]; }');
      expect(result.nodes[0].style?.backgroundColor).toBe('lightblue');
    });

    it('should parse color attribute as stroke color', () => {
      const result = parseDOT('digraph { A [color=red]; }');
      expect(result.nodes[0].style?.strokeColor).toBe('red');
    });

    it('should parse dashed node style', () => {
      const result = parseDOT('digraph { A [style=dashed]; }');
      expect(result.nodes[0].style?.strokeStyle).toBe('dashed');
    });
  });

  describe('subgraph handling', () => {
    it('should flatten subgraph nodes to main graph', () => {
      const result = parseDOT(`
        digraph {
          subgraph cluster_0 {
            A; B;
          }
          C;
        }
      `);
      expect(result.nodes).toHaveLength(3);
      expect(result.nodes.map((n) => n.label).sort()).toEqual(['A', 'B', 'C']);
    });

    it('should preserve edges within subgraphs', () => {
      const result = parseDOT(`
        digraph {
          subgraph cluster_0 {
            A -> B;
          }
          B -> C;
        }
      `);
      expect(result.edges).toHaveLength(2);
    });

    it('should handle nested subgraphs', () => {
      const result = parseDOT(`
        digraph {
          subgraph cluster_outer {
            subgraph cluster_inner {
              A;
            }
            B;
          }
          C;
        }
      `);
      expect(result.nodes).toHaveLength(3);
    });
  });

  describe('complex flowcharts', () => {
    it('should parse a decision tree flowchart', () => {
      const dot = `
        digraph {
          rankdir=TB;
          
          Start [shape=ellipse];
          Process [shape=box];
          Decision [shape=diamond];
          End [shape=ellipse];
          
          Start -> Process;
          Process -> Decision;
          Decision -> End [label="yes"];
          Decision -> Process [label="no"];
        }
      `;
      const result = parseDOT(dot);

      expect(result.nodes).toHaveLength(4);
      expect(result.edges).toHaveLength(4);

      const startNode = result.nodes.find((n) => n.label === 'Start');
      const decisionNode = result.nodes.find((n) => n.label === 'Decision');
      expect(startNode?.type).toBe('ellipse');
      expect(decisionNode?.type).toBe('diamond');

      const yesEdge = result.edges.find((e) => e.label === 'yes');
      const noEdge = result.edges.find((e) => e.label === 'no');
      expect(yesEdge).toBeDefined();
      expect(noEdge).toBeDefined();
    });

    it('should parse a login flow from the issue example', () => {
      const dot = `
        digraph {
          Start -> Process -> Decision;
          Decision -> End [label="yes"];
          Decision -> Process [label="no"];
          
          Start [shape=ellipse];
          Decision [shape=diamond];
          End [shape=ellipse];
        }
      `;
      const result = parseDOT(dot);

      expect(result.nodes.length).toBeGreaterThanOrEqual(4);
      expect(result.edges.length).toBeGreaterThanOrEqual(4);
    });

    it('should deduplicate nodes referenced multiple times', () => {
      const result = parseDOT('digraph { A -> B; B -> C; A -> C; }');
      expect(result.nodes).toHaveLength(3);
    });
  });

  describe('error handling', () => {
    it('should throw on invalid DOT syntax', () => {
      expect(() => parseDOT('not valid dot')).toThrow('Invalid DOT syntax');
    });

    it('should throw on unclosed braces', () => {
      expect(() => parseDOT('digraph { A -> B')).toThrow();
    });

    it('should handle empty digraph', () => {
      const result = parseDOT('digraph {}');
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it('should handle digraph with only whitespace', () => {
      const result = parseDOT('digraph {   }');
      expect(result.nodes).toHaveLength(0);
    });
  });

  describe('named graphs', () => {
    it('should parse named digraph', () => {
      const result = parseDOT('digraph MyGraph { A -> B; }');
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
    });

    it('should parse strict digraph', () => {
      const result = parseDOT('strict digraph { A -> B; A -> B; }');
      expect(result.nodes).toHaveLength(2);
      // In strict mode, duplicate edges should be merged by ts-graphviz
      // The edge count depends on how ts-graphviz handles strict mode
      expect(result.edges.length).toBeGreaterThanOrEqual(1);
    });
  });
});

