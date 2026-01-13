/**
 * Image Factory
 *
 * Creates Excalidraw image elements and handles image file data.
 */

import * as fs from 'fs';
import * as path from 'path';
import { nanoid } from 'nanoid';
import { createBaseElement } from './element-factory.js';
import type { ExcalidrawImage, ExcalidrawFileData } from '../types/excalidraw.js';
import type { LayoutedNode, LayoutedImage } from '../types/dsl.js';

/**
 * Default image dimensions
 */
const DEFAULT_IMAGE_WIDTH = 100;
const DEFAULT_IMAGE_HEIGHT = 100;

/**
 * MIME type mapping by file extension
 */
const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
};

/**
 * Get MIME type from file path or URL
 */
function getMimeType(src: string): string {
  const ext = path.extname(src).toLowerCase();
  return MIME_TYPES[ext] || 'image/png';
}

/**
 * Check if source is a URL
 */
function isUrl(src: string): boolean {
  return src.startsWith('http://') || src.startsWith('https://');
}

/**
 * Check if source is a sticker reference
 */
function isSticker(src: string): boolean {
  return src.startsWith('sticker:');
}

/**
 * Resolve sticker name to actual path using library
 */
export function resolveStickerPath(stickerSrc: string, libraryPath?: string): string {
  const name = stickerSrc.replace('sticker:', '');

  if (!libraryPath) {
    // No library specified, return as-is (will fail gracefully)
    return name;
  }

  // Try common extensions
  const extensions = ['.png', '.svg', '.jpg', '.jpeg', '.gif', '.webp'];
  for (const ext of extensions) {
    const fullPath = path.join(libraryPath, `${name}${ext}`);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  // Try with the name as-is (might already have extension)
  const directPath = path.join(libraryPath, name);
  if (fs.existsSync(directPath)) {
    return directPath;
  }

  return name;
}

/**
 * Create file data for an image
 * For local files: reads and base64 encodes
 * For URLs: stores the URL directly (Excalidraw supports this)
 */
export function createFileData(
  src: string,
  fileId: string,
  libraryPath?: string
): ExcalidrawFileData | null {
  // Handle sticker references
  let resolvedSrc = src;
  if (isSticker(src)) {
    resolvedSrc = resolveStickerPath(src, libraryPath);
  }

  // Remote URLs are not supported - Excalidraw requires base64-encoded data URLs
  if (isUrl(resolvedSrc)) {
    console.warn(
      `Remote URLs are not supported for images: ${resolvedSrc}\n` +
        `  Download the image locally and use a file path instead.`
    );
    return null;
  }

  // For local files, read and base64 encode
  try {
    const absolutePath = path.isAbsolute(resolvedSrc)
      ? resolvedSrc
      : path.resolve(process.cwd(), resolvedSrc);

    if (!fs.existsSync(absolutePath)) {
      console.warn(`Image file not found: ${absolutePath}`);
      return null;
    }

    const buffer = fs.readFileSync(absolutePath);
    const base64 = buffer.toString('base64');
    const mimeType = getMimeType(resolvedSrc);
    const dataURL = `data:${mimeType};base64,${base64}`;

    return {
      mimeType,
      id: fileId,
      dataURL,
      created: Date.now(),
    };
  } catch (error) {
    console.warn(`Failed to read image file: ${resolvedSrc}`, error);
    return null;
  }
}

/**
 * Create an image element for a layouted node
 */
export function createImageElement(
  node: LayoutedNode,
  fileId: string
): ExcalidrawImage {
  return {
    ...createBaseElement('image', node.x, node.y, node.width, node.height, {
      id: node.id,
      roundness: null,
      boundElements: null,
      backgroundColor: 'transparent',
    }),
    type: 'image',
    fileId,
    status: 'saved',
    scale: [1, 1],
  } as ExcalidrawImage;
}

/**
 * Create an image element for a layouted positioned image
 */
export function createPositionedImageElement(
  image: LayoutedImage,
  fileId: string
): ExcalidrawImage {
  return {
    ...createBaseElement('image', image.x, image.y, image.width, image.height, {
      id: image.id,
      roundness: null,
      boundElements: null,
      backgroundColor: 'transparent',
    }),
    type: 'image',
    fileId,
    status: 'saved',
    scale: [1, 1],
  } as ExcalidrawImage;
}

/**
 * Generate a unique file ID
 */
export function generateFileId(): string {
  return nanoid(21);
}

/**
 * Get image dimensions (for layout calculation)
 * Returns explicit dimensions if provided, otherwise defaults
 */
export function getImageDimensions(
  src: string,
  explicitWidth?: number,
  explicitHeight?: number
): { width: number; height: number } {
  // Use explicit dimensions if provided
  if (explicitWidth && explicitHeight) {
    return { width: explicitWidth, height: explicitHeight };
  }

  // For local files, we could probe the actual dimensions, but that adds complexity
  // For now, use defaults and let users specify dimensions if needed
  return {
    width: explicitWidth || DEFAULT_IMAGE_WIDTH,
    height: explicitHeight || DEFAULT_IMAGE_HEIGHT,
  };
}
