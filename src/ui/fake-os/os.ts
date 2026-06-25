import { PANELS } from '../../content/panels';
import { APP_PROJECTS, itemLinks, isPdfHref, type PortfolioItem } from '../../content/portfolio';
import { buildTerminal } from './terminal';
import { WindowManager } from './wm';

interface PerformanceVideo {
  id: string;
  title: string;
  year: string;
  note: string;
  achievement?: string;
}

const PERFORMANCE_VIDEOS: PerformanceVideo[] = [
  {
    id: 'I0edzg5Sk58',
    title: 'Ripple Effect',
    year: '2019 · WBA Finals',
    note: 'Marching band · saxophone soloist',
    achievement: 'WBA Grand Champion',
  },
  {
    id: 'Bs_qo1PKeF0',
    title: 'Heart of the Home',
    year: '2021 · WBA Finals',
    note: 'Marching band · saxophone soloist',
    achievement: 'WBA Grand Champion',
  },
  {
    id: 'ElUdzfNCs7U',
    title: 'All the World’s a Stage',
    year: '2022 · WBA Finals',
    note: 'Marching band · saxophone soloist',
    achievement: 'WBA Grand Champion',
  },
  {
    id: 'ry0rKeoQI0o',
    title: 'In This Room',
    year: '2023 · WGI Finals',
    note: 'Indoor drumline · saxophone soloist',
    achievement: 'WGI World Silver',
  },
];

function panelBody(panelId: string): HTMLElement {
  const div = document.createElement('div');
  div.className = 'os-doc panel-body';
  const content = PANELS[panelId];
  div.innerHTML = content ? content.html : 'file not found';
  return div;
}

/** A PDF rendered inside BaileyOS, with escape hatches to a tab or download. */
function pdfBody(href: string, title: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'os-pdf';
  const bar = document.createElement('div');
  bar.className = 'os-pdf-bar';
  const openTab = document.createElement('a');
  openTab.className = 'os-pdf-action';
  openTab.href = href;
  openTab.target = '_blank';
  openTab.rel = 'noopener';
  openTab.textContent = 'open in new tab ↗';
  const download = document.createElement('a');
  download.className = 'os-pdf-action';
  download.href = href;
  download.setAttribute('download', '');
  download.textContent = 'download ⤓';
  bar.append(openTab, download);
  const frame = document.createElement('iframe');
  frame.className = 'os-pdf-frame';
  frame.src = href;
  frame.title = title;
  wrap.append(bar, frame);
  return wrap;
}

/** A project "app": its description plus buttons for each link. */
function projectBody(
  project: PortfolioItem,
  openPdf: (href: string, title: string) => void,
): HTMLElement {
  const div = document.createElement('div');
  div.className = 'os-doc os-project';
  const desc = document.createElement('p');
  desc.textContent = project.description;
  div.appendChild(desc);
  if (project.meta) {
    const meta = document.createElement('span');
    meta.className = 'os-project-meta';
    meta.textContent = project.meta;
    div.appendChild(meta);
  }
  if (project.featured && project.challenge && project.contribution && project.outcome) {
    const evidence = document.createElement('dl');
    evidence.className = 'os-project-evidence';
    for (const [label, value] of [
      ['Signal', project.challenge],
      ['Work', project.contribution],
      ['Evidence', project.outcome],
    ]) {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      term.textContent = label;
      const detail = document.createElement('dd');
      detail.textContent = value;
      row.append(term, detail);
      evidence.appendChild(row);
    }
    div.appendChild(evidence);
    if (project.tools?.length) {
      const tools = document.createElement('span');
      tools.className = 'os-project-tools';
      tools.textContent = project.tools.join(' · ');
      div.appendChild(tools);
    }
  }
  const actions = document.createElement('div');
  actions.className = 'os-project-actions';
  for (const link of itemLinks(project)) {
    if (isPdfHref(link.href)) {
      const btn = document.createElement('button');
      btn.className = 'os-project-link';
      btn.textContent = link.label;
      btn.addEventListener('click', () =>
        openPdf(link.href, `${project.app?.short ?? project.title} — ${link.label}`),
      );
      actions.appendChild(btn);
    } else {
      const a = document.createElement('a');
      a.className = 'os-project-link';
      a.href = link.href;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = `${link.label} ↗`;
      actions.appendChild(a);
    }
  }
  div.appendChild(actions);
  return div;
}

