// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { Tour } from '../src/ui/tour';
import { CHAIN3D } from '../src/scenes/registry';

afterEach(() => {
  document.body.replaceChildren();
});

const mount = () => {
  const root = document.createElement('div');
  document.body.appendChild(root);
  return root;
};

describe('guided tour sequencer', () => {
  it('starts at the top and advances through every scene, then ends', () => {
    const root = mount();
    const nav: number[] = [];
    const activeChanges: boolean[] = [];
    const tour = new Tour(root, {
      navigateTo: (i) => nav.push(i),
      reduced: false,
      onActiveChange: (a) => activeChanges.push(a),
    });

    tour.start();
    expect(tour.active).toBe(true);
    expect(nav).toEqual([0]); // flies to the widest scale first

    const last = CHAIN3D.length - 1;
    let t = 1000;
    for (let scene = 0; scene <= last; scene++) {
      tour.update(t, scene); // arrive → dwell
      t += 5; // wait past the dwell window
      tour.update(t, scene); // dwell elapsed → advance (or finish)
      t += 1;
    }

    expect(nav).toEqual([0, 1, 2, 3, 4, 5]);
    expect(tour.active).toBe(false);
    expect(activeChanges).toEqual([true, false]);
  });

  it('does not advance while still traveling to the target scene', () => {
    const root = mount();
    const nav: number[] = [];
    const tour = new Tour(root, { navigateTo: (i) => nav.push(i), reduced: false });
    tour.start();
    // settled === null (mid-flight) must never trigger a dwell/advance.
    for (let t = 1000; t < 1010; t++) tour.update(t, null);
    expect(nav).toEqual([0]);
    expect(tour.active).toBe(true);
  });

  it('renders the current scene label and step counter', () => {
    const root = mount();
    const tour = new Tour(root, { navigateTo: () => {}, reduced: false });
    tour.start();
    expect(root.querySelector('.tour-line')?.textContent).toContain(CHAIN3D[0].label);
    expect(root.querySelector('.tour-step')?.textContent).toBe(`1 / ${CHAIN3D.length}`);
  });

  it('can be replayed: a second start resets to the top', () => {
    const root = mount();
    const nav: number[] = [];
    const tour = new Tour(root, { navigateTo: (i) => nav.push(i), reduced: false });

    // First run to completion.
    tour.start();
    let t = 1000;
    for (let scene = 0; scene <= 5; scene++) {
      tour.update(t, scene);
      t += 5;
      tour.update(t, scene);
      t += 1;
    }
    expect(tour.active).toBe(false);

    // Replaying must restart cleanly from the galaxy.
    tour.start();
    expect(tour.active).toBe(true);
    expect(nav.at(-1)).toBe(0);
    expect(root.querySelector('.tour-step')?.textContent).toBe(`1 / ${CHAIN3D.length}`);
  });

  it('cancel stops the tour and hides the caption', () => {
    const root = mount();
    const tour = new Tour(root, { navigateTo: () => {}, reduced: false });
    tour.start();
    expect(root.querySelector('.tour-caption')?.classList.contains('on')).toBe(true);
    tour.cancel();
    expect(tour.active).toBe(false);
    expect(root.querySelector('.tour-caption')?.classList.contains('on')).toBe(false);
  });

  it('pauses without consuming dwell time and resumes from the same step', () => {
    const root = mount();
    const nav: number[] = [];
    const tour = new Tour(root, { navigateTo: (i) => nav.push(i), reduced: false });
    tour.start();
    tour.update(100, 0);
    tour.pause();

    tour.update(120, 0);
    expect(tour.paused).toBe(true);
    expect(nav).toEqual([0]);
    expect(root.querySelector('.tour-pause')?.getAttribute('aria-pressed')).toBe('true');

    tour.resume();
    tour.update(121, 0);
    expect(nav).toEqual([0]);
    tour.update(124, 0);
    expect(nav).toEqual([0, 1]);
  });

  it('exposes keyboard-accessible pause and quick-portfolio controls', () => {
    const root = mount();
    new Tour(root, { navigateTo: () => {}, reduced: false });
    expect(root.querySelector('.tour-caption')?.getAttribute('aria-hidden')).toBeNull();
    expect(root.querySelector('.tour-pause')?.getAttribute('aria-label')).toBe(
      'Pause guided journey',
    );
    expect(root.querySelector<HTMLAnchorElement>('.tour-portfolio')?.href).toContain('/about.html');
  });
});
