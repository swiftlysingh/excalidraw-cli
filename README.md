# excalidraw-cli
<p>
  <a href="https://www.npmjs.com/package/@swiftlysingh/excalidraw-cli"><img src="https://img.shields.io/npm/v/@swiftlysingh/excalidraw-cli" alt="npm version"></a>
  <a href="https://github.com/swiftlysingh/excalidraw-cli/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License"></a>
</p>

<p align="center">
  <img alt="image" src="https://github.com/user-attachments/assets/5af4b002-bd69-4187-8836-84135685117a" />
</p>

<p align="center">
  Create Excalidraw flowcharts and diagrams from text-based DSL or JSON.
</p>



## Features

- **Text-based DSL** for quick flowchart creation
- **JSON API** for programmatic use
- **Auto-layout** using ELK.js (Eclipse Layout Kernel)
- **Multiple flow directions**: TB (top-bottom), BT, LR, RL
- **Export to PNG & SVG** with dark mode, custom backgrounds, scale, and padding
- **Programmable API** for integration into other tools

## Requirements

- **Node.js** `^20.19.0 || ^22.12.0 || >=24.0.0`

## Installation

### Using npm

```bash
npm i @swiftlysingh/excalidraw-cli
```

### From Source (Local Development)

```bash
git clone https://github.com/swiftlysingh/excalidraw-cli.git
cd excalidraw-cli
npm install
npm run build
npm link  # Makes 'excalidraw-cli' available globally
```

### Direct Usage (No Install)

```bash
# Run directly with node
node dist/cli.js create --inline "[A] -> [B]" -o diagram.excalidraw
```

## Quick Start

### Create from DSL

```bash
# Inline DSL
excalidraw-cli create --inline "(Start) -> [Process] -> {Decision?}" -o flow.excalidraw

# From file
excalidraw-cli create flowchart.dsl -o diagram.excalidraw

# From stdin
echo "[A] -> [B] -> [C]" | excalidraw-cli create --stdin -o diagram.excalidraw
```

### Export to Image

```bash
# Export while creating a flowchart
excalidraw-cli create --inline "[A] -> [B]" -o flow.excalidraw --export-as svg

# Convert an existing .excalidraw file to PNG
excalidraw-cli convert diagram.excalidraw --format png

# Convert with options
excalidraw-cli convert diagram.excalidraw --format png --scale 2 --dark

# Convert to SVG without background
excalidraw-cli convert diagram.excalidraw --format svg --no-export-background
```

### DSL Syntax

| Syntax | Element | Description |
|--------|---------|-------------|
| `[Label]` | Rectangle | Process steps, actions |
| `{Label}` | Diamond | Decisions, conditionals |
| `(Label)` | Ellipse | Start/End points |
| `[[Label]]` | Database | Data storage |
| `->` | Arrow | Connection |
| `-->` | Dashed Arrow | Dashed connection |
| `-> "text" ->` | Labeled Arrow | Connection with label |

### Example DSL

```
(Start) -> [Enter Credentials] -> {Valid?}
{Valid?} -> "yes" -> [Dashboard] -> (End)
{Valid?} -> "no" -> [Show Error] -> [Enter Credentials]
```

### Directives

```
@direction LR    # Left to Right (default: TB)
@spacing 60      # Node spacing in pixels
```

## CLI Reference

### Commands

#### `create`

Create an Excalidraw flowchart.

```bash
excalidraw-cli create [input] [options]
```

**Options:**
- `-o, --output <file>` - Output file path (default: flowchart.excalidraw)
- `-f, --format <type>` - Input format: dsl, json, dot (default: dsl)
- `--inline <dsl>` - Inline DSL string
- `--stdin` - Read from stdin
- `-d, --direction <dir>` - Flow direction: TB, BT, LR, RL
- `-s, --spacing <n>` - Node spacing in pixels
- `-e, --export-as <format>` - Also export as image: `png` or `svg`
- `--export-background / --no-export-background` - Include or exclude background (default: include)
- `--background-color <color>` - Background color (default: #ffffff)
- `--dark` - Export with dark mode theme
- `--embed-scene` - Embed scene data in exported image
- `--export-padding <n>` - Padding around content in pixels (default: 10)
- `--scale <n>` - Scale factor for PNG export (default: 1)
- `--verbose` - Verbose output

#### `convert`

Convert an existing `.excalidraw` file to PNG or SVG.

```bash
excalidraw-cli convert <input> [options]
```

**Options:**
- `--format <format>` - **(required)** Export format: `png` or `svg`
- `-o, --output <file>` - Output file path (default: input file with swapped extension)
- `--export-background / --no-export-background` - Include or exclude background
- `--background-color <color>` - Background color (default: #ffffff)
- `--dark` - Export with dark mode theme
- `--embed-scene` - Embed scene data in exported image
- `--export-padding <n>` - Padding around content in pixels (default: 10)
- `--scale <n>` - Scale factor for PNG export (default: 1)
- `--verbose` - Verbose output

#### `parse`

Parse and validate input without generating output.

```bash
excalidraw-cli parse <input> [options]
```

## JSON API

For programmatic flowchart creation:

```json
{
  "nodes": [
    { "id": "start", "type": "ellipse", "label": "Start" },
    { "id": "process", "type": "rectangle", "label": "Process" },
    { "id": "end", "type": "ellipse", "label": "End" }
  ],
  "edges": [
    { "from": "start", "to": "process" },
    { "from": "process", "to": "end" }
  ],
  "options": {
    "direction": "TB",
    "nodeSpacing": 50
  }
}
```

```bash
excalidraw-cli create flowchart.json -o diagram.excalidraw
```

## Programmatic Usage

```typescript
import {
  createFlowchartFromDSL,
  createFlowchartFromJSON,
  convertToSVG,
  convertToPNG,
} from '@swiftlysingh/excalidraw-cli';

// From DSL
const dsl = '(Start) -> [Process] -> (End)';
const json = await createFlowchartFromDSL(dsl);

// From JSON input
const input = {
  nodes: [
    { id: 'a', type: 'rectangle', label: 'Hello' },
    { id: 'b', type: 'rectangle', label: 'World' }
  ],
  edges: [{ from: 'a', to: 'b' }]
};
const json2 = await createFlowchartFromJSON(input);
```

### Export API

```typescript
import { convertToSVG, convertToPNG } from '@swiftlysingh/excalidraw-cli';
import { readFileSync, writeFileSync } from 'fs';

// Load an existing .excalidraw file
const file = JSON.parse(readFileSync('diagram.excalidraw', 'utf-8'));

// Export to SVG
const svg = await convertToSVG(file, { exportPadding: 20 });
writeFileSync('diagram.svg', svg);

// Export to PNG with 2x scale and dark mode
const png = await convertToPNG(file, {
  scale: 2,
  dark: true,
});
writeFileSync('diagram.png', png);
```

## Examples

Here are some flowcharts created with excalidraw-cli:

### Simple Flow
![Simple Flow](assets/up.png)

### iOS App Architecture
![iOS App Architecture](assets/ios-app-architecture.png)

### LeetCode Problem Solving Flow
![LeetCode Flow](assets/leetcode.png)

## Output

The generated `.excalidraw` files can be:

1. Opened directly in [Excalidraw](https://excalidraw.com) (File > Open)
2. Imported into Obsidian with the Excalidraw plugin
3. Used with any tool that supports the Excalidraw format

With the `--export-as` flag or `convert` command, you can also generate:

- **SVG** — scalable vector graphics, ideal for embedding in docs or web pages
- **PNG** — raster images at any scale (1×, 2×, 3×, etc.) for presentations or sharing

## License

MIT
