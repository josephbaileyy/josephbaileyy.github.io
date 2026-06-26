// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EarthExplorer, type EarthExplorerAdapter } from '../src/ui/earth-explorer';

afterEach(() => {
  document.body.replaceChildren();
});

describe('EarthExplorer', () => {
  it('isolates mount and destroy behind explicit enter/exit controls', async () => {
    const adapter: EarthExplorerAdapter = {
      mount: vi.fn(async (_container, _stanford, onCamera) => onCamera('37°, -122° · 100 km')),
      reset: vi.fn(),
      destroy: vi.fn(),
    };
    const explorer = new EarthExplorer(async () => adapter);
    explorer.setAvailable(true);
    const trigger = document.querySelector('.earth-explore-trigger') as HTMLButtonElement;
    expect(trigger.hidden).toBe(false);
    expect(trigger.textContent).toBe('terrain mode');
    trigger.click();
    await vi.waitFor(() => expect(adapter.mount).toHaveBeenCalledOnce());
    expect(document.body.dataset.earthExplore).toBe('true');
    const exit = [...document.querySelectorAll('button')].find(
      (node) => node.textContent === 'exit Earth',
    )! as HTMLButtonElement;
    exit.click();
    expect(adapter.destroy).toHaveBeenCalledOnce();
    expect(document.body.dataset.earthExplore).toBeUndefined();
  });
});