function videosBody(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'os-videos';

  const intro = document.createElement('div');
  intro.className = 'os-videos-intro';
  intro.innerHTML = '<strong>Performance reel</strong><span>Marching arts · Chino Hills HS</span>';
  wrap.appendChild(intro);

  const grid = document.createElement('div');
  grid.className = 'os-video-grid';
  for (const video of PERFORMANCE_VIDEOS) {
    const link = document.createElement('a');
    link.className = 'os-video-card';
    link.href = `https://youtu.be/${video.id}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('aria-label', `Watch ${video.title} on YouTube`);

    const thumb = document.createElement('span');
    thumb.className = 'os-video-thumb';
    const image = document.createElement('img');
    image.src = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
    image.alt = '';
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    const play = document.createElement('span');
    play.className = 'os-video-play';
    play.setAttribute('aria-hidden', 'true');
    thumb.append(image, play);

    const copy = document.createElement('span');
    copy.className = 'os-video-copy';
    const title = document.createElement('strong');
    title.textContent = video.title;
    const year = document.createElement('span');
    year.className = 'os-video-year';
    year.textContent = video.year;
    const note = document.createElement('span');
    note.className = 'os-video-note';
    note.textContent = video.note;
    copy.append(title, year, note);
    if (video.achievement) {
      const achievement = document.createElement('span');
      achievement.className = 'os-video-achievement';
      achievement.textContent = `✦ ${video.achievement}`;
      copy.appendChild(achievement);
    }

    link.append(thumb, copy);
    grid.appendChild(link);
  }
  wrap.appendChild(grid);
  return wrap;
}

function playIcon(className: string): HTMLElement {
  const icon = document.createElement('span');
  icon.className = `${className} os-play-app-icon`;
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

function projectIcon(iconValue: string): HTMLElement {
  const icon = document.createElement('span');
  icon.className = 'os-desktop-icon-glyph';
  if (iconValue.startsWith('/')) {
    const image = document.createElement('img');
    image.className = 'os-app-icon-image';
    image.src = iconValue;
    image.alt = '';
    icon.appendChild(image);
  } else {
    icon.textContent = iconValue;
  }
  return icon;
}

function mobileIcon(iconValue: string | HTMLElement, className = ''): HTMLElement {
  const wrap = document.createElement('span');
  wrap.className = `os-mobile-app-icon ${className}`.trim();
  if (typeof iconValue === 'string') {
    if (iconValue.startsWith('/')) {
      const image = document.createElement('img');
      image.src = iconValue;
      image.alt = '';
      wrap.appendChild(image);
    } else {
      wrap.textContent = iconValue;
    }
  } else {
    wrap.appendChild(iconValue.cloneNode(true));
  }
  return wrap;
}

/** The little desktop that lives on the monitor at depth 5. */
export function buildFakeOs(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'fake-os';

  const menubar = document.createElement('div');
  menubar.className = 'os-menubar';
  const identity = document.createElement('span');
  identity.innerHTML =
    '⬡ <strong>BaileyOS</strong> · mission desktop · windows remember their layout';
  const actions = document.createElement('div');
  actions.className = 'os-menubar-actions';
  const arrange = document.createElement('button');
  arrange.type = 'button';
  arrange.className = 'os-arrange';
  arrange.textContent = 'arrange windows';
  arrange.setAttribute('aria-label', 'Arrange BaileyOS windows');
  const clock = document.createElement('span');
  clock.className = 'os-clock';
  const status = document.createElement('span');
  status.className = 'os-mobile-status';
  status.setAttribute('aria-hidden', 'true');
  status.innerHTML = '<i></i><i></i><i></i><b></b><em></em>';
  const tickClock = () => {
    clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  tickClock();
  setInterval(tickClock, 10000);
  actions.append(arrange, clock, status);
  menubar.append(identity, actions);
  root.appendChild(menubar);

  const desktop = document.createElement('div');
  desktop.className = 'os-desktop';
  root.appendChild(desktop);
  const wm = new WindowManager(desktop);
  arrange.addEventListener('click', () => wm.arrange());

  const openPdf = (href: string, title: string) =>
    wm.open({ id: `pdf:${href}`, title, body: pdfBody(href, title), x: 12, y: 6, w: 560, h: 460 });
  const openProject = (project: PortfolioItem) =>
    wm.open({
      id: `project:${project.app?.short ?? project.title}`,
      title: `${project.app?.short ?? project.title} — project`,
      body: projectBody(project, openPdf),
      x: 20,
      y: 12,
      w: 430,
      h: 320,
    });
  const openTerminal = () =>
    wm.open({
      id: 'terminal',
      title: 'terminal — zsh',
      body: buildTerminal(),
      x: 8,
      y: 12,
      w: 460,
      h: 320,
    });
  const openResearch = () =>
    wm.open({
      id: 'research',
      title: 'research.md — physics',
      body: panelBody('research'),
      x: 30,
      y: 8,
      w: 410,
      h: 350,
    });
  const openExperience = () =>
    wm.open({
      id: 'experience',
      title: 'experience.md — product & engineering',
      body: panelBody('experience'),
      x: 34,
      y: 10,
      w: 430,
      h: 330,
    });
  const openProfile = () =>
    wm.open({
      id: 'profile',
      title: 'about.md — joseph',
      body: panelBody('profile'),
      x: 16,
      y: 8,
      w: 440,
      h: 350,
    });
  const openVideos = () =>
    wm.open({
      id: 'videos',
      title: 'videos — performance reel',
      body: videosBody(),
      x: 22,
      y: 7,
      w: 620,
      h: 450,
    });
  const launchJourney = () => window.dispatchEvent(new CustomEvent('universe:tour'));
  const appActions = new Map<string, () => void>([
    ['terminal', openTerminal],
    ['research', openResearch],
    ['experience', openExperience],
    ['cv', () => openPdf('/resume.pdf', 'cv.pdf')],
    ['profile', openProfile],
    ['videos', openVideos],
  ]);
  for (const project of APP_PROJECTS) {
    appActions.set(`project:${project.app!.short}`, () => openProject(project));
  }
  const openApp = (event: Event) => {
    const id = (event as CustomEvent<string>).detail;
    appActions.get(id)?.();
  };
  window.addEventListener('universe:open-app', openApp);

  const createMobileLauncher = (
    appId: string,
    icon: string | HTMLElement,
    label: string,
    action: (() => void) | string,
    docked = false,
  ): HTMLElement => {
    const el =
      typeof action === 'string' ? document.createElement('a') : document.createElement('button');
    el.className = docked ? 'os-mobile-dock-item' : 'os-mobile-app';
    el.dataset.appId = appId;
    el.setAttribute('aria-label', `${typeof action === 'string' ? 'Open' : 'Launch'} ${label}`);
    el.appendChild(mobileIcon(icon, `os-mobile-icon-${appId.replace(/[^a-z0-9-]/gi, '-')}`));
    if (!docked) {
      const text = document.createElement('span');
      text.textContent = label;
      el.appendChild(text);
    }
    if (typeof action === 'string') {
      const link = el as HTMLAnchorElement;
      link.href = action;
      if (action.startsWith('http') || action.endsWith('.pdf')) {
        link.target = '_blank';
        link.rel = 'noopener';
      }
    } else {
      el.addEventListener('click', () => {
        el.blur();
        requestAnimationFrame(() => {
          action();
          requestAnimationFrame(() => {
            const active = document.activeElement;
            if (
              window.matchMedia('(max-width: 760px)').matches &&
              active instanceof HTMLInputElement &&
              active.closest('.os-terminal')
            ) {
              active.blur();
            }
          });
        });
      });
    }
    return el;
  };

  // ---- desktop icons (projects deliberately live here, not in the dock) ----
  const icons = document.createElement('div');
  icons.className = 'os-desktop-icons';
  for (const project of APP_PROJECTS) {
    const icon = document.createElement('button');
    icon.className = 'os-desktop-icon';
    const label = document.createElement('span');
    label.className = 'os-desktop-icon-label';
    label.textContent = project.app!.short;
    icon.append(projectIcon(project.app!.icon), label);
    icon.setAttribute('aria-label', `Open ${project.title}`);
    icon.addEventListener('click', () => openProject(project));
    icons.appendChild(icon);
  }
  desktop.appendChild(icons);

  // Mobile turns BaileyOS into a focused launcher rather than shrinking the desktop metaphor.
  const mobileHome = document.createElement('div');
  mobileHome.className = 'os-mobile-home';
  mobileHome.setAttribute('role', 'navigation');
  mobileHome.setAttribute('aria-label', 'BaileyOS apps');
  const mobileProjectIcons: Array<[string, string | HTMLElement, string, () => void]> =
    APP_PROJECTS.map((project) => [
      `project:${project.app!.short}`,
      project.app!.icon,
      project.app!.short,
      () => openProject(project),
    ]);
  const mobileCoreIcons: Array<[string, string | HTMLElement, string, (() => void) | string]> = [
    ['terminal', '⌘', 'Terminal', openTerminal],
    ['research', '🔬', 'Research', openResearch],
    ['experience', '🛰️', 'Experience', openExperience],
    ['cv', '📄', 'CV', () => openPdf('/resume.pdf', 'cv.pdf')],
    ['profile', '🧑‍🚀', 'About', openProfile],
    ['videos', playIcon(''), 'Videos', openVideos],
    ['journey', '🌌', 'Journey', launchJourney],
    ['github', '⌨', 'GitHub', 'https://github.com/josephbaileyy'],
    ['linkedin', 'in', 'LinkedIn', 'https://linkedin.com/in/baileyjosephr'],
    ['email', '✉', 'Mail', 'mailto:jrbailey555@gmail.com'],
  ];
  for (const [appId, icon, label, action] of [...mobileCoreIcons, ...mobileProjectIcons]) {
    mobileHome.appendChild(createMobileLauncher(appId, icon, label, action));
  }
  desktop.appendChild(mobileHome);

  const mobileDock = document.createElement('div');
  mobileDock.className = 'os-mobile-dock';
  mobileDock.setAttribute('role', 'navigation');
  mobileDock.setAttribute('aria-label', 'Favorite BaileyOS apps');
  for (const [appId, icon, label, action] of mobileCoreIcons.slice(0, 4)) {
    mobileDock.appendChild(createMobileLauncher(appId, icon, label, action, true));
  }
  root.appendChild(mobileDock);

  const homeIndicator = document.createElement('span');
  homeIndicator.className = 'os-home-indicator';
  homeIndicator.setAttribute('aria-hidden', 'true');
  root.appendChild(homeIndicator);

  // ---- dock ----
  const dock = document.createElement('div');
  dock.className = 'os-dock';
  const items: Array<[string, string | HTMLElement, string, (() => void) | string]> = [
    ['terminal', '🖥', 'terminal', openTerminal],
    ['research', '🔬', 'research', openResearch],
    ['experience', '🛰️', 'experience', openExperience],
    ['cv', '📄', 'cv.pdf', () => openPdf('/resume.pdf', 'cv.pdf')],
    ['profile', '🧑‍🚀', 'about', openProfile],
    ['videos', playIcon('os-dock-icon'), 'videos', openVideos],
    ['journey', '🌌', 'journey', launchJourney],
    ['github', '💻', 'github', 'https://github.com/josephbaileyy'],
    ['linkedin', '🔗', 'linkedin', 'https://linkedin.com/in/baileyjosephr'],
    ['email', '✉️', 'email', 'mailto:jrbailey555@gmail.com'],
  ];
  const dockApps = new Map<string, HTMLElement>();
  for (const [appId, icon, label, action] of items) {
    const el =
      typeof action === 'string' ? document.createElement('a') : document.createElement('button');
    el.className = 'os-dock-item';
    el.dataset.appId = appId;
    const iconElement = typeof icon === 'string' ? document.createElement('span') : icon;
    if (typeof icon === 'string') {
      iconElement.className = 'os-dock-icon';
      iconElement.textContent = icon;
    }
    const labelElement = document.createElement('span');
    labelElement.className = 'os-dock-label';
    labelElement.textContent = label;
    el.append(iconElement, labelElement);
    if (typeof action === 'string') {
      const a = el as HTMLAnchorElement;
      a.href = action;
      if (action.startsWith('http') || action.endsWith('.pdf')) {
        a.target = '_blank';
        a.rel = 'noopener';
      }
    } else {
      el.addEventListener('click', action);
      if (appId === 'journey') {
        el.setAttribute('aria-label', 'Launch guided journey');
      } else {
        el.setAttribute('aria-pressed', 'false');
        dockApps.set(appId, el);
      }
    }
    dock.appendChild(el);
  }
  wm.subscribe((states) => {
    const byId = new Map(states.map((state) => [state.id, state]));
    for (const [appId, el] of dockApps) {
      const state = byId.get(appId === 'cv' ? 'pdf:/resume.pdf' : appId);
      el.classList.toggle('open', Boolean(state));
      el.classList.toggle('active', Boolean(state?.active));
      el.classList.toggle('minimized', Boolean(state?.minimized));
      el.setAttribute('aria-pressed', String(Boolean(state?.active)));
      const label = el.querySelector('.os-dock-label')?.textContent ?? appId;
      const status = state?.minimized
        ? 'minimized'
        : state?.active
          ? 'active'
          : state
            ? 'open'
            : 'closed';
      el.setAttribute('aria-label', `${label} — ${status}`);
    }
    root.classList.toggle(
      'app-open',
      states.some((state) => state.active),
    );
  });
  root.appendChild(dock);

  // Desktop welcomes with the terminal; mobile begins on the app launcher.
  if (!window.matchMedia('(max-width: 760px)').matches) setTimeout(openTerminal, 450);

  return root;
}
