---
name: excalidraw-cli
description: Create Excalidraw flowcharts and diagrams from DSL, JSON, or Graphviz DOT with excalidraw-cli, then export PNG or SVG. Use when the user asks to create a flowchart, draw a diagram, visualize a process, make an architecture or flow diagram, convert an Excalidraw file, or mentions excalidraw.
license: MIT
compatibility: Requires Node.js >=20.19.0 and excalidraw-cli (this repo after npm run build, a global install, or npx --yes @swiftlysingh/excalidraw-cli).
---

# Excalidraw CLI

Create editable `.excalidraw` diagrams from text, then optionally export PNG or SVG.

This skill lives with the CLI at https://github.com/swiftlysingh/excalidraw-cli.

## When to use

- User asks for a flowchart, architecture diagram, decision tree, or process visualization
- User mentions Excalidraw, `.excalidraw`, or this CLI
- User wants a diagram from a description or from code in the workspace
- User wants to preview or export an existing `.excalidraw` file as PNG or SVG

## Command

Use the first form that exists:

1. In this repo after `npm run build`: `node dist/cli.js`
2. Installed binary: `excalidraw-cli`
3. No install: `npx --yes @swiftlysingh/excalidraw-cli`

Examples below use `excalidraw-cli`. Substitute the form you are running.

`create` writes Excalidraw JSON only. It rejects `-o file.png` and `-o file.svg`. Export images with `convert` after `create`.

## Workflow

1. Extract nodes, decisions, and edges from the request.
2. Prefer DSL. Use DOT when the user already has Graphviz. Use JSON for programmatic node/edge lists.
3. Write a small `.dsl` file for anything beyond one line. Use `--inline` for short diagrams.
4. Run `create`, then `convert` if the user wants a PNG or SVG preview.
5. Tell the user the output path and that they can open the `.excalidraw` file at https://excalidraw.com via File > Open.

## DSL

| Syntax | Element |
|--------|---------|
| `[Label]` | Rectangle (process, action) |
| `{Label}` | Diamond (decision). A trailing `?` is just label text. |
| `(Label)` | Ellipse (start/end) |
| `[[Label]]` | Database |
| `![path]` | Local image node, default 100x100 |
| `![path](WxH)` | Local image node with explicit size |
| `[Label @key:value]` | Styled node |
| `->` | Solid arrow |
| `<-` | Reverse solid arrow |
| `<->` | Bidirectional solid arrow |
| `-->` | Dashed arrow |
| `<--` | Reverse dashed arrow |
| `<-->` | Bidirectional dashed arrow |
| `-> "text" ->` | Labeled solid arrow (double quotes) |
| `-> 'text' ->` | Labeled solid arrow (single quotes) |

Nodes are deduplicated by label and type. Chains such as `[A] -> [B] -> [C]` create one edge per hop. Use `#` for comments outside node definitions and quoted labels.

Labeled edges must be fully specified. Mixed forms such as `[A] --> "x" -> [B]` are rejected.

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

### Node styling

Inline attributes:

```
(Start) -> [Enter Credentials @fillStyle:hachure @backgroundColor:#a5d8ff] -> {Valid?}
{Valid?} -> "no" -> [Show Error @backgroundColor:#ffc9c9 @strokeStyle:dashed] -> [Enter Credentials]
```

Shared defaults with an `@node` block. Inline attributes override the block. Later explicit values win per property.

```
@node [Enter Credentials]
  fillStyle: solid
  backgroundColor: #a5d8ff

(Start) -> [Enter Credentials @fillStyle:hachure] -> {Valid?}
```

Supported keys: `fillStyle` (`solid`, `hachure`, `cross-hatch`), `backgroundColor`, `strokeColor`, `strokeWidth`, `strokeStyle` (`solid`, `dashed`, `dotted`), `roughness`, `opacity`.

### Directives

