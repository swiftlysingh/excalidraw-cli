/**
 * Factory module exports
 */

export { createBaseElement, resetIndexCounter, DEFAULT_ELEMENT_STYLE } from './element-factory.js';
export { createNode, createRectangle, createDiamond, createEllipse } from './node-factory.js';
export { createArrow, createArrowWithBindings } from './connection-factory.js';
export { createText, createBoundText, createNodeLabel, createEdgeLabel } from './text-factory.js';
export {
  createImageElement,
  createPositionedImageElement,
  createFileData,
  generateFileId,
  getImageDimensions,
  resolveStickerPath,
} from './image-factory.js';
