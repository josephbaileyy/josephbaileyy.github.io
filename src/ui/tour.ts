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
  paused = false;

  private el: HTMLDivElement;
  private captionEl: HTMLParagraphElement;
  private stepEl: HTMLSpanElement;
  private pauseButton: HTMLButtonElement;
  private phase: 'travel' | 'dwell' = 'travel';
  private i = 0;
  private dwellUntil = 0;
  private readonly last = CHAIN3D.length - 1;
  private readonly dwell: number;
  private lastNow = 0;

  constructor(
    root: HTMLElement,
    private deps: TourDeps,
  ) {
    this.dwell = deps.reduced ? 3.2 : 2.4;

    this.el = document.createElement('div');
    this.el.className = 'tour-caption';
    this.el.hidden = true;
    this.el.setAttribute('role', 'region');
    this.el.setAttribute('aria-label', 'Guided universe journey');

    this.captionEl = document.createElement('p');
    this.captionEl.className = 'tour-line';

    this.stepEl = document.createElement('span');
    this.stepEl.className = 'tour-step';

    const controls = document.createElement('div');
    controls.className = 'tour-controls';
    this.pauseButton = document.createElement('button');
    this.pauseButton.className = 'tour-pause';
    this.pauseButton.type = 'button';
    this.pauseButton.textContent = 'pause';
    this.pauseButton.setAttribute('aria-label', 'Pause guided journey');
    this.pauseButton.setAttribute('aria-pressed', 'false');
    this.pauseButton.addEventListener('click', () => {
      if (this.paused) this.resume();
      else this.pause();
    });
    const portfolio = document.createElement('a');
    portfolio.className = 'tour-portfolio';
    portfolio.href = '/about.html';
    portfolio.textContent = 'skip to portfolio ↗';
    controls.append(this.pauseButton, portfolio);

    this.el.append(this.stepEl, this.captionEl, controls);
    root.appendChild(this.el);
  }

  /**
   * Begin (or restart) from the top of the chain regardless of where the camera
   * sits. Idempotent on purpose: replaying via the HUD button, the dock, or the
   * terminal always resets cleanly, even if a prior run was left mid-flight.
   */
  start(): void {
    this.active = true;
    this.paused = false;
    this.lastNow = 0;
    this.i = 0;
    this.phase = 'travel';
    this.el.classList.add('on');
    this.el.hidden = false;
    this.syncPauseButton();
    this.render();
    this.deps.onActiveChange?.(true);
    this.deps.navigateTo(0);
  }

  cancel(): void {
    if (!this.active) return;
    this.active = false;
    this.paused = false;
    this.el.classList.remove('on');
    this.el.hidden = true;
    this.syncPauseButton();
    this.deps.onActiveChange?.(false);
  }

  pause(): void {
    if (!this.active || this.paused) return;
    this.paused = true;
    this.el.classList.add('paused');
    this.syncPauseButton();
  }

  resume(): void {
    if (!this.active || !this.paused) return;
    this.paused = false;
    this.el.classList.remove('paused');
    this.syncPauseButton();
  }

  /** Ticked each frame with the camera's settled scene index (or null). */
  update(now: number, settled: number | null): void {
    if (!this.active) return;
    if (this.paused) {
      if (this.phase === 'dwell' && this.lastNow)
        this.dwellUntil += Math.max(0, now - this.lastNow);
      this.lastNow = now;
      return;
    }
    this.lastNow = now;

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

  private syncPauseButton(): void {
    this.pauseButton.textContent = this.paused ? 'resume' : 'pause';
    this.pauseButton.setAttribute(
      'aria-label',
      this.paused ? 'Resume guided journey' : 'Pause guided journey',
    );
    this.pauseButton.setAttribute('aria-pressed', String(this.paused));
  }
}
