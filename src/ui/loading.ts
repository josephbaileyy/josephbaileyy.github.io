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
    this.el.append(this.text, this.bar);
    document.body.appendChild(this.el);
    this.timer = setInterval(() => {
      this.phrase = (this.phrase + 1) % PHRASES.length;
      this.text.textContent = PHRASES[this.phrase];
    }, 1400);
  }

  progress(p: number): void {
    (this.bar.firstElementChild as HTMLElement).style.width = `${Math.round(p * 100)}%`;
  }

  hide(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.el.classList.add('done');
    setTimeout(() => this.el.remove(), 600);
  }

  get visible(): boolean {
    return this.el.isConnected && !this.el.classList.contains('done');
  }
}
