import type { SceneDef } from './engine/types';

export interface RouteState {
  scene: number;
  panel?: string;
}

export class Router {
  private names: string[];
  private lastWritten = '';

  constructor(
    scenes: SceneDef[],
    private onNavigate: (state: RouteState) => void,
  ) {
    this.names = scenes.map((s) => s.id);
    window.addEventListener('hashchange', () => {
      const hash = location.hash;
      if (hash === this.lastWritten) return;
      const state = this.parse(hash);
      if (state) this.onNavigate(state);
    });
  }

  parse(hash: string = location.hash): RouteState | null {
    const m = hash.match(/^#\/([a-z-]+)(?:\/([a-z0-9-]+))?$/);
    if (!m) return null;
    const scene = this.names.indexOf(m[1]);
    if (scene === -1) return null;
    return { scene, panel: m[2] };
  }

  /** Quiet update while scrubbing — no history entry, no hashchange loop. */
  replace(scene: number, panel?: string): void {
    const hash = `#/${this.names[scene]}${panel ? `/${panel}` : ''}`;
    if (location.hash === hash) return;
    this.lastWritten = hash;
    history.replaceState(null, '', hash);
  }

  /** History entry (panel opens) so the Back button behaves. */
  push(scene: number, panel?: string): void {
    const hash = `#/${this.names[scene]}${panel ? `/${panel}` : ''}`;
    if (location.hash === hash) return;
    this.lastWritten = hash;
    location.hash = hash;
  }
}
