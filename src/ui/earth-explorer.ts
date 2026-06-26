import 'cesium/Build/Cesium/Widgets/widgets.css';
import { SCENE_SIGNALS } from '../content/portfolio';

export interface EarthExplorerAdapter {
  mount(
    container: HTMLElement,
    onStanford: () => void,
    onCamera: (text: string) => void,
  ): Promise<void>;
  reset(): void;
  destroy(): void;
}

export class EarthExplorer {
  private trigger = document.createElement('button');
  private root = document.createElement('section');
  private canvasHost = document.createElement('div');
  private readout = document.createElement('output');
  private error = document.createElement('p');
  private adapter: EarthExplorerAdapter | null = null;

  constructor(private createAdapter: () => Promise<EarthExplorerAdapter> = createCesiumAdapter) {
    this.trigger.className = 'earth-explore-trigger';
    this.trigger.textContent = 'terrain mode';
    this.trigger.hidden = true;
    this.trigger.addEventListener('click', () => void this.enter());
    document.body.appendChild(this.trigger);

    this.root.className = 'earth-explorer';
    this.root.setAttribute('aria-label', 'Interactive Earth explorer');
    this.root.setAttribute('aria-hidden', 'true');
    this.canvasHost.className = 'earth-explorer-canvas';
    const toolbar = document.createElement('div');
    toolbar.className = 'earth-explorer-toolbar';
    const reset = control('reset view', () => this.adapter?.reset());
    const exit = control('exit Earth', () => this.exit());
    this.readout.textContent = 'loading terrain…';
    this.error.className = 'earth-explorer-error';
    toolbar.append(this.readout, reset, exit);
    const list = document.createElement('div');
    list.className = 'earth-coordinate-list';
    list.innerHTML = '<strong>Coordinate layer</strong>';
    for (const signal of SCENE_SIGNALS.filter((item) => item.scene === 'earth')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = signal.title;
      button.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('universe:signal', { detail: signal.id }));
      });
      list.appendChild(button);
    }
    this.root.append(this.canvasHost, toolbar, list, this.error);
    document.body.appendChild(this.root);
  }

  setAvailable(available: boolean): void {
    this.trigger.hidden = !available || this.root.classList.contains('active');
  }

  async enter(): Promise<void> {
    this.root.classList.add('active');
    this.root.setAttribute('aria-hidden', 'false');
    this.trigger.hidden = true;
    document.body.dataset.earthExplore = 'true';
    this.error.textContent = '';
    try {
      this.adapter ??= await this.createAdapter();
      await this.adapter.mount(
        this.canvasHost,
        () => {
          this.exit();
          window.dispatchEvent(new CustomEvent('universe:navigate', { detail: 3 }));
        },
        (text) => {
          this.readout.textContent = text;
        },
      );
    } catch (error) {
      console.error('Earth explorer failed', error);
      this.error.textContent =
        'Detailed Earth data is unavailable. The portfolio globe remains active behind this view.';
    }
  }

  exit(): void {
    this.adapter?.destroy();
    this.adapter = null;
    this.canvasHost.replaceChildren();
    this.root.classList.remove('active');
    this.root.setAttribute('aria-hidden', 'true');
    delete document.body.dataset.earthExplore;
    this.trigger.hidden = false;
  }
}

async function createCesiumAdapter(): Promise<EarthExplorerAdapter> {
  const token = import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined;
  if (!token) throw new Error('VITE_CESIUM_ION_TOKEN is not configured');
  (window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = '/cesium/';
  const C = await import('cesium');
  C.Ion.defaultAccessToken = token;
  let viewer: import('cesium').Viewer | null = null;
  const destination = () => C.Cartesian3.fromDegrees(-122.1697, 37.4275, 12_000_000);
  return {
    async mount(container, onStanford, onCamera) {
      const terrainProvider = await C.createWorldTerrainAsync();
      viewer = new C.Viewer(container, {
        terrainProvider,
        animation: false,
        timeline: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        selectionIndicator: false,
        infoBox: false,
      });
      try {
        viewer.scene.primitives.add(await C.createOsmBuildingsAsync());
      } catch (error) {
        console.warn('Cesium OSM buildings unavailable', error);
      }
      const stanford = viewer.entities.add({
        id: 'stanford-marker',
        position: C.Cartesian3.fromDegrees(-122.1697, 37.4275, 40),
        point: {
          pixelSize: 14,
          color: C.Color.fromCssColorString('#ff5a5a'),
          outlineColor: C.Color.WHITE,
          outlineWidth: 3,
        },
        label: {
          text: 'Stanford University\ncontinue the journey',
          font: '600 16px sans-serif',
          fillColor: C.Color.WHITE,
          showBackground: true,
          backgroundColor: C.Color.fromCssColorString('#070a1c').withAlpha(0.82),
          pixelOffset: new C.Cartesian2(0, -38),
        },
      });
      viewer.screenSpaceEventHandler.setInputAction(
        (movement: { position: import('cesium').Cartesian2 }) => {
          const picked = viewer?.scene.pick(movement.position) as { id?: unknown } | undefined;
          if (picked?.id === stanford) onStanford();
        },
        C.ScreenSpaceEventType.LEFT_CLICK,
      );
      const updateReadout = () => {
        if (!viewer) return;
        const p = viewer.camera.positionCartographic;
        onCamera(
          `${C.Math.toDegrees(p.latitude).toFixed(3)}°, ${C.Math.toDegrees(p.longitude).toFixed(3)}° · ${Math.round(p.height / 1000).toLocaleString()} km`,
        );
      };
      viewer.camera.changed.addEventListener(updateReadout);
      viewer.camera.flyTo({ destination: destination(), duration: 0 });
      updateReadout();
    },
    reset() {
      viewer?.camera.flyTo({ destination: destination(), duration: 1.2 });
    },
    destroy() {
      viewer?.destroy();
      viewer = null;
    },
  };
}

function control(label: string, action: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', action);
  return button;
}
