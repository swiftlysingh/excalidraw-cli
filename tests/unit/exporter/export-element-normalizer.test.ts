import { describe, it, expect } from 'vitest';
import { normalizeElementsForExport } from '../../../src/exporter/image-exporter.js';
import { createLabeledAngledArrowFile } from '../../helpers/fixtures.js';

describe('normalizeElementsForExport', () => {
  it('restores labeled arrow boxes so the SVG mask hole cannot cover the stroke', () => {
    const file = createLabeledAngledArrowFile();
    const normalized = normalizeElementsForExport(file.elements);
    const arrow = normalized.find((element) => element.id === 'ab');
    const label = normalized.find((element) => element.id === 'label');

    expect(arrow).toMatchObject({ width: 200, height: 300 });
    expect(label?.width).toBeGreaterThan(0);
    expect(label?.height).toBeGreaterThan(0);
    expect(label?.height).toBeLessThan(40);
  });

  it('leaves already-valid bound labels unchanged', () => {
    const file = createLabeledAngledArrowFile();
    const original = file.elements.find((element) => element.id === 'label');
    if (!original || original.type !== 'text') {
      throw new Error('expected bound text fixture');
    }
    original.height = 20;
    original.width = 72;

    const normalized = normalizeElementsForExport(file.elements);
    const label = normalized.find((element) => element.id === 'label');

    expect(label).toMatchObject({ width: 72, height: 20 });
  });

  it('repairs inherited arrow-wide label width even when height is valid', () => {
    const file = createLabeledAngledArrowFile();
    const original = file.elements.find((element) => element.id === 'label');
    if (!original || original.type !== 'text') {
      throw new Error('expected bound text fixture');
    }
    original.width = 200;
    original.height = 20;

    const normalized = normalizeElementsForExport(file.elements);
    const label = normalized.find((element) => element.id === 'label');

    expect(label?.height).toBe(20);
    expect(label?.width).toBeGreaterThan(0);
    expect(label?.width).toBeLessThan(120);
  });

  it('repairs a positive label height that matches the bound arrow height', () => {
    const file = createLabeledAngledArrowFile();
    const arrow = file.elements.find((element) => element.id === 'ab');
    const original = file.elements.find((element) => element.id === 'label');
    if (!arrow || arrow.type !== 'arrow' || !original || original.type !== 'text') {
      throw new Error('expected labeled arrow fixture');
    }
    arrow.height = 40;
    original.width = 72;
    original.height = 40;

    const normalized = normalizeElementsForExport(file.elements);
    const label = normalized.find((element) => element.id === 'label');

    expect(label).toMatchObject({ width: 72 });
    expect(label?.height).toBeGreaterThan(0);
    expect(label?.height).toBeLessThan(40);
  });
});
