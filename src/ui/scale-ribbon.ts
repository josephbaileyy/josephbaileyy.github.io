/** Live "10^x m" readout — the Powers of Ten homage. */
export class ScaleRibbon {
  private el: HTMLDivElement;
  private exp: HTMLSpanElement;
  private label: HTMLSpanElement;
  private lastText = '';

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'scale-ribbon';
    this.exp = document.createElement('span');
    this.exp.className = 'scale-exp';
    this.label = document.createElement('span');
    this.label.className = 'scale-label';
    this.el.append(this.exp, this.label);
    root.appendChild(this.el);
  }

  update(exponent: number, depth: number, sceneLabel: string): void {
    const text = `10^${exponent.toFixed(1)} m`;
    if (text !== this.lastText) {
      this.lastText = text;
      this.exp.innerHTML = `10<sup>${exponent.toFixed(1)}</sup> m`;
    }
    const nearSettled = Math.abs(depth - Math.round(depth)) < 0.2;
    this.label.textContent = nearSettled ? ` — ${sceneLabel}` : '';
    this.label.style.opacity = nearSettled ? '1' : '0';
  }
}
