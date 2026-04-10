import { describe, it, expect } from 'vitest';
import { createFlowchartFromDSL } from '../../../src/index.js';

describe('edge label integration', () => {
  it('binds escaped edge labels to arrows in generated Excalidraw output', async () => {
    const dsl = String.raw`[API] -> "GET /users?name=\"pp\" \\ path" -> [Client]`;
    const raw = await createFlowchartFromDSL(dsl);
    const file = JSON.parse(raw);

    const arrow = file.elements.find((element: any) => element.type === 'arrow');
    const text = file.elements.find(
      (element: any) => element.type === 'text' && element.containerId === arrow?.id
    );

    expect(arrow).toBeTruthy();
    expect(arrow.boundElements).toEqual([{ id: text.id, type: 'text' }]);
    expect(text).toBeTruthy();
    expect(text.text).toBe('GET /users?name="pp" \\ path');
    expect(text.containerId).toBe(arrow.id);
  });

  it('supports single-quoted edge labels end to end', async () => {
    const raw = await createFlowchartFromDSL(String.raw`[Decision] -> 'team\'s choice' -> [Next]`);
    const file = JSON.parse(raw);

    const text = file.elements.find((element: any) => element.type === 'text' && element.containerId);
    expect(text.text).toBe("team's choice");
  });
});
