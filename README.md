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
- **Programmable API** for integration into other tools

## Installation

### Using the npm

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
- `-f, --format <type>` - Input format: dsl, json (default: dsl)
- `--inline <dsl>` - Inline DSL string
- `--stdin` - Read from stdin
- `-d, --direction <dir>` - Flow direction: TB, BT, LR, RL
- `-s, --spacing <n>` - Node spacing in pixels
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
import { createFlowchartFromDSL, createFlowchartFromJSON } from 'excalidraw-cli';

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

## License

MIT
