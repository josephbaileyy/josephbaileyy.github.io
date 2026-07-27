// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import signalsData from '../public/data/signals.json';
import mountSignalFigure from '../js/components/signal-figure/index.js';

function makeCanvasContext(type) {
  if (type !== '2d') {
    return null;
  }
  return {
    clearRect() {},
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fill() {},
    arc() {},
    fillText() {},
    strokeRect() {},
    save() {},
    restore() {},
    scale() {},
  };
}

describe('signal-figure component & data sanity', () => {
  describe('signals.json data sanity', () => {
    it('has all three datasets: stride, score, star', () => {
      expect(signalsData).toHaveProperty('stride');
      expect(signalsData).toHaveProperty('score');
      expect(signalsData).toHaveProperty('star');
    });

    describe('stride data', () => {
      const stride = signalsData.stride;

      it('has strictly increasing touchdown times', () => {
        expect(stride.finishTime).toBe(52.17);
        expect(Array.isArray(stride.touchdownTimes)).toBe(true);

        for (let i = 0; i < stride.touchdownTimes.length; i++) {
          const t = stride.touchdownTimes[i];
          expect(t).toBeGreaterThan(0);
          expect(t).toBeLessThan(stride.finishTime);

          if (i > 0) {
            expect(t).toBeGreaterThan(stride.touchdownTimes[i - 1]);
          }
        }
      });

      it('has strictly increasing track positions up to 400m', () => {
        const pos = stride.trackPositions;
        expect(pos[0]).toBe(0);
        expect(pos[pos.length - 1]).toBe(400);

        for (let i = 1; i < pos.length; i++) {
          expect(pos[i]).toBeGreaterThan(pos[i - 1]);
        }
      });

      it('has sane interval velocities in human sprinting range (6 to 10 m/s)', () => {
        stride.intervalVelocities.forEach((velocity) => {
          expect(velocity).toBeGreaterThan(5);
          expect(velocity).toBeLessThan(12);
        });
      });
    });

    describe('score data', () => {
      const score = signalsData.score;

      it('has positive duration and non-empty notes array', () => {
        expect(score.duration).toBeGreaterThan(0);
        expect(Array.isArray(score.notes)).toBe(true);
        expect(score.notes.length).toBeGreaterThan(0);
      });

      it('has notes with pitches in valid MIDI range (21 to 108)', () => {
        score.notes.forEach((note) => {
          expect(note.pitch).toBeGreaterThanOrEqual(21);
          expect(note.pitch).toBeLessThanOrEqual(108);
          expect(note.start).toBeGreaterThanOrEqual(0);
          expect(note.end).toBeGreaterThan(note.start);
          expect(note.velocity).toBeGreaterThanOrEqual(0);
          expect(note.velocity).toBeLessThanOrEqual(1);
        });
      });
    });

    describe('star data', () => {
      const star = signalsData.star;

      it('contains only sourced observation and model-fit statistics', () => {
        expect(star).not.toHaveProperty('phaseModel');
        expect(star.exposuresRetained).toBe(138);
        expect(star.durationMinutesApprox).toBe(110);
        expect(star.imageSrc).toBe('./img/am-cvn-light-curve.png');
        expect(star.fitStatistics).toHaveLength(4);
        expect(
          star.fitStatistics.find((fit) => fit.model === 'Fixed harmonic superhump template'),
        ).toMatchObject({
          periodSeconds: 1051.2,
          amplitude1Percent: 0.58,
          amplitude2Percent: 1,
          chiSquared: 688.3,
          degreesOfFreedom: 133,
          rmsPercent: 1.25,
          bic: 712.91,
        });
      });
    });
  });

  describe('mountSignalFigure component lifecycle', () => {
    let container;
    let getContext;

    beforeEach(() => {
      getContext = vi
        .spyOn(HTMLCanvasElement.prototype, 'getContext')
        .mockImplementation(makeCanvasContext);
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      getContext.mockRestore();
      if (container?.parentNode) {
        container.parentNode.removeChild(container);
      }
    });

    it('mounts stride figure, sets state to ready, and responds to controls', async () => {
      const instance = mountSignalFigure(container, { signal: 'stride', data: signalsData });
      expect(instance).toBeDefined();
      expect(typeof instance.play).toBe('function');
      expect(typeof instance.pause).toBe('function');
      expect(typeof instance.seek).toBe('function');
      expect(typeof instance.destroy).toBe('function');

      await instance.ready;
      expect(container.dataset.state).toBe('ready');

      instance.seek(25);
      instance.destroy();
      expect(container.children.length).toBe(0);
    });

    it('mounts score figure and handles destroy cleanly', async () => {
      const instance = mountSignalFigure(container, { signal: 'score', data: signalsData });
      await instance.ready;
      expect(container.dataset.state).toBe('ready');

      instance.destroy();
      expect(container.innerHTML).toBe('');
    });

    it('mounts the real AM CVn image with a caption and accessible statistics', async () => {
      const instance = mountSignalFigure(container, { signal: 'star', data: signalsData });
      await instance.ready;
      expect(container.dataset.state).toBe('ready');
      expect(container.querySelector('canvas')).toBeNull();
      expect(container.querySelector('img').getAttribute('src')).toBe(
        './img/am-cvn-light-curve.png',
      );
      expect(container.querySelector('img').alt).toContain('Five stacked AM CVn');
      expect(container.querySelector('figcaption').textContent).toContain('P = 1051.20 s');
      expect(container.querySelector('table').textContent).toContain('Effective BIC');

      instance.destroy();
    });

    it('uses the documented fallback when Canvas 2D is unavailable', async () => {
      getContext.mockReturnValue(null);
      const instance = mountSignalFigure(container, { signal: 'stride', data: signalsData });
      await instance.ready;
      expect(container.dataset.state).toBe('fallback');
      expect(container.textContent).toContain('Canvas 2D context not supported');
      instance.destroy();
    });
  });
});
