import { describe, it, expect } from 'vitest';
import { normalizeSvgForRasterization } from '../../../src/exporter/image-exporter.js';

describe('normalizeSvgForRasterization', () => {
  it('inlines image symbol use nodes for rasterizers', () => {
    const svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">',
      '  <defs>',
      '    <symbol id="image-file-1">',
      '      <image href="data:image/png;base64,abc" preserveAspectRatio="none" width="100%" height="100%"></image>',
      '    </symbol>',
      '    <clipPath id="clip-1"><rect width="16" height="16"></rect></clipPath>',
      '  </defs>',
      '  <g transform="translate(10 20)">',
      '    <use href="#image-file-1" width="24" height="18" opacity="0.5" transform="scale(2)" clip-path="url(#clip-1)"></use>',
      '  </g>',
      '</svg>',
    ].join('');

    const normalized = normalizeSvgForRasterization(svg);

    expect(normalized).not.toContain('<use href="#image-file-1"');
    expect(normalized).toContain('<image');
    expect(normalized).toContain('href="data:image/png;base64,abc"');
    expect(normalized).toContain('width="24"');
    expect(normalized).toContain('height="18"');
    expect(normalized).toContain('opacity="0.5"');
    expect(normalized).toContain('transform="scale(2)"');
    expect(normalized).toContain('clip-path="url(#clip-1)"');
    expect(normalized).toContain('<clipPath id="clip-1">');
    expect(normalized).not.toContain('<symbol id="image-file-1"');
  });

  it('leaves unrelated symbol references untouched', () => {
    const svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">',
      '  <defs>',
      '    <symbol id="shape-symbol"><rect width="10" height="10"></rect></symbol>',
      '  </defs>',
      '  <use href="#shape-symbol" width="10" height="10"></use>',
      '</svg>',
    ].join('');

    const normalized = normalizeSvgForRasterization(svg);

    expect(normalized).toContain('<use href="#shape-symbol"');
    expect(normalized).toContain('<symbol id="shape-symbol"');
  });
});