| Directive | Meaning |
|-----------|---------|
| `@direction TB\|BT\|LR\|RL` | Flow direction. Default `TB`. |
| `@spacing N` | Node spacing in pixels. |
| `@image path at X,Y` | Place a local image at absolute coordinates. |
| `@image path near (NodeLabel) [anchor]` | Place a local image relative to a node. |
| `@decorate path [anchor]` | Attach a decoration to the preceding node. Default anchor `top-right`. |
| `@sticker name` | Sticker at `0,0`. |
| `@sticker name at X,Y` | Sticker at absolute coordinates. |
| `@sticker name near (NodeLabel) [anchor]` | Sticker relative to a node. |
| `@library path` | Directory used to resolve sticker names. |
| `@scatter path count:N [width:W] [height:H]` | Repeat an image across the canvas. |

Decoration anchors: `top`, `bottom`, `left`, `right`, `top-left`, `top-right`, `bottom-left`, `bottom-right`.

Images must be local files. Relative paths resolve from the working directory. HTTP and HTTPS URLs parse but are skipped during generation with a warning.

Ready-made DSL lives in [examples/](examples/).

## CLI

```bash
excalidraw-cli --help
excalidraw-cli --version
excalidraw-cli help create
```

### `create [input]`

Generate an `.excalidraw` file from a file, `--inline`, or `--stdin`.

| Flag | Meaning |
|------|---------|
| `-o, --output <file>` | Output path. Default `flowchart.excalidraw`. Use `-` for stdout. |
| `-f, --format <type>` | `dsl`, `json`, or `dot`. Default `dsl`. |
| `--inline <input>` | Inline DSL, JSON, or DOT string. |
| `--stdin` | Read input from stdin. |
| `-d, --direction <dir>` | Override direction: `TB`, `BT`, `LR`, `RL`. |
| `-s, --spacing <n>` | Override node spacing. Non-negative integer. |
| `--verbose` | Print parse and layout progress. |

Input source order: `--inline`, then `--stdin`, then the positional file. One of the three is required.

When the positional file is used and `--format` is omitted, `.json` selects JSON and `.dot` or `.gv` selects DOT. Any other extension is DSL. `--inline` and `--stdin` stay DSL unless `--format` is set. An explicit `--format` always wins.

`--direction` and `--spacing` override values from DSL directives, JSON `options`, or DOT `rankdir` / spacing attributes.

```bash
excalidraw-cli create --inline "(Start) -> [Process] -> {Decision?}" -o flow.excalidraw
```

```bash
excalidraw-cli create --inline "$(cat <<'EOF'
(Start) -> [Step 1] -> {Decision?}
{Decision?} -> "yes" -> [Step 2] -> (End)
{Decision?} -> "no" -> [Step 3] -> [Step 1]
EOF
)" -o flowchart.excalidraw
```

```bash
printf '%s\n' '(Start) -> [Process] -> (End)' > flowchart.dsl
excalidraw-cli create flowchart.dsl -o diagram.excalidraw
```

```bash
echo "[A] -> [B] -> [C]" | excalidraw-cli create --stdin -o diagram.excalidraw
```

```bash
excalidraw-cli create --inline "[A] -> [B] -> [C]" --direction LR --spacing 80 -o horizontal-flow.excalidraw
```

```bash
excalidraw-cli create --inline "(Start) -> [Login @fillStyle:hachure @backgroundColor:#a5d8ff] -> (End)" -o styled.excalidraw
```

```bash
excalidraw-cli create --inline "[A] -> [B]" --verbose -o verbose.excalidraw
```

```bash
excalidraw-cli create --inline "[A] -> [B]" -o -
```

### `parse <input>`

Validate a file and print nodes, edges, and direction. Does not write a diagram.

| Flag | Meaning |
|------|---------|
| `-f, --format <type>` | `dsl`, `json`, or `dot`. Default `dsl`, with the same file-extension detection as `create`. |

```bash
printf '%s\n' '(Start) -> [Process] -> (End)' > graph.dsl
excalidraw-cli parse graph.dsl
```

