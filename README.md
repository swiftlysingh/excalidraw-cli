# excalidraw-cli
<p>
  <a href="https://www.npmjs.com/package/@swiftlysingh/excalidraw-cli"><img src="https://img.shields.io/npm/v/@swiftlysingh/excalidraw-cli" alt="npm version"></a>
  <a href="https://github.com/swiftlysingh/excalidraw-cli/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License"></a>
</p>

<p align="center">
  <img alt="image" src="https://github.com/user-attachments/assets/5af4b002-bd69-4187-8836-84135685117a" />
</p>

<p align="center">
  Create Excalidraw flowcharts and diagrams from text-based DSL, JSON, or Graphviz DOT.
</p>

## Features

- **Text-based DSL** for quick flowchart creation
- **JSON API** for programmatic use
- **Auto-layout** using ELK.js (Eclipse Layout Kernel)
- **Multiple flow directions**: TB (top-bottom), BT, LR, RL
- **Export to PNG & SVG** with dark mode, custom backgrounds, scale, and padding
- **Programmable API** for integration into other tools

## Installation

Requires `Node >=20.19.0`. Node 18 is no longer supported.

Styling and extended arrow syntax are available in the unreleased 1.3.0 source.
The npm and Homebrew releases currently provide 1.2.0.

### Using npm

```bash
npm install -g @swiftlysingh/excalidraw-cli
```

### Homebrew

Install from the tap:

```bash
brew install swiftlysingh/tap/excalidraw-cli
```

Homebrew installs Node.js automatically. See the [tap README](https://github.com/swiftlysingh/homebrew-tap#readme)
for upgrades and switching from an existing npm installation.

### From Source (Local Development)

```bash
git clone https://github.com/swiftlysingh/excalidraw-cli.git
cd excalidraw-cli
npm install
npm run build
npm link  # Makes 'excalidraw-cli' available globally
```

### Run without a global install

```bash
npx --yes @swiftlysingh/excalidraw-cli create --inline "[A] -> [B]" -o diagram.excalidraw
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

### Create from DOT

```bash
excalidraw-cli create --format dot --inline 'digraph { A [label="Start"]; B [label="Process"]; A -> B; }' -o flow.excalidraw
```

DOT subgraphs are flattened. See `man excalidraw-cli` for supported attributes
and shape mappings.

### Export to Image

```bash
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
| `![path]` | Image | Local image node, default size 100x100 |
| `![path](WxH)` | Image | Image node with an explicit size |
| `[Label @fillStyle:hachure @backgroundColor:#a5d8ff]` | Styled node | Add inline node style attributes |
| `[A] -> [B]` | Arrow | Forward connection |
| `[A] <- [B]` | Reverse arrow | Connection from B to A |
| `[A] <-> [B]` | Bidirectional arrow | Arrowheads on both ends |
| `[A] --> [B]` | Dashed arrow | Dashed connection |
| `[A] <-- [B]` | Dashed reverse arrow | Dashed connection from B to A |
| `[A] <--> [B]` | Dashed bidirectional arrow | Dashed connection with arrowheads on both ends |
| `[A] -> "text" -> [B]` | Labeled arrow | Double-quoted edge label |
| `[A] -> 'text' -> [B]` | Labeled arrow | Single-quoted edge label |

### Example DSL

```
(Start) -> [Enter Credentials] -> {Valid?}
{Valid?} -> "yes" -> [Dashboard] -> (End)
{Valid?} -> 'no' -> [Show Error] -> [Enter Credentials]
[API] -> "GET /users?name=\"pp\" \\ cache" -> [Client]
[Client] --> [Webhook]
[Worker] <-- [Queue]
[Service A] <--> [Service B]
[Reviewer] <- [Approved]
[Client] <-> [API]
```

### Edge label escaping

Edge labels must use the fully specified form `[A] -> "label" -> [B]` (or single quotes instead of double quotes).
Mixed forms like `[A] --> "x" -> [B]` are rejected because they are ambiguous.

Shell escaping tips:

```bash
# easiest: wrap the whole DSL in single quotes, use double-quoted labels inside
excalidraw-cli create --inline '[API] -> "GET /users?name=\"pp\"" -> [Client]' -o api.excalidraw

# if the label itself needs apostrophes, flip it
excalidraw-cli create --inline "[Decision] -> 'team\'s call' -> [Next]" -o decision.excalidraw
```

### Node Styling

Add shape-level styling directly to nodes with inline `@key:value` attributes:

```excalidraw
(Start) -> [Enter Credentials @fillStyle:hachure @backgroundColor:#a5d8ff] -> {Valid?}
{Valid?} -> "no" -> [Show Error @backgroundColor:#ffc9c9 @strokeStyle:dashed] -> [Enter Credentials]
```

For repeated or shared nodes, define defaults with an `@node` block:

```excalidraw
@node [Enter Credentials]
  fillStyle: solid
  backgroundColor: #a5d8ff

(Start) -> [Enter Credentials @fillStyle:hachure] -> {Valid?}
```

Supported node style keys:

- `fillStyle`: `solid`, `hachure`, `cross-hatch`
- `backgroundColor`
- `strokeColor`
- `strokeWidth`
- `strokeStyle`: `solid`, `dashed`, `dotted`
- `roughness`
- `opacity`

Precedence rules:

- `@node` blocks provide defaults for matching nodes
- inline node attributes override block values
- repeated references to the same node merge explicit style properties with later values winning per property

### Directives

```
@direction LR    # Left to Right (default: TB)
@spacing 60      # Node spacing in pixels
```

Use `#` for comments outside node definitions and quoted labels.

Images must be local files; relative paths resolve from the working directory.
Use `![path]` for an image node. For positioning, decorations, stickers, and
scatter directives, see the [man page](man/excalidraw-cli.1).

## CLI Reference

| Command | Purpose |
|---------|---------|
| `create [input]` | Generate an editable `.excalidraw` file. Accepts a file, `--inline`, or `--stdin`. |
| `convert <input> --format png\|svg` | Export an existing `.excalidraw` file. |
| `parse <input>` | Validate input and print its graph without generating a file. |

Use `--help` with any command for its options, or `man excalidraw-cli` for the
full reference. `create -o -` writes to stdout.

Both `create` and `parse` detect `.json`, `.dot`, and `.gv` files. Other files
and inline/stdin input default to DSL; use `--format json` or `--format dot`
to override.

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
} from '@swiftlysingh/excalidraw-cli';

