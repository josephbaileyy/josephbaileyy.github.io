export function drawEventHitMap(canvas: HTMLCanvasElement, event: Float32Array): void {
  canvas.width = 640;
  canvas.height = 252;
  const context = canvas.getContext('2d')!;
  context.scale(2, 2);
  context.strokeStyle = 'rgba(210,225,240,.22)';
  context.lineWidth = 0.5;
  context.beginPath();
  context.moveTo(25, 8);
  context.lineTo(25, 104);
  context.lineTo(311, 104);
  context.stroke();
  for (let i = 0; i < event.length; i += 6) {
    const hot = event[i + 3] ** 0.72;
    context.fillStyle = `rgba(${22 + hot * 233},${57 + hot * 198},${126 + hot * 129},${0.45 + event[i + 3] * 0.55})`;
    context.fillRect(23 + (event[i + 4] / 56) * 286, 102 - (event[i + 5] / 36) * 96, 4.2, 4.2);
  }
  context.fillStyle = 'rgba(190,205,220,.7)';
  context.font = '8px monospace';
  context.fillText('0', 22, 116);
  context.fillText('module 56', 270, 116);
  context.save();
  context.translate(9, 67);
  context.rotate(-Math.PI / 2);
  context.fillText('strip', 0, 0);
  context.restore();
}

export function renderEventSummary(card: HTMLElement, clusters: number): void {
  card.innerHTML = `<dl>
    <div><dt>E<sub>μ</sub></dt><dd>3.84 GeV</dd></div>
    <div><dt>θ<sub>μ</sub></dt><dd>11.7°</dd></div>
    <div><dt>recoil</dt><dd>0.46 GeV</dd></div>
    <div><dt>Q²</dt><dd>0.31 GeV²</dd></div>
    <div><dt>visible E</dt><dd>1.08 GeV</dd></div>
    <div><dt>clusters</dt><dd>${clusters}</dd></div>
  </dl>`;
}
