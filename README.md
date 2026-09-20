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

The latest published package is 1.2.0. This README also documents the upcoming
1.3.0 release, so the styling, extended arrow syntax, and other 1.3.0 changes
require a source checkout until 1.3.0 is published. `npm` and `npx` currently
install 1.2.0.

### Using npm

```bash
npm install -g @swiftlysingh/excalidraw-cli
```

### Homebrew

Install from the tap:

```bash
brew install swiftlysingh/tap/excalidraw-cli
```

Homebrew installs Node.js and the published CLI package. To update later:

```bash
brew update
brew upgrade swiftlysingh/tap/excalidraw-cli
```

If you already installed this package globally with npm, both installers use the
same command and man-page names. To switch to Homebrew, remove the npm package
first with `npm uninstall -g @swiftlysingh/excalidraw-cli`, then install with
Homebrew. If Homebrew already installed the formula but reported a link
conflict, run `brew link excalidraw-cli` after removing the npm package.

Verify the Homebrew installation with `brew test swiftlysingh/tap/excalidraw-cli`.

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

DOT supports directed and undirected graphs, node and edge labels, common shape
mappings, and color/dashed/dotted styles. `rankdir` controls direction;
`nodesep` and `ranksep` control approximate spacing. Subgraphs are flattened.
See `man excalidraw-cli` for the supported attributes and shape mappings.

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

| Directive | Purpose |
|-----------|---------|
| `@image path at X,Y` | Place a local image at absolute coordinates. |
| `@image path near (NodeLabel) anchor` | Place an image relative to a node. |
| `@decorate path anchor` | Attach an image to the preceding node; anchor defaults to `top-right`. |
| `@library path` | Set the directory used to resolve sticker names. |
| `@sticker name` | Add a sticker at `0,0`; also supports `at X,Y` and `near (NodeLabel) anchor`. |
| `@scatter path count:N width:W height:H` | Scatter repeated images; width and height are optional. |

Anchors include `top`, `bottom`, `left`, `right`, and corners such as
`top-right`. The anchor for `near` placement is optional.

Image nodes and `@decorate` use 100x100 when no size is supplied. `@image` and
`@sticker` use 50x50; `@scatter` uses 30x30. Local files are embedded in the
output. Relative paths resolve from the current working directory. HTTP/HTTPS
image URLs are skipped with a warning; download the image first.

## CLI Reference

### Commands

#### `create`

Create an Excalidraw flowchart.

```bash
excalidraw-cli create [input] [options]
```

**Options:**
- `-o, --output <file>` - Output file path (default: flowchart.excalidraw); use `-` for stdout
- `-f, --format <type>` - Input format: dsl, json, dot (default: dsl)
- `--inline <input>` - Inline DSL, JSON, or DOT; use `--format` for JSON or DOT
- `--stdin` - Read from stdin
- `-d, --direction <dir>` - Flow direction: TB, BT, LR, RL
- `-s, --spacing <n>` - Node spacing in pixels
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
- `--background-color <color>` - Background color. Uses the input scene's background when omitted, then falls back to `#ffffff`.
- `--dark` - Export with dark mode theme
- `--embed-scene` - Embed scene data in exported image
- `--padding <n>` - Padding around content in pixels (default: 10)
- `--scale <n>` - Scale factor for PNG export (default: 1; clamped to 0.1-10)
- `--verbose` - Verbose output

#### `parse`

Parse and validate input without generating output.

```bash
excalidraw-cli parse <input> [options]
```

Use `-f, --format <type>` to select `dsl`, `json`, or `dot`. Both `create` and
`parse` detect JSON from `.json` and DOT from `.dot` or `.gv` filenames when
`--format` is omitted. Other files and inline/stdin input default to DSL.

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

`@excalidraw/utils` remains a required runtime dependency for image export. The CLI uses its `exportToSvg()` implementation for SVG generation, and reuses the bundled Excalidraw font assets so server-side PNG rendering keeps text output close to the browser version.

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

With the `convert` command, you can also generate:

- **SVG**: scalable vector graphics, ideal for embedding in docs or web pages
- **PNG**: raster images at a requested scale from 0.1× through 10× for presentations or sharing

## Maintainer release checklist

1. Update the version in `package.json` and both root package version entries in `package-lock.json`. The CLI reads its version from `package.json`. Update the version in the `man/excalidraw-cli.1` header and date the matching `CHANGELOG.md` heading.
2. Run `npm ci`, `npm run build`, `npm run test:run`, and `npm run lint`.
3. Confirm that the `NPM_TOKEN` and `HOMEBREW_TAP_GITHUB_TOKEN` repository secrets are configured and unexpired. The Homebrew token needs contents write access to [`swiftlysingh/homebrew-tap`](https://github.com/swiftlysingh/homebrew-tap).
4. Create and push the matching `v<version>` tag. The release workflow also accepts a manual dispatch for that tag.
5. Confirm the GitHub release, npm version, and tap formula were updated. Run `brew update`, `brew upgrade swiftlysingh/tap/excalidraw-cli`, and `brew test swiftlysingh/tap/excalidraw-cli`.
6. If a downstream release step fails after npm has published, retry the same tag. The workflow detects the existing npm version and continues without publishing it again.

## License

MIT
