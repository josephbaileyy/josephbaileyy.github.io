import { PANELS } from '../../content/panels';
import { PORTFOLIO } from '../../content/portfolio';

// Render the panel HTML to plain text: turn list items into bullets, then let
// the browser strip tags and decode every entity (&mdash;, &gamma;, …) via
// textContent. Finally collapse indentation and blank lines.
const stripHtml = (html: string): string => {
  const el = document.createElement('div');
  el.innerHTML = html.replace(/<li>/g, '\n· ').replace(/<\/li>/g, '\n');
  return (el.textContent ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
};

const FILES: Record<string, () => string> = {
  'about.txt': () =>
    `${PORTFOLIO.profile.name.toLowerCase()} — ${PORTFOLIO.profile.tagline}.\n\n${PORTFOLIO.profile.summary}\n\n(full story: type 'open about')`,
  'research.txt': () => stripHtml(PANELS['research'].html),
  'experience.txt': () => stripHtml(PANELS['experience'].html),
  'projects.txt': () => stripHtml(PANELS['projects'].html),
  'socials.txt': () => stripHtml(PANELS['socials'].html),
  'education.txt': () =>
    PORTFOLIO.education.map((item) => `${item.title}\n${item.description}`).join('\n\n'),
  'honors.txt': () => PORTFOLIO.honors.map((item) => `· ${item}`).join('\n'),
  'amcvn.txt': () => stripHtml(PANELS['am-cvn'].html),
  'resume.pdf': () => "binary file — try 'open resume'",
};

export function buildTerminal(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'os-terminal';
  const scrollback = document.createElement('div');
  scrollback.className = 'os-term-scrollback';
  const inputLine = document.createElement('div');
  inputLine.className = 'os-term-input';
  inputLine.innerHTML = `<span class="os-prompt">joseph@dorm-desk:~$</span>`;
  const input = document.createElement('input');
  input.type = 'text';
  input.spellcheck = false;
  input.autocapitalize = 'none';
  input.autocomplete = 'off';
  input.setAttribute('enterkeyhint', 'send');
  input.setAttribute('aria-label', 'terminal input');
  inputLine.appendChild(input);
  root.append(scrollback, inputLine);

  const history: string[] = [];
  let histIdx = -1;

  const print = (text: string, cls = ''): void => {
    const line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = text;
    scrollback.appendChild(line);
    scrollback.scrollTop = scrollback.scrollHeight;
  };

  const COMMANDS: Record<string, (args: string[]) => string | null> = {
    help: () =>
      'commands: whoami · ls · cat <file> · open <resume|github|linkedin|about|socials> · neofetch · echo · date · clear · help',
    whoami: () => 'joseph — coterm physics + cs (ai) @ stanford · ml for fundamental physics',
    ls: (args) =>
      args[0] === 'projects' || args[0] === 'projects/'
        ? 'neutrino-unfolding/   splora/   lord/   soccer-gnn/   eth-wallet/   this-website/'
        : 'resume.pdf   about.txt   research.txt   experience.txt   projects.txt   socials.txt   education.txt   honors.txt   amcvn.txt   projects/',
    cat: (args) => {
      if (!args[0]) return 'usage: cat <file>';
      const f = FILES[args[0]];
      return f ? f() : `cat: ${args[0]}: no such file`;
    },
    open: (args) => {
      switch (args[0]) {
        case 'resume':
          window.open('/resume.pdf', '_blank', 'noopener');
          return 'opening resume.pdf…';
        case 'github':
          window.open('https://github.com/josephbaileyy', '_blank', 'noopener');
          return 'opening github…';
        case 'linkedin':
          window.open('https://linkedin.com/in/baileyjosephr', '_blank', 'noopener');
          return 'opening linkedin…';
        case 'about':
          window.location.href = '/about.html';
          return 'navigating…';
        case 'socials':
          window.dispatchEvent(new CustomEvent('universe:open-app', { detail: 'socials' }));
          return 'opening personal orbit…';
        default:
          return 'usage: open <resume|github|linkedin|about|socials>';
      }
    },
    echo: (args) => args.join(' '),
    date: () => new Date().toString(),
    neofetch: () =>
      [
        '        ⢀⣴⣦⡀        joseph@dorm-desk',
        '       ⣰⣿⣿⣿⣆       ----------------',
        '      ⣼⣿⡟⠙⣿⣿⣧      OS: BaileyOS 1.0 (universe.app)',
        '     ⣼⣿⣿⣷⣶⣿⣿⣿⣧     Host: third rock from the sun',
        '    ⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉    Kernel: physics 4.0-stanford',
        '                  Uptime: since 2005',
        '                  Shell: zsh (allegedly)',
        '                  Theme: deep-space [dark, obviously]',
      ].join('\n'),
    clear: () => {
      scrollback.replaceChildren();
      return null;
    },
    sudo: () => 'joseph is not in the sudoers file. This incident will be reported.',
    pwd: () => '/home/joseph',
    exit: () => 'there is no escape. try zooming out instead.',
    // Hidden easter egg: hand off to the guided journey (main.ts listens).
    tour: () => {
      window.dispatchEvent(new CustomEvent('universe:tour'));
      return 'launching the guided journey — sit back and zoom out…';
    },
  };

  print('BaileyOS terminal — type `help` to get started.', 'os-term-dim');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length) {
        histIdx = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
        input.value = history[histIdx];
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx >= 0) {
        histIdx = Math.min(history.length - 1, histIdx + 1);
        input.value = history[histIdx];
      }
      return;
    }
    if (e.key !== 'Enter') return;
    const raw = input.value.trim();
    input.value = '';
    histIdx = -1;
    if (!raw) return;
    history.push(raw);
    print(`joseph@dorm-desk:~$ ${raw}`, 'os-term-cmd');
    const [cmd, ...args] = raw.split(/\s+/);
    const fn = COMMANDS[cmd.toLowerCase()];
    const out = fn ? fn(args) : `command not found: ${cmd} — try 'help'`;
    if (out) print(out);
  });

  root.addEventListener('click', () => input.focus({ preventScroll: true }));
  return root;
}
