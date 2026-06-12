import { PANELS } from '../../content/panels';

const stripHtml = (html: string): string =>
  html
    .replace(/<li>/g, ' · ')
    .replace(/<[^>]+>/g, '')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&amp;/g, '&')
    .replace(/\n\s+/g, '\n')
    .trim();

const FILES: Record<string, () => string> = {
  'about.txt': () =>
    "joseph bailey — physics @ stanford.\ninterested in compact objects, ultracompact binaries,\nand anything that orbits anything else.\n\n(full story: type 'open about')",
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
      'commands: whoami · ls · cat <file> · open <resume|github|about> · neofetch · echo · date · clear · help',
    whoami: () => 'joseph — physics @ stanford',
    ls: (args) =>
      args[0] === 'projects' || args[0] === 'projects/'
        ? 'am-cvn-binaries/   this-website/   your-next-project/'
        : 'resume.pdf   about.txt   amcvn.txt   projects/',
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
        case 'about':
          window.location.href = '/about.html';
          return 'navigating…';
        default:
          return 'usage: open <resume|github|about>';
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

  root.addEventListener('click', () => input.focus());
  setTimeout(() => input.focus(), 350);
  return root;
}
