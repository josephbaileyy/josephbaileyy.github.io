export interface PanelContent {
  kicker: string;
  title: string;
  html: string;
}

export const PANELS: Record<string, PanelContent> = {
  'am-cvn': {
    kicker: 'research · ultracompact binaries',
    title: 'AM CVn binaries',
    html: `
      <p>
        AM Canum Venaticorum stars are <strong>ultracompact binaries</strong>: a white dwarf
        accreting helium-rich material from a degenerate companion, locked in orbits of just
        <strong>5&ndash;65 minutes</strong>. The whole binary would fit inside the Earth&ndash;Moon
        distance many times over.
      </p>
      <p>
        Because they are so tight, they are among the strongest known sources of
        <strong>millihertz gravitational waves</strong> &mdash; several are "verification
        binaries" that the LISA space mission is guaranteed to detect. The accretion stream,
        the disk, and the slow gravitational-wave-driven evolution make them beautiful
        laboratories for extreme physics.
      </p>
      <span class="todo">TODO(joseph): describe your actual project here &mdash; what question
      you're working on, with whom, methods, and any results or links.</span>
    `,
  },
  projects: {
    kicker: 'projects',
    title: 'Things I’ve built & studied',
    html: `
      <ul>
        <li><strong>AM CVn research</strong> &mdash; see the binary system out in the galaxy view.</li>
        <li><strong>This website</strong> &mdash; a Powers-of-Ten zoom from the Milky Way to my desk.
            TypeScript + SVG, no frameworks, zero runtime dependencies.</li>
        <li><strong>Project placeholder</strong> &mdash; a future project goes here.</li>
      </ul>
      <span class="todo">TODO(joseph): replace with your real project list.</span>
    `,
  },
};
