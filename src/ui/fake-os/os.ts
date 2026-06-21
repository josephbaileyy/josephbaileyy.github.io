import { PANELS } from '../../content/panels';
import { APP_PROJECTS, itemLinks, isPdfHref, type PortfolioItem } from '../../content/portfolio';
import { buildTerminal } from './terminal';
import { WindowManager } from './wm';

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
function projectBody(project: PortfolioItem, openPdf: (href: string, title: string) => void): HTMLElement {
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
  const actions = document.createElement('div');
  actions.className = 'os-project-actions';
  for (const link of itemLinks(project)) {
    if (isPdfHref(link.href)) {
      const btn = document.createElement('button');
      btn.className = 'os-project-link';
      btn.textContent = link.label;
      btn.addEventListener('click', () => openPdf(link.href, `${project.app?.short ?? project.title} — ${link.label}`));
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

/** The little desktop that lives on the monitor at depth 5. */
export function buildFakeOs(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'fake-os';

  const menubar = document.createElement('div');
  menubar.className = 'os-menubar';
  const clock = document.createElement('span');
  const tickClock = () => {
    clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  tickClock();
  setInterval(tickClock, 10000);
  menubar.innerHTML = `<span>⬡ <strong>BaileyOS</strong> · dock & desktop icons open apps · windows save automatically</span>`;
  menubar.appendChild(clock);
  root.appendChild(menubar);

  const desktop = document.createElement('div');
  desktop.className = 'os-desktop';
  root.appendChild(desktop);
  const wm = new WindowManager(desktop);

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
    wm.open({ id: 'terminal', title: 'terminal — zsh', body: buildTerminal(), x: 8, y: 12, w: 460, h: 320 });
  const openResearch = () =>
    wm.open({ id: 'research', title: 'research.md — physics', body: panelBody('research'), x: 30, y: 8, w: 410, h: 350 });
  const openProfile = () =>
    wm.open({ id: 'profile', title: 'about.md — joseph', body: panelBody('profile'), x: 16, y: 8, w: 440, h: 350 });
  const launchJourney = () => window.dispatchEvent(new CustomEvent('universe:tour'));

  // ---- desktop icons (the CS projects live here, double duty with the dock) ----
  const icons = document.createElement('div');
  icons.className = 'os-desktop-icons';
  for (const project of APP_PROJECTS) {
    const icon = document.createElement('button');
    icon.className = 'os-desktop-icon';
    icon.innerHTML = `<span class="os-desktop-icon-glyph">${project.app!.icon}</span><span class="os-desktop-icon-label">${project.app!.short}</span>`;
    icon.setAttribute('aria-label', `Open ${project.title}`);
    icon.addEventListener('click', () => openProject(project));
    icons.appendChild(icon);
  }
  desktop.appendChild(icons);

  // ---- dock ----
  const dock = document.createElement('div');
  dock.className = 'os-dock';
  const projectDockItems: Array<[string, string, () => void]> = APP_PROJECTS.map((project) => [
    project.app!.icon,
    project.app!.short,
    () => openProject(project),
  ]);
  const items: Array<[string, string, (() => void) | string]> = [
    ['🖥', 'terminal', openTerminal],
    ...projectDockItems,
    ['🔬', 'research', openResearch],
    ['📄', 'cv.pdf', () => openPdf('/resume.pdf', 'cv.pdf')],
    ['🧑‍🚀', 'about', openProfile],
    ['🌌', 'journey', launchJourney],
    ['💻', 'github', 'https://github.com/josephbaileyy'],
    ['🔗', 'linkedin', 'https://linkedin.com/in/baileyjosephr'],
    ['✉️', 'email', 'mailto:jrbailey555@gmail.com'],
  ];
  for (const [icon, label, action] of items) {
    const el = typeof action === 'string' ? document.createElement('a') : document.createElement('button');
    el.className = 'os-dock-item';
    el.innerHTML = `<span class="os-dock-icon">${icon}</span><span class="os-dock-label">${label}</span>`;
    if (typeof action === 'string') {
      const a = el as HTMLAnchorElement;
      a.href = action;
      if (action.startsWith('http') || action.endsWith('.pdf')) {
        a.target = '_blank';
        a.rel = 'noopener';
      }
    } else {
      el.addEventListener('click', action);
    }
    dock.appendChild(el);
  }
  root.appendChild(dock);

  // a welcoming window on first dock
  setTimeout(openTerminal, 450);

  return root;
}
