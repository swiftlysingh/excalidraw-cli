/**
 * Excalidraw Element Type Definitions
 * Based on Excalidraw JSON schema
 */

export type ExcalidrawElementType =
  | 'rectangle'
  | 'diamond'
  | 'ellipse'
  | 'text'
  | 'arrow'
  | 'line'
  | 'freedraw'
  | 'image';

export type ExcalidrawFillStyle = 'solid' | 'hachure' | 'cross-hatch';

export type ExcalidrawStrokeStyle = 'solid' | 'dashed' | 'dotted';

export type ExcalidrawArrowhead = 'arrow' | 'bar' | 'dot' | 'triangle' | null;

export type ExcalidrawTextAlign = 'left' | 'center' | 'right';

export type ExcalidrawVerticalAlign = 'top' | 'middle' | 'bottom';

/**
 * Roundness configuration for elements
 */
export interface ExcalidrawRoundness {
  type: 1 | 2 | 3; // 1=legacy, 2=proportional, 3=adaptive
}

/**
 * Binding reference for arrows
 */
export interface ExcalidrawBoundElement {
  id: string;
  type: 'arrow' | 'text';
}

/**
 * Arrow binding to shapes
 */
export interface ExcalidrawArrowBinding {
  elementId: string;
  mode: 'orbit' | 'point';
  fixedPoint: [number, number]; // Normalized [0-1] coordinates
}

/**
 * Base properties shared by all Excalidraw elements
 */
export interface ExcalidrawElementBase {
  id: string;
  type: ExcalidrawElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: ExcalidrawFillStyle;
  strokeWidth: number;
  strokeStyle: ExcalidrawStrokeStyle;
  roughness: number;
  opacity: number;
  groupIds: string[];
  frameId: string | null;
  index: string;
  roundness: ExcalidrawRoundness | null;
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  boundElements: ExcalidrawBoundElement[] | null;
  updated: number;
  link: string | null;
  locked: boolean;
}

/**
 * Rectangle element
 */
export interface ExcalidrawRectangle extends ExcalidrawElementBase {
  type: 'rectangle';
}

/**
 * Diamond element
 */
export interface ExcalidrawDiamond extends ExcalidrawElementBase {
  type: 'diamond';
}

/**
 * Ellipse element
 */
export interface ExcalidrawEllipse extends ExcalidrawElementBase {
  type: 'ellipse';
}

/**
 * Text element
 */
export interface ExcalidrawText extends ExcalidrawElementBase {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: number; // 1=Virgil, 2=Helvetica, 3=Cascadia, 5=Excalifont
  textAlign: ExcalidrawTextAlign;
  verticalAlign: ExcalidrawVerticalAlign;
  containerId: string | null;
  originalText: string;
  autoResize: boolean;
  lineHeight: number;
}

/**
 * Arrow element
 */
export interface ExcalidrawArrow extends ExcalidrawElementBase {
  type: 'arrow';
  points: Array<[number, number]>;
  lastCommittedPoint: [number, number] | null;
  startBinding: ExcalidrawArrowBinding | null;
  endBinding: ExcalidrawArrowBinding | null;
  startArrowhead: ExcalidrawArrowhead;
  endArrowhead: ExcalidrawArrowhead;
  elbowed: boolean;
}

/**
 * Line element
 */
export interface ExcalidrawLine extends ExcalidrawElementBase {
  type: 'line';
  points: Array<[number, number]>;
  lastCommittedPoint: [number, number] | null;
  startBinding: ExcalidrawArrowBinding | null;
  endBinding: ExcalidrawArrowBinding | null;
  startArrowhead: ExcalidrawArrowhead;
  endArrowhead: ExcalidrawArrowhead;
}

/**
 * Image element
 */
export interface ExcalidrawImage extends ExcalidrawElementBase {
  type: 'image';
  fileId: string;
  status: 'pending' | 'saved' | 'error';
  scale: [number, number];
}

/**
 * Union type for all Excalidraw elements
 */
export type ExcalidrawElement =
  | ExcalidrawRectangle
  | ExcalidrawDiamond
  | ExcalidrawEllipse
  | ExcalidrawText
  | ExcalidrawArrow
  | ExcalidrawLine
  | ExcalidrawImage;

/**
 * File data for embedded images
 */
export interface ExcalidrawFileData {
  mimeType: string;
  id: string;
  dataURL: string; // data:image/...;base64,... or URL
  created: number;
  lastRetrieved?: number;
}

/**
 * Application state for the canvas
 */
export interface ExcalidrawAppState {
  gridSize: number;
  gridStep: number;
  gridModeEnabled: boolean;
  viewBackgroundColor: string;
  lockedMultiSelections: Record<string, unknown>;
}

/**
 * Complete Excalidraw file structure
 */
export interface ExcalidrawFile {
  type: 'excalidraw';
  version: 2;
  source: string;
  elements: ExcalidrawElement[];
  appState: ExcalidrawAppState;
  files: Record<string, ExcalidrawFileData>;
}

/**
 * Default app state
 */
export const DEFAULT_APP_STATE: ExcalidrawAppState = {
  gridSize: 20,
  gridStep: 5,
  gridModeEnabled: false,
  viewBackgroundColor: '#ffffff',
  lockedMultiSelections: {},
};

/**
 * Default element style values
 */
export const DEFAULT_ELEMENT_STYLE = {
  strokeColor: '#1e1e1e',
  backgroundColor: 'transparent',
  fillStyle: 'solid' as ExcalidrawFillStyle,
  strokeWidth: 2,
  strokeStyle: 'solid' as ExcalidrawStrokeStyle,
  roughness: 1,
  opacity: 100,
};

/**
 * Font family mapping
 */
export const FONT_FAMILIES = {
  Virgil: 1,
  Helvetica: 2,
  Cascadia: 3,
  Excalifont: 5,
} as const;
