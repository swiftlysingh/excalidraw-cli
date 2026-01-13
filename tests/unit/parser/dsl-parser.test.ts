import { describe, it, expect } from 'vitest';
import { parseDSL } from '../../../src/parser/dsl-parser.js';

describe('DSL Parser', () => {
  describe('node parsing', () => {
    it('should parse rectangle nodes', () => {
      const result = parseDSL('[Process Step]');
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('rectangle');
      expect(result.nodes[0].label).toBe('Process Step');
    });

    it('should parse diamond nodes', () => {
      const result = parseDSL('{Decision?}');
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('diamond');
      expect(result.nodes[0].label).toBe('Decision?');
    });

    it('should parse ellipse nodes', () => {
      const result = parseDSL('(Start)');
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('ellipse');
      expect(result.nodes[0].label).toBe('Start');
    });

    it('should parse database nodes', () => {
      const result = parseDSL('[[Database]]');
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('database');
      expect(result.nodes[0].label).toBe('Database');
    });
  });

  describe('connection parsing', () => {
    it('should parse simple connections', () => {
      const result = parseDSL('[A] -> [B]');
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].source).toBe(result.nodes[0].id);
      expect(result.edges[0].target).toBe(result.nodes[1].id);
    });

    it('should parse labeled connections', () => {
      const result = parseDSL('[A] -> "yes" -> [B]');
      expect(result.edges[0].label).toBe('yes');
    });

    it('should parse dashed connections', () => {
      const result = parseDSL('[A] --> [B]');
      expect(result.edges[0].style?.strokeStyle).toBe('dashed');
    });

    it('should parse chains of connections', () => {
      const result = parseDSL('[A] -> [B] -> [C]');
      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
    });
  });

  describe('directive parsing', () => {
    it('should parse direction directive', () => {
      const result = parseDSL('@direction LR\n[A] -> [B]');
      expect(result.options.direction).toBe('LR');
    });

    it('should parse spacing directive', () => {
      const result = parseDSL('@spacing 100\n[A] -> [B]');
      expect(result.options.nodeSpacing).toBe(100);
    });
  });

  describe('complex flowcharts', () => {
    it('should parse a decision tree', () => {
      const dsl = `
        (Start) -> [Enter Credentials] -> {Valid?}
        {Valid?} -> "yes" -> [Dashboard] -> (End)
        {Valid?} -> "no" -> [Show Error] -> [Enter Credentials]
      `;
      const result = parseDSL(dsl);

      expect(result.nodes.length).toBeGreaterThanOrEqual(5);
      expect(result.edges.length).toBeGreaterThanOrEqual(5);
    });

    it('should deduplicate nodes by label and type', () => {
      const result = parseDSL('[A] -> [B]\n[B] -> [C]');
      const bNodes = result.nodes.filter((n) => n.label === 'B');
      expect(bNodes).toHaveLength(1);
    });
  });

  describe('image parsing', () => {
    it('should parse basic image nodes', () => {
      const result = parseDSL('![logo.png]');
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('image');
      expect(result.nodes[0].label).toBe('logo.png');
      expect(result.nodes[0].image?.src).toBe('logo.png');
    });

    it('should parse image nodes with dimensions', () => {
      const result = parseDSL('![logo.png](200x100)');
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('image');
      expect(result.nodes[0].image?.width).toBe(200);
      expect(result.nodes[0].image?.height).toBe(100);
    });

    it('should parse images in flowcharts', () => {
      const result = parseDSL('(Start) -> ![icon.png] -> [Process]');
      expect(result.nodes).toHaveLength(3);
      expect(result.nodes[1].type).toBe('image');
      expect(result.edges).toHaveLength(2);
    });

    it('should parse URL images', () => {
      const result = parseDSL('![https://example.com/image.png]');
      expect(result.nodes[0].image?.src).toBe('https://example.com/image.png');
    });
  });

  describe('image directive parsing', () => {
    it('should parse @image at directive', () => {
      const result = parseDSL('@image icon.png at 100,200');
      expect(result.images).toHaveLength(1);
      expect(result.images![0].src).toBe('icon.png');
      expect(result.images![0].position).toEqual({ type: 'absolute', x: 100, y: 200 });
    });

    it('should parse @image near directive', () => {
      const result = parseDSL('@image icon.png near (Start)');
      expect(result.images).toHaveLength(1);
      expect(result.images![0].position).toEqual({
        type: 'near',
        nodeLabel: 'Start',
        anchor: undefined,
      });
    });

    it('should parse @image near with anchor', () => {
      const result = parseDSL('@image icon.png near (Start) top-left');
      expect(result.images![0].position).toEqual({
        type: 'near',
        nodeLabel: 'Start',
        anchor: 'top-left',
      });
    });
  });

  describe('decoration parsing', () => {
    it('should parse @decorate directive', () => {
      const result = parseDSL('(Start) @decorate holly.png top-left');
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].decorations).toHaveLength(1);
      expect(result.nodes[0].decorations![0].src).toBe('holly.png');
      expect(result.nodes[0].decorations![0].anchor).toBe('top-left');
    });

    it('should parse multiple decorations', () => {
      const result = parseDSL('(Start) @decorate a.png top-left @decorate b.png top-right');
      expect(result.nodes[0].decorations).toHaveLength(2);
    });
  });

  describe('sticker and library parsing', () => {
    it('should parse @library directive', () => {
      const result = parseDSL('@library ./stickers/');
      expect(result.library).toBe('./stickers/');
    });

    it('should parse @sticker directive', () => {
      const result = parseDSL('@sticker snowflake');
      expect(result.images).toHaveLength(1);
      expect(result.images![0].src).toBe('sticker:snowflake');
    });

    it('should parse @sticker with position', () => {
      const result = parseDSL('@sticker snowflake at 50,50');
      expect(result.images![0].src).toBe('sticker:snowflake');
      expect(result.images![0].position).toEqual({ type: 'absolute', x: 50, y: 50 });
    });
  });

  describe('scatter parsing', () => {
    it('should parse @scatter directive', () => {
      const result = parseDSL('@scatter snowflake.png count:20');
      expect(result.scatter).toHaveLength(1);
      expect(result.scatter![0].src).toBe('snowflake.png');
      expect(result.scatter![0].count).toBe(20);
    });

    it('should parse @scatter with dimensions', () => {
      const result = parseDSL('@scatter star.png count:10 width:30 height:30');
      expect(result.scatter![0].width).toBe(30);
      expect(result.scatter![0].height).toBe(30);
    });
  });
});