### `convert <input>`

Export an existing `.excalidraw` file. `--format` is required.

| Flag | Meaning |
|------|---------|
| `--format <format>` | Required. `png` or `svg`. |
| `-o, --output <file>` | Output path. Default swaps the input extension. |
| `--export-background` | Include background. Default on. |
| `--no-export-background` | Exclude background. |
| `--background-color <color>` | Background color. Default is the scene background, then `#ffffff`. |
| `--dark` | Dark theme. |
| `--embed-scene` | Embed scene data in the image. |
| `--padding <n>` | Padding in pixels. Default `10`. |
| `--scale <n>` | PNG scale. Default `1`. Values are clamped to `0.1` through `10`. |
| `--verbose` | Print export progress. |

```bash
excalidraw-cli create --inline "(Start) -> [Process] -> (End)" -o diagram.excalidraw
excalidraw-cli convert diagram.excalidraw --format png
```

```bash
excalidraw-cli create --inline "(Start) -> [Process] -> (End)" -o diagram.excalidraw
excalidraw-cli convert diagram.excalidraw --format png --scale 2 --dark
```

```bash
excalidraw-cli create --inline "(Start) -> [Process] -> (End)" -o diagram.excalidraw
excalidraw-cli convert diagram.excalidraw --format svg --no-export-background
```

```bash
excalidraw-cli create --inline "[A] -> [B]" -o diagram.excalidraw
excalidraw-cli convert diagram.excalidraw --format png --background-color "#fff8e7" --padding 20 --embed-scene --verbose -o preview.png
```

## JSON

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

Node types: `rectangle`, `diamond`, `ellipse`, `database`, `image`. Any other type becomes `rectangle`. JSON has no image source field; use DSL image nodes or directives for file-backed images.

```bash
excalidraw-cli create --format json --inline '{"nodes":[{"id":"a","type":"rectangle","label":"A"}],"edges":[]}' -o flow.excalidraw
```

```bash
printf '%s\n' '{"nodes":[{"id":"a","type":"ellipse","label":"Start"},{"id":"b","type":"rectangle","label":"Work"}],"edges":[{"from":"a","to":"b","label":"go"}]}' > flowchart.json
excalidraw-cli create flowchart.json -o diagram.excalidraw
```

## DOT

Accepted: `digraph` and `graph`; `->` and `--` edges; node `label=` and edge `label=`; `rankdir=TB|BT|LR|RL`; `nodesep` and `ranksep` as approximate pixel spacing; node/edge `color`; dashed or dotted `style`. Subgraphs are flattened. Undirected `--` edges have no arrowheads.

Shape map: `diamond` → diamond; `ellipse`, `oval`, `circle` → ellipse; `cylinder`, `record`, `mrecord` → database; all other shapes → rectangle.

```bash
excalidraw-cli create --format dot --inline 'digraph { A [label="Start"]; B [label="Process"]; A -> B; }' -o flow.excalidraw
```

```bash
printf '%s\n' 'digraph { rankdir=LR; start [shape=ellipse label="Start"]; process [shape=box label="Process Data"]; decision [shape=diamond label="Valid?"]; end [shape=ellipse label="End"]; start -> process; process -> decision; decision -> end [label="yes"]; decision -> process [label="no" style=dashed]; }' > diagram.dot
excalidraw-cli create diagram.dot -o output.excalidraw
```

```bash
printf '%s\n' 'digraph { A -> B -> C }' > graph.dot
excalidraw-cli parse graph.dot --format dot
```

## Patterns

Copy these into `--inline` or a `.dsl` file. See also [examples/simple-flow.dsl](examples/simple-flow.dsl), [examples/decision-tree.dsl](examples/decision-tree.dsl), [examples/retry-pattern.dsl](examples/retry-pattern.dsl), and [examples/api-flow.dsl](examples/api-flow.dsl).

### Simple linear flow

