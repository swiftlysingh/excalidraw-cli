#!/usr/bin/env node

/**
 * Excalidraw CLI
 *
 * Create Excalidraw flowcharts from DSL, JSON, or DOT input.
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { parseDSL } from './parser/dsl-parser.js';
import { parseJSONString } from './parser/json-parser.js';
import { parseDOT } from './parser/dot-parser.js';
import { layoutGraph } from './layout/elk-layout.js';
import { generateExcalidraw, serializeExcalidraw } from './generator/excalidraw-generator.js';
import type { FlowchartGraph, FlowDirection } from './types/dsl.js';

const program = new Command();

program
  .name('excalidraw-cli')
  .description('Create Excalidraw flowcharts from DSL, JSON, or DOT')
  .version('1.0.0');

/**
 * Create command - main flowchart creation
 */
program
  .command('create')
  .description('Create an Excalidraw flowchart')
  .argument('[input]', 'Input file path (DSL, JSON, or DOT)')
  .option('-o, --output <file>', 'Output file path', 'flowchart.excalidraw')
  .option('-f, --format <type>', 'Input format: dsl, json, dot (default: dsl)', 'dsl')
  .option('--inline <dsl>', 'Inline DSL/DOT string')
  .option('--stdin', 'Read input from stdin')
  .option('-d, --direction <dir>', 'Flow direction: TB, BT, LR, RL (default: TB)')
  .option('-s, --spacing <n>', 'Node spacing in pixels', '50')
  .option('--verbose', 'Verbose output')
  .action(async (inputFile, options) => {
    try {
      let input: string;
      let format = options.format;

      // Get input from various sources
      if (options.inline) {
        input = options.inline;
      } else if (options.stdin) {
        input = readFileSync(0, 'utf-8'); // Read from stdin
      } else if (inputFile) {
        input = readFileSync(inputFile, 'utf-8');

        // Auto-detect format from file extension
        if (inputFile.endsWith('.json')) {
          format = 'json';
        } else if (inputFile.endsWith('.dot') || inputFile.endsWith('.gv')) {
          format = 'dot';
        }
      } else {
        console.error('Error: No input provided. Use --inline, --stdin, or provide an input file.');
        process.exit(1);
      }

      if (options.verbose) {
        console.log(`Input format: ${format}`);
        console.log(`Input length: ${input.length} characters`);
      }

      // Parse input
      let graph: FlowchartGraph;
      if (format === 'json') {
        graph = parseJSONString(input);
      } else if (format === 'dot') {
        graph = parseDOT(input);
      } else {
        graph = parseDSL(input);
      }

      // Apply CLI options
      if (options.direction) {
        const dir = options.direction.toUpperCase() as FlowDirection;
        if (['TB', 'BT', 'LR', 'RL'].includes(dir)) {
          graph.options.direction = dir;
        }
      }
      if (options.spacing) {
        const spacing = parseInt(options.spacing, 10);
        if (!isNaN(spacing)) {
          graph.options.nodeSpacing = spacing;
        }
      }

      if (options.verbose) {
        console.log(`Parsed ${graph.nodes.length} nodes and ${graph.edges.length} edges`);
        console.log(`Layout direction: ${graph.options.direction}`);
      }

      // Layout the graph
      const layoutedGraph = await layoutGraph(graph);

      if (options.verbose) {
        console.log(`Layout complete. Canvas size: ${layoutedGraph.width}x${layoutedGraph.height}`);
      }

      // Generate Excalidraw file
      const excalidrawFile = generateExcalidraw(layoutedGraph);
      const output = serializeExcalidraw(excalidrawFile);

      // Write output
      if (options.output === '-') {
        process.stdout.write(output);
      } else {
        writeFileSync(options.output, output, 'utf-8');
        console.log(`Created: ${options.output}`);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * Parse command - parse and validate input without generating
 */
program
  .command('parse')
  .description('Parse and validate input without generating output')
  .argument('<input>', 'Input file path')
  .option('-f, --format <type>', 'Input format: dsl, json, dot (default: dsl)', 'dsl')
  .action((inputFile, options) => {
    try {
      const input = readFileSync(inputFile, 'utf-8');
      let format = options.format;

      // Auto-detect format from file extension
      if (inputFile.endsWith('.json')) {
        format = 'json';
      } else if (inputFile.endsWith('.dot') || inputFile.endsWith('.gv')) {
        format = 'dot';
      }

      // Parse input
      let graph: FlowchartGraph;
      if (format === 'json') {
        graph = parseJSONString(input);
      } else if (format === 'dot') {
        graph = parseDOT(input);
      } else {
        graph = parseDSL(input);
      }

      console.log('Parse successful!');
      console.log(`  Nodes: ${graph.nodes.length}`);
      console.log(`  Edges: ${graph.edges.length}`);
      console.log(`  Direction: ${graph.options.direction}`);
      console.log('\nNodes:');
      for (const node of graph.nodes) {
        console.log(`  - [${node.type}] ${node.label}`);
      }
      console.log('\nEdges:');
      for (const edge of graph.edges) {
        const sourceNode = graph.nodes.find((n) => n.id === edge.source);
        const targetNode = graph.nodes.find((n) => n.id === edge.target);
        const label = edge.label ? ` "${edge.label}"` : '';
        console.log(`  - ${sourceNode?.label} ->${label} ${targetNode?.label}`);
      }
    } catch (error) {
      console.error('Parse error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Parse arguments and run
program.parse();
