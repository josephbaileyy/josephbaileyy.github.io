const PHRASES = [
  'calibrating telescope…',
  'collecting photons…',
  'winding the orrery…',
  'focusing the eyepiece…',
];

export class LoadingOverlay {
  private el: HTMLDivElement;
  private text: HTMLDivElement;
  private bar: HTMLDivElement;
  private retry: HTMLButtonElement;
  private quickPortfolio: HTMLAnchorElement;
  private phrase = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'loading-overlay';
    this.text = document.createElement('div');
    this.text.className = 'loading-text';
    this.text.textContent = PHRASES[0];
    this.bar = document.createElement('div');
    this.bar.className = 'loading-bar';
    this.bar.innerHTML = '<i></i>';
    this.retry = document.createElement('button');
    this.retry.className = 'loading-retry';
    this.retry.type = 'button';
    this.retry.textContent = 'Try again';
    this.retry.hidden = true;
    this.quickPortfolio = document.createElement('a');
    this.quickPortfolio.className = 'loading-portfolio';
    this.quickPortfolio.href = '/about.html';
    this.quickPortfolio.textContent = 'Open the quick portfolio instead →';
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-live', 'polite');
    this.el.setAttribute('aria-hidden', 'false');
    this.el.append(this.text, this.bar, this.retry, this.quickPortfolio);
    document.body.appendChild(this.el);
    this.timer = setInterval(() => {
      this.phrase = (this.phrase + 1) % PHRASES.length;
      this.text.textContent = PHRASES[this.phrase];
    }, 1400);
  }

  progress(p: number): void {
    this.show();
    (this.bar.firstElementChild as HTMLElement).style.width = `${Math.round(p * 100)}%`;
  }

  fail(sceneLabel: string, onRetry: () => void): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.show();
    this.el.classList.add('failed');
    this.text.textContent = `We couldn't load ${sceneLabel}. Check your connection and try again.`;
    this.retry.hidden = false;
    this.retry.onclick = () => {
      this.retry.hidden = true;
      this.el.classList.remove('failed');
      this.text.textContent = 'Trying that scene again…';
      onRetry();
    };
  }

  show(): void {
    this.el.classList.remove('done');
    this.el.setAttribute('aria-hidden', 'false');
    this.quickPortfolio.tabIndex = 0;
  }

  hide(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.el.classList.add('done');
    this.el.setAttribute('aria-hidden', 'true');
    this.quickPortfolio.tabIndex = -1;
    this.retry.hidden = true;
  }

  get visible(): boolean {
    return !this.el.classList.contains('done');
  }
}