```
(Start) -> [Initialize] -> [Process Data] -> [Save Results] -> (End)
```

```bash
excalidraw-cli create --inline "(Start) -> [Initialize] -> [Process Data] -> [Save Results] -> (End)" -o simple-flow.excalidraw
```

### Decision tree

```
(Start) -> [Receive Request] -> {Authenticated?}
{Authenticated?} -> "yes" -> [Process Request] -> (Success)
{Authenticated?} -> "no" -> [Return 401] -> (End)
```

```bash
excalidraw-cli create --inline "$(cat <<'EOF'
(Start) -> [Receive Request] -> {Authenticated?}
{Authenticated?} -> "yes" -> [Process Request] -> (Success)
{Authenticated?} -> "no" -> [Return 401] -> (End)
EOF
)" -o decision-tree.excalidraw
```

### Retry loop

```
(Start) -> [Attempt Operation] -> {Success?}
{Success?} -> "yes" -> [Continue] -> (End)
{Success?} -> "no" -> {Retry Count < 3?}
{Retry Count < 3?} -> "yes" -> [Increment Counter] -> [Attempt Operation]
{Retry Count < 3?} -> "no" -> [Log Failure] -> (Error)
```

```bash
excalidraw-cli create --inline "$(cat <<'EOF'
(Start) -> [Attempt Operation] -> {Success?}
{Success?} -> "yes" -> [Continue] -> (End)
{Success?} -> "no" -> {Retry Count < 3?}
{Retry Count < 3?} -> "yes" -> [Increment Counter] -> [Attempt Operation]
{Retry Count < 3?} -> "no" -> [Log Failure] -> (Error)
EOF
)" -o retry-pattern.excalidraw
```

### API request

```
[Client Request] -> [API Gateway] -> {Auth Valid?}
{Auth Valid?} -> "yes" -> [Route to Service] -> [[Database]] -> [Response]
{Auth Valid?} -> "no" -> [401 Unauthorized]
```

```bash
excalidraw-cli create --inline "$(cat <<'EOF'
[Client Request] -> [API Gateway] -> {Auth Valid?}
{Auth Valid?} -> "yes" -> [Route to Service] -> [[Database]] -> [Response]
{Auth Valid?} -> "no" -> [401 Unauthorized]
EOF
)" -o api-flow.excalidraw
```

### CI/CD

```
(Push) -> [Build] -> [Test] -> {Tests Pass?}
{Tests Pass?} -> "yes" -> [Deploy Staging] -> {Manual Approval?}
{Manual Approval?} -> "yes" -> [Deploy Production] -> (Done)
{Manual Approval?} -> "no" -> (Cancelled)
{Tests Pass?} -> "no" -> [Notify Team] -> (Failed)
```

```bash
excalidraw-cli create --inline "$(cat <<'EOF'
(Push) -> [Build] -> [Test] -> {Tests Pass?}
{Tests Pass?} -> "yes" -> [Deploy Staging] -> {Manual Approval?}
{Manual Approval?} -> "yes" -> [Deploy Production] -> (Done)
{Manual Approval?} -> "no" -> (Cancelled)
{Tests Pass?} -> "no" -> [Notify Team] -> (Failed)
EOF
)" -o cicd.excalidraw
```

## Shell quoting

```bash
excalidraw-cli create --inline '[API] -> "GET /users?name=\"pp\"" -> [Client]' -o api.excalidraw
```

```bash
excalidraw-cli create --inline "[Decision] -> 'team\'s call' -> [Next]" -o decision.excalidraw
```

Wrap the whole DSL in single quotes when labels use double quotes. Flip that when the label needs an apostrophe.

## Tips

- Keep labels short and action-oriented.
- End decision labels with `?`.
- Reuse the exact same label and shape when two lines refer to the same node.
- Start with `(Start)` when the entry point matters.
- After `create`, run `convert --format png` if the user needs a preview they can open without Excalidraw.
- `man excalidraw-cli` is the full flag and format reference.
