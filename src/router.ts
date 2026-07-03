export interface RouteState {
  scene: number;
  panel?: string;
  app?: string;
}

export function parseRoute(hash: string, names: string[]): RouteState | null {
  const appMatch = hash.match(/^#\/([a-z-]+)\/app\/([^/]+)$/);
  if (appMatch) {
    const scene = names.indexOf(appMatch[1]);
    if (scene === -1) return null;
    return { scene, app: decodeURIComponent(appMatch[2]) };
  }

  const match = hash.match(/^#\/([a-z-]+)(?:\/([a-z0-9-]+))?$/);
  if (!match) return null;
  const scene = names.indexOf(match[1]);
  if (scene === -1) return null;
  return { scene, panel: match[2] };
}

export function formatRoute(scene: number, names: string[], panel?: string, app?: string): string {
  if (!names[scene]) throw new RangeError(`Unknown scene index: ${scene}`);
  if (app) return `#/${names[scene]}/app/${encodeURIComponent(app)}`;
  return `#/${names[scene]}${panel ? `/${panel}` : ''}`;
}

export class Router {
  private names: string[];
  private lastHandledHash = '';

  constructor(
    scenes: ReadonlyArray<{ id: string }>,
    private onNavigate: (state: RouteState) => void,
  ) {
    this.names = scenes.map((s) => s.id);
    const handleNavigation = () => {
      if (location.hash === this.lastHandledHash) return;
      this.lastHandledHash = location.hash;
      const state = this.parse(location.hash);
      if (state) this.onNavigate(state);
    };
    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('popstate', handleNavigation);
  }

  parse(hash: string = location.hash): RouteState | null {
    return parseRoute(hash, this.names);
  }

  /** Quiet update while scrubbing — no history entry, no hashchange loop. */
  replace(scene: number, panel?: string, app?: string): void {
    const hash = formatRoute(scene, this.names, panel, app);
    if (location.hash === hash) return;
    history.replaceState(null, '', hash);
    this.lastHandledHash = hash;
  }

  /** History entry for discrete user navigation so the Back button behaves. */
  push(scene: number, panel?: string, app?: string): void {
    const hash = formatRoute(scene, this.names, panel, app);
    if (location.hash === hash) return;
    history.pushState(null, '', hash);
    this.lastHandledHash = hash;
  }
}
