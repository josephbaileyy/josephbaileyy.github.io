// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import eventData from '../public/data/event.json';
import mountEventLens from '../js/components/event-lens/index.js';
import {
  parseEventId,
  pointOnHelix,
  projectTrack,
  summarizeEvent,
} from '../js/components/event-lens/event-geometry.js';

class ResizeObserverStub {
  observe() {}
  disconnect() {}
}

class IntersectionObserverStub {
  observe() {}
  disconnect() {}
}

function makeMediaQuery(matches = false) {
  return {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener() {},
    removeEventListener() {},
  };
}

describe('Event Lens data and geometry', () => {
  it('keeps two complete source events and the CMS CC0 provenance', () => {
    const sourcePath = join(process.cwd(), 'worldline/data/events.json');
    const sourceData = JSON.parse(readFileSync(sourcePath, 'utf8'));

    expect(eventData.source).toBe('https://opendata.cern.ch/record/303');
    expect(eventData.license).toBe('CC0');
    expect(eventData.events).toHaveLength(2);
    for (const event of eventData.events) {
      expect(event).toEqual(sourceData.events.find(({ id }) => id === event.id));
    }
  });

  it('bends opposite charges in opposite directions and lessens curvature at high pt', () => {
    const positive = projectTrack({ pt: 1, eta: 0, phi: 0, q: 1 }, { samples: 8 });
    const negative = projectTrack({ pt: 1, eta: 0, phi: 0, q: -1 }, { samples: 8 });
    const highPt = projectTrack({ pt: 12, eta: 0, phi: 0, q: 1 }, { samples: 8 });

    expect(positive[3].y).toBeGreaterThan(0);
    expect(negative[3].y).toBeLessThan(0);
    expect(Math.abs(highPt[3].y)).toBeLessThan(Math.abs(positive[3].y));
  });

  it('uses eta for longitudinal travel and reports event metadata', () => {
    const forward = projectTrack({ pt: 4, eta: 1.2, phi: 0.4, q: 1 });
    const backward = projectTrack({ pt: 4, eta: -1.2, phi: 0.4, q: 1 });
    expect(forward.at(-1).z).toBeGreaterThan(0);
    expect(backward.at(-1).z).toBeLessThan(0);

    expect(parseEventId(eventData.events[0].id)).toEqual({
      run: '146511',
      event: '44401481',
    });
    expect(summarizeEvent(eventData.events[0])).toMatchObject({
      tracks: 237,
      muons: 2,
      cells: 40,
    });
    expect(pointOnHelix(0, 0, 2, 0)).toEqual({ x: 2, y: 0, z: 0 });
  });
});

describe('mountEventLens fallback interface', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    history.replaceState({}, '', '/');
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => makeMediaQuery(false)),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => eventData,
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    history.replaceState({}, '', '/');
  });

  it('applies query state, dispatches readiness, and exposes accessible controls', async () => {
    history.replaceState({}, '', '/?fallback=1&mode=muons&lensx=.2&lensy=.7&event=1');
    const el = document.createElement('div');
    el.dataset.eventSrc = '/event.json';
    document.body.append(el);
    let readyEvents = 0;
    el.addEventListener('event-lens:ready', () => {
      readyEvents += 1;
    });

    const lens = mountEventLens(el);
    expect(el.dataset.state).toBe('loading');
    await lens.ready;

    expect(el.dataset.state).toBe('fallback');
    expect(lens.usingFallback).toBe(true);
    expect(readyEvents).toBe(1);
    expect(el.querySelectorAll('input[type="radio"]')).toHaveLength(4);
    expect(el.querySelector('input[value="muons"]').checked).toBe(true);
    expect(el.querySelector('[role="slider"]').getAttribute('aria-valuetext')).toBe(
      '20% from left, 70% from top',
    );
    expect(el.textContent).toContain('RUN 146511 · EVENT 45663605');
    expect(el.querySelector('svg').dataset.mode).toBe('muons');
    expect(el.querySelector('a').href).toBe('https://opendata.cern.ch/record/303');

    lens.destroy();
    expect(el.childElementCount).toBe(0);
  });

  it('keeps layer controls and keyboard lens movement operational in static mode', async () => {
    history.replaceState({}, '', '/?fallback=1');
    const el = document.createElement('div');
    document.body.append(el);
    const lens = mountEventLens(el, { src: '/event.json' });
    await lens.ready;

    lens.setMode('energy');
    expect(el.querySelector('input[value="energy"]').checked).toBe(true);
    expect(el.querySelector('svg').dataset.mode).toBe('energy');
    expect(el.querySelector('[aria-live]').textContent).toContain('Calorimeter energy');

    const handle = el.querySelector('[role="slider"]');
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(handle.getAttribute('aria-valuetext')).toBe('71% from left, 25% from top');
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(handle.getAttribute('aria-valuetext')).toBe('50% from left, 50% from top');
  });

  it('shows a labelled detector schematic when data loading fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
      })),
    );
    const el = document.createElement('div');
    document.body.append(el);
    const lens = mountEventLens(el, { src: '/missing.json' });
    await lens.ready;

    expect(el.dataset.state).toBe('fallback');
    expect(el.querySelector('svg[role="img"]')).not.toBeNull();
    expect(el.textContent).toContain('EVENT DATA UNAVAILABLE');
    expect(el.querySelector('title').textContent).toBe('Static CMS collision event display');
  });
});
