import { describe, expect, it } from 'vitest';
import { PANELS, PORTFOLIO } from '../src/content/portfolio';

describe('portfolio content', () => {
  it('keeps every major section available inside the interactive site', () => {
    expect(Object.keys(PANELS)).toEqual(
      expect.arrayContaining(['profile', 'research', 'experience', 'projects', 'am-cvn']),
    );
    expect(PORTFOLIO.research.length).toBeGreaterThanOrEqual(5);
    expect(PORTFOLIO.experience).toHaveLength(2);
    expect(PORTFOLIO.experience.map((item) => item.title).join(' ')).toContain('WisdomTree');
    expect(PORTFOLIO.experience.map((item) => item.title).join(' ')).toContain('Polytec');
    expect(PORTFOLIO.projects.length).toBeGreaterThanOrEqual(6);
    expect(PORTFOLIO.education.length).toBeGreaterThan(0);
    expect(PORTFOLIO.honors.length).toBeGreaterThan(0);
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
