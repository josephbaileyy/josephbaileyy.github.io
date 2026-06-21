import { CHAIN3D } from '../scenes/registry';

/**
 * The guided "journey": an opt-in autopilot that flies the camera from the
 * Milky Way all the way down to the desk, pausing at each scale to show a
 * one-line caption — the continuous-descent spirit of the Powers of Ten film,
 * and the first-time visitor's cue that this site is something you travel
 * through. It drives navigation through the same JumpController path as the
 * HUD, so it inherits reduced-motion handling for free (instant hops, captions
 * become a timed slideshow). Any manual navigation cancels it.
 */

export interface TourDeps {
  /** Same path the HUD uses: prefetch + JumpController.go. */
  navigateTo: (index: number) => void;
  reduced: boolean;
  /** Notified when the tour starts (true) and finishes/cancels (false). */
  onActiveChange?: (active: boolean) => void;
}

// Scale flavor per scene, index-aligned to CHAIN3D. The scene name itself
// comes from the registry (single source of truth); this adds the "how big".
const NOTES: string[] = [
  'a hundred billion stars · ~10²¹ m across',
  "planets at today's real positions · ~10¹³ m",
  'day and night from the live terminator · ~10⁷ m',
  'find the one lit dorm window · a few hundred meters',
  'almost home · a few meters across',
  "you've arrived — look around",
];

export class Tour {
  active = false;

  private el: HTMLDivElement;
  private captionEl: HTMLParagraphElement;
  private stepEl: HTMLSpanElement;
  private phase: 'travel' | 'dwell' = 'travel';
  private i = 0;
  private dwellUntil = 0;
  private readonly last = CHAIN3D.length - 1;
  private readonly dwell: number;

  constructor(
    root: HTMLElement,
    private deps: TourDeps,
  ) {
    this.dwell = deps.reduced ? 2.6 : 1.8;

    this.el = document.createElement('div');
    this.el.className = 'tour-caption';
    // Purely visual: the main loop already announces each settled scene to
    // screen readers via Hud.announce(), so keep this out of the a11y tree.
    this.el.setAttribute('aria-hidden', 'true');

    this.captionEl = document.createElement('p');
    this.captionEl.className = 'tour-line';

    this.stepEl = document.createElement('span');
    this.stepEl.className = 'tour-step';

    const skip = document.createElement('button');
    skip.className = 'tour-skip';
    skip.textContent = 'skip';
    skip.addEventListener('click', () => this.cancel());

    this.el.append(this.stepEl, this.captionEl, skip);
    root.appendChild(this.el);
  }

  /** Begin from the top of the chain regardless of where the camera sits. */
  start(): void {
    if (this.active) return;
    this.active = true;
    this.i = 0;
    this.phase = 'travel';
    this.el.classList.add('on');
    this.render();
    this.deps.onActiveChange?.(true);
    this.deps.navigateTo(0);
  }

  cancel(): void {
    if (!this.active) return;
    this.active = false;
    this.el.classList.remove('on');
    this.deps.onActiveChange?.(false);
  }

  /** Ticked each frame with the camera's settled scene index (or null). */
  update(now: number, settled: number | null): void {
    if (!this.active) return;

    if (this.phase === 'travel') {
      if (settled === this.i) {
        this.render();
        this.phase = 'dwell';
        this.dwellUntil = now + this.dwell;
      }
      return;
    }

    // dwell
    if (now < this.dwellUntil) return;
    if (this.i >= this.last) {
      this.cancel();
      return;
    }
    this.i += 1;
    this.phase = 'travel';
    this.deps.navigateTo(this.i);
  }

  private render(): void {
    this.stepEl.textContent = `${this.i + 1} / ${this.last + 1}`;
    this.captionEl.innerHTML = `<strong>${CHAIN3D[this.i].label}</strong>${NOTES[this.i] ? ` — ${NOTES[this.i]}` : ''}`;
  }
}
