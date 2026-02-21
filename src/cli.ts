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
import { exportImage, swapExtension } from './exporter/index.js';
import type { ExportOptions } from './exporter/index.js';
import type { ExcalidrawFile } from './types/excalidraw.js';
import type { FlowchartGraph, FlowDirection } from './types/dsl.js';

const program = new Command();

program
  .name('excalidraw-cli')
  .description('Create Excalidraw flowcharts from DSL, JSON, or DOT')
  .version('1.0.1');

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
  .option('-e, --export-as <format>', 'Export as image format: png or svg')
  .option('--export-background', 'Include background in export (default: true)')
  .option('--no-export-background', 'Exclude background from export')
  .option('--background-color <color>', 'Background color for export (default: #ffffff)')
  .option('--dark-mode', 'Export with dark mode')
  .option('--embed-scene', 'Embed scene data in exported image')
  .option('--export-padding <n>', 'Padding around exported content in pixels', '10')
  .option('--export-scale <n>', 'Scale factor for PNG export (default: 1)', '1')
  .option('--verbose', 'Verbose output')
  .action(async (inputFile, options, command) => {
    try {
      let input: string;
      let format = options.format;
      const formatExplicitlySet = command.getOptionValueSource('format') === 'cli';

      // Get input from various sources
      if (options.inline) {
        input = options.inline;
      } else if (options.stdin) {
        input = readFileSync(0, 'utf-8'); // Read from stdin
      } else if (inputFile) {
        input = readFileSync(inputFile, 'utf-8');

        // Auto-detect format from file extension (only if --format not explicitly set)
        if (!formatExplicitlySet) {
          if (inputFile.endsWith('.json')) {
            format = 'json';
          } else if (inputFile.endsWith('.dot') || inputFile.endsWith('.gv')) {
            format = 'dot';
          }
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

      // Export as image if requested
      if (options.exportAs) {
        const format = options.exportAs.toLowerCase();
        if (format !== 'png' && format !== 'svg') {
          console.error('Error: --export-as must be "png" or "svg"');
          process.exit(1);
        }

        const exportOpts: ExportOptions = {
          format: format as 'png' | 'svg',
          exportBackground: options.exportBackground !== false,
          viewBackgroundColor: options.backgroundColor,
          exportWithDarkMode: options.darkMode || false,
          exportEmbedScene: options.embedScene || false,
          exportPadding: parseInt(options.exportPadding, 10) || 10,
          exportScale: parseFloat(options.exportScale) || 1,
        };

        const imageOutput = swapExtension(
          options.output === '-' ? 'flowchart.excalidraw' : options.output,
          format
        );

        if (options.verbose) {
          console.log(`Exporting as ${format.toUpperCase()}...`);
        }

        const result = await exportImage(excalidrawFile, exportOpts);

        if (typeof result === 'string') {
          writeFileSync(imageOutput, result, 'utf-8');
        } else {
          writeFileSync(imageOutput, result);
        }
        console.log(`Exported: ${imageOutput}`);
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
  .action((inputFile, options, command) => {
    try {
      const input = readFileSync(inputFile, 'utf-8');
      let format = options.format;
      const formatExplicitlySet = command.getOptionValueSource('format') === 'cli';

      // Auto-detect format from file extension (only if --format not explicitly set)
      if (!formatExplicitlySet) {
        if (inputFile.endsWith('.json')) {
          format = 'json';
        } else if (inputFile.endsWith('.dot') || inputFile.endsWith('.gv')) {
          format = 'dot';
        }
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

/**
 * Export command - convert an existing .excalidraw file to PNG or SVG
 */
program
  .command('export')
  .description('Export an existing .excalidraw file to PNG or SVG')
  .argument('<input>', 'Input .excalidraw file path')
  .requiredOption('-F, --format <format>', 'Export format: png or svg')
  .option('-o, --output <file>', 'Output file path (default: input file with swapped extension)')
  .option('--export-background', 'Include background in export (default: true)')
  .option('--no-export-background', 'Exclude background from export')
  .option('--background-color <color>', 'Background color (default: #ffffff)')
  .option('--dark-mode', 'Export with dark mode')
  .option('--embed-scene', 'Embed scene data in exported image')
  .option('--export-padding <n>', 'Padding around content in pixels', '10')
  .option('--export-scale <n>', 'Scale factor for PNG export', '1')
  .option('--verbose', 'Verbose output')
  .action(async (inputFile, options) => {
    try {
      const format = options.format.toLowerCase();
      if (format !== 'png' && format !== 'svg') {
        console.error('Error: --format must be "png" or "svg"');
        process.exit(1);
      }

      // Read the .excalidraw file
      const rawInput = readFileSync(inputFile, 'utf-8');
      const excalidrawFile: ExcalidrawFile = JSON.parse(rawInput);

      if (options.verbose) {
        console.log(`Input: ${inputFile}`);
        console.log(`Elements: ${excalidrawFile.elements?.length || 0}`);
        console.log(`Files: ${Object.keys(excalidrawFile.files || {}).length}`);
      }

      const exportOpts: ExportOptions = {
        format: format as 'png' | 'svg',
        exportBackground: options.exportBackground !== false,
        viewBackgroundColor: options.backgroundColor,
        exportWithDarkMode: options.darkMode || false,
        exportEmbedScene: options.embedScene || false,
        exportPadding: parseInt(options.exportPadding, 10) || 10,
        exportScale: parseFloat(options.exportScale) || 1,
      };

      const outputPath = options.output || swapExtension(inputFile, format);

      if (options.verbose) {
        console.log(`Exporting as ${format.toUpperCase()} to ${outputPath}...`);
      }

      const result = await exportImage(excalidrawFile, exportOpts);

      if (typeof result === 'string') {
        writeFileSync(outputPath, result, 'utf-8');
      } else {
        writeFileSync(outputPath, result);
      }

      console.log(`Exported: ${outputPath}`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Parse arguments and run
program.parse();
