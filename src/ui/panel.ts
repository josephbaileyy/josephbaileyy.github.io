import { PANELS } from '../content/panels';

export class PanelHost {
  private dialog: HTMLDialogElement;
  private currentId: string | null = null;
  onClose: (() => void) | null = null;

  constructor() {
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'panel';
    document.body.appendChild(this.dialog);

    this.dialog.addEventListener('close', () => {
      this.currentId = null;
      this.onClose?.();
    });
    // Backdrop click closes: the dialog element itself is only hit outside the content.
    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.dialog.close();
    });
  }

  get openId(): string | null {
    return this.currentId;
  }

  get isOpen(): boolean {
    return this.dialog.open;
  }

  open(panelId: string): void {
    const content = PANELS[panelId];
    if (!content) return;
    this.currentId = panelId;
    this.dialog.innerHTML = `
      <div class="panel-head">
        <h2><span class="panel-kicker">${content.kicker}</span>${content.title}</h2>
        <button class="panel-close" aria-label="Close">&times;</button>
      </div>
      <div class="panel-body">${content.html}</div>
    `;
    this.dialog.querySelector('.panel-close')!.addEventListener('click', () => this.dialog.close());
    if (!this.dialog.open) this.dialog.showModal();
  }

  close(): void {
    if (this.dialog.open) this.dialog.close();
  }
}
