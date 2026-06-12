import { PANELS } from '../../content/panels';
import { buildTerminal } from './terminal';
import { WindowManager } from './wm';

function panelBody(panelId: string): HTMLElement {
  const div = document.createElement('div');
  div.className = 'os-doc panel-body';
  const content = PANELS[panelId];
  div.innerHTML = content ? content.html : 'file not found';
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
  menubar.innerHTML = `<span>⬡ <strong>BaileyOS</strong> · universe.app</span>`;
  menubar.appendChild(clock);
  root.appendChild(menubar);

  const desktop = document.createElement('div');
  desktop.className = 'os-desktop';
  root.appendChild(desktop);
  const wm = new WindowManager(desktop);

  const openTerminal = () =>
    wm.open({ id: 'terminal', title: 'terminal — zsh', body: buildTerminal(), x: 8, y: 12, w: 460 });
  const openAbout = () =>
    wm.open({ id: 'about', title: 'amcvn.md — my research', body: panelBody('am-cvn'), x: 30, y: 8, w: 400 });
  const openProjects = () =>
    wm.open({ id: 'projects', title: 'projects/', body: panelBody('projects'), x: 22, y: 30, w: 380 });

  const dock = document.createElement('div');
  dock.className = 'os-dock';
  const items: Array<[string, string, (() => void) | string]> = [
    ['🖥', 'terminal', openTerminal],
    ['🔭', 'research', openAbout],
    ['🗂', 'projects', openProjects],
    ['📄', 'resume.pdf', '/resume.pdf'],
    ['🧑‍🚀', 'about & cv', '/about.html'],
    ['💻', 'github', 'https://github.com/josephbaileyy'],
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
