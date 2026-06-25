export interface RouteState {
  scene: number;
  panel?: string;
}

export function parseRoute(hash: string, names: string[]): RouteState | null {
  const match = hash.match(/^#\/([a-z-]+)(?:\/([a-z0-9-]+))?$/);
  if (!match) return null;
  const scene = names.indexOf(match[1]);
  if (scene === -1) return null;
  return { scene, panel: match[2] };
}

export function formatRoute(scene: number, names: string[], panel?: string): string {
  if (!names[scene]) throw new RangeError(`Unknown scene index: ${scene}`);
  return `#/${names[scene]}${panel ? `/${panel}` : ''}`;
}

export class Router {
  private names: string[];

  constructor(
    scenes: ReadonlyArray<{ id: string }>,
    private onNavigate: (state: RouteState) => void,
  ) {
    this.names = scenes.map((s) => s.id);
    window.addEventListener('hashchange', () => {
      const state = this.parse(location.hash);
      if (state) this.onNavigate(state);
    });
  }

  parse(hash: string = location.hash): RouteState | null {
    return parseRoute(hash, this.names);
  }

  /** Quiet update while scrubbing — no history entry, no hashchange loop. */
  replace(scene: number, panel?: string): void {
    const hash = formatRoute(scene, this.names, panel);
    if (location.hash === hash) return;
    history.replaceState(null, '', hash);
  }

  /** History entry (panel opens) so the Back button behaves. */
  push(scene: number, panel?: string): void {
    const hash = formatRoute(scene, this.names, panel);
    if (location.hash === hash) return;
    history.pushState(null, '', hash);
  }
}