// From DSL
const dsl = '(Start) -> [Process] -> (End)';
const json = await createFlowchartFromDSL(dsl);

// From JSON input
const json2 = await createFlowchartFromJSON({
  nodes: [
    { id: 'a', type: 'rectangle', label: 'Hello' },
    { id: 'b', type: 'rectangle', label: 'World' }
  ],
  edges: [{ from: 'a', to: 'b' }]
});
```

### Export API

```typescript
import { convertToSVG, convertToPNG } from '@swiftlysingh/excalidraw-cli';
import { readFileSync, writeFileSync } from 'fs';

// Load an existing .excalidraw file
const file = JSON.parse(readFileSync('diagram.excalidraw', 'utf-8'));

// Export to SVG
const svg = await convertToSVG(file, { padding: 20 });
writeFileSync('diagram.svg', svg);

// Export to PNG with 2x scale and dark mode
const png = await convertToPNG(file, {
  scale: 2,
  dark: true,
});
writeFileSync('diagram.png', png);
```

When no background is supplied, exports use `file.appState.viewBackgroundColor`
and fall back to `#ffffff`. PNG scale values are clamped to `0.1` through `10`.

## Examples

Here are some flowcharts created with excalidraw-cli:

### Simple Flow
![Simple Flow](assets/up.png)

### iOS App Architecture
![iOS App Architecture](assets/ios-app-architecture.png)

### LeetCode Problem Solving Flow
![LeetCode Flow](assets/leetcode.png)

Generated `.excalidraw` files open in [Excalidraw](https://excalidraw.com) and
can be imported into Obsidian's Excalidraw plugin.

## License

MIT
