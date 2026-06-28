import { describe, expect, it } from 'vitest';
import { PANELS, PORTFOLIO } from '../src/content/portfolio';

describe('portfolio content', () => {
  it('keeps every major section available inside the interactive site', () => {
    expect(Object.keys(PANELS)).toEqual(
      expect.arrayContaining([
        'profile',
        'research',
        'experience',
        'projects',
        'socials',
        'am-cvn',
      ]),
    );
    expect(PORTFOLIO.research.length).toBeGreaterThanOrEqual(5);
    expect(PORTFOLIO.experience).toHaveLength(2);
    expect(PORTFOLIO.experience.map((item) => item.title).join(' ')).toContain('WisdomTree');
    expect(PORTFOLIO.experience.map((item) => item.title).join(' ')).toContain('Polytec');
    expect(PORTFOLIO.projects.length).toBeGreaterThanOrEqual(6);
    expect(PORTFOLIO.education.length).toBeGreaterThan(0);
    expect(PORTFOLIO.honors.length).toBeGreaterThan(0);
  });

  it('keeps approved social handles structured and room-mapped', () => {
    expect(PORTFOLIO.socials.map((social) => social.id)).toEqual(
      expect.arrayContaining([
        'instagram',
        'letterboxd',
        'goodreads',
        'beli',
        'steam',
        'fortnite',
        'league',
        'clash-royale',
        'clash-clans',
      ]),
    );
    const ids = new Set(PORTFOLIO.socials.map((social) => social.id));
    expect(ids.size).toBe(PORTFOLIO.socials.length);
    for (const social of PORTFOLIO.socials) {
      expect(social.handle).toBeTruthy();
      expect(social.roomObject).toBeTruthy();
      for (const link of social.links ?? []) expect(link.href).toMatch(/^https:\/\//);
      if (!social.links?.length) expect(social.copyText).toBeTruthy();
    }
    expect(PANELS.socials.html).toContain('@josphbailey');
    expect(PANELS.socials.html).toContain('NoSkillzJustHaxx');
    expect(PANELS.socials.html).toContain('official Fortnite Omega');
    expect(PORTFOLIO.socials.find((social) => social.id === 'league')?.description).toContain(
      "Riot's official Katarina",
    );
  });

  it('includes valid primary profile links', () => {
    const hrefs = PORTFOLIO.links.map((link) => link.href);
    expect(hrefs).toEqual(
      expect.arrayContaining(['/resume.pdf', 'https://github.com/josephbaileyy']),
    );
    expect(
      hrefs.every(
        (href) => href.startsWith('/') || href.startsWith('http') || href.startsWith('mailto:'),
      ),
    ).toBe(true);
  });

  it('defines a powers-of-ten scene map with routed evidence signals', () => {
    expect(PORTFOLIO.scenes.map((scene) => scene.id)).toEqual([
      'galaxy',
      'solar',
      'earth',
      'stanford',
      'room',
      'screen',
    ]);
    for (const scene of PORTFOLIO.scenes) {
      expect(scene.scale).toMatch(/10/);
      expect(scene.comparison).toBeTruthy();
      expect(scene.meaning).toBeTruthy();
      expect(scene.route).toBeTruthy();
      expect(PORTFOLIO.sceneSignals.some((signal) => signal.scene === scene.id)).toBe(true);
    }
    const signalIds = new Set(PORTFOLIO.sceneSignals.map((signal) => signal.id));
    expect(signalIds.size).toBe(PORTFOLIO.sceneSignals.length);
    expect([...signalIds]).toEqual(
      expect.arrayContaining([
        'galaxy-am-cvn',
        'solar-ephemeris',
        'earth-stanford-slac',
        'stanford-track',
        'room-music-sheet',
        'room-socials-board',
        'room-fortnite-poster',
        'room-league-poster',
        'room-clash-poster',
        'screen-start-here',
      ]),
    );
    for (const signal of PORTFOLIO.sceneSignals) {
      expect(signal.title).toBeTruthy();
      expect(signal.body).toBeTruthy();
      if (signal.destination?.type === 'panel') expect(signal.destination.panelId).toBeTruthy();
      if (signal.destination?.type === 'scene')
        expect(signal.destination.index).toBeTypeOf('number');
      if (signal.destination?.type === 'app') expect(signal.destination.appId).toBeTruthy();
      if (signal.destination?.type === 'url') expect(signal.destination.href).toMatch(/^https?:/);
    }
    expect(PANELS.scale.html).toContain('The Milky Way');
    expect(PANELS['am-cvn'].html).toContain('/img/am-cvn-light-curve.png');
  });

  it('keeps featured project evidence complete across shared renderers', () => {
    const featured = PORTFOLIO.projects.filter((project) => project.featured);
    expect(featured.map((project) => project.title)).toEqual(
      expect.arrayContaining([
        'This website',
        'MINERvA-OmniFold',
        'SPLoRA — parameter-efficient GPT-2',
        'Soccer action prediction with graph neural networks',
      ]),
    );
    for (const project of featured) {
      expect(project.challenge).toBeTruthy();
      expect(project.contribution).toBeTruthy();
      expect(project.outcome).toBeTruthy();
      expect(project.tools?.length).toBeGreaterThan(0);
    }
    expect(PANELS.projects.html).toContain('project-evidence');
    expect(PANELS.projects.html).toContain('Signal');
  });
});
